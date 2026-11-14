/**
 * VoxAI - Command Parser & Execution Engine
 * Detects and executes actionable intents from user voice or text input.
 */

class CommandEngine {
  constructor() {
    this.timers = [];
    this.timerIdCounter = 1;
    this.notes = JSON.parse(localStorage.getItem('voxai_notes') || '[]');
  }

  /**
   * Main entrypoint: tests if the prompt matches an actionable voice command.
   * Returns: { handled: boolean, responseText: string, actionTag: string, actionType: string } or null
   */
  process(rawInput) {
    if (!rawInput) return null;
    const input = rawInput.trim();
    const lower = input.toLowerCase();

    // 1. Timer / Countdown Commands
    const timerResult = this.handleTimerCommand(lower, input);
    if (timerResult) return timerResult;

    // 2. Theme Switching Commands
    const themeResult = this.handleThemeCommand(lower);
    if (themeResult) return themeResult;

    // 3. Notes & Tasks Commands
    const noteResult = this.handleNotesCommand(lower, input);
    if (noteResult) return noteResult;

    // 4. Math / Calculation Commands
    const mathResult = this.handleMathCommand(lower);
    if (mathResult) return mathResult;

    // 5. Time and Date Commands
    const timeResult = this.handleTimeCommand(lower);
    if (timeResult) return timeResult;

    // 6. Navigation / Search Commands
    const navResult = this.handleNavCommand(lower);
    if (navResult) return navResult;

    // 7. Voice & System Controls
    const sysResult = this.handleSystemCommand(lower);
    if (sysResult) return sysResult;

    // 8. Fun & Assistant Utilities
    const funResult = this.handleFunCommand(lower);
    if (funResult) return funResult;

    return null; // Not an explicit hard-coded action command; pass to conversational AI engine
  }

  /* ----------------------------------------------------
     TIMER COMMANDS
     ---------------------------------------------------- */
  handleTimerCommand(lower, original) {
    // "cancel timer" / "stop timer"
    if (/(cancel|stop|clear|delete)\s+(all\s+)?timer/i.test(lower)) {
      const count = this.timers.length;
      this.clearAllTimers();
      return {
        handled: true,
        responseText: count > 0 ? `Cleared ${count} active timer(s).` : `There are no active timers to cancel.`,
        actionTag: '⏱️ Timer Cancelled',
        actionType: 'timer'
      };
    }

    // "set a timer for 45 seconds" / "timer 2 minutes" / "set timer for 1 minute and 30 seconds"
    const timerRegex = /(?:set\s+)?(?:a\s+)?timer(?:\s+for)?\s+(.+)/i;
    const match = lower.match(timerRegex);

    if (match) {
      const phrase = match[1];
      let totalSeconds = 0;

      // Check for minutes
      const minMatch = phrase.match(/(\d+)\s*(?:m|min|minute|minutes)/i);
      if (minMatch) {
        totalSeconds += parseInt(minMatch[1], 10) * 60;
      }

      // Check for seconds
      const secMatch = phrase.match(/(\d+)\s*(?:s|sec|second|seconds)/i);
      if (secMatch) {
        totalSeconds += parseInt(secMatch[1], 10);
      }

      // Check for hours
      const hrMatch = phrase.match(/(\d+)\s*(?:h|hr|hour|hours)/i);
      if (hrMatch) {
        totalSeconds += parseInt(hrMatch[1], 10) * 3600;
      }

      // If user just said "timer 30"
      if (totalSeconds === 0) {
        const justNum = phrase.match(/^(\d+)$/);
        if (justNum) {
          totalSeconds = parseInt(justNum[1], 10);
        }
      }

      if (totalSeconds > 0) {
        const label = `Timer for ${this.formatDuration(totalSeconds)}`;
        this.addTimer(totalSeconds, label);
        return {
          handled: true,
          responseText: `Starting a timer for ${this.formatDuration(totalSeconds)}. I will alert you when it rings!`,
          actionTag: `⏱️ Timer: ${this.formatDuration(totalSeconds)}`,
          actionType: 'timer'
        };
      }
    }

    return null;
  }

