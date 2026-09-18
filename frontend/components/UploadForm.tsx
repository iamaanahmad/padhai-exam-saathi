"use client";

import { useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
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
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-slate-600">Language</span>
        <LanguageToggle
          value={language}
          onChange={onLanguageChange}
          disabled={isSubmitting}
        />
      </div>

      <div
        role="tablist"
        aria-label="Choose input type"
        className="grid grid-cols-2 gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "image"}
          disabled={isSubmitting}
          onClick={() => setMode("image")}
          className={`min-h-touch rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            mode === "image"
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          Upload photo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "text"}
          disabled={isSubmitting}
          onClick={() => setMode("text")}
          className={`min-h-touch rounded-xl border px-4 py-2 text-sm font-semibold transition ${
            mode === "text"
              ? "border-brand-600 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          Paste text
        </button>
      </div>

      {mode === "image" ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="image-upload"
            className="min-h-touch flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-4 py-6 text-center text-sm font-medium text-brand-700"
          >
            {fileName ? `Selected: ${fileName}` : "Tap to take a photo or choose a file"}
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
          <p className="text-xs text-slate-400">JPG or PNG, up to 10 MB.</p>
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
            className="w-full rounded-xl border border-slate-200 p-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-right text-xs text-slate-400">
            {text.length}/{MAX_TEXT_CHARS}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Explaining..." : "Explain & Practice"}
      </button>
    </form>
  );
}
