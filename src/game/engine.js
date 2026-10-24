/**
 * GoalRoyale - Core Game Engine & State Machine
 */

import clubsData from '../data/clubs.json';
import { sound } from './sound.js';

export const AVATARS = [
  { id: 'knight', emoji: '⚔️', name: 'Knight' },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Wizard' },
  { id: 'king', emoji: '👑', name: 'King' },
  { id: 'archer', emoji: '🏹', name: 'Archer' },
  { id: 'goblin', emoji: '👺', name: 'Goblin' },
  { id: 'dragon', emoji: '🐉', name: 'Dragon' }
];

export class GameEngine {
  constructor() {
    this.clubs = JSON.parse(JSON.stringify(clubsData.clubs));
    this.loadCustomPlayersFromStorage();
    this.listeners = [];

    this.state = {
      view: 'setup', // 'setup' | 'battle' | 'victory'
      config: {
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
        playerAvatars: ['king', 'knight', 'wizard', 'archer'],
        clubId: 'random',
        startScore: 350,
        timerSec: 30,
        yellowCardsEnabled: true
      },
      match: null,
      historyStack: []
    };

    this.timerInterval = null;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  notify(event = { type: 'state_change' }) {
    this.listeners.forEach((cb) => cb(this.state, event));
  }

  updateConfig(partial) {
    this.state.config = { ...this.state.config, ...partial };
    this.notify({ type: 'config_change' });
  }

  startMatch() {
    const { playerCount, playerNames, playerAvatars, clubId, startScore, timerSec, yellowCardsEnabled } = this.state.config;

    // Resolve club
    let selectedClub;
    if (clubId === 'random' || !clubId) {
      const randIdx = Math.floor(Math.random() * this.clubs.length);
      selectedClub = this.clubs[randIdx];
    } else {
      selectedClub = this.clubs.find((c) => c.id === clubId) || this.clubs[0];
    }

    const players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: `p-${i + 1}`,
        name: playerNames[i]?.trim() || `Player ${i + 1}`,
        avatar: playerAvatars[i] || AVATARS[i % AVATARS.length].id,
        score: startScore,
        startScore: startScore,
        yellowCards: 0,
        suspendedRounds: 0,
        turnsCount: 0,
        history: []
      });
    }

    this.state.match = {
      club: selectedClub,
      targetScore: startScore,
      players,
      activePlayerIndex: 0,
      round: 1,
      usedPlayers: [],
      timerSec,
      timeLeft: timerSec,
      timerRunning: timerSec > 0,
      yellowCardsEnabled,
      winner: null,
      lastAction: null // e.g. { type: 'score'|'bust'|'timeout', player, footballer, goals }
    };

    this.state.historyStack = [];
    this.state.view = 'battle';

    sound.playClick();
    this.startTurnTimer();
    this.notify();
  }

  getActivePlayer() {
    if (!this.state.match) return null;
    return this.state.match.players[this.state.match.activePlayerIndex];
  }

  startTurnTimer() {
    this.clearTimer();
    if (!this.state.match || this.state.match.timerSec <= 0) return;

    this.state.match.timeLeft = this.state.match.timerSec;
    this.state.match.timerRunning = true;

    this.timerInterval = setInterval(() => {
      if (!this.state.match || !this.state.match.timerRunning) return;

      this.state.match.timeLeft -= 1;

      if (this.state.match.timeLeft <= 5 && this.state.match.timeLeft > 0) {
        sound.playTick(true);
      } else if (this.state.match.timeLeft > 5 && this.state.match.timeLeft % 5 === 0) {
        sound.playTick(false);
      }

      if (this.state.match.timeLeft <= 0) {
        this.handleTimeout();
      } else {
        this.notify({ type: 'timer_tick' });
      }
    }, 1000);
  }

  pauseTimer() {
    if (this.state.match) {
      this.state.match.timerRunning = false;
      this.notify({ type: 'timer_paused' });
    }
  }

  resumeTimer() {
    if (this.state.match && this.state.match.timerSec > 0 && !this.state.match.winner) {
      this.state.match.timerRunning = true;
      this.notify({ type: 'timer_resumed' });
    }
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeout() {
    this.clearTimer();
    const activePlayer = this.getActivePlayer();
    if (!activePlayer) return;

    sound.playBust();

    let penaltyApplied = false;
    if (this.state.match.yellowCardsEnabled) {
      activePlayer.yellowCards += 1;
      penaltyApplied = true;
      if (activePlayer.yellowCards >= 2) {
        activePlayer.suspendedRounds = 1;
        activePlayer.yellowCards = 0; // Reset after red card penalty
      }
    }

    this.state.match.lastAction = {
      type: 'timeout',
      player: activePlayer.name,
      penalty: penaltyApplied ? (activePlayer.suspendedRounds ? 'red' : 'yellow') : null,
      message: `⏰ Time's up! Turn passed for ${activePlayer.name}.`
    };

    this.saveHistorySnapshot();
    this.advanceTurn();
  }

  saveHistorySnapshot() {
    // Deep clone match state for Undo
    this.state.historyStack.push(JSON.parse(JSON.stringify(this.state.match)));
    if (this.state.historyStack.length > 20) {
      this.state.historyStack.shift();
    }
  }

  undo() {
    if (this.state.historyStack.length === 0) return false;
    const previousState = this.state.historyStack.pop();
    this.state.match = previousState;
    this.state.view = previousState.winner ? 'victory' : 'battle';
    this.startTurnTimer();
    sound.playClick();
    this.notify();
    return true;
  }

  searchPlayers(query) {
    if (!this.state.match || !query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();
    const club = this.state.match.club;
    const usedNames = new Set(this.state.match.usedPlayers.map((p) => p.name.toLowerCase()));

    return club.players.filter((player) => {
      // Check if already used
      if (usedNames.has(player.name.toLowerCase())) return false;

      // Match name, shortName or aliases
      if (player.name.toLowerCase().includes(q)) return true;
      if (player.shortName.toLowerCase().includes(q)) return true;
      if (player.aliases && player.aliases.some((a) => a.toLowerCase().includes(q))) return true;

      return false;
    });
  }

  isPlayerAlreadyUsed(name) {
    if (!this.state.match || !name) return false;
    const check = name.trim().toLowerCase();
    return this.state.match.usedPlayers.some(
      (p) => p.name.toLowerCase() === check || p.shortName?.toLowerCase() === check
    );
  }

  submitPlayer(footballerData) {
    const activePlayer = this.getActivePlayer();
    if (!activePlayer || !this.state.match) return { success: false, error: 'No active match' };

    const { name, shortName, goals } = footballerData;

    // Check if already used in match
    if (this.isPlayerAlreadyUsed(name)) {
      sound.playBust();
      return { success: false, error: `${name} has already been used in this match!` };
    }

    this.saveHistorySnapshot();
    this.clearTimer();

    const currentScore = activePlayer.score;
    const remainingAfterGoals = currentScore - goals;

    // Check for Bust (must reach exact 0)
    if (remainingAfterGoals < 0) {
      sound.playBust();

      let penalty = null;
      if (this.state.match.yellowCardsEnabled) {
        activePlayer.yellowCards += 1;
        if (activePlayer.yellowCards >= 2) {
          activePlayer.suspendedRounds = 1;
          activePlayer.yellowCards = 0; // Cleared on Red Card
          penalty = 'red';
        } else {
          penalty = 'yellow';
        }
      }

      this.state.match.lastAction = {
        type: 'bust',
        player: activePlayer.name,
        footballer: name,
        goals,
        penalty,
        message: `💥 BUST! ${activePlayer.name} needed ${currentScore} but ${name} scored ${goals} goals!`
      };

      this.advanceTurn();
      return { success: true, bust: true, penalty };
    }

    // Success score deduction
    activePlayer.score = remainingAfterGoals;
    activePlayer.turnsCount += 1;
    activePlayer.history.push({
      round: this.state.match.round,
      footballer: name,
      goals,
      scoreAfter: remainingAfterGoals
    });

    // Record into match used deck
    this.state.match.usedPlayers.unshift({
      name,
      shortName: shortName || name,
      goals,
      usedBy: activePlayer.name,
      round: this.state.match.round
    });

    sound.playScoreDeduct(goals);

    this.state.match.lastAction = {
      type: 'score',
      player: activePlayer.name,
      footballer: name,
      goals,
      scoreAfter: remainingAfterGoals,
      message: `⚡ ${activePlayer.name} played ${name} (-${goals} goals)!`
    };

    // Check Victory condition (reached exact 0)
    if (remainingAfterGoals === 0) {
      this.state.match.winner = activePlayer;
      this.state.view = 'victory';
      this.clearTimer();
      sound.playVictory();
      this.notify();
      return { success: true, winner: activePlayer };
    }

    this.advanceTurn();
    return { success: true, bust: false };
  }

  submitRefereeOverride(name, goals) {
    if (!name || isNaN(goals) || goals <= 0) {
      return { success: false, error: 'Enter valid player name and positive goal count' };
    }

    const club = this.state.match?.club;
    const cleanName = name.trim();
    const cleanGoals = parseInt(goals, 10);

    const playerRecord = {
      name: cleanName,
      shortName: cleanName,
      goals: cleanGoals,
      years: 'Verified Record',
      aliases: [cleanName.toLowerCase()]
    };

    // 1. Add to active club in-memory so search and future turns have it immediately
    if (club) {
      const existing = club.players.find(
        (p) => p.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (existing) {
        existing.goals = cleanGoals;
      } else {
        club.players.push(playerRecord);
      }
      club.players.sort((a, b) => b.goals - a.goals);

      // 2. Save in browser localStorage for persistent play across sessions
      this.saveCustomPlayerToStorage(club.id, playerRecord);

      // 3. Persist to server / clubs.json via API endpoint
      try {
        fetch('/api/add-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clubId: club.id, player: playerRecord })
        })
          .then((res) => res.json())
          .then((data) => {
            console.log('Saved to clubs.json:', data);
          })
          .catch((err) => {
            console.warn('Could not persist to server clubs.json:', err);
          });
      } catch (e) {
        console.warn('Fetch failed:', e);
      }
    }

    return this.submitPlayer({
      name: cleanName,
      shortName: cleanName,
      goals: cleanGoals,
      isOverride: true
    });
  }

  async lookupSportApiPlayer(playerName) {
    const club = this.state.match?.club;
    if (!club) return { success: false, error: 'No active match club' };

    try {
      const res = await fetch('/api/sportapi-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, clubId: club.id })
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  advanceTurn() {
    if (!this.state.match) return;

    let nextIdx = (this.state.match.activePlayerIndex + 1) % this.state.match.players.length;

    // If wrapped to 0, increment round
    if (nextIdx === 0) {
      this.state.match.round += 1;
    }

    // Check if next player is suspended by Red Card
    const nextPlayer = this.state.match.players[nextIdx];
    if (nextPlayer.suspendedRounds > 0) {
      nextPlayer.suspendedRounds -= 1;
      this.state.match.activePlayerIndex = nextIdx;
      this.state.match.lastAction = {
        type: 'suspended',
        player: nextPlayer.name,
        message: `🟥 ${nextPlayer.name} is serving a red card suspension! Skipping turn.`
      };
      this.notify();
      // Auto skip to subsequent player after brief delay
      setTimeout(() => {
        this.advanceTurn();
      }, 1500);
      return;
    }

    this.state.match.activePlayerIndex = nextIdx;
    this.startTurnTimer();
    this.notify();
  }

  loadCustomPlayersFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const stored = localStorage.getItem('goalroyale_custom_players');
      if (stored) {
        const customMap = JSON.parse(stored);
        Object.entries(customMap).forEach(([clubId, players]) => {
          const club = this.clubs.find((c) => c.id === clubId);
          if (club && Array.isArray(players)) {
            players.forEach((p) => {
              const existingIdx = club.players.findIndex(
                (x) => x.name.toLowerCase() === p.name.toLowerCase()
              );
              if (existingIdx >= 0) {
                club.players[existingIdx] = { ...club.players[existingIdx], ...p };
              } else {
                club.players.push(p);
              }
            });
            club.players.sort((a, b) => b.goals - a.goals);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  saveCustomPlayerToStorage(clubId, player) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const stored = localStorage.getItem('goalroyale_custom_players');
      const customMap = stored ? JSON.parse(stored) : {};
      if (!customMap[clubId]) customMap[clubId] = [];
      const idx = customMap[clubId].findIndex(
        (p) => p.name.toLowerCase() === player.name.toLowerCase()
      );
      if (idx >= 0) {
        customMap[clubId][idx] = player;
      } else {
        customMap[clubId].push(player);
      }
      localStorage.setItem('goalroyale_custom_players', JSON.stringify(customMap));
    } catch {
      // Ignore storage errors
    }
  }

  resetToSetup() {
    this.clearTimer();
    this.state.view = 'setup';
    this.state.match = null;
    this.state.historyStack = [];
    sound.playClick();
    this.notify();
  }

  rematch() {
    this.clearTimer();
    sound.playClick();
    this.startMatch();
  }
}

export const game = new GameEngine();