  addTimer(durationSeconds, label = 'Timer') {
    const timerObj = {
      id: this.timerIdCounter++,
      label,
      totalSeconds: durationSeconds,
      remaining: durationSeconds,
      status: 'running',
      timerInterval: null
    };

    timerObj.timerInterval = setInterval(() => {
      timerObj.remaining--;
      if (timerObj.remaining <= 0) {
        clearInterval(timerObj.timerInterval);
        timerObj.status = 'finished';
        timerObj.remaining = 0;
        window.speechEngine.playChime('alarm');
        window.speechEngine.speak(`Attention: Your ${label} has finished!`);
        if (window.renderTimersList) window.renderTimersList();
      } else {
        if (window.updateTimerDisplay) window.updateTimerDisplay(timerObj.id, timerObj.remaining, timerObj.totalSeconds);
      }
    }, 1000);

    this.timers.unshift(timerObj);
    if (window.renderTimersList) window.renderTimersList();
    return timerObj;
  }

  clearAllTimers() {
    this.timers.forEach(t => clearInterval(t.timerInterval));
    this.timers = [];
    if (window.renderTimersList) window.renderTimersList();
  }

  removeTimer(id) {
    const idx = this.timers.findIndex(t => t.id === id);
    if (idx !== -1) {
      clearInterval(this.timers[idx].timerInterval);
      this.timers.splice(idx, 1);
      if (window.renderTimersList) window.renderTimersList();
    }
  }

