# PadhAI (ExamSaathi) — Demo Video Script

Target runtime: **≤ 3 minutes**. Structure follows the hackathon's required
format exactly (problem → live demo → AWS architecture → what we learned).
Record on a phone in portrait orientation against the live public URL —
no local setup, no simulator, exactly what a judge would see.

---

## 0:00–0:10 — The problem (10s)

**Visual:** A student flipping through a dense textbook page or messy
handwritten notes, looking confused. Cut to phone screen.

**Voiceover (pick one language, keep it short):**
> "Millions of Indian students preparing for boards, JEE, or NEET get stuck
> on a page their textbook explains badly — and most study tools are
> English-only, or too complex to use in the moment."

---

## 0:10–1:40 — Live demo on mobile (90s)

Record this directly against the deployed URL: `https://master.d3qsjwy8ni5jch.amplifyapp.com`
(or your custom domain if set up by submission time). Every step below should
be a real tap on a real phone — no cuts that skip a loading state.

1. **(0:10–0:20)** Open the URL on the phone. Show the Home screen —
   clean, mobile-first, no login wall.
2. **(0:20–0:35)** Tap **Upload photo**, choose a real textbook page or
   handwritten notes photo from the gallery (not a screenshot — show the
   actual native photo picker opening, since that's the gallery-access fix).
3. **(0:35–0:40)** Tap the language toggle — show switching to **हिंदी**.
4. **(0:40–0:45)** Tap **Explain & Practice**. Let the loading state
   ("Reading your material...") show on screen for its real duration —
   don't cut it out, it demonstrates the loading-state requirement.
5. **(0:45–1:10)** Show the result appearing: explanation, the practice
   questions with answers, and the "What to revise next" callout. Scroll
   through all three sections on camera.
6. **(1:10–1:20)** Tap **Save to Weak Topics**, show the confirmation state
   on the button.
7. **(1:20–1:35)** Tap **History** in the nav. Show the saved item in the
   list with its timestamp, tap it open to expand the full detail.
8. **(1:35–1:40)** Quick beat: switch language back to English and re-run
   the same input, showing the same material explained in the other
   language — this is the core "Hindi + English" value proposition landing
   visually in one cut.

---

## 1:40–2:20 — Where AWS fits (40s)

**Visual:** Cut to the architecture diagram (from the README) on screen,
or a simple hand-drawn/slide version of it. Voiceover walks through it
left to right.

> "This runs entirely on AWS, and it scales to zero when nobody's using it.
> The frontend is on Amplify Hosting. Every request goes through API
> Gateway to one of three Lambda functions — Python, no servers running
> in between requests. The analyze function calls Amazon Bedrock's
> Converse API with Claude, sending either the photo or the pasted text
> plus a language choice, and gets back a structured explanation,
> practice questions, and a revision tip. Uploaded images live in S3 just
> long enough to get analyzed, then get deleted immediately — not even
> waiting for the lifecycle rule. Saved results go into DynamoDB, on
> on-demand billing, so there's zero cost when the app is idle. Every
> Lambda only has the exact permissions it needs — the analyze function
> can't touch the history table, and the history functions can't touch
> Bedrock or S3."

---

## 2:20–3:00 — What we learned (40s)

**Visual:** Talking-head or voiceover over a slide with 2-3 bullet points.

> "The biggest surprise was that current Claude models on Bedrock need an
> inference profile, not a bare model ID — we only found that out by
> testing against our own account and reading the actual error. We also
> hit a real mobile bug in production: some Android photo pickers report
> the wrong file type, and Bedrock rejects the mismatch. We fixed it by
> re-encoding every photo through canvas before upload, so what we declare
> always matches what we send. And CORS almost broke our own live demo
> silently — deployed and working-looking isn't the same as actually
> working, so we learned to always test the real public URL end to end,
> not just 'it built successfully.'"

**Closing frame:** App name, public URL, GitHub repo link on screen for
the last 3-4 seconds.

---

## Shot list / checklist before recording

- [ ] Confirm the live URL works end to end right before recording (CORS,
      env vars, Bedrock access) — don't record against a stale deploy.
- [ ] Use a real textbook page or real handwritten notes, not a stock photo
      or screenshot — the vision quality on real material is the point.
- [ ] Do at least one take with the language toggle actually switching
      the *same* uploaded material, not two separate uploads.
- [ ] Keep total runtime under 3:00 — trim the AWS section first if over,
      since the live demo (judging criterion: execution + idea/impact) and
      the "what we learned" close (explicitly scored) matter more than a
      long architecture walkthrough.
- [ ] Publish as public or unlisted on YouTube; link it in the submission
      form and in the README.
