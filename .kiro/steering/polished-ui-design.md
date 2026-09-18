---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,vue,svelte,css,scss,html,astro}"
---

<!-- POLISHED-UI-SKILLS:BEGIN -->
# Polished UI Design Rules

Produce polished, professional UI. Avoid the generic "AI slop" / "vibe coded"
look — the statistical average of training data. Make deliberate choices grounded
in the product, the user, and the brand.

## Workflow (do not skip step 1)

1. **Constrain first.** Establish a minimal design system before generating UI:
   one dominant color + one accent + one neutral scale; a fixed spacing scale
   (4/8/12/16/24/32/48/64); a limited type scale with a deliberate font (not
   reflexively Inter). Encode as tokens (CSS variables + tokens file).
2. **Generate against the constraints.** Supply tokens + framework config + a
   visual reference. Be specific about what "good" means for THIS product.
3. **Critique against the anti-patterns** below. Never ship the first output.
4. **Add guardrails.** Lint against arbitrary values; pre-commit checks.

## Anti-patterns to avoid

1. Neon palettes with no hierarchy → one dominant color, one accent, one neutral.
2. Decorative dark-mode glow → earn depth via typography/contrast/surfaces.
3. Emojis as UI chrome → use a consistent icon system; emojis in microcopy only.
4. Purple/indigo gradient on everything → derive color from brand and audience.
5. Cards for every block → group with whitespace; cards = independent/interactive only.
6. Rainbow side-tab accents → accent color is scarce; define what gets it and why.
7. Meaningless status dots → every indicator maps to a defined, labeled state.

## Token guidance

- Semantic tokens (`text-foreground`, `bg-background`), never raw hex in components.
- Spacing scale only — no arbitrary values (`p-[13px]`).
- Prefer Tailwind + shadcn/ui. Same semantic names in light/dark; only values swap.

## Pre-ship self-check

- [ ] ONE dominant color, not competing neons?
- [ ] Every color/effect communicates hierarchy or state?
- [ ] Cards reserved for independent/interactive blocks?
- [ ] Spacing from the scale (no arbitrary values)?
- [ ] Consistent icon set (no emoji chrome)?
- [ ] Status indicators map to a defined, labeled state?
- [ ] Looks at home for THIS brand — not any generic AI product?
<!-- POLISHED-UI-SKILLS:END -->
