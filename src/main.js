/**
 * GoalRoyale - Main Application Controller
 * Handles view rendering, user input, autocomplete, modals, and confetti
 */

import './styles/main.css';
import { game, AVATARS } from './game/engine.js';
import { sound } from './game/sound.js';

class GoalRoyaleApp {
  constructor() {
    this.appEl = document.getElementById('app');
    this.modalEl = document.getElementById('modal-root');
    this.confettiCanvas = null;

    this.selectedAutocompleteIndex = -1;
    this.currentSuggestions = [];

    this.init();
  }

  init() {
    game.subscribe((state, event) => {
      if (event && (event.type === 'timer_tick' || event.type === 'timer_paused' || event.type === 'timer_resumed')) {
        this.updateTimerDisplay(state);
        return;
      }
      this.render(state);
    });

    this.render(game.state);
  }

  updateTimerDisplay(state) {
    const timerBadge = document.querySelector('.timer-seconds-badge');
    if (timerBadge && state.match) {
      if (!state.match.timerRunning && state.match.timerSec > 0) {
        timerBadge.textContent = `${state.match.timeLeft}s ⏸️`;
        timerBadge.classList.remove('urgent');
      } else {
        timerBadge.textContent = `${state.match.timeLeft}s`;
        timerBadge.classList.toggle('urgent', state.match.timeLeft <= 5);
      }
    }
  }

  render(state) {
    if (state.view === 'setup') {
      this.renderSetup(state);
    } else if (state.view === 'battle') {
      this.renderBattle(state);
    } else if (state.view === 'victory') {
      this.renderVictory(state);
    }
  }

  renderHeader(state) {
    const isMuted = sound.muted;
    const canUndo = state.historyStack && state.historyStack.length > 0;

    return `
      <header class="royale-header">
        <div class="royale-logo">
          <span class="royale-crown-icon">👑</span>
          <div class="royale-logo-text">
            <span class="royale-logo-title">GOAL ROYALE</span>
            <span class="royale-logo-subtitle">Football Countdown Party</span>
          </div>
        </div>

        <div class="header-controls">
          <button class="btn-3d btn-wood btn-icon-only" id="rules-btn" title="Game Rules">
            📖
          </button>
          
          <button class="btn-3d btn-wood btn-icon-only" id="sound-btn" title="Toggle Sound">
            ${isMuted ? '🔇' : '🔊'}
          </button>

          ${
            state.view === 'battle'
              ? `
            <button class="btn-3d btn-gold btn-icon-only" id="graveyard-btn" title="View Used Footballers">
              ⚰️ <span style="font-size: 11px;">(${state.match?.usedPlayers?.length || 0})</span>
            </button>
            <button class="btn-3d btn-blue btn-icon-only" id="undo-btn" ${canUndo ? '' : 'disabled style="opacity: 0.5;"'} title="Undo Last Turn">
              ↩️
            </button>
            <button class="btn-3d btn-red btn-icon-only" id="quit-btn" title="Exit to Setup">
              ✕
            </button>
          `
              : ''
          }
        </div>
      </header>
    `;
  }

