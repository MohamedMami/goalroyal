---
title: 'Build GoalRoyale Football Countdown Web Game'
type: 'feature'
created: '2026-10-24'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/briefs/brief-quickgame-2026-10-24/brief.md'
  - '_bmad-output/planning-artifacts/briefs/brief-quickgame-2026-10-24/addendum.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Friends need an instant, debate-free football trivia party game they can play together in the next 2 hours on a single device, combining trivia knowledge with high-stakes countdown arithmetic.

**Approach:** Build a standalone, high-energy client-side web application titled "GoalRoyale" featuring Clash Royale-inspired arcade aesthetics, 2-4 player pass-and-play turns, configurable turn timers, verified goalscorer database for top European clubs, autocomplete search, exact-0 bust/yellow card mechanics, and an instant Referee Override.

</frozen-after-approval>

## Implementation Notes

- Initialized oneshot build flow for GoalRoyale.
- Created `package.json` with Vite 5.4.
- Created `src/data/clubs.json` with rich, verified competitive goal tallies for 12 top European powerhouses (Real Madrid, Barcelona, Man United, Bayern Munich, Liverpool, Arsenal, Chelsea, Man City, PSG, Juventus, AC Milan, Inter Milan).
- Built Web Audio API synthesizer `src/game/sound.js` producing 8-bit / arcade sound effects (button clicks, impact goal deductions, urgent timer ticking, bust buzzer, victory arpeggio).
- Built core state engine `src/game/engine.js` managing player turns, countdown subtraction, single-use player lockout graveyard, exact-0 bust and yellow/red card penalties, history snapshots, and full undo support.
- Built Clash Royale arcade styling in `src/styles/tokens.css` and `src/styles/main.css` with beveled 3D buttons, pitch patterns, elixir meters, glowing turn crowns, and screen shake.
- Built interactive controller `src/main.js` and `index.html` featuring autocomplete search, keyboard navigation, referee override modal, graveyard modal, and victory fanfare with confetti.
- Verified production build (`npm run build` completed cleanly in 462ms).
- Launched Vite dev server at `http://localhost:5173/` (HTTP 200 OK verified on all endpoints).
