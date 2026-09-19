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
- **Amazon Cognito** — an unauthenticated (anonymous) Identity Pool issues a real, AWS-signed `IdentityId` per browser, used as the session identifier instead of a purely client-generated UUID. No user pool, no sign-in UI, no passwords, and no direct browser-to-AWS calls with Cognito credentials — the unauthenticated IAM role it uses has zero permissions attached, since all data access still goes through the three Lambdas. Falls back to a local UUID if Cognito isn't configured or `GetId` fails, so the app keeps working either way.
- No VPC, no always-on compute. Everything scales to zero when idle, which keeps cost near $0 outside of active use.

Full requirements and design detail live in [`.kiro/specs/padhai-exam-saathi/`](.kiro/specs/padhai-exam-saathi/) (`requirements.md`, `design.md`, `tasks.md`).

## Repository layout

```
frontend/    Next.js 15 App Router site (Home + History pages, shared components, API client)
backend/     AWS SAM project: template.yaml + 3 Lambda functions (analyze, save_history, get_history)
.kiro/       Spec (requirements/design/tasks) and steering docs for this project
```

## Setup & deployment

### AWS credentials — use a scoped IAM user, not root

Deploying with AWS account root credentials works, but root has unrestricted
account-wide access with no way to scope it down — a real risk if a key ever
leaks. This repo includes a least-privilege IAM policy for exactly what
`sam build`/`sam deploy` need:

```powershell
cd backend/iam
aws iam create-user --user-name padhai-deployer
aws iam create-policy --policy-name PadhaiExamSaathiDeployPolicy `
  --policy-document file://padhai-deployer-policy.json
aws iam attach-user-policy --user-name padhai-deployer `
  --policy-arn arn:aws:iam::<your-account-id>:policy/PadhaiExamSaathiDeployPolicy
aws iam create-access-key --user-name padhai-deployer
# save the AccessKeyId/SecretAccessKey it prints - shown only once
aws configure --profile padhai-deployer
```

Then pass `--profile padhai-deployer` on every `sam build`/`sam deploy`
call instead of using default/root credentials. The policy
(`backend/iam/padhai-deployer-policy.json`) grants only: CloudFormation on
this stack (plus SAM's own managed deployment-bucket stack and the
`Serverless-2016-10-31` transform it requires), the app's S3 buckets,
this stack's Lambda functions and DynamoDB table, IAM role management
scoped to roles matching `padhai-exam-saathi-*` (needed because SAM
creates Lambda execution roles on your behalf), CloudWatch Logs for this
stack's log groups, and Bedrock model discovery/invoke (Bedrock's
list/invoke actions don't support per-resource ARN scoping, so that
statement is intentionally the one exception with `Resource: "*"`).
Verified working: a real `sam deploy` against the live stack using only
this profile completed a changeset successfully with no additional
permissions needed.

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

> **Note on capabilities:** this stack requires `--capabilities CAPABILITY_NAMED_IAM` (not just `CAPABILITY_IAM`), since the Cognito unauthenticated role has an explicit name rather than an auto-generated one.

`sam deploy` also prints `StudentIdentityPoolId` and `StudentIdentityPoolRegion` — you'll need both for the frontend's Cognito env vars below.

> **Note on `sam build`:** if your machine doesn't have Python 3.12 on `PATH` (only a newer version), use `sam build --use-container` instead of plain `sam build` — it builds inside a Lambda-matching Python 3.12 Docker image regardless of your local Python version. Requires Docker Desktop running.

`sam deploy` prints an `ApiBaseUrl` output — copy it, you'll need it for the frontend.

### 2. Run/deploy the frontend

Local development:

```powershell
cd frontend
copy .env.local.example .env.local
# edit .env.local: set NEXT_PUBLIC_API_BASE_URL to the ApiBaseUrl from step 1,
# and NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID / NEXT_PUBLIC_COGNITO_REGION to the
# StudentIdentityPoolId / StudentIdentityPoolRegion outputs (optional - the
# app falls back to a local UUID if these are left blank)
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
| `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | Frontend | Cognito Identity Pool id for anonymous session identity (optional) |
| `NEXT_PUBLIC_COGNITO_REGION` | Frontend | Region the identity pool lives in (optional) |

No secrets are hardcoded anywhere in the repo; the Bedrock model id/region are deploy-time parameters, not source constants.

## Security notes

- S3 upload bucket has Block Public Access fully enabled and a 1-day lifecycle rule — nothing is retained longer than necessary.
- DynamoDB and S3 are only reachable through their respective Lambda's execution role; each Lambda has a distinct, least-privilege IAM policy (see `backend/template.yaml`) — for example, `AnalyzeFunction` can write images and call Bedrock but has no DynamoDB access at all.
- There is no authentication layer in this MVP — access is scoped only by a client-generated session id stored in `localStorage`, not by verified identity. This is an explicit MVP tradeoff (see "Explicitly out of scope" below); anyone with a session id could read that session's history. Do not use this deployment for sensitive data. Adding Cognito would close this gap.
- The public API has no rate limiting beyond API Gateway defaults — acceptable for a hackathon demo, not for production traffic.

