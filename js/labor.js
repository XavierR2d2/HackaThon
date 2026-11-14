/**
 * Applied Materials AI - Cleanroom Labor & Workforce Management Engine
 * Manages persistent worker records (clock in / clock out), live shift duration tracking,
 * and persistent count-up Labor Clock with exact plain-English duration readbacks.
 */

class LaborEngine {
  constructor() {
    this.STORAGE_KEY_WORKERS = 'amat_labor_workers';
    this.STORAGE_KEY_CLOCK = 'amat_labor_clock_start';
    this.STORAGE_KEY_LOGS = 'amat_labor_logs';

    this.workers = [];
    this.clockStartTime = null;
    this.logs = [];

    this.isViewOpen = false;
    this.lastOfferToOpen = false;
    this.timerTickInterval = null;

    this.initData();
  }

  initData() {
    this.workers = this.loadWorkers();
    this.clockStartTime = this.loadClockStartTime();
    this.logs = this.loadLogs();
  }

  getAssistantName() {
    if (window.getAssistantName) return window.getAssistantName();
    const stored = localStorage.getItem('amat_assistant_name');
    if (!stored || stored === 'J.A.R.V.I.S.' || stored === 'Jarvis') return 'Voxel';
    return stored;
  }

  loadClockStartTime() {
    const raw = localStorage.getItem(this.STORAGE_KEY_CLOCK);
    if (!raw) return null;
    const num = parseInt(raw, 10);
    return isNaN(num) ? null : num;
  }

