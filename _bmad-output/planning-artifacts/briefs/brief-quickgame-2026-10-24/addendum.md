# Product Brief Addendum: GoalRoyale

## Supported European Powerhouse Clubs
1. **Real Madrid** (La Liga)
2. **FC Barcelona** (La Liga)
3. **Manchester United** (Premier League)
4. **Liverpool FC** (Premier League)
5. **Arsenal FC** (Premier League)
6. **Chelsea FC** (Premier League)
7. **Manchester City** (Premier League)
8. **Bayern Munich** (Bundesliga)
9. **Paris Saint-Germain** (Ligue 1)
10. **Juventus** (Serie A)
11. **AC Milan** (Serie A)
12. **Inter Milan** (Serie A)

## Clash Royale Visual System Specification
- **Color Palette:**
  - Gold / Crown: `#FFD700`, `#FFA500`, `#8B5A00` (gradient gold badges, crowns, borders).
  - Elixir / Health Blue-Purple: `#8A2BE2`, `#4A0E4E`, `#00BFFF`.
  - Arena Pitch Green: `#1a3c1e`, `#102613` with subtle grass grid patterns.
  - Wood & Stone Trim: Deep charcoal stone (`#22262c`) with wooden plank accents (`#5c3a21`).
  - Card Outlines: Heavy 3px-4px rounded borders with outer glow on active player.
- **Typography:**
  - Headers: Heavy display sans with 3D drop shadow (`Lilita One` or `Outfit Black`).
  - Numbers: High-contrast digital/arcade countdown counters.

## Data Strategy Evaluation
- **Static JSON Dataset vs LLM API:**
  - *Static JSON:* Zero latency, zero cost, works completely offline, 100% immune to API key limits or timeouts.
  - *LLM API (Gemini/OpenAI):* Solves the long-tail problem for obscure players (e.g. "Who scored 2 goals for Real Madrid in 1984?"), but adds 1.5–3s latency per turn, requires an API key, and can hallucinate numbers.
  - *Decision:* Build the core engine with a rich static JSON dataset of 40–50 players per club, PLUS a simple "Referee Override" button. An optional LLM prompt/API key input can be supported as an enhancement if desired.