## Demo video

A shot-by-shot script for the required ≤3 minute demo video lives at
[`docs/demo-video-script.md`](docs/demo-video-script.md), structured to
match the hackathon's required format (problem → live mobile demo → AWS
architecture → what we learned).

## What's explicitly out of scope

Per the hackathon MVP scope: full curriculum coverage, accounts beyond an anonymous session id, spaced repetition/streaks/social features, multi-page PDF/OCR, admin dashboards, payments, multi-user classrooms, and large-scale RAG. See `.kiro/steering/product.md` for the full rationale.

## What we learned

**First Bedrock Converse call, and the inference-profile surprise.** Our first working assumption was to call Claude directly by foundation-model ID (`anthropic.claude-3-5-sonnet-...`), the way most Bedrock tutorials show it. Live testing against our own account immediately returned `ValidationException: ... isn't supported. Retry your request with the ID or ARN of an inference profile`. Turns out current-generation Anthropic models on Bedrock require invocation through a system-defined **inference profile**, not a bare model ID, even for single-region on-demand calls with no cross-region need. We ran `aws bedrock list-inference-profiles` against our own account, found the `us.anthropic.claude-sonnet-4-5-...` geographic profile (keeps routing inside the US, no data leaves the country, no extra quota request needed unlike the `global.` profile), and learned that IAM has a specific three-ARN requirement for these: the inference-profile ARN itself, *plus* the underlying foundation-model ARN in every region the profile can route to (us-east-1/us-east-2/us-west-2 for the "US" profile) — granting only the profile ARN silently fails.

**A real mobile bug that a toy test wouldn't have caught.** Once live, some phones started hitting `analysis_failed` intermittently. CloudWatch logs showed the actual cause: `ValidationException: The image was specified using the image/jpeg media type, but the image appears to be a image/webp image`. Some Android gallery/camera pickers report an inaccurate `File.type` — real WebP bytes labeled `image/jpeg` — and Bedrock validates the declared type against the actual bytes, so it hard-rejects the mismatch. We fixed this at the source: the browser now decodes every selected image through an off-screen `<canvas>` and always re-encodes it as a genuine JPEG before upload, so what we declare always matches what we send, regardless of what the OS/picker claims. We verified this by deliberately reproducing the exact bug (real WebP bytes, mislabeled as JPEG) against the live API and confirming it still fails as expected, then confirming the fixed path succeeds — the bug can no longer occur from the app itself.

**First Amplify Hosting deploy, and the monorepo build spec.** Since this repo has `frontend/` and `backend/` side by side, Amplify auto-detected it as a monorepo the moment we connected the GitHub repo, and the first build failed with `Monorepo spec provided without "applications" key` — our single-app `amplify.yml` format didn't match what Amplify expected once it inferred `AMPLIFY_MONOREPO_APP_ROOT=frontend`. Fixed by moving `amplify.yml` to the repo root and switching to the documented multi-app `applications:` list format with an explicit `appRoot: frontend` key.

**CORS almost sank the live demo silently.** After getting SAM and Amplify both deployed independently, opening the actual public Amplify URL produced a working-looking page that failed every API call — the backend's CORS `AllowedOrigin` was still set to `http://localhost:3000` from local development, and the real Amplify domain was never explicitly allowed. Caught this only by deliberately testing a live CORS preflight (`OPTIONS` with `Origin: https://master.<app>.amplifyapp.com`) rather than assuming "it deployed" meant "it works." Redeployed the SAM stack with the real origin and verified the preflight response before considering the app actually done.

**Cost-aware architecture decisions, made deliberately:** DynamoDB on `PAY_PER_REQUEST` billing (not provisioned capacity) so idle cost is $0; no VPC for any Lambda, since none of them need to reach a private resource, which also avoids NAT gateway cost and keeps cold starts fast; S3 lifecycle rule expiring temp uploads after 1 day as a backstop, plus an explicit `s3:DeleteObject` call in the Lambda itself right after each analysis finishes (success or failure) so images are usually gone in seconds, not a day; and splitting `/analyze`, `POST /history`, and `GET /history` into three separate Lambdas specifically so IAM could stay least-privilege per function — the analyze function can write images and call Bedrock but has zero DynamoDB permissions, and the two history functions have zero S3/Bedrock permissions.

**What we'd do differently with more time:** add a minimal authenticated identity layer (we kept session identity as a client-generated UUID in `localStorage` per the strict-MVP scope, which works but means history doesn't survive clearing browser storage or switching devices), and get automated tests running against the Lambda handlers' pure validation/parsing logic rather than relying on manual `curl`/PowerShell verification against the live stack for every change.

## License

Built for the First Commit hackathon. Add a license here if you plan to keep developing this beyond the event.