  formatDuration(seconds) {
    if (seconds >= 3600) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h} hour${h > 1 ? 's' : ''}${m > 0 ? ` ${m} min` : ''}`;
    }
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m} minute${m > 1 ? 's' : ''}${s > 0 ? ` ${s} sec` : ''}`;
    }
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  /* ----------------------------------------------------
     THEME COMMANDS
     ---------------------------------------------------- */
  handleThemeCommand(lower) {
    const themePattern = /(?:change|switch|set)\s+(?:the\s+)?theme(?:\s+to)?\s+([a-zA-Z\s]+)|theme\s+([a-zA-Z]+)/i;
    const match = lower.match(themePattern);

    if (match) {
      const requested = (match[1] || match[2] || '').trim().toLowerCase();
      let targetTheme = null;

      if (requested.includes('cyber') || requested.includes('neon') || requested.includes('matrix')) {
        targetTheme = 'cyberpunk';
      } else if (requested.includes('emerald') || requested.includes('green')) {
        targetTheme = 'emerald';
      } else if (requested.includes('sunset') || requested.includes('orange') || requested.includes('amber')) {
        targetTheme = 'sunset';
      } else if (requested.includes('light') || requested.includes('white') || requested.includes('day')) {
        targetTheme = 'light';
      } else if (requested.includes('midnight') || requested.includes('dark') || requested.includes('night') || requested.includes('default')) {
        targetTheme = 'midnight';
      }

      if (targetTheme) {
        document.documentElement.setAttribute('data-theme', targetTheme);
        const select = document.getElementById('themeSelect');
        if (select) select.value = targetTheme;
        localStorage.setItem('voxai_theme', targetTheme);

        return {
          handled: true,
          responseText: `Applied the ${targetTheme.toUpperCase()} theme for you.`,
          actionTag: `🎨 Theme: ${targetTheme}`,
          actionType: 'theme'
        };
      }
    }
    return null;
  }

  /* ----------------------------------------------------
     NOTES & TASKS COMMANDS
     ---------------------------------------------------- */
  handleNotesCommand(lower, original) {
    // "clear notes"
    if (/(clear|delete|remove)\s+(all\s+)?(?:notes|tasks)/i.test(lower)) {
      const count = this.notes.length;
      this.notes = [];
      localStorage.setItem('voxai_notes', JSON.stringify(this.notes));
      if (window.renderNotesList) window.renderNotesList();
      return {
        handled: true,
        responseText: `Cleared all ${count} voice notes.`,
        actionTag: '📝 Notes Cleared',
        actionType: 'note'
      };
    }

    // "take a note: buy groceries" / "add note finish presentation" / "add task buy coffee"
    const notePattern = /(?:take\s+a\s+note|note|add\s+note|take\s+note|add\s+task|remember|write\s+down)[:\s]+(.+)/i;
    const match = original.match(notePattern);

    if (match && match[1]) {
      const content = match[1].trim();
      if (content.length > 0) {
        const newNote = {
          id: Date.now(),
          text: content,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.notes.unshift(newNote);
        localStorage.setItem('voxai_notes', JSON.stringify(this.notes));
        if (window.renderNotesList) window.renderNotesList();

        return {
          handled: true,
          responseText: `Saved note: "${content}" to your task board.`,
          actionTag: '📝 Note Saved',
          actionType: 'note'
        };
      }
    }

    return null;
  }

  deleteNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    localStorage.setItem('voxai_notes', JSON.stringify(this.notes));
    if (window.renderNotesList) window.renderNotesList();
  }

  /* ----------------------------------------------------
     MATH & CALCULATION COMMANDS
     ---------------------------------------------------- */
  handleMathCommand(lower) {
    // Check if starts with calculate or math questions
    const isCalc = /(?:calculate|what\s+is|what's|how\s+much\s+is|compute|solve)\s+(.+)/i.test(lower);
    if (!isCalc) return null;

    const query = lower.replace(/(?:calculate|what\s+is|what's|how\s+much\s+is|compute|solve)/i, '').trim();

    // 15% tip on 84 dollars
    const tipMatch = query.match(/(\d+(?:\.\d+)?)\s*%\s*(?:tip\s+(?:on|for))\s*(?:\$)?(\d+(?:\.\d+)?)/i) ||
                     query.match(/(\d+(?:\.\d+)?)\s*percent\s*(?:tip\s+(?:on|for))\s*(?:\$)?(\d+(?:\.\d+)?)/i);
    if (tipMatch) {
      const pct = parseFloat(tipMatch[1]);
      const base = parseFloat(tipMatch[2]);
      const tipAmount = (pct / 100) * base;
      const total = base + tipAmount;
      return {
        handled: true,
        responseText: `A ${pct}% tip on $${base.toFixed(2)} is $${tipAmount.toFixed(2)}, making the total $${total.toFixed(2)}.`,
        actionTag: `🧮 Tip: $${tipAmount.toFixed(2)} (Total: $${total.toFixed(2)})`,
        actionType: 'math'
      };
    }

    // 25% of 800
    const pctMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)/i);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      const val = parseFloat(pctMatch[2]);
      const result = (pct / 100) * val;
      return {
        handled: true,
        responseText: `${pct}% of ${val} is ${result}.`,
        actionTag: `🧮 ${pct}% of ${val} = ${result}`,
        actionType: 'math'
      };
    }

    // Square root of 144
    const sqrtMatch = query.match(/(?:square\s+root\s+of|sqrt)\s+(\d+(?:\.\d+)?)/i);
    if (sqrtMatch) {
      const val = parseFloat(sqrtMatch[1]);
      const result = Math.sqrt(val);
      return {
        handled: true,
        responseText: `The square root of ${val} is ${result}.`,
        actionTag: `🧮 √${val} = ${result}`,
        actionType: 'math'
      };
    }

    // Basic arithmetic expression: replace "times", "multiplied by", "divided by", "plus", "minus", "to the power of"
    let cleanExpr = query
      .replace(/times|multiplied\s+by|x/gi, '*')
      .replace(/divided\s+by|over/gi, '/')
      .replace(/plus|add/gi, '+')
      .replace(/minus|subtract/gi, '-')
      .replace(/to\s+the\s+power\s+of|\^/gi, '**');

    // Only allow safe math characters: digits, ., +, -, *, /, (, ), spaces
    if (/^[0-9\.\+\-\*\/\(\)\s\*\*\^]+$/.test(cleanExpr) && /[0-9]/.test(cleanExpr)) {
      try {
        // Safe evaluation function using Function constructor restricted to math
        const safeEval = new Function(`'use strict'; return (${cleanExpr})`);
        const result = safeEval();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          const rounded = Math.round(result * 100000) / 100000;
          return {
            handled: true,
            responseText: `The calculation result is ${rounded}.`,
            actionTag: `🧮 ${cleanExpr} = ${rounded}`,
            actionType: 'math'
          };
        }
      } catch (e) {
        // Not a pure arithmetic expression, continue to AI
      }
    }

    return null;
  }

  /* ----------------------------------------------------
     TIME & DATE COMMANDS
     ---------------------------------------------------- */
  handleTimeCommand(lower) {
    if (/(what\s+time\s+is\s+it|current\s+time|what's\s+the\s+time|tell\s+me\s+the\s+time)/i.test(lower)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      return {
        handled: true,
        responseText: `The current time is ${timeStr}.`,
        actionTag: `🕒 Time: ${timeStr}`,
        actionType: 'time'
      };
    }

    if (/(what\s+is\s+today's\s+date|what's\s+the\s+date|what\s+date\s+is\s+it|today's\s+date|what\s+day\s+is\s+it)/i.test(lower)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        handled: true,
        responseText: `Today is ${dateStr}.`,
        actionTag: `📅 Date: ${dateStr}`,
        actionType: 'time'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     NAVIGATION & WEB SEARCH COMMANDS
     ---------------------------------------------------- */
  handleNavCommand(lower) {
    // "open youtube" / "open google" / "open github" / "open wikipedia"
    const openMatch = lower.match(/(?:open|go\s+to|launch)\s+(youtube|google|github|wikipedia|reddit|twitter|x)/i);
    if (openMatch) {
      const site = openMatch[1].toLowerCase();
      const urls = {
        youtube: 'https://www.youtube.com',
        google: 'https://www.google.com',
        github: 'https://www.github.com',
        wikipedia: 'https://www.wikipedia.org',
        reddit: 'https://www.reddit.com',
        twitter: 'https://twitter.com',
        x: 'https://x.com'
      };
      const url = urls[site];
      if (url) {
        window.open(url, '_blank');
        return {
          handled: true,
          responseText: `Opening ${site.toUpperCase()} in a new tab for you.`,
          actionTag: `🌐 Navigating: ${site.toUpperCase()}`,
          actionType: 'nav'
        };
      }
    }

    // "search for [topic]" / "google [topic]"
    const searchMatch = lower.match(/(?:search\s+for|search|google|look\s+up)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.open(searchUrl, '_blank');
      return {
        handled: true,
        responseText: `Searching Google for "${query}". Opening search results in a new tab.`,
        actionTag: `🔍 Search: "${query}"`,
        actionType: 'search'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     SYSTEM & VOICE SETTINGS COMMANDS
     ---------------------------------------------------- */
  handleSystemCommand(lower) {
    // "stop talking" / "shut up" / "be quiet" / "stop speaking"
    if (/(stop\s+talking|stop\s+speaking|be\s+quiet|shut\s+up|silence|pause\s+voice)/i.test(lower)) {
      window.speechEngine.stopSpeaking();
      return {
        handled: true,
        responseText: `Understood, silenced audio output.`,
        actionTag: '🔇 Audio Silenced',
        actionType: 'system'
      };
    }

    // "mute voice" / "turn off voice"
    if (/(mute\s+voice|turn\s+off\s+voice|disable\s+voice|mute\s+audio)/i.test(lower)) {
      window.speechEngine.ttsEnabled = false;
      const ttsBtn = document.getElementById('ttsToggleBtn');
      if (ttsBtn) {
        ttsBtn.classList.remove('active');
        ttsBtn.querySelector('.btn-label').textContent = 'Voice: OFF';
      }
      return {
        handled: true,
        responseText: `Voice output has been muted. I will now respond in text only.`,
        actionTag: '🔇 Voice Muted',
        actionType: 'system'
      };
    }

    // "unmute voice" / "turn on voice"
    if (/(unmute\s+voice|turn\s+on\s+voice|enable\s+voice|enable\s+audio)/i.test(lower)) {
      window.speechEngine.ttsEnabled = true;
      const ttsBtn = document.getElementById('ttsToggleBtn');
      if (ttsBtn) {
        ttsBtn.classList.add('active');
        ttsBtn.querySelector('.btn-label').textContent = 'Voice: ON';
      }
      return {
        handled: true,
        responseText: `Voice output is now enabled. I will speak responses aloud.`,
        actionTag: '🔊 Voice Enabled',
        actionType: 'system'
      };
    }

    // "clear chat" / "clear screen" / "reset conversation"
    if (/(clear\s+chat|clear\s+screen|reset\s+chat|clear\s+transcript|new\s+conversation)/i.test(lower)) {
      if (window.clearSessionChat) {
        window.clearSessionChat();
      }
      return {
        handled: true,
        responseText: `Chat history and transcript have been cleared.`,
        actionTag: '🧹 Chat Cleared',
        actionType: 'system'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     FUN & ASSISTANT COMMANDS
     ---------------------------------------------------- */
  handleFunCommand(lower) {
    // "tell me a joke"
    if (/(tell\s+me\s+a\s+joke|make\s+me\s+laugh|say\s+something\s+funny)/i.test(lower)) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs!",
        "Why did the JavaScript developer wear glasses? Because they didn't C#!",
        "There are 10 types of people in the world: those who understand binary, and those who don't.",
        "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
        "Why do Java programmers wear glasses? Because they don't see sharp!",
        "An optimist sees the glass half full. A pessimist sees it half empty. An engineer sees the glass as twice as big as it needs to be."
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        handled: true,
        responseText: joke,
        actionTag: '😂 Joke of the Day',
        actionType: 'fun'
      };
    }

    // "tell me a fun fact"
    if (/(tell\s+me\s+a\s+(?:fun\s+)?fact|give\s+me\s+a\s+fact|interesting\s+fact)/i.test(lower)) {
      const facts = [
        "The first computer mouse was invented in 1964 by Doug Engelbart and was made of wood!",
        "The Apollo 11 lunar module guidance computer had just 4 kilobytes of RAM.",
        "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs over 3,000 years old that are still edible!",
        "Octopuses have three hearts, nine brains, and blue blood.",
        "The first computer bug was an actual real moth stuck inside the Harvard Mark II computer in 1947."
      ];
      const fact = facts[Math.floor(Math.random() * facts.length)];
      return {
        handled: true,
        responseText: fact,
        actionTag: '💡 Fun Fact',
        actionType: 'fun'
      };
    }

    // "give me an inspirational quote"
    if (/(inspirational\s+quote|quote\s+of\s+the\s+day|inspire\s+me|motivate\s+me)/i.test(lower)) {
      const quotes = [
        `"The only way to do great work is to love what you do." — Steve Jobs`,
        `"It always seems impossible until it's done." — Nelson Mandela`,
        `"Code is like humor. When you have to explain it, it’s bad." — Cory House`,
        `"Simplicity is prerequisite for reliability." — Edsger W. Dijkstra`,
        `"The best way to predict the future is to invent it." — Alan Kay`
      ];
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      return {
        handled: true,
        responseText: quote,
        actionTag: '✨ Inspiration',
        actionType: 'fun'
      };
    }

    // "give me a hackathon project idea"
    if (/(hackathon\s+(?:project\s+)?idea|project\s+idea|give\s+me\s+an\s+idea)/i.test(lower)) {
      const ideas = [
        "An AI Meeting Summarizer that generates actionable Jira cards and notes from microphone audio in real time.",
        "An accessible hands-free Voice Navigation browser extension for motor-impaired developers.",
        "An AI Audio Co-pilot that listens to pair programming conversations and pulls up relevant docs and code snippets.",
        "A smart interactive ambient soundscape that adapts tempo and frequencies to your heart rate and typing cadence."
      ];
      const idea = ideas[Math.floor(Math.random() * ideas.length)];
      return {
        handled: true,
        responseText: idea,
        actionTag: '🚀 Hackathon Idea',
        actionType: 'fun'
      };
    }

    // "flip a coin"
    if (/(flip\s+a\s+coin|heads\s+or\s+tails)/i.test(lower)) {
      const outcome = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return {
        handled: true,
        responseText: `I flipped a coin and it landed on: ${outcome}!`,
        actionTag: `🪙 Coin Toss: ${outcome}`,
        actionType: 'fun'
      };
    }

    // "roll a die"
    if (/(roll\s+a\s+die|roll\s+dice)/i.test(lower)) {
      const roll = Math.floor(Math.random() * 6) + 1;
      return {
        handled: true,
        responseText: `You rolled a ${roll}! 🎲`,
        actionTag: `🎲 Rolled: ${roll}`,
        actionType: 'fun'
      };
    }

    return null;
  }
}

// Global instance
window.commandEngine = new CommandEngine();
