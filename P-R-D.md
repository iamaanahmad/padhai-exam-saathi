PRD: PadhAI (ExamSaathi) — Personalized AI Study Companion for Indian Students1. Overview & VisionPadhAI is a simple, mobile-first web application that helps Indian students (Classes 10–12, JEE/NEET, university) turn any textbook page, handwritten notes, or question into clear explanations, practice questions, and personalized revision suggestions using Amazon Bedrock.Hackathon goal: Ship a working, publicly accessible MVP in ~2 days that scores highly on Idea & Impact, AWS usage, Learning, Execution, and Demo Video for the Ship It grand prize (₹2,00,000 + $3,000 AWS credits).Core value proposition: “Upload any page or notes → get simple Hindi/English explanation + practice questions in seconds.”2. Problem Statement (Idea & Impact)Students struggle with:Dense or poorly explained textbook content
Handwritten notes that are hard to revise later
Lack of personalized practice for weak topics
Language barriers (prefer simple Hindi + English)

A small, reliable tool that removes friction in daily study has high personal and community impact for the exact audience of this hackathon (university students across India).3. Success Metrics for Grand PrizeLive public URL that works without setup
One crystal-clear core loop that demos perfectly in ≤ 3 minutes
Clear demonstration of AWS services (especially Bedrock + serverless)
Cost-aware architecture (scales to zero)
Explicit “what I learned” story
Clean, usable UI (contends for Best UI)
Public GitHub repo with commit history matching the event window

4. Target UsersIndian students preparing for board exams, JEE, NEET, or university courses
Primary language preference: Hindi + English
Device: Mobile phones (primary) and laptops

5. MVP Scope (Strict – Do Not Expand)Must have (ship these only):Image or text upload (textbook page / handwritten notes / question)
Bedrock analysis that returns:Simple, clear explanation of the concept (Hindi + English toggle)
3–5 similar practice questions with short answers
One short “what to revise next” suggestion

Ability to save the result to a personal “Weak Topics / History” list
Clean, distraction-free, mobile-first UI
Public live URL on AWS
Basic error handling and loading states

Out of scope (do not build):Full curriculum coverage or subject selection
User accounts beyond minimal Cognito (optional)
Spaced repetition, streaks, social features
Multi-page PDF upload or advanced OCR
Admin dashboard, payments, or multi-user classrooms
Complex RAG over large knowledge bases

6. Functional RequirementsUpload image (jpg/png) or paste text
Call Amazon Bedrock multimodal model
Display structured response (explanation, questions, suggestion)
Language toggle (Hindi / English)
Save item to DynamoDB (with timestamp and optional title)
View simple history list
Responsive design (works well on phone)

7. Non-Functional RequirementsFast response time (aim < 8–10 seconds for Bedrock call)
Scales to zero (no always-on servers)
Cost-aware (use efficient Bedrock model + minimal storage)
Secure (no public write access without basic controls)
Accessible and simple UI (large touch targets, readable fonts)

8. Technical Architecture (Ship It – AWS)Frontend:Next.js 14+ (App Router) or React + Vite
Tailwind CSS for clean mobile-first UI
Hosted on AWS Amplify Hosting (preferred) or App Runner

Backend:API Gateway + Lambda (Python 3.12 or Node.js)
Amazon Bedrock (Claude 3.5 Sonnet / Claude 4 or Amazon Nova multimodal for vision + reasoning)
S3 bucket for temporary image storage (with lifecycle rule)
DynamoDB table for user history / weak topics (single-table design, partition key = userId or sessionId)
Optional: Cognito for simple anonymous or email login

Key design decisions for scoring:Everything scales to zero
Least-privilege IAM roles
Environment variables for Bedrock model ID and region
Clear separation of frontend and backend

9. User Flow (Demo Script)Open public URL on phone
Upload photo of a textbook page or handwritten notes (or paste text)
Select language (Hindi/English)
Click “Explain & Practice”
See loading state → structured result appears
Click “Save to Weak Topics”
View history page
(Optional) Show architecture diagram briefly

10. Demo Video Requirements (≤ 3 minutes)Start with the real student problem (5–10 sec)
Live demo of the full flow on mobile (60–90 sec)
Briefly show the AWS services used and why (architecture + cost awareness)
End with what you learned in these 2 days

11. Submission RequirementsPublic GitHub repository (README with problem, solution, AWS architecture diagram, setup, what you learned)
Live public URL
YouTube demo video (public or unlisted, ≤ 3 min)
Short write-up covering problem, build, and where AWS fits

12. Risks & MitigationsBedrock vision quality → Use strong system prompt + test with real student notes
Time → Strict MVP only; use AI coding agent for all boilerplate
UI polish → Prioritize clean Tailwind design over features

Optional use Hackathon Agent Skill: npx hackathon-skills list
npx hackathon-skills add hackathon-grand-prize --agent kiro