  loadLogs() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_LOGS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse labor logs', e);
      return [];
    }
  }

  loadWorkers() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_WORKERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse workers data', e);
    }

    // Default Applied Materials Cleanroom Seed Roster (3 in, 2 out)
    const now = Date.now();
    const defaultWorkers = [
      {
        id: 'w_1',
        name: 'Alex Chen',
        role: 'Lithography Lead',
        status: 'clocked_in',
        lastClockIn: now - (3 * 3600 * 1000 + 14 * 60 * 1000 + 22 * 1000), // ~3h 14m ago
        lastClockOut: null
      },
      {
        id: 'w_2',
        name: 'Elena Rostova',
        role: 'Process Engineer',
        status: 'clocked_in',
        lastClockIn: now - (1 * 3600 * 1000 + 45 * 60 * 1000 + 10 * 1000), // ~1h 45m ago
        lastClockOut: null
      },
      {
        id: 'w_3',
        name: 'Marcus Vance',
        role: 'CVD Specialist',
        status: 'clocked_out',
        lastClockIn: now - (8 * 3600 * 1000),
        lastClockOut: now - (4 * 3600 * 1000 + 30 * 60 * 1000)
      },
      {
        id: 'w_4',
        name: 'Sarah Jenkins',
        role: 'Cleanroom QA Tech',
        status: 'clocked_in',
        lastClockIn: now - (42 * 60 * 1000 + 5 * 1000), // ~42m ago
        lastClockOut: null
      },
      {
        id: 'w_5',
        name: 'Tyler Reed',
        role: 'Equipment Tech',
        status: 'clocked_out',
        lastClockIn: now - (24 * 3600 * 1000),
        lastClockOut: now - (16 * 3600 * 1000)
      }
    ];

    this.saveWorkers(defaultWorkers);
    return defaultWorkers;
  }

  saveWorkers(data = this.workers) {
    this.workers = data;
    localStorage.setItem(this.STORAGE_KEY_WORKERS, JSON.stringify(this.workers));
  }

  saveLogs(data = this.logs) {
    this.logs = data;
    localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(this.logs));
  }

  // --- DURATION FORMATTING ENGINE ---
  /**
   * Plain-English duration formatter satisfying all user requirements:
   * - Include hours only if greater than 0 ("1 hour, 5 minutes and 2 seconds")
   * - Use singular and plural correctly ("1 minute", "2 minutes")
   * - Always accurate to the second, no rounding
   * - Skip any unit that is 0, except seconds (e.g. 45 seconds -> "45 seconds")
   */
  formatDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;

    const parts = [];

    if (hours > 0) {
      parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
    }

    if (minutes > 0) {
      parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
    }

    // Skip any unit that is 0, except seconds:
    // When hours and minutes are 0, seconds is kept (e.g. 45 seconds -> "45 seconds", 0 seconds -> "0 seconds")
    // When hours > 0 or minutes > 0, seconds is kept if > 0
    if (seconds > 0 || (hours === 0 && minutes === 0)) {
      parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
    }

    if (parts.length === 0) {
      return '0 seconds';
    }
    if (parts.length === 1) {
      return parts[0];
    }
    if (parts.length === 2) {
      return `${parts[0]} and ${parts[1]}`;
    }
    return `${parts[0]}, ${parts[1]} and ${parts[2]}`;
  }

  formatHMS(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = String(Math.floor(sec / 3600)).padStart(2, '0');
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  formatCompactDuration(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  }

  // --- WORKER ROSTER OPERATIONS ---
  addWorker(name, role) {
    if (!name || !name.trim()) return null;
    const worker = {
      id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      role: (role && role.trim()) ? role.trim() : 'Cleanroom Specialist',
      status: 'clocked_out',
      lastClockIn: null,
      lastClockOut: null
    };
    this.workers.unshift(worker);
    this.saveWorkers();
    this.render();
    return worker;
  }

  removeWorker(id) {
    this.workers = this.workers.filter(w => w.id !== id);
    this.saveWorkers();
    this.render();
  }

  toggleWorker(id) {
    const worker = this.workers.find(w => w.id === id);
    if (!worker) return null;
    const now = Date.now();
    if (worker.status === 'clocked_in') {
      worker.status = 'clocked_out';
      worker.lastClockOut = now;
    } else {
      worker.status = 'clocked_in';
      worker.lastClockIn = now;
    }
    this.saveWorkers();
    this.render();
    return worker;
  }

  getSummary() {
    const clockedIn = this.workers.filter(w => w.status === 'clocked_in').length;
    const clockedOut = this.workers.filter(w => w.status === 'clocked_out').length;
    return { clockedIn, clockedOut, total: this.workers.length };
  }

  // --- LABOR CLOCK OPERATIONS ---
  isClockRunning() {
    return this.clockStartTime !== null && this.clockStartTime > 0;
  }

  getClockElapsedSeconds() {
    if (!this.isClockRunning()) return 0;
    return Math.max(0, Math.floor((Date.now() - this.clockStartTime) / 1000));
  }

  startLaborClock() {
    if (this.isClockRunning()) {
      const elapsed = this.getClockElapsedSeconds();
      const wording = this.formatDuration(elapsed);
      return {
        status: 'already_running',
        elapsed,
        message: `The labor clock is already running (${wording} so far).`
      };
    }

    this.clockStartTime = Date.now();
    localStorage.setItem(this.STORAGE_KEY_CLOCK, this.clockStartTime.toString());
    this.renderClock();

    if (!this.isViewOpen) {
      this.lastOfferToOpen = true;
      return {
        status: 'started',
        offerOpen: true,
        message: 'Labor clock started. Would you like to view Manage Labor?'
      };
    }

    return {
      status: 'started',
      offerOpen: false,
      message: 'Labor clock started.'
    };
  }

  stopLaborClock() {
    if (!this.isClockRunning()) {
      return {
        status: 'not_running',
        message: "There's no labor clock running right now."
      };
    }

    const elapsed = this.getClockElapsedSeconds();
    const wording = this.formatDuration(elapsed);
    const startTime = this.clockStartTime;
    const stopTime = Date.now();

    this.clockStartTime = null;
    localStorage.removeItem(this.STORAGE_KEY_CLOCK);

    // Save session to persistent Labor Log
    this.addLogEntry({
      startTime,
      stopTime,
      durationSeconds: elapsed,
      durationFormatted: wording
    });

    this.renderClock();
    this.renderLogs();

    return {
      status: 'stopped',
      elapsed,
      message: `Clock was going for ${wording}.`
    };
  }

  queryLaborClock() {
    if (!this.isClockRunning()) {
      return {
        status: 'not_running',
        message: "There's no labor clock running right now."
      };
    }
    const elapsed = this.getClockElapsedSeconds();
    const wording = this.formatDuration(elapsed);
    return {
      status: 'running',
      elapsed,
      message: `The labor clock has been going for ${wording}.`
    };
  }

  addLogEntry(entry) {
    const logItem = {
      id: Date.now(),
      startTime: entry.startTime,
      stopTime: entry.stopTime,
      durationSeconds: entry.durationSeconds,
      durationFormatted: entry.durationFormatted,
      dateStr: new Date(entry.stopTime).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 50) this.logs.pop();
    this.saveLogs();
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
    this.renderLogs();
  }

  // --- NAVIGATION / VIEW FLIP ---
  isLaborOpen() {
    return this.isViewOpen;
  }

  openManageLabor() {
    this.isViewOpen = true;
    this.lastOfferToOpen = false;

    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const manageLaborSection = document.getElementById('manageLaborSection');
    const navBtn = document.getElementById('navManageLaborBtn');

    if (chatSection) chatSection.style.display = 'none';
    if (actionSidebar) actionSidebar.style.display = 'none';
    if (manageLaborSection) {
      manageLaborSection.style.display = 'flex';
      manageLaborSection.classList.remove('fade-out');
      manageLaborSection.classList.add('fade-in');
    }
    if (navBtn) navBtn.classList.add('active');

    this.render();
    return 'Opening Manage Labor';
  }

  closeManageLabor() {
    if (!this.isViewOpen) {
      return 'You are already on the operational HUD interface, sir.';
    }

    this.isViewOpen = false;
    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const manageLaborSection = document.getElementById('manageLaborSection');
    const navBtn = document.getElementById('navManageLaborBtn');

    if (manageLaborSection) {
      manageLaborSection.style.display = 'none';
    }
    if (chatSection) {
      chatSection.style.display = '';
      chatSection.classList.add('fade-in');
    }
    if (actionSidebar) {
      actionSidebar.style.display = '';
    }
    if (navBtn) navBtn.classList.remove('active');

    return 'Returning to operational interface, sir.';
  }

  toggleView() {
    if (this.isViewOpen) {
      return this.closeManageLabor();
    } else {
      return this.openManageLabor();
    }
  }

  // --- RENDERING METHODS ---
  render() {
    this.renderSummary();
    this.renderWorkers();
    this.renderClock();
    this.renderLogs();
  }

  renderSummary() {
    const summary = this.getSummary();
    const summaryText = `${summary.clockedIn} clocked in / ${summary.clockedOut} clocked out`;

    const badge = document.getElementById('laborSummaryBadge');
    if (badge) badge.textContent = summaryText;

    const banner = document.getElementById('workerSummaryBanner');
    if (banner) {
      banner.innerHTML = `
        <span class="stat-pill clocked-in"><strong>${summary.clockedIn}</strong> Clocked In</span>
        <span class="stat-divider">•</span>
        <span class="stat-pill clocked-out"><strong>${summary.clockedOut}</strong> Clocked Out</span>
        <span class="stat-divider">•</span>
        <span class="stat-pill total"><strong>${summary.total}</strong> Total Personnel</span>
      `;
    }

    const workerCountBadge = document.getElementById('workerCountBadge');
    if (workerCountBadge) {
      workerCountBadge.textContent = `${summary.total} Workers`;
    }
  }

  renderClock() {
    const digitsEl = document.getElementById('laborClockDigits');
    const subEl = document.getElementById('laborClockSub');
    const toggleBtn = document.getElementById('laborClockToggleBtn');
    const statusPill = document.getElementById('laborClockStatusPill');

    const running = this.isClockRunning();
    const elapsed = this.getClockElapsedSeconds();

    if (digitsEl) {
      digitsEl.textContent = this.formatHMS(elapsed);
    }

    if (statusPill) {
      statusPill.textContent = running ? 'RUNNING' : 'STOPPED';
      if (running) {
        statusPill.classList.add('active');
      } else {
        statusPill.classList.remove('active');
      }
    }

    if (subEl) {
      if (running) {
        subEl.textContent = `Running: ${this.formatDuration(elapsed)} so far`;
        subEl.className = 'labor-clock-sub active';
      } else {
        subEl.textContent = 'Ready to track session duration';
        subEl.className = 'labor-clock-sub';
      }
    }

    if (toggleBtn) {
      if (running) {
        toggleBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="2" />
          </svg>
          Stop Labor Clock
        `;
        toggleBtn.className = 'action-btn stop-clock-btn';
        toggleBtn.setAttribute('aria-label', 'Stop Labor Clock');
      } else {
        toggleBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start Labor Clock
        `;
        toggleBtn.className = 'primary-btn labor-clock-btn';
        toggleBtn.setAttribute('aria-label', 'Start Labor Clock');
      }
    }
  }

  renderWorkers() {
    const listEl = document.getElementById('workerList');
    if (!listEl) return;

    if (this.workers.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <p>No registered workers in roster.</p>
          <small>Add cleanroom personnel using the form above.</small>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.workers.map(w => {
      const isClockedIn = w.status === 'clocked_in';
      let durationHtml = '';
      if (isClockedIn && w.lastClockIn) {
        const elapsed = Math.max(0, Math.floor((Date.now() - w.lastClockIn) / 1000));
        durationHtml = `<span class="worker-duration" id="worker-dur-${w.id}">⏱️ ${this.formatCompactDuration(elapsed)} on shift</span>`;
      } else if (w.lastClockOut) {
        const outTime = new Date(w.lastClockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        durationHtml = `<span class="worker-last-out">Last clocked out: ${outTime}</span>`;
      } else {
        durationHtml = `<span class="worker-last-out">Not yet clocked in</span>`;
      }

      return `
        <div class="worker-item ${isClockedIn ? 'in-shift' : 'off-shift'}" data-worker-id="${w.id}">
          <div class="worker-main-info">
            <div class="worker-name-row">
              <span class="worker-name">${this.escape(w.name)}</span>
              <span class="worker-badge ${isClockedIn ? 'clocked-in' : 'clocked-out'}" aria-label="Status: ${isClockedIn ? 'Clocked In' : 'Clocked Out'}">
                <span class="badge-dot"></span>
                ${isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </span>
            </div>
            <div class="worker-meta-row">
              <span class="worker-role">${this.escape(w.role || 'Cleanroom Specialist')}</span>
              ${durationHtml}
            </div>
          </div>
          <div class="worker-actions">
            <button class="worker-toggle-btn ${isClockedIn ? 'clock-out' : 'clock-in'}"
                    onclick="window.laborEngine.toggleWorker('${w.id}')"
                    aria-label="${isClockedIn ? 'Clock out ' + this.escape(w.name) : 'Clock in ' + this.escape(w.name)}">
              ${isClockedIn ? 'Clock Out' : 'Clock In'}
            </button>
            <button class="worker-remove-btn"
                    onclick="window.laborEngine.removeWorker('${w.id}')"
                    title="Remove worker from roster"
                    aria-label="Remove ${this.escape(w.name)}">
              &times;
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderLogs() {
    const logEl = document.getElementById('laborLogList');
    if (!logEl) return;

    if (this.logs.length === 0) {
      logEl.innerHTML = `
        <div class="empty-state">
          <p>No completed labor sessions logged yet.</p>
          <small>Start and stop the Labor Clock to log shift durations.</small>
        </div>
      `;
      return;
    }

    logEl.innerHTML = this.logs.map((log, index) => {
      const hms = this.formatHMS(log.durationSeconds);
      return `
        <div class="labor-log-item">
          <div class="log-meta">
            <span class="log-session-num">Session #${this.logs.length - index}</span>
            <span class="log-date">${this.escape(log.dateStr)}</span>
          </div>
          <div class="log-duration-row">
            <span class="log-duration-text">${this.escape(log.durationFormatted)}</span>
            <span class="log-hms">${hms}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- LIVE 1-SECOND TICK ---
  tick() {
    // 1. Tick Labor Clock if active
    if (this.isClockRunning()) {
      const elapsed = this.getClockElapsedSeconds();
      const digitsEl = document.getElementById('laborClockDigits');
      if (digitsEl) digitsEl.textContent = this.formatHMS(elapsed);

      const subEl = document.getElementById('laborClockSub');
      if (subEl) subEl.textContent = `Running: ${this.formatDuration(elapsed)} so far`;
    }

    // 2. Tick every clocked-in worker's elapsed duration
    const now = Date.now();
    for (const w of this.workers) {
      if (w.status === 'clocked_in' && w.lastClockIn) {
        const durEl = document.getElementById(`worker-dur-${w.id}`);
        if (durEl) {
          const elapsed = Math.max(0, Math.floor((now - w.lastClockIn) / 1000));
          durEl.textContent = `⏱️ ${this.formatCompactDuration(elapsed)} on shift`;
        }
      }
    }
  }

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  init() {
    // Start live interval (1 second)
    if (this.timerTickInterval) clearInterval(this.timerTickInterval);
    this.timerTickInterval = setInterval(() => this.tick(), 1000);

    // Initial render
    this.render();

    // Wire up events
    const navBtn = document.getElementById('navManageLaborBtn');
    if (navBtn) {
      navBtn.addEventListener('click', () => {
        this.toggleView();
      });
    }

    const backBtn = document.getElementById('backToHudBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.closeManageLabor();
      });
    }

    const clockToggleBtn = document.getElementById('laborClockToggleBtn');
    if (clockToggleBtn) {
      clockToggleBtn.addEventListener('click', () => {
        if (this.isClockRunning()) {
          const res = this.stopLaborClock();
          if (window.speechEngine && window.speechEngine.speak) {
            window.speechEngine.speak(res.message);
          }
          if (window.appendAiMessage) {
            window.appendAiMessage(res.message, '⏹️ Labor Clock Stopped');
          }
        } else {
          const res = this.startLaborClock();
          if (window.speechEngine && window.speechEngine.speak) {
            window.speechEngine.speak(res.message);
          }
          if (window.appendAiMessage) {
            window.appendAiMessage(res.message, '⏱️ Labor Clock Started');
          }
        }
      });
    }

    const clearLogBtn = document.getElementById('clearLaborLogBtn');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        if (confirm('Purge all completed labor session logs, sir?')) {
          this.clearLogs();
        }
      });
    }

    const addForm = document.getElementById('addWorkerForm');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('newWorkerName');
        const roleInput = document.getElementById('newWorkerRole');
        const name = nameInput ? nameInput.value.trim() : '';
        const role = roleInput ? roleInput.value.trim() : '';
        if (name) {
          this.addWorker(name, role);
          if (nameInput) nameInput.value = '';
          if (roleInput) roleInput.value = '';
        }
      });
    }
  }
}

// Instantiate globally
window.laborEngine = new LaborEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.laborEngine.init();
});
