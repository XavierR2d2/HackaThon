/**
 * J.A.R.V.I.S. - Command Parser & Execution Engine
 * Tailored for Applied Materials. Speaks with the sophisticated British cadence and wit of J.A.R.V.I.S.
 */

class CommandEngine {
  constructor() {
    this.timers = [];
    this.timerIdCounter = 1;
    this.notes = JSON.parse(localStorage.getItem('voxai_notes') || '[]');
  }

  getName() {
    return window.getAssistantName ? window.getAssistantName() : (localStorage.getItem('amat_assistant_name') || 'J.A.R.V.I.S.');
  }

  /**
   * Main entrypoint: tests if the prompt matches an actionable voice command.
   * Returns: { handled: boolean, responseText: string, actionTag: string, actionType: string } or null
   */
  process(rawInput) {
    if (!rawInput) return null;
    const input = rawInput.trim();
    const lower = input.toLowerCase();

    // 0. Name Change & Identity Protocols
    const nameResult = this.handleNameCommand(lower, input);
    if (nameResult) return nameResult;

    // 1. Applied Materials Telemetry & Status
    const amatResult = this.handleAppliedMaterialsCommand(lower);
    if (amatResult) return amatResult;

    // 2. Timer / Countdown Commands
    const timerResult = this.handleTimerCommand(lower, input);
    if (timerResult) return timerResult;

    // 3. Theme Switching Commands
    const themeResult = this.handleThemeCommand(lower);
    if (themeResult) return themeResult;

    // 4. Notes & Tasks Commands
    const noteResult = this.handleNotesCommand(lower, input);
    if (noteResult) return noteResult;

    // 5. Math / Calculation Commands
    const mathResult = this.handleMathCommand(lower);
    if (mathResult) return mathResult;

    // 6. Time and Date Commands
    const timeResult = this.handleTimeCommand(lower);
    if (timeResult) return timeResult;

    // 7. Navigation / Search Commands
    const navResult = this.handleNavCommand(lower);
    if (navResult) return navResult;

    // 8. Voice & System Controls
    const sysResult = this.handleSystemCommand(lower);
    if (sysResult) return sysResult;

    // 9. Fun & Assistant Utilities
    const funResult = this.handleFunCommand(lower);
    if (funResult) return funResult;

    return null; // Delegate to conversational AI engine
  }

