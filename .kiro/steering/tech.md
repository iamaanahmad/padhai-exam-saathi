---
inclusion: always
---

# Tech Stack & Tooling Guidance

## Frontend
- Next.js 14+ (App Router) or React + Vite, whichever is already scaffolded first.
- Tailwind CSS for a clean, mobile-first UI (large touch targets, readable fonts).
- Hosted on AWS Amplify Hosting (preferred) or App Runner, with a public URL.
- Core screens: upload (image/text) + language toggle, structured result view,
  "Weak Topics / History" list. Keep the flow to those screens only.

## Backend
- API Gateway + Lambda (Python 3.12 or Node.js -- pick one and stay consistent).
- Amazon Bedrock multimodal model (Claude 3.5 Sonnet / Claude 4, or Amazon Nova) for
  vision + reasoning over uploaded pages/notes and text prompts.
- S3 bucket for temporary image storage, with a lifecycle rule to auto-expire objects.
- DynamoDB table for history/weak topics: single-table design, partition key =
  userId or sessionId.
- Optional: Cognito for simple anonymous or email login -- do not build more auth
  than that.

## Key design decisions (scored by judges)
- Everything should scale to zero -- no always-on servers, no idle compute.
- Least-privilege IAM roles per Lambda/resource.
- Bedrock model ID and region come from environment variables, not hardcoded.
- Clear separation between frontend and backend deployables.
- Prefer Infrastructure-as-Code (SAM/CDK) over manual console clicking so the
  architecture is reproducible and demoable in the write-up.

## Performance & cost targets
- Bedrock round trip target: under 8-10 seconds end to end.
- Use an efficient Bedrock model and minimal storage footprint to keep cost low.
- Secure by default: no public write access to S3/DynamoDB without basic controls.

## MCP / Powers usage during development
- The aws-agentcore power is installed and exposes AgentCore Runtime, Memory,
  Gateway, Identity, and Policy tools plus doc search. Consider it only if the
  agent loop grows beyond a single Bedrock call+response (e.g. needs session
  memory or tool orchestration) -- the MVPs core loop may not need it.
- Use search_agentcore_docs / official Bedrock docs to check current API shapes
  rather than relying on memory, since Bedrock model IDs and APIs change often.
- Keep secrets (API keys, OAuth client secrets) out of LLM context -- use .env
  (gitignored) locally and Secrets Manager in deployed environments. Prefer CLI-based
  credential commands over passing raw secrets through chat/MCP tools.

## General conventions
- Keep credentials and API keys out of source control.
- Favor a strict MVP: do not add subject selection, spaced repetition, streaks,
  social features, multi-page PDF/OCR, admin dashboards, payments, multi-user
  classrooms, or large-scale RAG. These are explicitly out of scope.
- Test Bedrock prompts against real handwritten notes/photos early -- vision
  quality on handwriting is the biggest technical risk.
