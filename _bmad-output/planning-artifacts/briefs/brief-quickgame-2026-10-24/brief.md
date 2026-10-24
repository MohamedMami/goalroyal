---
title: "Product Brief: GoalRoyale (Football Goal Countdown)"
status: finalized
created: 2026-10-24
updated: 2026-10-24
---

# Product Brief: GoalRoyale (Football Goal Countdown)

## Executive Summary
**GoalRoyale** is a fast-paced, high-energy party game inspired by the punchy, tactile arcade aesthetic of **Clash Royale** and the countdown drama of Darts 501. Designed for 2 to 4 friends playing locally on a single device or screen, each player starts with an identical countdown score (randomly generated between 200 and 600, or custom selected).

A top European football club is selected (e.g., Real Madrid, FC Barcelona, Manchester United, Bayern Munich, Liverpool, Arsenal, Chelsea, Juventus, PSG, Man City). On each turn, players must name a footballer who played for that club; that player's official club goal tally is deducted from their individual score. 

Players race to hit **exactly 0**. A footballer can only be named once across the entire match, turning every legendary striker into a scarce tactical resource. An optional turn timer (15s–60s) cranks up the psychological pressure, while an optional Yellow Card bust rule penalizes overshooting past zero.

Engineered to be built and playable in under 2 hours, the game is a zero-dependency, self-contained client-side web application featuring rich preloaded club data, fuzzy autocomplete, and an optional manual "Referee Override" so gameplay never stalls.

---

## Visual Design & Game Feel: "Clash Royale" Aesthetic
- **Chunky 3D Arcade Styling:** Beveled buttons, bold border strokes, golden crowns, and wooden/stone banner frames.
- **Punchy Typography:** Chunky, high-impact arcade font (e.g., *Lilita One* / *Outfit Black* / *Fredoka*) with high-contrast text outlines and drop shadows.
- **Card-Deck Player Cards:** Each player has an active "battle card" with their avatar, remaining goal count styled like an elixir/health gauge, yellow/red card badges, and turn indicator.
- **Tactile Feedback & Visual FX:** Screen shake on big goal deductions (e.g. CR7 450 goals or Messi 672 goals), ticking timer urgency with flashing red vignette, and confetti/crown victory fanfare.

---

## Core Gameplay Mechanics & Rules

### 1. Match Setup
- **Player Count:** 2, 3, or 4 players with custom player names and avatar selection.
- **Starting Score Target:** 
  - Random roll between 200 and 600 (default: 350–500 for optimal 8–12 round match).
  - Manual slider/input option.
  - Each player starts with their **own separate countdown score**.
- **Club Selection:**
  - Top European powerhouses: Real Madrid, FC Barcelona, Manchester United, Bayern Munich, Liverpool, Arsenal, Chelsea, Manchester City, Juventus, PSG, AC Milan, Inter Milan.
  - Can be randomly rolled or chosen by the players.
- **Turn Timer:** 
  - Configurable: Off, 15s, 30s, 45s, 60s.
  - Expiry counts as a passed turn (or Yellow Card if rule is active).
- **Rules Toggles:** 
  - Yellow Card / Bust penalty: On/Off.

### 2. Turn Sequence
1. The active player is spotlighted with a glowing arena border.
2. The timer begins ticking down.
3. Player types a footballer in the autocomplete search box.
4. The system validates:
   - Did the player score goals for this club?
   - Has this player already been used in this match? (Global lockout).
5. Upon confirmation:
   - Deduct: `Player Score = Player Score - Club Goals`.
   - Goal badge flies into the player's gauge with a punchy score reduction animation.
   - The used footballer is locked into the match's "Graveyard / Used Deck".
6. Turn rotates to the next player.

### 3. Bust & Yellow Card Rules (Toggleable Option)
- **Target is exact 0:**
  - If a player needs 15 goals and names someone with 25 goals, it's a **Bust**.
  - **Yellow Card Mode enabled:**
    - 1st Bust = 🟨 Yellow Card badge added to player. Score remains unchanged; turn passes.
    - 2nd Bust = 🟥 Red Card suspension. Player must sit out their next full round!
  - **Yellow Card Mode disabled:**
    - Simple bust: turn passes without score change.

### 4. Victory Condition
- The first player to reach exactly 0 wins the crown!
- Victory screen displays crowns, match statistics, best goal picks, and a "Rematch" button.

---

## Data Source Strategy: Guaranteed Fast Turnaround (< 2 Hours)

### Recommendation: Built-In Verified Dataset + "Referee Override"
To ensure the game is 100% playable in the next 2 hours without API key setup, network latency, rate limits, or AI hallucinations:
1. **Bundled Curated Dataset (`football-data.json`):**
   - 10–12 Top European clubs.
   - 35–50 verified top goalscorers per club (all official competitive goals for that club).
   - Includes full names, short names, and common nicknames (e.g., "Cristiano Ronaldo", "CR7", "Ronaldo"; "Karim Benzema", "Benzema"; "Lionel Messi", "Messi").
2. **Instant Search & Autocomplete:**
   - As players type, suggestions appear with their goal tally preview.
3. **"Referee Override" / Custom Player Entry:**
   - If a friend names an obscure defender or player who scored 3 goals not in the top-50 list, players can click **"Referee Override"** to enter the player's name and goals manually (verified via phone or agreed by friends).
4. **Optional LLM API Integration (Future / Secondary Hook):**
   - The architecture will include an extensible lookup function where a free Gemini / Groq API key can be pasted in Settings if players want an unlimited AI referee for any player in history.

---

## Scope for 2-Hour Launch (V1.0)
### In Scope
- Clash Royale UI design system (chunky buttons, gold borders, elixir-style gauges, crown banners).
- 2–4 Player local pass-and-play.
- Individual countdown scores per player.
- 10 Top European Clubs with verified scorer database.
- Configurable turn timer (15s, 30s, 45s, 60s, or Off).
- Autocomplete search with instant goal lookup.
- Global single-use player lockout per match.
- Optional Yellow Card / Bust mechanics.
- Referee Override (manual goal entry).
- Match summary & Rematch button.

### Out of Scope (Post-Launch)
- Real-time WebSockets / online multiplayer on separate phones.
- Sound effects synthesizer (can add basic Web Audio beeps/clicks in V1.1).
