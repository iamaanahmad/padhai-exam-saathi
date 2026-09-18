// Shared types for the PadhAI frontend. Mirrors the API contract in
// .kiro/specs/padhai-exam-saathi/design.md.

export type Language = "en" | "hi";

export interface PracticeQuestion {
  question: string;
  answer: string;
}

export interface StudyResult {
  explanation: string;
  questions: PracticeQuestion[];
  revisionSuggestion: string;
  language: Language;
}

export interface HistoryItem {
  id: string;
  createdAt: string;
  label: string;
  language: Language;
  explanation: string;
  questions: PracticeQuestion[];
  revisionSuggestion: string;
}

export type UploadMode = "text" | "image";

export interface AnalyzeRequest {
  mode: UploadMode;
  text?: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png";
  language: Language;
}