  /* ==========================================================================
     VIEW 1: SETUP
     ========================================================================== */
  renderSetup(state) {
    const cfg = state.config;
    const clubs = game.clubs;

    this.appEl.innerHTML = `
      ${this.renderHeader(state)}

      <div class="setup-container">
        <div class="setup-banner">
          <h1 class="setup-title">ARENA SETUP</h1>
          <p class="setup-desc">
            Race your friends to exact 0! Deduct official club goals scored by real football legends. A footballer can only be named once!
          </p>
        </div>

        <!-- 1. Player Count & Names -->
        <div class="setup-section-card">
          <div class="section-label">
            <span>👥</span> SELECT PLAYERS
          </div>
          
          <div class="player-count-tabs">
            ${[2, 3, 4]
              .map(
                (num) => `
              <button class="count-tab-btn ${cfg.playerCount === num ? 'active' : ''}" data-count="${num}">
                ${num} PLAYERS
              </button>
            `
              )
              .join('')}
          </div>

          <div class="player-inputs-grid">
            ${Array.from({ length: cfg.playerCount })
              .map((_, i) => {
                const avatarObj = AVATARS.find((a) => a.id === cfg.playerAvatars[i]) || AVATARS[i % AVATARS.length];
                return `
                <div class="player-input-card">
                  <div class="player-avatar-badge" data-player-idx="${i}" title="Click to change avatar">
                    ${avatarObj.emoji}
                  </div>
                  <input type="text" class="player-name-input" data-player-idx="${i}" 
                         value="${cfg.playerNames[i] || `Player ${i + 1}`}" 
                         placeholder="Player ${i + 1}" maxlength="16" />
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <!-- 2. Starting Goal Target -->
        <div class="setup-section-card">
          <div class="section-label">
            <span>🎯</span> STARTING COUNTDOWN TARGET
          </div>
          <div class="target-slider-row">
            <div class="target-display-badge">
              <span style="font-size: 14px; font-weight: 700; color: #94a3b8;">Each player starts with:</span>
              <span class="target-number" id="target-val">${cfg.startScore}</span>
            </div>
            <input type="range" class="target-slider" id="target-slider" min="200" max="600" step="25" value="${cfg.startScore}" />
            <div class="target-presets">
              ${[250, 350, 450, 550]
                .map(
                  (val) => `
                <button class="preset-chip ${cfg.startScore === val ? 'active' : ''}" data-preset="${val}">
                  ${val} Goals
                </button>
              `
                )
                .join('')}
              <button class="preset-chip" id="random-target-btn">🎲 Random Roll</button>
            </div>
          </div>
        </div>

        <!-- 3. European Club Selector -->
        <div class="setup-section-card">
          <div class="section-label">
            <span>⚽</span> SELECT POWERHOUSE CLUB
          </div>
          <div class="clubs-grid">
            <div class="club-card-btn ${cfg.clubId === 'random' ? 'active' : ''}" data-club-id="random">
              <div class="club-badge-circle" style="background: linear-gradient(135deg, #F59E0B, #8B5CF6);">🎲</div>
              <span class="club-name-label">Random Club</span>
            </div>
            ${clubs
              .map(
                (club) => `
              <div class="club-card-btn ${cfg.clubId === club.id ? 'active' : ''}" data-club-id="${club.id}">
                <div class="club-badge-circle" style="background: ${club.badgeColor || '#3b82f6'};">
                  ${club.shortName.charAt(0)}
                </div>
                <span class="club-name-label">${club.shortName}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- 4. Match Rules & Timer -->
        <div class="setup-section-card">
          <div class="section-label">
            <span>⚙️</span> MATCH RULES
          </div>
          <div class="settings-options-row">
            <div class="setting-pill-box">
              <div>
                <div style="font-weight: 700;">⏱️ Turn Timer</div>
                <div style="font-size: 12px; color: #94a3b8;">Pressure countdown per turn</div>
              </div>
              <select class="timer-select" id="timer-select">
                <option value="0" ${cfg.timerSec === 0 ? 'selected' : ''}>Off (Casual)</option>
                <option value="15" ${cfg.timerSec === 15 ? 'selected' : ''}>15 Seconds</option>
                <option value="30" ${cfg.timerSec === 30 ? 'selected' : ''}>30 Seconds</option>
                <option value="45" ${cfg.timerSec === 45 ? 'selected' : ''}>45 Seconds</option>
                <option value="60" ${cfg.timerSec === 60 ? 'selected' : ''}>60 Seconds</option>
              </select>
            </div>

            <div class="setting-pill-box">
              <div>
                <div style="font-weight: 700;">🟨 Yellow Card Mode</div>
                <div style="font-size: 12px; color: #94a3b8;">Bust = 🟨, 2nd Bust = Skip Round</div>
              </div>
              <label class="switch">
                <input type="checkbox" id="yellow-cards-toggle" ${cfg.yellowCardsEnabled ? 'checked' : ''}>
                <span class="slider-toggle"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Launch Button -->
        <button class="btn-3d btn-green launch-battle-btn" id="start-match-btn">
          ⚔️ ENTER THE ARENA!
        </button>
      </div>
    `;

    this.bindSetupEvents();
  }

  bindSetupEvents() {
    // Header controls
    document.getElementById('rules-btn')?.addEventListener('click', () => this.showRulesModal());
    document.getElementById('sound-btn')?.addEventListener('click', () => {
      sound.toggleMute();
      this.render(game.state);
    });

    // Player Count tabs
    this.appEl.querySelectorAll('.count-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        game.updateConfig({ playerCount: parseInt(btn.dataset.count, 10) });
      });
    });

