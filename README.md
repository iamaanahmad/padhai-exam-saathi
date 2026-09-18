# PadhAI (ExamSaathi)

**Upload any page or notes → get a simple Hindi/English explanation + practice questions in seconds.**

Built for the WeMakeDevs × AWS **First Commit** hackathon (Ship It track), Sept 17–20 2026.

## The problem

Indian students preparing for board exams, JEE, NEET, or university courses run into the same friction points every day:

- Textbook content that's dense or poorly explained.
- Handwritten notes that are hard to revise later.
- No personalized practice for the topics they're actually weak on.
- A preference for simple Hindi + English explanations, not dense English-only text.

PadhAI removes that friction: point your phone at a page, or paste a question, and get back a plain-language explanation, a few practice questions with answers, and one concrete next step to revise — in the language you actually study in.

## Core flow

1. Open the app on your phone.
2. Upload a photo of a textbook page or handwritten notes, or paste text.
3. Pick Hindi or English.
4. Tap **Explain & Practice**.
5. Read the explanation, try the practice questions, see the revision tip.
6. Tap **Save to Weak Topics** to keep it for later.
7. Revisit anything you've saved on the **History** page.

## Architecture

```
┌─────────────────┐        HTTPS         ┌──────────────────────┐
│  Next.js 15 App  │ ───────────────────▶ │  API Gateway (HTTP)  │
│ (Amplify Hosting) │ ◀─────────────────── │                      │
└─────────────────┘        JSON           └──────────┬───────────┘
     │  session id in                                 │ routes
     │  localStorage                     ┌─────────────┼─────────────┐
     ▼                                   ▼             ▼             ▼
 browser                          ┌───────────┐ ┌────────────┐ ┌────────────┐
                                   │AnalyzeFn  │ │SaveHistoryFn│ │GetHistoryFn│
                                   │ (Lambda)  │ │  (Lambda)   │ │  (Lambda)  │
                                   └─────┬─────┘ └──────┬──────┘ └──────┬─────┘
                                         │              │              │
                              ┌──────────┼───────┐      │              │
                              ▼          ▼       │      ▼              ▼
                        ┌──────────┐ ┌────────┐  │  ┌────────────────────┐
                        │  S3      │ │Bedrock │  │  │   DynamoDB table   │
                        │ (images, │ │Runtime │  │  │  PK=sessionId       │
                        │ 24h TTL) │ │(Claude)│  │  │  SK=createdAt#id    │
                        └──────────┘ └────────┘  └─▶└────────────────────┘
```

- **Frontend** — Next.js 15 (App Router) + TypeScript + Tailwind CSS, three screens only (Home/Upload, Result, History), deployed on **AWS Amplify Hosting** for a public HTTPS URL.
- **Backend** — three single-purpose **AWS Lambda** functions (Python 3.12) behind one **API Gateway HTTP API**:
  - `POST /analyze` — validates the upload, stores images in S3, calls **Amazon Bedrock** (Converse API) with a tutoring system prompt, returns a structured explanation + practice questions + revision tip.
  - `POST /history` — saves a Study_Result to DynamoDB under the caller's session id.
  - `GET /history` — lists saved Study_Results for that session, newest first.
- **Amazon Bedrock** — multimodal model (Claude 3.5 Sonnet by default, swappable to Amazon Nova) handles both the vision (photo) and text-only paths through the same Converse API call.
- **S3** — temporary storage for uploaded images, fully private (Block Public Access), 1-day lifecycle expiry.
- **DynamoDB** — single table, on-demand billing, partition key `sessionId` / sort key `sortKey` (`ISO timestamp#uuid`) so history reads come back newest-first with no extra indexes.
- No Cognito, no VPC, no always-on compute. Everything scales to zero when idle, which keeps cost near $0 outside of active use.

Full requirements and design detail live in [`.kiro/specs/padhai-exam-saathi/`](.kiro/specs/padhai-exam-saathi/) (`requirements.md`, `design.md`, `tasks.md`).

## Repository layout

```
frontend/    Next.js 15 App Router site (Home + History pages, shared components, API client)
backend/     AWS SAM project: template.yaml + 3 Lambda functions (analyze, save_history, get_history)
.kiro/       Spec (requirements/design/tasks) and steering docs for this project
```

## Setup & deployment

### Prerequisites

