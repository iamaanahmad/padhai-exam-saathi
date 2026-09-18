# Implementation Plan

- [ ] 1. Scaffold repository structure
  - Create `frontend/` (Next.js 14 App Router + TS + Tailwind) and `backend/` (SAM project) directories at repo root.
  - Add root `.gitignore` covering `node_modules`, `.next`, `.aws-sam`, `.env*`, `__pycache__`.
  - _Requirements: 8.1, 8.3_

- [ ] 2. Frontend foundation
  - [ ] 2.1 Initialize Next.js 14 App Router project with TypeScript and Tailwind CSS configured for mobile-first defaults (base font size, touch-target friendly spacing scale).
  - [ ] 2.2 Add `lib/types.ts` with `StudyResult`, `PracticeQuestion`, `HistoryItem`, `Language` types shared across components.
  - [ ] 2.3 Add `lib/session.ts` with `getOrCreateSessionId()` using `localStorage` + `crypto.randomUUID()`.
  - [ ] 2.4 Add `lib/api.ts` with `analyze()`, `saveHistory()`, `getHistory()` typed fetch wrappers using `NEXT_PUBLIC_API_BASE_URL` and the `X-Session-Id` header, normalizing failures into a typed `ApiError`.
  - _Requirements: 7.1, 7.2, 2.1, 2.3, 5.1, 6.1_

- [ ] 3. Frontend shared UI components
  - [ ] 3.1 `components/LanguageToggle.tsx` — English/Hindi toggle, defaults to English.
  - [ ] 3.2 `components/UploadForm.tsx` — image file input (JPG/PNG, ≤10MB client-side check) and text textarea (≤1000 chars), inline validation messages, submit disabled until valid input present.
  - [ ] 3.3 `components/ResultView.tsx` — renders explanation, practice Q&A list, revision suggestion as distinct mobile-first sections; "Save to Weak Topics" button with saved/saving/error states.
  - [ ] 3.4 `components/ErrorBanner.tsx` and `components/LoadingSpinner.tsx` — shared error-with-retry and loading indicator components.
  - _Requirements: 1.1-1.7, 4.1, 4.2, 5.2, 5.3_

- [ ] 4. Home page (upload + result flow)
  - Wire `app/page.tsx`: form submission calls `analyze()`, shows loading state while in flight, renders `ResultView` on success, renders `ErrorBanner` with retry on failure; language change after a result triggers a re-analysis with the same input.
  - _Requirements: 2.4, 2.6, 2.7, 2.8, 4.3_

- [ ] 5. History page
  - Wire `app/history/page.tsx`: fetches `getHistory()` on mount, renders list with timestamp + label, tap-to-expand full detail, empty state, and retry-on-failure state.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Root layout and navigation
  - `app/layout.tsx` with top bar (app name, nav link Home/History), global font and viewport meta for mobile.
  - _Requirements: 4.2, 8.1_

- [ ] 7. Backend: SAM project skeleton
  - `backend/template.yaml` defining HTTP API (with CORS), three Lambda functions (Python 3.12), S3 bucket with lifecycle + Block Public Access, DynamoDB table, and per-function least-privilege IAM policies via SAM `Policies`.
  - _Requirements: 3.2, 3.3, 5.4, 8.3_

- [ ] 8. Backend: AnalyzeFn
  - [ ] 8.1 `backend/analyze/app.py` — request validation (mode, text length, image type/size), S3 put for images, Bedrock Converse call with system+user prompt, JSON response parsing with fenced-code fallback, structured error responses (400/502/504).
  - [ ] 8.2 Embed the ExamSaathi system prompt (from design.md) as a constant, with `{LANGUAGE_NAME}` substitution.
  - _Requirements: 2.1-2.8, 3.1_

- [ ] 9. Backend: SaveHistoryFn and GetHistoryFn
  - `backend/save_history/app.py` — PutItem with sessionId/sortKey/label derivation.
  - `backend/get_history/app.py` — Query by sessionId, ScanIndexForward=False, map to response shape.
  - _Requirements: 5.1, 5.3, 6.1, 6.2, 6.5, 7.2_

- [ ] 10. Environment and config wiring
  - Frontend `.env.local.example` with `NEXT_PUBLIC_API_BASE_URL`.
  - Backend `template.yaml` parameters/env vars for `BEDROCK_MODEL_ID`, `BEDROCK_REGION`, `HISTORY_TABLE_NAME`, `UPLOAD_BUCKET_NAME`.
  - _Requirements: (tech steering: env vars for Bedrock model/region, not hardcoded)_

- [ ] 11. Verification
  - [ ] 11.1 `npm run build` in `frontend/` to confirm the Next.js app compiles.
  - [ ] 11.2 `sam validate` (or template lint) on `backend/template.yaml`; `python -m py_compile` on each handler.
  - _Requirements: all_

- [ ] 12. Documentation
  - Root `README.md`: problem statement, architecture diagram description, setup/deploy instructions (SAM + Amplify), env vars, and a "What I Learned" section placeholder for the team to fill in with real firsts.
  - _Requirements: submission requirements (hackathon)_