    // Player Name inputs
    this.appEl.querySelectorAll('.player-name-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.playerIdx, 10);
        const names = [...game.state.config.playerNames];
        names[idx] = e.target.value;
        game.state.config.playerNames = names;
      });
    });

    // Player Avatar cycle click
    this.appEl.querySelectorAll('.player-avatar-badge').forEach((badge) => {
      badge.addEventListener('click', () => {
        sound.playClick();
        const idx = parseInt(badge.dataset.playerIdx, 10);
        const currentAv = game.state.config.playerAvatars[idx] || 'knight';
        const curIdx = AVATARS.findIndex((a) => a.id === currentAv);
        const nextAv = AVATARS[(curIdx + 1) % AVATARS.length].id;
        const avatars = [...game.state.config.playerAvatars];
        avatars[idx] = nextAv;
        game.updateConfig({ playerAvatars: avatars });
      });
    });

    // Target Slider
    const slider = document.getElementById('target-slider');
    const display = document.getElementById('target-val');
    slider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      display.textContent = val;
      game.state.config.startScore = val;
    });

    // Target Presets
    this.appEl.querySelectorAll('.preset-chip[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sound.playClick();
        const val = parseInt(btn.dataset.preset, 10);
        game.updateConfig({ startScore: val });
      });
    });

    // Random Target Roll
    document.getElementById('random-target-btn')?.addEventListener('click', () => {
      sound.playClick();
      const randScore = Math.floor(Math.random() * (600 - 200 + 1) / 25) * 25 + 200;
      game.updateConfig({ startScore: randScore });
    });

    // Club selection
    this.appEl.querySelectorAll('.club-card-btn').forEach((card) => {
      card.addEventListener('click', () => {
        sound.playClick();
        game.updateConfig({ clubId: card.dataset.clubId });
      });
    });

    // Timer selector
    document.getElementById('timer-select')?.addEventListener('change', (e) => {
      game.updateConfig({ timerSec: parseInt(e.target.value, 10) });
    });

    // Yellow card toggle
    document.getElementById('yellow-cards-toggle')?.addEventListener('change', (e) => {
      game.updateConfig({ yellowCardsEnabled: e.target.checked });
    });

    // Start match button
    document.getElementById('start-match-btn')?.addEventListener('click', () => {
      game.startMatch();
    });
  }

  /* ==========================================================================
     VIEW 2: BATTLE ARENA
     ========================================================================== */
  renderBattle(state) {
    const match = state.match;
    if (!match) return;

    const activePlayer = game.getActivePlayer();
    const club = match.club;

    this.appEl.innerHTML = `
      ${this.renderHeader(state)}

      <div class="battle-arena-container" id="arena-container">
        <!-- Top Banner: Club & Round -->
        <div class="arena-top-banner">
          <div class="active-club-badge">
            <div class="active-club-crest" style="background: ${club.badgeColor || '#1e3a8a'};">
              ${club.shortName.charAt(0)}
            </div>
            <div class="active-club-info">
              <span class="active-club-title">${club.name}</span>
              <span class="active-round-tag">Round ${match.round} · ${club.league}</span>
            </div>
          </div>

          <div style="font-size: 13px; color: #94a3b8; font-weight: 700;">
            Target: <span style="color: #34d399; font-size: 16px;">${match.targetScore}</span>
          </div>
        </div>

        <!-- Player Battle Cards Grid -->
        <div class="players-cards-grid">
          ${match.players
            .map((player, idx) => {
              const isActive = idx === match.activePlayerIndex;
              const avatarObj = AVATARS.find((a) => a.id === player.avatar) || AVATARS[0];
              const pctRemaining = Math.max(0, Math.min(100, (player.score / match.targetScore) * 100));

              return `
              <div class="player-battle-card ${isActive ? 'active-turn' : ''}">
                ${isActive ? '<span class="active-indicator-tag">⚡ ATTACKING</span>' : ''}
                
                <div class="player-card-header">
                  <span class="player-avatar-icon">${avatarObj.emoji}</span>
                  <span class="player-name-heading">${player.name}</span>
                </div>

                <div class="player-score-box">
                  <div class="player-score-digits" id="score-digits-${player.id}">${player.score}</div>
                  <span class="score-goals-label">Goals Remaining</span>
                </div>

                <!-- Elixir Progress Meter -->
                <div class="elixir-meter-track" title="${pctRemaining.toFixed(0)}% remaining">
                  <div class="elixir-meter-fill" style="width: ${pctRemaining}%;"></div>
                </div>

                <!-- Cards Penalties -->
                <div class="card-penalties-row">
                  ${Array.from({ length: player.yellowCards }).map(() => '<span class="yellow-card-pill" title="Yellow Card"></span>').join('')}
                  ${player.suspendedRounds > 0 ? '<span class="red-card-pill" title="Red Card (Suspended)"></span>' : ''}
                </div>
              </div>
            `;
            })
            .join('')}
        </div>

        <!-- Center Battle Command Console -->
        <div class="battle-command-console">
          <div class="console-header-row">
            <div class="turn-banner">
              <span>⚽</span> ${activePlayer?.name}'s Turn:
            </div>

            ${
              match.timerSec > 0
                ? `
              <div class="timer-dial-container">
                <span>⏱️</span>
                <span class="timer-seconds-badge ${match.timeLeft <= 5 ? 'urgent' : ''}">
                  ${match.timeLeft}s
                </span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Autocomplete Search Bar -->
          <div class="search-input-wrapper">
            <input type="text" class="player-search-bar" id="player-search-input"
                   placeholder="Type a footballer who scored for ${club.shortName}..."
                   autocomplete="off" />
            
            <div class="autocomplete-dropdown" id="autocomplete-dropdown" style="display: none;"></div>
          </div>

          <!-- Console Action Buttons -->
          <div class="console-actions-row">
            <button class="btn-3d btn-green action-btn-main" id="submit-player-btn">
              ⚡ PLAY FOOTBALLER
            </button>
            <button class="btn-3d btn-gold action-btn-secondary" id="referee-override-btn" title="Manual Entry for unlisted players">
              ⚖️ Referee Override
            </button>
            <button class="btn-3d btn-wood action-btn-secondary" id="pass-turn-btn" title="Pass your turn">
              ⏭️ Pass Turn
            </button>
          </div>

          <!-- Live Battle Action Ticker -->
          <div class="action-ticker-box" id="action-ticker">
            ${match.lastAction ? match.lastAction.message : `🎯 Enter a ${club.name} scorer to deduct goals!`}
          </div>
        </div>
      </div>
    `;

    this.bindBattleEvents();
  }

  bindBattleEvents() {
    // Header controls
    document.getElementById('rules-btn')?.addEventListener('click', () => this.showRulesModal());
    document.getElementById('sound-btn')?.addEventListener('click', () => {
      sound.toggleMute();
      this.render(game.state);
    });
    document.getElementById('graveyard-btn')?.addEventListener('click', () => this.showGraveyardModal());
    document.getElementById('undo-btn')?.addEventListener('click', () => game.undo());
    document.getElementById('quit-btn')?.addEventListener('click', () => {
      if (confirm('Exit match and return to setup?')) {
        game.resetToSetup();
      }
    });

    // Console controls
    const searchInput = document.getElementById('player-search-input');
    const dropdown = document.getElementById('autocomplete-dropdown');
    const submitBtn = document.getElementById('submit-player-btn');
    const overrideBtn = document.getElementById('referee-override-btn');
    const passBtn = document.getElementById('pass-turn-btn');

    // Auto-focus input
    searchInput?.focus();

    // Autocomplete input logic
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value;
      if (!q || q.trim().length === 0) {
        dropdown.style.display = 'none';
        this.currentSuggestions = [];
        return;
      }

      const results = game.searchPlayers(q);
      this.currentSuggestions = results.slice(0, 8);
      this.selectedAutocompleteIndex = -1;

      if (this.currentSuggestions.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 14px; text-align: center; color: #94a3b8; font-size: 13px;">
            No verified player found for "<strong>${q}</strong>".<br/>
            <button class="btn-3d btn-gold" id="quick-override-btn" style="margin-top: 8px; font-size: 12px; padding: 6px 12px;">
              ⚖️ Enter as Custom Player
            </button>
          </div>
        `;
        dropdown.style.display = 'flex';
        document.getElementById('quick-override-btn')?.addEventListener('click', () => {
          this.showRefereeModal(q);
        });
        return;
      }

      dropdown.innerHTML = this.currentSuggestions
        .map((p, idx) => {
          return `
          <div class="autocomplete-item" data-idx="${idx}">
            <div class="item-player-info">
              <span class="item-player-name">${p.name} ${p.shortName !== p.name ? `(${p.shortName})` : ''}</span>
              <span class="item-player-years">${p.years || 'Official Record'}</span>
            </div>
            <div class="item-select-badge">
              <span>PLAY ⚽</span>
            </div>
          </div>
        `;
        })
        .join('');

      dropdown.style.display = 'flex';

      // Click or touch to pick suggestion
      dropdown.querySelectorAll('.autocomplete-item').forEach((item) => {
        const selectHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(item.dataset.idx, 10);
          if (this.currentSuggestions[idx]) {
            this.pickSuggestion(this.currentSuggestions[idx]);
          }
        };
        item.addEventListener('mousedown', selectHandler);
        item.addEventListener('click', selectHandler);
      });
    });

    // Keyboard navigation in search
    searchInput?.addEventListener('keydown', (e) => {
      const items = dropdown.querySelectorAll('.autocomplete-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedAutocompleteIndex = Math.min(this.selectedAutocompleteIndex + 1, items.length - 1);
        this.updateFocusedItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedAutocompleteIndex = Math.max(this.selectedAutocompleteIndex - 1, 0);
        this.updateFocusedItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedAutocompleteIndex >= 0 && this.currentSuggestions[this.selectedAutocompleteIndex]) {
          this.pickSuggestion(this.currentSuggestions[this.selectedAutocompleteIndex]);
        } else if (this.currentSuggestions.length > 0) {
          this.pickSuggestion(this.currentSuggestions[0]);
        } else if (searchInput.value.trim().length > 0) {
          this.showRefereeModal(searchInput.value.trim());
        }
      }
    });

    // Submit button
    submitBtn?.addEventListener('click', () => {
      const val = searchInput.value.trim();
      if (!val) {
        alert('Please type or select a footballer!');
        return;
      }
      if (this.currentSuggestions.length > 0) {
        this.pickSuggestion(this.currentSuggestions[0]);
      } else {
        this.showRefereeModal(val);
      }
    });

    // Override button
    overrideBtn?.addEventListener('click', () => {
      this.showRefereeModal();
    });

    // Pass turn button
    passBtn?.addEventListener('click', () => {
      sound.playClick();
      game.advanceTurn();
    });
  }

  updateFocusedItem(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('focused', idx === this.selectedAutocompleteIndex);
      if (idx === this.selectedAutocompleteIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  pickSuggestion(playerObj) {
    if (!playerObj) return;

    // Reset search bar and dropdown immediately
    const searchInput = document.getElementById('player-search-input');
    const dropdown = document.getElementById('autocomplete-dropdown');
    if (searchInput) searchInput.value = '';
    if (dropdown) dropdown.style.display = 'none';
    this.currentSuggestions = [];
    this.selectedAutocompleteIndex = -1;

    // Trigger screen shake on big goals (> 100)
    if (playerObj.goals >= 100) {
      const arena = document.getElementById('arena-container');
      arena?.classList.add('shake-screen');
      setTimeout(() => arena?.classList.remove('shake-screen'), 450);
    }

    const res = game.submitPlayer(playerObj);
    if (!res.success && res.error) {
      alert(res.error);
    }
  }

  /* ==========================================================================
     VIEW 3: VICTORY CEREMONY
     ========================================================================== */
  renderVictory(state) {
    const winner = state.match?.winner;
    const match = state.match;
    if (!winner || !match) return;

    const avatarObj = AVATARS.find((a) => a.id === winner.avatar) || AVATARS[0];

    // Calculate match MVP pick (highest goalscorer used)
    let highestScorer = null;
    if (match.usedPlayers.length > 0) {
      highestScorer = [...match.usedPlayers].sort((a, b) => b.goals - a.goals)[0];
    }

    this.appEl.innerHTML = `
      ${this.renderHeader(state)}

      <div class="victory-screen-container">
        <div class="victory-trophy-crown">👑</div>
        <h1 class="victory-heading">VICTORY ROYALE!</h1>

        <div class="winner-champion-card">
          <span class="champion-avatar">${avatarObj.emoji}</span>
          <span class="champion-name">${winner.name} Wins!</span>
        </div>

        <p style="color: #cbd5e1; font-size: 16px;">
          Hit exact <strong>0</strong> in <strong>${match.round} Rounds</strong> playing for <strong>${match.club.name}</strong>!
        </p>

        <!-- Match Stats Highlights -->
        <div style="background: rgba(0,0,0,0.3); border-radius: var(--radius-md); padding: 16px; width: 100%; text-align: left;">
          <div style="font-family: var(--font-arcade); font-size: 16px; color: #38bdf8; margin-bottom: 8px;">
            📊 MATCH HIGHLIGHTS
          </div>
          <div style="font-size: 14px; color: #e2e8f0; line-height: 1.8;">
            • Total Footballers Played: <strong>${match.usedPlayers.length}</strong><br/>
            ${highestScorer ? `• Top Goal Bomb: <strong>${highestScorer.name}</strong> (${highestScorer.goals} goals by ${highestScorer.usedBy})<br/>` : ''}
            • Starting Countdown Target: <strong>${match.targetScore} Goals</strong>
          </div>
        </div>

        <div class="victory-actions">
          <button class="btn-3d btn-green" id="rematch-btn">
            ⚔️ REMATCH (Same Settings)
          </button>
          <button class="btn-3d btn-wood" id="new-game-btn">
            ⚙️ NEW ARENA SETUP
          </button>
        </div>
      </div>
    `;

    document.getElementById('rematch-btn')?.addEventListener('click', () => {
      game.rematch();
    });

    document.getElementById('new-game-btn')?.addEventListener('click', () => {
      game.resetToSetup();
    });

    // Trigger celebratory confetti
    this.launchConfetti();
  }

  /* ==========================================================================
     MODALS
     ========================================================================== */
  showRefereeModal(prefilledName = '') {
    // PAUSE TIMER WHILE REFEREE OVERRIDE IS OPEN
    game.pauseTimer();

    const activePlayer = game.getActivePlayer();
    const club = game.state.match?.club;

    this.modalEl.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal-dialog">
          <button class="modal-close-btn" id="close-modal-x">✕</button>
          <h2 class="modal-title">⚖️ REFEREE OVERRIDE (Timer Paused)</h2>
          <p style="font-size: 13px; color: #94a3b8;">
            Enter a footballer not in the top-50 database for <strong>${club?.name}</strong>.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
            <div>
              <label style="font-size: 13px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px; display: block;">Footballer Name</label>
              <input type="text" class="player-search-bar" id="override-player-name" 
                     value="${prefilledName}" placeholder="e.g. Sergio Ramos" style="padding: 12px 14px; font-size: 16px;" />
            </div>

            <div>
              <label style="font-size: 13px; font-weight: 700; color: #cbd5e1; margin-bottom: 4px; display: block;">Official Club Goals</label>
              <input type="number" class="player-search-bar" id="override-player-goals" 
                     placeholder="e.g. 101" min="1" max="1000" style="padding: 12px 14px; font-size: 16px;" />
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 12px;">
            <button class="btn-3d btn-green" id="confirm-override-btn" style="flex: 2;">
              ✅ Validate & Deduct
            </button>
            <button class="btn-3d btn-wood" id="cancel-override-btn" style="flex: 1;">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => {
      this.modalEl.innerHTML = '';
      // RESUME TIMER IF CANCELLED
      game.resumeTimer();
    };

    document.getElementById('modal-bg')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-bg') close();
    });
    document.getElementById('close-modal-x')?.addEventListener('click', close);
    document.getElementById('cancel-override-btn')?.addEventListener('click', close);

    document.getElementById('confirm-override-btn')?.addEventListener('click', () => {
      const name = document.getElementById('override-player-name').value.trim();
      const goals = parseInt(document.getElementById('override-player-goals').value, 10);

      if (!name || isNaN(goals) || goals <= 0) {
        alert('Please enter a valid footballer name and positive goal count!');
        return;
      }

      this.modalEl.innerHTML = '';
      const res = game.submitRefereeOverride(name, goals);
      if (!res.success && res.error) {
        alert(res.error);
        game.resumeTimer();
      }
    });
  }

  showGraveyardModal() {
    const match = game.state.match;
    if (!match) return;

    this.modalEl.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal-dialog" style="max-width: 600px;">
          <button class="modal-close-btn" id="close-modal-x">✕</button>
          <h2 class="modal-title">⚰️ THE GRAVEYARD (Used Cards)</h2>
          <p style="font-size: 13px; color: #94a3b8;">
            These footballers have already been used this match and cannot be picked again:
          </p>

          <div style="max-height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            ${
              match.usedPlayers.length === 0
                ? '<div style="color: #64748b; text-align: center; padding: 20px;">No footballers used yet.</div>'
                : match.usedPlayers
                    .map(
                      (p) => `
              <div style="background: rgba(0,0,0,0.3); border: 1px solid #334155; border-radius: var(--radius-sm); padding: 8px 14px; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="font-weight: 700; color: #fff;">${p.name}</span>
                  <span style="font-size: 11px; color: #94a3b8; margin-left: 8px;">Used by ${p.usedBy} (Round ${p.round})</span>
                </div>
                <span class="item-goals-pill">⚽ -${p.goals}</span>
              </div>
            `
                    )
                    .join('')
            }
          </div>
        </div>
      </div>
    `;

    const close = () => {
      this.modalEl.innerHTML = '';
    };
    document.getElementById('modal-bg')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-bg') close();
    });
    document.getElementById('close-modal-x')?.addEventListener('click', close);
  }

  showRulesModal() {
    this.modalEl.innerHTML = `
      <div class="modal-backdrop" id="modal-bg">
        <div class="modal-dialog">
          <button class="modal-close-btn" id="close-modal-x">✕</button>
          <h2 class="modal-title">📖 HOW TO PLAY GOAL ROYALE</h2>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
            <div><strong>1. Target Score:</strong> Every player starts with the same countdown target (e.g. 350 goals).</div>
            <div><strong>2. Turn Loop:</strong> On your turn, name a footballer who scored competitive goals for your club. Their official goals are deducted from your score!</div>
            <div><strong>3. Race to EXACT 0:</strong> You must reach exactly zero to win.</div>
            <div><strong>4. Bust Rule:</strong> If you need 5 goals and play someone who scored 10, you BUST! Your turn ends without deduction.</div>
            <div><strong>5. Yellow Card Mode:</strong> In yellow card mode, 1st bust = 🟨. 2nd bust = 🟥 (skip your next turn)!</div>
            <div><strong>6. Single-Use Lockout:</strong> A footballer can only be used ONCE across the whole match.</div>
            <div><strong>7. Referee Override:</strong> If your friend names an obscure player not in the top 50, use the Referee Override to enter their goals manually!</div>
          </div>
          <button class="btn-3d btn-green" id="close-rules-btn" style="margin-top: 10px;">
            GOT IT, LET'S PLAY!
          </button>
        </div>
      </div>
    `;

    const close = () => {
      this.modalEl.innerHTML = '';
    };
    document.getElementById('modal-bg')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-bg') close();
    });
    document.getElementById('close-modal-x')?.addEventListener('click', close);
    document.getElementById('close-rules-btn')?.addEventListener('click', close);
  }

  launchConfetti() {
    // Simple inline canvas confetti
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 90 }).map(() => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      size: Math.random() * 10 + 6,
      color: ['#FFDF00', '#F5A623', '#2ECC71', '#3498DB', '#E056FD', '#E74C3C'][Math.floor(Math.random() * 6)],
      speedY: Math.random() * 4 + 2,
      speedX: Math.random() * 4 - 2,
      angle: Math.random() * 360,
      spin: Math.random() * 8 - 4
    }));

    let animationFrame;
    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.angle += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (pieces.some((p) => p.y < canvas.height)) {
        animationFrame = requestAnimationFrame(renderConfetti);
      } else {
        cancelAnimationFrame(animationFrame);
        canvas.remove();
      }
    };

    renderConfetti();
  }
}

// Bootstrap app on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new GoalRoyaleApp();
});
