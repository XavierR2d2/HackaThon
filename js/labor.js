/**
 * Applied Materials AI - Cleanroom Labor & Workforce Management Engine
 * Manages persistent worker records (clock in / clock out), live shift duration tracking,
 * active user / self-only clock out security enforcement, new hire database persistence,
 * daily shift rollover ("next day" status reset), and persistent count-up Labor Clock.
 */

class LaborEngine {
  constructor() {
    this.STORAGE_KEY_WORKERS = 'amat_labor_workers';
    this.STORAGE_KEY_CLOCK = 'amat_labor_clock_start';
    this.STORAGE_KEY_LOGS = 'amat_labor_logs';
    this.STORAGE_KEY_CURRENT_USER = 'amat_labor_current_user';
    this.STORAGE_KEY_LAST_DATE = 'amat_labor_shift_date';

    this.workers = [];
    this.clockStartTime = null;
    this.logs = [];

    this.isViewOpen = false;
    this.lastOfferToOpen = false;
    this.timerTickInterval = null;

    this.initData();
  }

  initData() {
    this.checkDayRolloverInitial();
    this.workers = this.loadWorkers();
    this.clockStartTime = this.loadClockStartTime();
    this.logs = this.loadLogs();
    this.ensureValidCurrentUser();
  }

  getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getCurrentShiftDate() {
    return localStorage.getItem(this.STORAGE_KEY_LAST_DATE) || this.getTodayString();
  }

  formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
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

  // --- DAY ROLLOVER & DATABASE RETENTION ENGINE ---
  checkDayRolloverInitial() {
    const today = this.getTodayString();
    const lastDate = localStorage.getItem(this.STORAGE_KEY_LAST_DATE);
    if (!lastDate) {
      localStorage.setItem(this.STORAGE_KEY_LAST_DATE, today);
    } else if (lastDate !== today) {
      this.rolloverToDate(today, lastDate, false);
    }
  }

  rolloverToDate(newDateStr, oldDateStr, triggerRender = true) {
    const workers = this.loadWorkersRaw();
    const now = Date.now();

    for (const w of workers) {
      // Archive yesterday's shift if active or finished
      if (!w.shiftHistory) w.shiftHistory = [];
      if (w.status === 'clocked_in' && w.lastClockIn) {
        w.shiftHistory.unshift({
          date: oldDateStr || w.shiftDate || 'Previous',
          clockIn: w.lastClockIn,
          clockOut: now,
          duration: this.formatDuration(Math.floor((now - w.lastClockIn) / 1000))
        });
      } else if (w.status === 'clocked_out' && w.lastClockIn && w.lastClockOut) {
        w.shiftHistory.unshift({
          date: oldDateStr || w.shiftDate || 'Previous',
          clockIn: w.lastClockIn,
          clockOut: w.lastClockOut,
          duration: this.formatDuration(Math.floor((w.lastClockOut - w.lastClockIn) / 1000))
        });
      }

      // Next day reset: retains name and all info in database, but neither clocked in nor clocked out yet!
      w.status = 'not_clocked_in';
      w.lastClockIn = null;
      w.lastClockOut = null;
      w.shiftDate = newDateStr;
    }

    localStorage.setItem(this.STORAGE_KEY_LAST_DATE, newDateStr);
    localStorage.setItem(this.STORAGE_KEY_WORKERS, JSON.stringify(workers));
    this.workers = workers;

    if (triggerRender) {
      this.render();
    }
  }

  simulateNextDay() {
    const currentStr = this.getCurrentShiftDate();
    const parts = currentStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 1);

    const nextStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.rolloverToDate(nextStr, currentStr, true);

    const formattedDate = this.formatDateDisplay(nextStr);
    const msg = `Shift date advanced to ${formattedDate}. All personnel retained in company database; shift statuses reset to 'Not Clocked In Yet'.`;

