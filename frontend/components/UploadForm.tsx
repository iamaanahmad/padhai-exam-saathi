"use client";

import { useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { TextIcon, UploadCloudIcon } from "./icons";
import type { AnalyzeRequest, Language, UploadMode } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, per Requirement 1.4
const MAX_TEXT_CHARS = 5000; // per Requirement 1.6
// Output format we always re-encode to before upload, regardless of the
// source file's real or reported type (see normalizeImageToJpeg below).
const OUTPUT_MEDIA_TYPE = "image/jpeg" as const;
const OUTPUT_QUALITY = 0.9;

/**
 * Decodes an arbitrary image File via <canvas> and re-encodes it as a real
 * JPEG, returning base64 (no data: prefix) plus the media type to declare.
 * This is the fix for mobile pickers that mislabel a file's MIME type (e.g.
 * reporting "image/jpeg" for actual WebP bytes) - the browser's <img>/canvas
 * decode path is tolerant of the mismatch, so whatever comes out the other
 * side is guaranteed to actually be a JPEG.
 */
function normalizeImageToJpeg(
  file: File
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable."));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL(OUTPUT_MEDIA_TYPE, OUTPUT_QUALITY);
      const base64 = dataUrl.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to encode image."));
        return;
      }
      resolve({ base64, mediaType: OUTPUT_MEDIA_TYPE });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Browser could not decode this image."));
    };

    img.src = objectUrl;
  });
}

interface UploadFormProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onSubmit: (payload: AnalyzeRequest) => void;
  isSubmitting: boolean;
}

/**
 * Upload screen: lets a student pick an image OR paste text, choose a
 * language, and submit for analysis. Validates input client-side for fast
 * feedback; the backend re-validates since client checks aren't trustworthy.
 */
export default function UploadForm({
  language,
  onLanguageChange,
  onSubmit,
  isSubmitting,
}: UploadFormProps) {
  const [mode, setMode] = useState<UploadMode>("image");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<"image/jpeg" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetImage() {
    setFileName(null);
    setImageBase64(null);
    setImageMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) {
      resetImage();
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large. Maximum size is 10 MB.");
      resetImage();
      return;
    }

    // Some mobile gallery/camera apps report an inaccurate MIME type on the
    // File object (observed: Android sending real WebP bytes labeled as
    // "image/jpeg"), which Bedrock rejects outright since it validates the
    // declared type against the actual image bytes. Re-encoding every
    // upload to a real JPEG through <canvas> guarantees what we send always
    // matches what we declare, regardless of the source's reported type.
    setIsProcessingImage(true);
    try {
      const { base64, mediaType } = await normalizeImageToJpeg(file);
      setImageBase64(base64);
      setImageMediaType(mediaType);
      setFileName(file.name);
    } catch {
      setError(
        "Could not read that image. Try a different photo (JPG, PNG, or WEBP)."
      );
      resetImage();
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "image") {
      if (!imageBase64 || !imageMediaType) {
        setError("Please choose an image to upload.");
        return;
      }
      onSubmit({ mode: "image", imageBase64, imageMediaType, language });
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please paste some text or upload an image.");
      return;
    }
    if (trimmed.length > MAX_TEXT_CHARS) {
      setError(`Text is too long. Please keep it under ${MAX_TEXT_CHARS} characters.`);
      return;
    }
    onSubmit({ mode: "text", text: trimmed, language });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Choose input type"
        className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "image"}
          disabled={isSubmitting}
          onClick={() => setMode("image")}
          className={`flex min-h-touch items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ${
            mode === "image"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <UploadCloudIcon className="h-4 w-4" />
          Upload photo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "text"}
          disabled={isSubmitting}
          onClick={() => setMode("text")}
          className={`flex min-h-touch items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition ${
            mode === "text"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <TextIcon className="h-4 w-4" />
          Paste text
        </button>
      </div>

      {mode === "image" ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="image-upload"
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              isProcessingImage ? "cursor-wait opacity-70" : ""
            } ${
              fileName
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-surface hover:border-primary/40"
            }`}
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                fileName ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              <UploadCloudIcon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">
              {isProcessingImage
                ? "Preparing photo..."
                : fileName
                  ? fileName
                  : "Choose from gallery or take a photo"}
            </span>
            {!fileName && !isProcessingImage && (
              <span className="text-xs text-muted">JPG, PNG, or WEBP, up to 10 MB</span>
            )}
          </label>
          {/* No `capture` attribute: this lets mobile browsers offer their
              native chooser (gallery OR camera) instead of forcing the
              camera to open directly. */}
          <input
            id="image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={isSubmitting || isProcessingImage}
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={isSubmitting}
            maxLength={MAX_TEXT_CHARS}
            rows={6}
            placeholder="Paste your notes or question here..."
            className="w-full rounded-2xl border border-border bg-surface p-3.5 text-[0.95rem] leading-relaxed placeholder:text-muted/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <p className="self-end text-xs text-muted">
            {text.length}/{MAX_TEXT_CHARS}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">Language</span>
        <LanguageToggle
          value={language}
          onChange={onLanguageChange}
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary"
        disabled={isSubmitting || isProcessingImage}
      >
        {isSubmitting ? "Explaining..." : "Explain & Practice"}
      </button>
    </form>
  );
}