- Node.js 18.18+ and npm
- Python 3.12
- AWS CLI configured with credentials (`aws configure`)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- An AWS account with **Amazon Bedrock model access enabled** for the model you choose (Claude 3.5 Sonnet or Amazon Nova), in a region where that model is available (Bedrock model availability is region-specific — check the [Bedrock model support table](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html) before deploying)

### 1. Deploy the backend (SAM)

```powershell
cd backend
sam build
sam deploy --guided
```

During the guided deploy you'll be asked for:
- `BedrockModelId` — defaults to `us.anthropic.claude-sonnet-4-5-20250929-v1:0`, a system-defined **inference profile** id. Current Anthropic Claude models on Bedrock require an inference profile rather than a bare foundation-model id for on-demand calls (verified directly: `Converse` on a bare model id returns `ValidationException`). Run `aws bedrock list-inference-profiles --region us-east-1` to see current options for your account.
- `BedrockRegion` — the region to call the inference profile from (default `us-east-1`)
- `BedrockFoundationModelId` — the underlying model id behind `BedrockModelId` with the region prefix stripped (default `anthropic.claude-sonnet-4-5-20250929-v1:0`), used to build the IAM policy correctly
- `AllowedOrigin` — your Amplify frontend URL once you have it (use `http://localhost:3000` for local dev first, then redeploy with the real URL after step 2)

> **Note on `sam build`:** if your machine doesn't have Python 3.12 on `PATH` (only a newer version), use `sam build --use-container` instead of plain `sam build` — it builds inside a Lambda-matching Python 3.12 Docker image regardless of your local Python version. Requires Docker Desktop running.

`sam deploy` prints an `ApiBaseUrl` output — copy it, you'll need it for the frontend.

### 2. Run/deploy the frontend

Local development:

```powershell
cd frontend
copy .env.local.example .env.local
# edit .env.local and set NEXT_PUBLIC_API_BASE_URL to the ApiBaseUrl from step 1
npm install
npm run dev
```

Production deploy via **AWS Amplify Hosting**:
1. Push this repo to GitHub/GitLab.
2. In the Amplify console, create a new app from your repo, set the app root to `frontend/`.
3. Add the environment variable `NEXT_PUBLIC_API_BASE_URL` = the `ApiBaseUrl` output from `sam deploy`.
4. Deploy. Amplify gives you a public HTTPS URL.
5. Re-run `sam deploy` for the backend with `AllowedOrigin` set to that Amplify URL, so CORS allows real traffic.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Frontend (Amplify env var / `.env.local`) | Base URL of the deployed HTTP API |
| `BedrockModelId` (SAM parameter) | Backend | Bedrock model id used for analysis |
| `BedrockRegion` (SAM parameter) | Backend | Region to call Bedrock in |
| `AllowedOrigin` (SAM parameter) | Backend | CORS origin allowed to call the API |

No secrets are hardcoded anywhere in the repo; the Bedrock model id/region are deploy-time parameters, not source constants.

## Security notes

- S3 upload bucket has Block Public Access fully enabled and a 1-day lifecycle rule — nothing is retained longer than necessary.
- DynamoDB and S3 are only reachable through their respective Lambda's execution role; each Lambda has a distinct, least-privilege IAM policy (see `backend/template.yaml`) — for example, `AnalyzeFunction` can write images and call Bedrock but has no DynamoDB access at all.
- There is no authentication layer in this MVP — access is scoped only by a client-generated session id stored in `localStorage`, not by verified identity. This is an explicit MVP tradeoff (see "Explicitly out of scope" below); anyone with a session id could read that session's history. Do not use this deployment for sensitive data. Adding Cognito would close this gap.
- The public API has no rate limiting beyond API Gateway defaults — acceptable for a hackathon demo, not for production traffic.

## What's explicitly out of scope

Per the hackathon MVP scope: full curriculum coverage, accounts beyond an anonymous session id, spaced repetition/streaks/social features, multi-page PDF/OCR, admin dashboards, payments, multi-user classrooms, and large-scale RAG. See `.kiro/steering/product.md` for the full rationale.

## What we learned

*(Fill this in with your team's real firsts before submitting — judges score this explicitly.)*

- First time calling Amazon Bedrock's Converse API for multimodal (image + text) input —
- First Amplify Hosting deploy of a Next.js App Router site —
- Decisions made to keep the architecture cost-aware (on-demand DynamoDB, no VPC, S3 lifecycle rules) —
- Any surprises testing Bedrock against real handwritten notes/photos —

## License

Built for the First Commit hackathon. Add a license here if you plan to keep developing this beyond the event.
