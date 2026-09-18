---
inclusion: always
---

# PadhAI (ExamSaathi) — Product Context

## What it is
A simple, mobile-first web app that helps Indian students (Classes 10-12, JEE/NEET,
university) turn a textbook page, handwritten notes, or a typed question into a clear
explanation, practice questions, and a short revision suggestion, powered by Amazon
Bedrock.

## Core value proposition
"Upload any page or notes -> get a simple Hindi/English explanation + practice
questions in seconds."

## Problem it solves
- Dense or poorly explained textbook content.
- Handwritten notes that are hard to revise later.
- Lack of personalized practice for weak topics.
- Language barrier: students prefer simple Hindi + English, not dense English-only text.

## Target users
Indian students preparing for board exams, JEE, NEET, or university courses. Primary
language preference is Hindi + English. Primary device is mobile phones, secondary is
laptops.

## Hackathon goal
Ship a working, publicly accessible MVP in ~2 days for the "Ship It" grand prize
(₹2,00,000 + $3,000 AWS credits) at the First Commit hackathon (WeMakeDevs x AWS,
Sept 17-20 2026). Score highly on: Idea & Impact, Built on AWS, Learning, Execution,
Demo Video.

## MVP scope — ship these only
1. Image (jpg/png) or text upload (textbook page / handwritten notes / question).
2. Amazon Bedrock multimodal analysis returning:
   - A simple, clear explanation of the concept (Hindi + English toggle).
   - 3-5 similar practice questions with short answers.
   - One short "what to revise next" suggestion.
3. Save the result to a personal "Weak Topics / History" list.
4. Clean, distraction-free, mobile-first UI.
5. Public live URL on AWS.
6. Basic error handling and loading states.

## Explicitly out of scope (do not build)
- Full curriculum coverage or subject selection.
- User accounts beyond a minimal/optional Cognito setup.
- Spaced repetition, streaks, or social features.
- Multi-page PDF upload or advanced OCR.
- Admin dashboard, payments, or multi-user classrooms.
- Complex RAG over large knowledge bases.

## Success metrics for the grand prize
- Live public URL that works with zero setup for a judge.
- One crystal-clear core loop that demos perfectly in <= 3 minutes.
- Clear, visible use of AWS services (especially Bedrock + serverless).
- Cost-aware architecture that scales to zero.
- An explicit "what I learned" story in the write-up/video.
- Clean, usable UI (also contends for the Best UI prize).
- Public GitHub repo with commit history matching the event window.

## Demo script (user flow)
1. Open the public URL on a phone.
2. Upload a photo of a textbook page / handwritten notes, or paste text.
3. Select language (Hindi/English).
4. Click "Explain & Practice".
5. See a loading state, then the structured result appears.
6. Click "Save to Weak Topics".
7. View the history page.
8. (Optional) Briefly show the architecture diagram.

## Demo video (<= 3 minutes)
- 5-10s: the real student problem.
- 60-90s: live demo of the full flow on mobile.
- Briefly: which AWS services are used and why (architecture + cost awareness).
- End: what was learned during the build.

## Judging criteria (weight decisions accordingly)
1. Idea & Impact — real problem, real change for the student.
2. Built on AWS — visible, meaningful use of AWS services (Bedrock + serverless) is
   mandatory to win.
3. Learning — document firsts (first Bedrock multimodal call, first Amplify deploy, etc).
4. Execution — working > polished. One flawless core loop beats many half-built features.
5. Demo video — 3 minutes, mobile-first live demo.

## Risks & mitigations
- Bedrock vision quality on handwriting: use a strong system prompt, test with real
  student notes/photos early.
- Time pressure: strict MVP only, lean on AI coding assistance for boilerplate.
- UI polish: prioritize a clean Tailwind mobile-first layout over extra features.
