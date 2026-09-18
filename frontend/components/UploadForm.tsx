"use client";

import { useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import { TextIcon, UploadCloudIcon } from "./icons";
import type { AnalyzeRequest, Language, UploadMode } from "@/lib/types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, per Requirement 1.4
const MAX_TEXT_CHARS = 1000; // per Requirement 1.5
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

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
  const [imageMediaType, setImageMediaType] = useState<
    "image/jpeg" | "image/png" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetImage() {
    setFileName(null);
    setImageBase64(null);
    setImageMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(null);
    if (!file) {
      resetImage();
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please upload a JPG or PNG image.");
      resetImage();
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image is too large. Maximum size is 10 MB.");
      resetImage();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:image/jpeg;base64,AAAA..." - strip prefix.
      const base64 = result.split(",")[1] ?? "";
      setImageBase64(base64);
      setImageMediaType(file.type as "image/jpeg" | "image/png");
    };
    reader.onerror = () => {
      setError("Could not read that image. Please try another file.");
      resetImage();
    };
    reader.readAsDataURL(file);
    setFileName(file.name);
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
              {fileName ? fileName : "Tap to take a photo or choose a file"}
            </span>
            {!fileName && (
              <span className="text-xs text-muted">JPG or PNG, up to 10 MB</span>
            )}
          </label>
          <input
            id="image-upload"
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            disabled={isSubmitting}
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

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Explaining..." : "Explain & Practice"}
      </button>
    </form>
  );
}