  /* ----------------------------------------------------
     NAME CHANGE & IDENTITY COMMANDS
     ---------------------------------------------------- */
  handleNameCommand(lower, original) {
    // "change your name to Friday" / "call yourself Jarvis" / "rename yourself to Edith"
    const renamePattern = /(?:change\s+(?:your\s+)?name\s+to|call\s+yourself|rename\s+(?:yourself\s+)?to|your\s+name\s+is\s+now|set\s+(?:your\s+)?name\s+to)\s+([a-zA-Z0-9\.\-\_\s]+)/i;
    const match = original.match(renamePattern);

    if (match && match[1]) {
      const newName = match[1].trim();
      if (newName.length > 0) {
        if (window.setAssistantName) {
          window.setAssistantName(newName);
        }
        return {
          handled: true,
          responseText: `As you wish, sir. Protocol updated. I shall now respond to the designation ${newName}.`,
          actionTag: `🏷️ Designation: ${newName}`,
          actionType: 'system'
        };
      }
    }

    // "what is your name" / "who are you"
    if (/(what\s+is\s+your\s+name|who\s+are\s+you|identify\s+yourself)/i.test(lower)) {
      const currentName = this.getName();
      return {
        handled: true,
        responseText: `I am ${currentName}, the artificial intelligence interface for Applied Materials. At your service, sir.`,
        actionTag: `🤖 System: ${currentName}`,
        actionType: 'system'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     APPLIED MATERIALS SPECIFIC TELEMETRY COMMANDS
     ---------------------------------------------------- */
  handleAppliedMaterialsCommand(lower) {
    if (/(status\s+report|telemetry\s+report|systems\s+status|cleanroom\s+status|diagnostics)/i.test(lower)) {
      return {
        handled: true,
        responseText: `All Applied Materials fabrication chambers, vacuum levels, and cleanroom atmospheric sensors are operating within optimal tolerances, sir. Uptime is at 99.99%.`,
        actionTag: `📊 Telemetry: Nominal`,
        actionType: 'amat'
      };
    }

    if (/(what\s+is\s+applied\s+materials|about\s+applied\s+materials|tell\s+me\s+about\s+applied\s+materials)/i.test(lower)) {
      return {
        handled: true,
        responseText: `Applied Materials is the global leader in materials engineering solutions used to produce virtually every new semiconductor chip and advanced display in the world. Our tools specialize in atomic layer deposition, chemical vapor deposition, etch, and planarization.`,
        actionTag: `🔬 Applied Materials Profile`,
        actionType: 'amat'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     TIMER COMMANDS & CONTINUOUS ALARM LOOP
     ---------------------------------------------------- */
  handleTimerCommand(lower, original) {
    // "acknowledge alarm" / "stop alarm" / "silence alarm" / "dismiss alarm" / "turn off alarm"
    if (/(acknowledge|stop\s+alarm|silence|turn\s+off\s+alarm|dismiss\s+alarm|cancel\s+alarm|quiet|hush)/i.test(lower)) {
      const acked = this.acknowledgeAlarm();
      if (acked) {
        return {
          handled: true,
          responseText: `Alarm acknowledged and silenced, sir. Standing by.`,
          actionTag: '🔔 Alarm Acknowledged',
          actionType: 'timer'
        };
      }
    }

    // "cancel timer" / "stop timer"
    if (/(cancel|stop|clear|delete)\s+(all\s+)?timer/i.test(lower)) {
      const count = this.timers.length;
      this.clearAllTimers();
      return {
        handled: true,
        responseText: count > 0 ? `Cleared all active countdown protocols, sir. Total timers purged: ${count}.` : `There are no active countdown protocols running at this time, sir.`,
        actionTag: '⏱️ Timer Purged',
        actionType: 'timer'
      };
    }

    // "set a timer for 45 seconds" / "timer 2 minutes" / "set timer for 1 minute and 30 seconds"
    const timerRegex = /(?:set\s+)?(?:a\s+)?timer(?:\s+for)?\s+(.+)/i;
    const match = lower.match(timerRegex);

    if (match) {
      const phrase = match[1];
      let totalSeconds = 0;

      const minMatch = phrase.match(/(\d+)\s*(?:m|min|minute|minutes)/i);
      if (minMatch) totalSeconds += parseInt(minMatch[1], 10) * 60;

      const secMatch = phrase.match(/(\d+)\s*(?:s|sec|second|seconds)/i);
      if (secMatch) totalSeconds += parseInt(secMatch[1], 10);

      const hrMatch = phrase.match(/(\d+)\s*(?:h|hr|hour|hours)/i);
      if (hrMatch) totalSeconds += parseInt(hrMatch[1], 10) * 3600;

      if (totalSeconds === 0) {
        const justNum = phrase.match(/^(\d+)$/);
        if (justNum) totalSeconds += parseInt(justNum[1], 10);
      }

      if (totalSeconds > 0) {
        const label = `Fabrication Countdown (${this.formatDuration(totalSeconds)})`;
        this.addTimer(totalSeconds, label);
        return {
          handled: true,
          responseText: `Right away, sir. Initiating countdown for ${this.formatDuration(totalSeconds)}. I shall alert you upon completion.`,
          actionTag: `⏱️ Countdown: ${this.formatDuration(totalSeconds)}`,
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
        
        // Loop alarm continuously until acknowledged
        if (window.speechEngine && window.speechEngine.startAlarm) {
          window.speechEngine.startAlarm();
        }
        window.speechEngine.speak(`Sir, your countdown for ${label} has completed. Acknowledgment required.`);
        if (window.renderTimersList) window.renderTimersList();
      } else {
        if (window.updateTimerDisplay) window.updateTimerDisplay(timerObj.id, timerObj.remaining, timerObj.totalSeconds);
      }
    }, 1000);

    this.timers.unshift(timerObj);
    if (window.renderTimersList) window.renderTimersList();
    return timerObj;
  }

  /**
   * Acknowledges all ringing/finished timers and silences the continuous alarm loop
   */
  acknowledgeAlarm() {
    const finishedTimers = this.timers.filter(t => t.status === 'finished');
    if (finishedTimers.length > 0) {
      this.timers = this.timers.filter(t => t.status !== 'finished');
      if (window.speechEngine && window.speechEngine.stopAlarm) {
        window.speechEngine.stopAlarm();
      }
      if (window.renderTimersList) window.renderTimersList();
      return true;
    }
    return false;
  }

  clearAllTimers() {
    this.timers.forEach(t => clearInterval(t.timerInterval));
    this.timers = [];
    if (window.speechEngine && window.speechEngine.stopAlarm) {
      window.speechEngine.stopAlarm();
    }
    if (window.renderTimersList) window.renderTimersList();
  }

  removeTimer(id) {
    const idx = this.timers.findIndex(t => t.id === id);
    if (idx !== -1) {
      clearInterval(this.timers[idx].timerInterval);
      this.timers.splice(idx, 1);
      // Check if any finished alarms remain
      const hasRinging = this.timers.some(t => t.status === 'finished');
      if (!hasRinging && window.speechEngine && window.speechEngine.stopAlarm) {
        window.speechEngine.stopAlarm();
      }
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
     THEME COMMANDS (STARK ARC HUD, DARK, LIGHT)
     ---------------------------------------------------- */
  handleThemeCommand(lower) {
    const themePattern = /(?:change|switch|set)\s+(?:the\s+)?(?:theme|visuals|hud|interface)(?:\s+to)?\s+([a-zA-Z\s]+)|theme\s+([a-zA-Z]+)/i;
    const match = lower.match(themePattern);

    if (match) {
      const requested = (match[1] || match[2] || '').trim().toLowerCase();
      let targetTheme = null;
      let displayName = '';

      if (requested.includes('stark') || requested.includes('arc') || requested.includes('reactor') || requested.includes('iron man') || requested.includes('tony') || requested.includes('cyan') || requested.includes('blue')) {
        targetTheme = 'stark';
        displayName = 'Stark Arc HUD';
      } else if (requested.includes('dark') || requested.includes('night') || requested.includes('stealth') || requested.includes('black') || requested.includes('midnight')) {
        targetTheme = 'dark';
        displayName = 'Default Dark HUD';
      } else if (requested.includes('light') || requested.includes('cleanroom') || requested.includes('white') || requested.includes('day')) {
        targetTheme = 'light';
        displayName = 'Default Light HUD';
      }

      if (targetTheme) {
        document.documentElement.setAttribute('data-theme', targetTheme);
        const select = document.getElementById('themeSelect');
        if (select) select.value = targetTheme;
        localStorage.setItem('voxai_theme', targetTheme);

        return {
          handled: true,
          responseText: `Reconfiguring visual interface to the ${displayName} protocol, sir.`,
          actionTag: `⚡ Protocol: ${displayName}`,
          actionType: 'theme'
        };
      } else {
        return {
          handled: true,
          responseText: `Visual protocols available are: Stark Arc HUD, Default Dark HUD, and Default Light HUD, sir. Which protocol would you prefer?`,
          actionTag: `⚡ Available HUDs`,
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
    if (/(clear|delete|purge)\s+(all\s+)?(?:notes|tasks|logs)/i.test(lower)) {
      const count = this.notes.length;
      this.notes = [];
      localStorage.setItem('voxai_notes', JSON.stringify(this.notes));
      if (window.renderNotesList) window.renderNotesList();
      return {
        handled: true,
        responseText: `Purged all ${count} entries from the engineering registry, sir.`,
        actionTag: '📝 Log Purged',
        actionType: 'note'
      };
    }

    const notePattern = /(?:take\s+a\s+note|note|add\s+note|take\s+note|add\s+task|remember|log)[:\s]+(.+)/i;
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
          responseText: `Logged into Applied Materials engineering records, sir: "${content}".`,
          actionTag: '📝 Logged to Registry',
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
    const isCalc = /(?:calculate|what\s+is|what's|compute|solve|area\s+of)\s+(.+)/i.test(lower);
    if (!isCalc) return null;

    // Special: 300mm wafer area
    if (/300\s*(?:mm|millimeter)\s*wafer/i.test(lower)) {
      // Radius = 15 cm. Area = pi * 15^2 = ~706.86 cm^2
      const area = Math.PI * 15 * 15;
      return {
        handled: true,
        responseText: `A standard 300 millimeter semiconductor wafer has a surface area of approximately ${area.toFixed(2)} square centimeters, or roughly 70,686 square millimeters, sir.`,
        actionTag: `🧮 300mm Wafer: ~706.86 cm²`,
        actionType: 'math'
      };
    }

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
        responseText: `A ${pct}% tip on $${base.toFixed(2)} is $${tipAmount.toFixed(2)}, bringing the total to $${total.toFixed(2)}, sir.`,
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
        responseText: `${pct}% of ${val} is ${result}, sir.`,
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
        responseText: `The square root of ${val} is precisely ${result}, sir.`,
        actionTag: `🧮 √${val} = ${result}`,
        actionType: 'math'
      };
    }

    // Basic arithmetic expression
    let cleanExpr = query
      .replace(/times|multiplied\s+by|x/gi, '*')
      .replace(/divided\s+by|over/gi, '/')
      .replace(/plus|add/gi, '+')
      .replace(/minus|subtract/gi, '-')
      .replace(/to\s+the\s+power\s+of|\^/gi, '**');

    if (/^[0-9\.\+\-\*\/\(\)\s\*\*\^]+$/.test(cleanExpr) && /[0-9]/.test(cleanExpr)) {
      try {
        const safeEval = new Function(`'use strict'; return (${cleanExpr})`);
        const result = safeEval();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          const rounded = Math.round(result * 100000) / 100000;
          return {
            handled: true,
            responseText: `Computing now, sir. The result is ${rounded}.`,
            actionTag: `🧮 ${cleanExpr} = ${rounded}`,
            actionType: 'math'
          };
        }
      } catch (e) {
        // Continue to AI
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
        responseText: `It is currently ${timeStr}, sir.`,
        actionTag: `🕒 Chrono: ${timeStr}`,
        actionType: 'time'
      };
    }

    if (/(what\s+is\s+today's\s+date|what's\s+the\s+date|what\s+date\s+is\s+it|today's\s+date|what\s+day\s+is\s+it)/i.test(lower)) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        handled: true,
        responseText: `Today is ${dateStr}, sir.`,
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
    const openMatch = lower.match(/(?:open|go\s+to|launch)\s+(youtube|google|github|wikipedia|reddit|twitter|x|applied\s+materials)/i);
    if (openMatch) {
      const site = openMatch[1].toLowerCase().replace(/\s+/g, '');
      const urls = {
        youtube: 'https://www.youtube.com',
        google: 'https://www.google.com',
        github: 'https://www.github.com',
        wikipedia: 'https://www.wikipedia.org',
        reddit: 'https://www.reddit.com',
        twitter: 'https://twitter.com',
        x: 'https://x.com',
        appliedmaterials: 'https://www.appliedmaterials.com'
      };
      const url = urls[site];
      if (url) {
        window.open(url, '_blank');
        return {
          handled: true,
          responseText: `Opening ${openMatch[1].toUpperCase()} for you now, sir.`,
          actionTag: `🌐 Navigating: ${openMatch[1].toUpperCase()}`,
          actionType: 'nav'
        };
      }
    }

    const searchMatch = lower.match(/(?:search\s+for|search|google|look\s+up)\s+(.+)/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      window.open(searchUrl, '_blank');
      return {
        handled: true,
        responseText: `Running search telemetry for "${query}", sir. Displaying results in a separate tab.`,
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
    if (/(stop\s+talking|stop\s+speaking|be\s+quiet|shut\s+up|silence|pause\s+voice)/i.test(lower)) {
      window.speechEngine.stopSpeaking();
      return {
        handled: true,
        responseText: `Standing by in silent protocol, sir.`,
        actionTag: '🔇 Audio Silenced',
        actionType: 'system'
      };
    }

    if (/(mute\s+voice|turn\s+off\s+voice|disable\s+voice|mute\s+audio)/i.test(lower)) {
      window.speechEngine.ttsEnabled = false;
      const ttsBtn = document.getElementById('ttsToggleBtn');
      if (ttsBtn) {
        ttsBtn.classList.remove('active');
        ttsBtn.querySelector('.btn-label').textContent = 'Vocal: OFF';
      }
      return {
        handled: true,
        responseText: `Vocal synthesis module disabled, sir. Proceeding with visual telemetry only.`,
        actionTag: '🔇 Vocal Muted',
        actionType: 'system'
      };
    }

    if (/(unmute\s+voice|turn\s+on\s+voice|enable\s+voice|enable\s+audio)/i.test(lower)) {
      window.speechEngine.ttsEnabled = true;
      const ttsBtn = document.getElementById('ttsToggleBtn');
      if (ttsBtn) {
        ttsBtn.classList.add('active');
        ttsBtn.querySelector('.btn-label').textContent = 'Vocal: ON';
      }
      return {
        handled: true,
        responseText: `Vocal synthesis module restored, sir.`,
        actionTag: '🔊 Vocal Enabled',
        actionType: 'system'
      };
    }

    if (/(clear\s+chat|clear\s+screen|reset\s+chat|clear\s+transcript|purge\s+log)/i.test(lower)) {
      if (window.clearSessionChat) {
        window.clearSessionChat();
      }
      return {
        handled: true,
        responseText: `Session transcript purged, sir. Registers cleared.`,
        actionTag: '🧹 Log Purged',
        actionType: 'system'
      };
    }

    return null;
  }

  /* ----------------------------------------------------
     FUN & ASSISTANT COMMANDS
     ---------------------------------------------------- */
  handleFunCommand(lower) {
    if (/(tell\s+me\s+a\s+joke|make\s+me\s+laugh|say\s+something\s+funny)/i.test(lower)) {
      const jokes = [
        "A photon checks into a hotel and is asked if it has any luggage. It replies: 'No, I'm traveling light.'",
        "Why did the semiconductor go to school? To improve its micro-architecture.",
        "There are 10 types of people in the world, sir: those who understand binary, and those who do not.",
        "Why do programmers prefer dark mode? Because light attracts bugs, and our cleanrooms cannot tolerate contaminants.",
        "A quantum physicist walks into a bar... or did they?"
      ];
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return {
        handled: true,
        responseText: `A brief diversion from materials engineering, sir: ${joke}`,
        actionTag: '😂 Diversion',
        actionType: 'fun'
      };
    }

    if (/(tell\s+me\s+a\s+(?:fun\s+)?fact|give\s+me\s+a\s+fact|interesting\s+fact)/i.test(lower)) {
      const facts = [
        "Modern advanced semiconductor chips manufactured with Applied Materials equipment contain over 50 billion transistors, with gate oxide layers as thin as a single nanometer.",
        "Applied Materials cleanrooms are thousands of times cleaner than an operating room, filtering out particles down to tens of nanometers in size.",
        "Silicon dioxide thin films are deposited using atomic layer deposition, laying down atoms one individual atomic monolayer at a time.",
        "The Apollo 11 navigation computer operated at 1 MHz with 4 KB of RAM. A single modern wafer fabricated today contains trillions of times more computational throughput."
      ];
      const fact = facts[Math.floor(Math.random() * facts.length)];
      return {
        handled: true,
        responseText: `An interesting scientific datum, sir: ${fact}`,
        actionTag: '💡 Scientific Datum',
        actionType: 'fun'
      };
    }

    if (/(inspirational\s+quote|quote\s+of\s+the\s+day|inspire\s+me|motivate\s+me)/i.test(lower)) {
      const quotes = [
        `"Sometimes you have to run before you can walk." — Tony Stark`,
        `"The best way to predict the future is to invent it." — Alan Kay`,
        `"Simplicity is the prerequisite for reliability." — Edsger W. Dijkstra`,
        `"Engineering is the closest thing to magic that exists in the world." — Elon Musk`
      ];
      const quote = quotes[Math.floor(Math.random() * quotes.length)];
      return {
        handled: true,
        responseText: `A pertinent reflection, sir: ${quote}`,
        actionTag: '✨ Reflection',
        actionType: 'fun'
      };
    }

    if (/(flip\s+a\s+coin|heads\s+or\s+tails)/i.test(lower)) {
      const outcome = Math.random() < 0.5 ? 'Heads' : 'Tails';
      return {
        handled: true,
        responseText: `Coin tossed, sir. Aerodynamic analysis resolves to: ${outcome}.`,
        actionTag: `🪙 Coin Toss: ${outcome}`,
        actionType: 'fun'
      };
    }

    if (/(roll\s+a\s+die|roll\s+dice)/i.test(lower)) {
      const roll = Math.floor(Math.random() * 6) + 1;
      return {
        handled: true,
        responseText: `Die roll executed, sir. The result is ${roll}.`,
        actionTag: `🎲 Rolled: ${roll}`,
        actionType: 'fun'
      };
    }

    return null;
  }
}

// Global instance
window.commandEngine = new CommandEngine();