    if (window.appendAiMessage) {
      window.appendAiMessage(msg, '🌅 Next Day Shift Active');
    }
    if (window.speechEngine && window.speechEngine.speak) {
      window.speechEngine.speak(`Shift date advanced to ${formattedDate}. All personnel are in the database, standing by for shift check-in.`);
    }

    return msg;
  }

  loadWorkersRaw() {
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

    const now = Date.now();
    const today = this.getTodayString();
    const defaultWorkers = [
      {
        id: 'w_1',
        name: 'Elena Rostova',
        role: 'Process Engineer',
        status: 'clocked_in',
        shiftDate: today,
        lastClockIn: now - (1 * 3600 * 1000 + 45 * 60 * 1000 + 10 * 1000), // ~1h 45m ago
        lastClockOut: null,
        shiftHistory: [],
        dateAdded: new Date(now - 86400000 * 30).toISOString()
      },
      {
        id: 'w_2',
        name: 'Alex Chen',
        role: 'Lithography Lead',
        status: 'clocked_out',
        shiftDate: today,
        lastClockIn: now - (8 * 3600 * 1000),
        lastClockOut: now - (1 * 3600 * 1000 + 15 * 60 * 1000),
        shiftHistory: [],
        dateAdded: new Date(now - 86400000 * 60).toISOString()
      },
      {
        id: 'w_3',
        name: 'Marcus Vance',
        role: 'CVD Specialist',
        status: 'not_clocked_in',
        shiftDate: today,
        lastClockIn: null,
        lastClockOut: null,
        shiftHistory: [],
        dateAdded: new Date(now - 86400000 * 10).toISOString()
      },
      {
        id: 'w_4',
        name: 'Sarah Jenkins',
        role: 'Cleanroom QA Tech',
        status: 'not_clocked_in',
        shiftDate: today,
        lastClockIn: null,
        lastClockOut: null,
        shiftHistory: [],
        dateAdded: new Date(now - 86400000 * 5).toISOString()
      },
      {
        id: 'w_5',
        name: 'Tyler Reed',
        role: 'Equipment Tech',
        status: 'not_clocked_in',
        shiftDate: today,
        lastClockIn: null,
        lastClockOut: null,
        shiftHistory: [],
        dateAdded: new Date(now - 86400000 * 2).toISOString()
      }
    ];

    localStorage.setItem(this.STORAGE_KEY_WORKERS, JSON.stringify(defaultWorkers));
    return defaultWorkers;
  }

  loadWorkers() {
    return this.loadWorkersRaw();
  }

  saveWorkers(data = this.workers) {
    this.workers = data;
    localStorage.setItem(this.STORAGE_KEY_WORKERS, JSON.stringify(this.workers));
    if (window.jobsEngine && window.jobsEngine.render) {
      window.jobsEngine.render();
    }
  }

  saveLogs(data = this.logs) {
    this.logs = data;
    localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(this.logs));
  }

  // --- CURRENT USER / OPERATOR IDENTITY MANAGEMENT ---
  getCurrentUserId() {
    let id = localStorage.getItem(this.STORAGE_KEY_CURRENT_USER);
    if (!id || !this.workers.some(w => w.id === id)) {
      id = this.workers[0] ? this.workers[0].id : null;
      if (id) localStorage.setItem(this.STORAGE_KEY_CURRENT_USER, id);
    }
    return id;
  }

  getCurrentUser() {
    const id = this.getCurrentUserId();
    return this.workers.find(w => w.id === id) || null;
  }

  getCurrentUserName() {
    const user = this.getCurrentUser();
    return user ? user.name : 'Operator';
  }

  setCurrentUser(id) {
    if (this.workers.some(w => w.id === id)) {
      localStorage.setItem(this.STORAGE_KEY_CURRENT_USER, id);
      const user = this.workers.find(w => w.id === id);
      this.render();
      if (window.jobsEngine && window.jobsEngine.render) {
        window.jobsEngine.render();
      }

      const notifyText = `Active operator profile set to ${user.name}. You may now clock in or clock out for your shift.`;
      if (window.appendAiMessage) {
        window.appendAiMessage(notifyText, '👤 Operator Active');
      }
      return user;
    }
    return null;
  }

  ensureValidCurrentUser() {
    this.getCurrentUserId();
  }

  // --- DURATION FORMATTING ENGINE ---
  /**
   * Plain-English duration formatter satisfying all strict requirements:
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

    // Skip any unit that is 0, except seconds
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

  // --- WORKER ROSTER OPERATIONS & SELF-ONLY CLOCK ENFORCEMENT ---
  /**
   * Adds a new hire to the persistent database.
   * New hires start with status: 'not_clocked_in' (they won't be clocked in or clocked out yet).
   * They persist across sessions and day rollovers.
   */
  addWorker(name, role) {
    if (!name || !name.trim()) return null;
    const worker = {
      id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      role: (role && role.trim()) ? role.trim() : 'Cleanroom Specialist',
      status: 'not_clocked_in', // New hires are NOT clocked in or clocked out yet!
      shiftDate: this.getCurrentShiftDate(),
      lastClockIn: null,
      lastClockOut: null,
      shiftHistory: [],
      dateAdded: new Date().toISOString()
    };
    this.workers.unshift(worker);
    this.saveWorkers();
    this.render();

    const notifyMsg = `Registered new cleanroom technician ${worker.name} (${worker.role}) in persistent database. Initial status: Not Clocked In Yet.`;
    if (window.appendAiMessage) {
      window.appendAiMessage(notifyMsg, '➕ New Hire Registered');
    }
    if (window.speechEngine && window.speechEngine.speak) {
      window.speechEngine.speak(`New hire ${worker.name} added to company database.`);
    }

    return worker;
  }

  removeWorker(id) {
    const worker = this.workers.find(w => w.id === id);
    const name = worker ? worker.name : 'Worker';

    if (confirm(`Remove ${name} from the company workforce database, sir?`)) {
      this.workers = this.workers.filter(w => w.id !== id);
      if (this.getCurrentUserId() === id) {
        localStorage.removeItem(this.STORAGE_KEY_CURRENT_USER);
        this.ensureValidCurrentUser();
      }
      this.saveWorkers();
      this.render();
    }
  }

  /**
   * Clock Out enforcement: User can ONLY clock out their self.
   */
  clockOutUser(workerId = null) {
    const activeUserId = this.getCurrentUserId();
    const targetId = workerId || activeUserId;

    // Security check: Only self-clock-out is permitted
    if (targetId !== activeUserId) {
      const activeName = this.getCurrentUserName();
      const targetWorker = this.workers.find(w => w.id === targetId);
      const targetName = targetWorker ? targetWorker.name : 'this worker';

      const errorMsg = `Access denied, sir. Company policy dictates workers may only clock out themselves. You are currently operating as ${activeName}.`;
      if (window.appendAiMessage) {
        window.appendAiMessage(errorMsg, '🔒 Security Restriction');
      }
      if (window.speechEngine && window.speechEngine.speak) {
        window.speechEngine.speak(`Access denied. Workers may only clock out themselves.`);
      }
      return { success: false, message: errorMsg };
    }

    const worker = this.workers.find(w => w.id === targetId);
    if (!worker) {
      return { success: false, message: 'Worker record not found.' };
    }

    if (worker.status !== 'clocked_in') {
      const warnMsg = `${worker.name} is not currently clocked in today.`;
      if (window.appendAiMessage) {
        window.appendAiMessage(warnMsg, '⚠️ Not Clocked In');
      }
      if (window.speechEngine && window.speechEngine.speak) {
        window.speechEngine.speak(warnMsg);
      }
      return { success: false, message: warnMsg };
    }

    const now = Date.now();
    const elapsedSec = Math.max(0, Math.floor((now - (worker.lastClockIn || now)) / 1000));
    const durationWording = this.formatDuration(elapsedSec);

    worker.status = 'clocked_out';
    worker.lastClockOut = now;

    if (!worker.shiftHistory) worker.shiftHistory = [];
    worker.shiftHistory.unshift({
      date: this.getCurrentShiftDate(),
      clockIn: worker.lastClockIn,
      clockOut: now,
      duration: durationWording
    });

    this.saveWorkers();
    this.render();

    const successMsg = `${worker.name} clocked out. Shift completed for ${durationWording}.`;
    if (window.appendAiMessage) {
      window.appendAiMessage(successMsg, '⏹️ Shift Clocked Out');
    }
    if (window.speechEngine && window.speechEngine.speak) {
      window.speechEngine.speak(`${worker.name} clocked out. Shift completed for ${durationWording}.`);
    }

    return {
      success: true,
      durationWording,
      message: successMsg
    };
  }

  /**
   * Clock In: User clocks in their self.
   */
  clockInUser(workerId = null) {
    const activeUserId = this.getCurrentUserId();
    const targetId = workerId || activeUserId;

    if (targetId !== activeUserId) {
      const activeName = this.getCurrentUserName();
      const errorMsg = `Access denied, sir. You may only clock in for yourself (${activeName}).`;
      if (window.appendAiMessage) {
        window.appendAiMessage(errorMsg, '🔒 Security Restriction');
      }
      if (window.speechEngine && window.speechEngine.speak) {
        window.speechEngine.speak(`Access denied. You may only clock in for yourself.`);
      }
      return { success: false, message: errorMsg };
    }

    const worker = this.workers.find(w => w.id === targetId);
    if (!worker) {
      return { success: false, message: 'Worker record not found.' };
    }

    if (worker.status === 'clocked_in') {
      const warnMsg = `${worker.name} is already clocked in today.`;
      if (window.appendAiMessage) {
        window.appendAiMessage(warnMsg, 'ℹ️ Already Clocked In');
      }
      return { success: false, message: warnMsg };
    }

    const now = Date.now();
    worker.status = 'clocked_in';
    worker.lastClockIn = now;
    worker.lastClockOut = null;
    worker.shiftDate = this.getCurrentShiftDate();

    this.saveWorkers();
    this.render();

    const timeStr = new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const successMsg = `${worker.name} clocked in at ${timeStr}. Active shift initiated.`;
    if (window.appendAiMessage) {
      window.appendAiMessage(successMsg, '▶️ Shift Clocked In');
    }
    if (window.speechEngine && window.speechEngine.speak) {
      window.speechEngine.speak(`${worker.name} clocked in for cleanroom shift.`);
    }

    return {
      success: true,
      message: successMsg
    };
  }

  getSummary() {
    const clockedIn = this.workers.filter(w => w.status === 'clocked_in').length;
    const clockedOut = this.workers.filter(w => w.status === 'clocked_out').length;
    const notClockedIn = this.workers.filter(w => w.status === 'not_clocked_in' || !w.status).length;
    return { clockedIn, clockedOut, notClockedIn, total: this.workers.length };
  }

  // --- LABOR CLOCK (COUNT-UP TIMER) OPERATIONS ---
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

  // --- SHIFT STATUS & WORKFORCE DATABASE VOICE QUERIES ---
  getWhoIsClockedInVoice() {
    const clockedIn = this.workers.filter(w => w.status === 'clocked_in');
    if (clockedIn.length === 0) {
      return 'No cleanroom technicians are currently clocked in, sir.';
    }

    if (clockedIn.length === 1) {
      const w = clockedIn[0];
      const sec = Math.max(0, Math.floor((Date.now() - (w.lastClockIn || Date.now())) / 1000));
      const dur = this.formatDuration(sec);
      return `Currently 1 technician is clocked in: ${w.name} (${w.role || 'Cleanroom Specialist'}), on shift for ${dur}.`;
    }

    const summaries = clockedIn.map(w => {
      const sec = Math.max(0, Math.floor((Date.now() - (w.lastClockIn || Date.now())) / 1000));
      return `${w.name} (${this.formatDuration(sec)})`;
    });
    return `Currently ${clockedIn.length} technicians are clocked in: ${summaries.join(', ')}.`;
  }

  getWhoIsClockedOutVoice() {
    const clockedOut = this.workers.filter(w => w.status === 'clocked_out');
    const notClocked = this.workers.filter(w => w.status === 'not_clocked_in' || !w.status);

    if (clockedOut.length === 0 && notClocked.length === 0) {
      return 'All registered cleanroom personnel are currently clocked in, sir.';
    }

    const segments = [];
    if (clockedOut.length > 0) {
      const names = clockedOut.map(w => w.name).join(', ');
      segments.push(`${clockedOut.length} clocked out: ${names}`);
    }
    if (notClocked.length > 0) {
      const names = notClocked.map(w => w.name).join(', ');
      segments.push(`${notClocked.length} not clocked in yet today: ${names}`);
    }

    return `Off-shift personnel: ${segments.join('; ')}.`;
  }

  getWorkerClockedInDurationVoice(workerQuery) {
    const query = (workerQuery || '').trim().toLowerCase();
    const currentUser = this.getCurrentUser();

    // Check if query refers to active user or is empty
    if (!query || query === 'i' || query === 'me' || query === 'myself') {
      if (!currentUser) {
        return 'No active operator profile is currently selected, sir.';
      }
      if (currentUser.status === 'clocked_in' && currentUser.lastClockIn) {
        const sec = Math.max(0, Math.floor((Date.now() - currentUser.lastClockIn) / 1000));
        const dur = this.formatDuration(sec);
        return `You (${currentUser.name}) have been clocked in for ${dur}, sir.`;
      }
      if (currentUser.status === 'clocked_out') {
        return `You (${currentUser.name}) are currently clocked out, sir.`;
      }
      return `You (${currentUser.name}) have not clocked in yet today, sir.`;
    }

    // Search workers by name (full or partial match)
    const worker = this.workers.find(w => w.name.toLowerCase().includes(query));
    if (!worker) {
      return `I could not find technician "${workerQuery}" in the workforce database, sir.`;
    }

    if (worker.status === 'clocked_in' && worker.lastClockIn) {
      const sec = Math.max(0, Math.floor((Date.now() - worker.lastClockIn) / 1000));
      const dur = this.formatDuration(sec);
      return `${worker.name} (${worker.role || 'Technician'}) has been clocked in for ${dur}.`;
    }

    if (worker.status === 'clocked_out') {
      const outTime = worker.lastClockOut ? ` at ${new Date(worker.lastClockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '';
      return `${worker.name} is currently clocked out${outTime}.`;
    }

    return `${worker.name} is registered in the database but has not clocked in yet today.`;
  }

  getShiftStatusReportVoice() {
    const summary = this.getSummary();
    const currentUser = this.getCurrentUser();
    const currentName = currentUser ? currentUser.name : 'Operator';
    let userShiftInfo = '';

    if (currentUser) {
      if (currentUser.status === 'clocked_in' && currentUser.lastClockIn) {
        const sec = Math.max(0, Math.floor((Date.now() - currentUser.lastClockIn) / 1000));
        userShiftInfo = `Active operator ${currentName} is clocked in for ${this.formatDuration(sec)}.`;
      } else if (currentUser.status === 'clocked_out') {
        userShiftInfo = `Active operator ${currentName} is clocked out.`;
      } else {
        userShiftInfo = `Active operator ${currentName} is not clocked in yet.`;
      }
    }

    let clockInfo = '';
    if (this.isClockRunning()) {
      clockInfo = ` The labor clock is running at ${this.formatDuration(this.getClockElapsedSeconds())}.`;
    }

    return `Cleanroom workforce status: ${summary.clockedIn} clocked in, ${summary.clockedOut} clocked out, and ${summary.notClockedIn} not clocked in yet out of ${summary.total} total technicians. ${userShiftInfo}${clockInfo}`;
  }

  // --- NAVIGATION / VIEW SWITCHING ---
  isLaborOpen() {
    return this.isViewOpen;
  }

  openManageLabor() {
    this.isViewOpen = true;
    this.lastOfferToOpen = false;

    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const manageLaborSection = document.getElementById('manageLaborSection');
    const jobsSection = document.getElementById('jobsSection');
    const navBtn = document.getElementById('navManageLaborBtn');
    const navJobsBtn = document.getElementById('navJobsBtn');
    const navTranscriptBtn = document.getElementById('navTranscriptBtn');

    if (chatSection) chatSection.style.display = 'none';
    if (actionSidebar) actionSidebar.style.display = 'none';
    if (jobsSection) jobsSection.style.display = 'none';
    if (manageLaborSection) {
      manageLaborSection.style.display = 'flex';
      manageLaborSection.classList.remove('fade-out');
      manageLaborSection.classList.add('fade-in');
    }
    if (navBtn) navBtn.classList.add('active');
    if (navJobsBtn) navJobsBtn.classList.remove('active');
    if (navTranscriptBtn) navTranscriptBtn.classList.remove('active');

    if (window.jobsEngine) window.jobsEngine.isViewOpen = false;

    // Ensure acoustic sensors remain actively listening across tabs
    if (window.speechEngine && window.speechEngine.continuousMode && !window.speechEngine.isListening && !window.speechEngine.manualStop) {
      window.speechEngine.startListening();
    }

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
    const navTranscriptBtn = document.getElementById('navTranscriptBtn');

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
    if (navTranscriptBtn) navTranscriptBtn.classList.add('active');

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
    this.renderCurrentUserDropdown();
    this.renderWorkers();
    this.renderClock();
    this.renderLogs();
    this.renderMiniWidget();
  }

  renderSummary() {
    const summary = this.getSummary();
    const summaryText = `${summary.clockedIn} clocked in / ${summary.clockedOut} clocked out / ${summary.notClockedIn} not clocked in`;

    const badge = document.getElementById('laborSummaryBadge');
    if (badge) badge.textContent = summaryText;

    const banner = document.getElementById('workerSummaryBanner');
    if (banner) {
      banner.innerHTML = `
        <span class="stat-pill clocked-in"><strong>${summary.clockedIn}</strong> Clocked In</span>
        <span class="stat-divider">•</span>
        <span class="stat-pill clocked-out"><strong>${summary.clockedOut}</strong> Clocked Out</span>
        <span class="stat-divider">•</span>
        <span class="stat-pill not-clocked-in"><strong>${summary.notClockedIn}</strong> Not Clocked In Yet</span>
        <span class="stat-divider">•</span>
        <span class="stat-pill total"><strong>${summary.total}</strong> in Database</span>
      `;
    }

    const workerCountBadge = document.getElementById('workerCountBadge');
    if (workerCountBadge) {
      workerCountBadge.textContent = `${summary.total} Workers`;
    }

    const shiftDateSub = document.getElementById('laborCurrentDateSub');
    if (shiftDateSub) {
      const formatted = this.formatDateDisplay(this.getCurrentShiftDate());
      shiftDateSub.textContent = `Applied Materials Fabrication Facility • Shift Date: ${formatted}`;
    }
  }

  renderCurrentUserDropdown() {
    const selectEl = document.getElementById('currentUserSelect');
    if (!selectEl) return;

    const currentId = this.getCurrentUserId();
    selectEl.innerHTML = this.workers.map(w => {
      const selected = w.id === currentId ? 'selected' : '';
      let statusIcon = '○ Not In';
      if (w.status === 'clocked_in') statusIcon = '● In';
      else if (w.status === 'clocked_out') statusIcon = '✓ Out';
      return `<option value="${w.id}" ${selected}>${this.escape(w.name)} (${this.escape(w.role || 'Tech')}) [${statusIcon}]</option>`;
    }).join('');
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
          <p>No registered personnel in company database.</p>
          <small>Add new hires using the registration form above.</small>
        </div>
      `;
      return;
    }

    const currentUserId = this.getCurrentUserId();

    listEl.innerHTML = this.workers.map(w => {
      const isSelf = w.id === currentUserId;
      const isClockedIn = w.status === 'clocked_in';
      const isClockedOut = w.status === 'clocked_out';
      const isNotClockedIn = w.status === 'not_clocked_in' || (!isClockedIn && !isClockedOut);

      // Duration & status display
      let durationHtml = '';
      if (isClockedIn && w.lastClockIn) {
        const elapsed = Math.max(0, Math.floor((Date.now() - w.lastClockIn) / 1000));
        durationHtml = `<span class="worker-duration" id="worker-dur-${w.id}">⏱️ ${this.formatCompactDuration(elapsed)} on shift</span>`;
      } else if (isClockedOut && w.lastClockOut) {
        const outTime = new Date(w.lastClockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        durationHtml = `<span class="worker-last-out">Shift complete (${outTime})</span>`;
      } else {
        durationHtml = `<span class="worker-pending-badge">○ Ready for shift</span>`;
      }

      // Status Badge
      let badgeHtml = '';
      if (isClockedIn) {
        badgeHtml = `<span class="worker-badge clocked-in"><span class="badge-dot"></span>Clocked In</span>`;
      } else if (isClockedOut) {
        badgeHtml = `<span class="worker-badge clocked-out"><span class="badge-dot"></span>Clocked Out</span>`;
      } else {
        badgeHtml = `<span class="worker-badge not-clocked-in"><span class="badge-dot"></span>Not Clocked In Yet</span>`;
      }

      // Self-Only Clock Actions logic:
      // "the user can only Clock out their self"
      let actionBtnHtml = '';
      if (isSelf) {
        if (isClockedIn) {
          actionBtnHtml = `
            <button class="worker-toggle-btn clock-out"
                    onclick="window.laborEngine.clockOutUser('${w.id}')"
                    aria-label="Clock out ${this.escape(w.name)}">
              ⏹ Clock Out (You)
            </button>
          `;
        } else if (isClockedOut) {
          actionBtnHtml = `
            <button class="worker-toggle-btn clock-in"
                    onclick="window.laborEngine.clockInUser('${w.id}')"
                    aria-label="Re-clock in for next shift">
              ▶ Clock In Again
            </button>
          `;
        } else {
          actionBtnHtml = `
            <button class="worker-toggle-btn clock-in"
                    onclick="window.laborEngine.clockInUser('${w.id}')"
                    aria-label="Clock in for shift">
              ▶ Clock In (You)
            </button>
          `;
        }
      } else {
        // Other workers: Lock Clock Out button as mandated
        if (isClockedIn) {
          actionBtnHtml = `
            <button class="worker-toggle-btn locked"
                    title="Security Restriction: Only ${this.escape(w.name)} may clock out themselves"
                    onclick="window.laborEngine.clockOutUser('${w.id}')">
              🔒 Clock Out (Self Only)
            </button>
          `;
        } else {
          actionBtnHtml = `
            <button class="worker-toggle-btn switch-user-btn"
                    title="Switch active operator identity to ${this.escape(w.name)}"
                    onclick="window.laborEngine.setCurrentUser('${w.id}')">
              👤 Set as Me
            </button>
          `;
        }
      }

      return `
        <div class="worker-item ${isSelf ? 'current-user-card' : ''} ${isClockedIn ? 'in-shift' : (isClockedOut ? 'off-shift' : 'pending-shift')}" data-worker-id="${w.id}">
          <div class="worker-main-info">
            <div class="worker-name-row">
              <span class="worker-name">${this.escape(w.name)}</span>
              ${isSelf ? '<span class="self-pill">👤 YOU</span>' : ''}
              ${badgeHtml}
            </div>
            <div class="worker-meta-row">
              <span class="worker-role">${this.escape(w.role || 'Cleanroom Specialist')}</span>
              ${durationHtml}
            </div>
          </div>
          <div class="worker-actions">
            ${actionBtnHtml}
            <button class="worker-remove-btn"
                    onclick="window.laborEngine.removeWorker('${w.id}')"
                    title="Remove worker from company database"
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
          <small>Start and stop the Labor Clock to log active shift sessions.</small>
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

  renderMiniWidget() {
    const container = document.getElementById('miniOperatorContent');
    if (!container) return;

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No operator selected.</p>
          <button class="primary-btn mini-btn" onclick="window.laborEngine.openManageLabor()">Select Operator</button>
        </div>
      `;
      return;
    }

    const isClockedIn = currentUser.status === 'clocked_in';
    const isClockedOut = currentUser.status === 'clocked_out';
    const now = Date.now();

    let durationText = 'Shift Not Started';
    if (isClockedIn && currentUser.lastClockIn) {
      const elapsed = Math.max(0, Math.floor((now - currentUser.lastClockIn) / 1000));
      durationText = `⏱️ ${this.formatCompactDuration(elapsed)} active`;
    } else if (isClockedOut && currentUser.lastClockOut) {
      durationText = `Clocked Out Today`;
    }

    let actionBtn = '';
    if (isClockedIn) {
      actionBtn = `<button class="action-btn mini-clock-btn clock-out" onclick="window.laborEngine.clockOutUser('${currentUser.id}')">⏹ Clock Out</button>`;
    } else {
      actionBtn = `<button class="primary-btn mini-clock-btn clock-in" onclick="window.laborEngine.clockInUser('${currentUser.id}')">▶ Clock In</button>`;
    }

    container.innerHTML = `
      <div class="mini-user-info">
        <div class="mini-user-header">
          <span class="mini-user-name">${this.escape(currentUser.name)}</span>
          <span class="worker-badge ${isClockedIn ? 'clocked-in' : (isClockedOut ? 'clocked-out' : 'not-clocked-in')}">
            <span class="badge-dot"></span>
            ${isClockedIn ? 'Clocked In' : (isClockedOut ? 'Clocked Out' : 'Not In Yet')}
          </span>
        </div>
        <div class="mini-user-role">${this.escape(currentUser.role || 'Cleanroom Specialist')}</div>
        <div class="mini-user-duration" id="miniUserDuration">${durationText}</div>
      </div>
      <div class="mini-actions-row">
        ${actionBtn}
        <button class="ghost-btn mini-btn" onclick="window.laborEngine.openManageLabor()">📊 Open Roster</button>
      </div>
    `;
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

    // 3. Tick mini sidebar widget for current user
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.status === 'clocked_in' && currentUser.lastClockIn) {
      const miniDurEl = document.getElementById('miniUserDuration');
      if (miniDurEl) {
        const elapsed = Math.max(0, Math.floor((now - currentUser.lastClockIn) / 1000));
        miniDurEl.textContent = `⏱️ ${this.formatCompactDuration(elapsed)} active`;
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
    // Check for calendar day rollover on startup
    this.checkDayRolloverInitial();

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

    const userSelect = document.getElementById('currentUserSelect');
    if (userSelect) {
      userSelect.addEventListener('change', (e) => {
        this.setCurrentUser(e.target.value);
      });
    }

    const nextDayBtn = document.getElementById('simulateNextDayBtn');
    if (nextDayBtn) {
      nextDayBtn.addEventListener('click', () => {
        this.simulateNextDay();
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
