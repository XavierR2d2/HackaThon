/**
 * J.A.R.V.I.S. - Google Gemini AI Integration Module
 * Pure front-end client implementation using Google Gemini REST API.
 */

const GeminiAI = (() => {
  const KEY = 'jarvis_gemini_key';
  const MODEL = 'jarvis_gemini_model';
  const history = []; // Gemini REST is stateless, so resend history each call

  const $ = id => document.getElementById(id);
  const getKey = () => localStorage.getItem(KEY) || localStorage.getItem('amat_gemini_key') || localStorage.getItem('voxai_gemini_key') || '';
  const getModel = () => localStorage.getItem(MODEL) || localStorage.getItem('amat_gemini_model') || 'gemini-3.5';
  const isConnected = () => !!getKey();

  async function call(contents, systemText) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': getKey() },
        body: JSON.stringify({
          system_instruction: systemText ? { parts: [{ text: systemText }] } : undefined,
          contents,
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'No response, sir.';
  }

  function getLiveDatabaseContext() {
    const sections = [];

    // 1. Shift Status & Cleanroom Workforce Database
    try {
      const le = window.laborEngine;
      if (le && le.workers) {
        const lines = [];
        const shiftDate = le.getCurrentShiftDate ? le.getCurrentShiftDate() : 'Today';
        lines.push(`- Current Shift Date: ${shiftDate}`);

        const currentUser = le.getCurrentUser ? le.getCurrentUser() : null;
        if (currentUser) {
          let userStatusStr = currentUser.status || 'not_clocked_in';
          if (currentUser.status === 'clocked_in' && currentUser.lastClockIn) {
            const sec = Math.max(0, Math.floor((Date.now() - currentUser.lastClockIn) / 1000));
            userStatusStr = `CLOCKED IN for ${le.formatDuration(sec)} (started at ${new Date(currentUser.lastClockIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`;
          } else if (currentUser.status === 'clocked_out' && currentUser.lastClockOut) {
            userStatusStr = `CLOCKED OUT at ${new Date(currentUser.lastClockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
          } else {
            userStatusStr = 'NOT CLOCKED IN YET';
          }
          lines.push(`- Active Operator: ${currentUser.name} (${currentUser.role || 'Cleanroom Specialist'}) - Shift Status: ${userStatusStr}`);
        }

        const summary = le.getSummary ? le.getSummary() : null;
        if (summary) {
          lines.push(`- Workforce Summary: ${summary.clockedIn} clocked in, ${summary.clockedOut} clocked out, ${summary.notClockedIn} not clocked in yet (${summary.total} total personnel registered).`);
        }

        lines.push(`- Workforce Roster & Shift Status:`);
        for (const w of le.workers) {
          let statusText = 'Not clocked in yet';
          if (w.status === 'clocked_in' && w.lastClockIn) {
            const sec = Math.max(0, Math.floor((Date.now() - w.lastClockIn) / 1000));
            statusText = `CLOCKED IN for ${le.formatDuration(sec)} (since ${new Date(w.lastClockIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`;
          } else if (w.status === 'clocked_out' && w.lastClockOut) {
            statusText = `CLOCKED OUT at ${new Date(w.lastClockOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
          }
          lines.push(`  * ${w.name} (${w.role || 'Cleanroom Tech'}): ${statusText}`);
        }

        if (le.isClockRunning && le.isClockRunning()) {
          const clockSec = le.getClockElapsedSeconds();
          lines.push(`- Labor Clock: RUNNING for ${le.formatDuration(clockSec)}`);
        } else {
          lines.push(`- Labor Clock: STOPPED / STANDBY`);
        }

        sections.push(`[SHIFT STATUS DATABASE]\n${lines.join('\n')}`);
      }
    } catch (e) {
      console.error('Error fetching shift status context', e);
    }

    // 2. Jobs & Cleanroom Assignments Database
    try {
      const je = window.jobsEngine;
      if (je && je.jobs) {
        const lines = [];
        const workers = (window.laborEngine && window.laborEngine.workers) || (je.getAllWorkers ? je.getAllWorkers() : []);
        const getWorkerName = (id) => {
          const found = workers.find(w => w.id === id);
          return found ? found.name : 'Unassigned';
        };

        const currentWorkerId = je.getCurrentWorkerId ? je.getCurrentWorkerId() : null;
        const activeJob = je.getActiveJob ? je.getActiveJob(currentWorkerId) : null;
        const upNextJob = je.getUpNextJob ? je.getUpNextJob(currentWorkerId) : null;

        if (activeJob) {
          const jSteps = je.getStepsForJob ? je.getStepsForJob(activeJob.id) : [];
          const doneCount = jSteps.filter(s => s.completed).length;
          const nextStep = jSteps.find(s => !s.completed);
          lines.push(`- Active Operator Current Job: "${activeJob.title}" (Priority ${activeJob.priority}) - IN PROGRESS (${doneCount} of ${jSteps.length} steps completed).`);
          if (nextStep) {
            lines.push(`  * Next Step to perform: Step ${nextStep.stepNumber}: "${nextStep.text}"`);
          }
        } else if (upNextJob) {
          const jSteps = je.getStepsForJob ? je.getStepsForJob(upNextJob.id) : [];
          lines.push(`- Active Operator Current Job: None currently started. Up next by priority is "${upNextJob.title}" (Priority ${upNextJob.priority}, ${jSteps.length} steps).`);
        } else {
          lines.push(`- Active Operator Current Job: All assigned cleanroom jobs completed.`);
        }

        const totalJobs = je.jobs.length;
        const inProgressJobs = je.jobs.filter(j => j.status === 'in_progress');
        const pendingJobs = je.jobs.filter(j => j.status === 'not_started').sort((a, b) => a.priority - b.priority);
        const completedJobs = je.jobs.filter(j => j.status === 'completed');

        lines.push(`- Facility Jobs Summary: ${totalJobs} total jobs (${completedJobs.length} completed, ${inProgressJobs.length} in progress, ${pendingJobs.length} waiting to be done).`);

        if (inProgressJobs.length > 0) {
          lines.push(`- Facility Jobs In Progress:`);
          for (const j of inProgressJobs) {
            const jSteps = je.getStepsForJob ? je.getStepsForJob(j.id) : [];
            const done = jSteps.filter(s => s.completed).length;
            lines.push(`  * "${j.title}" (Priority ${j.priority}) - Assigned to: ${getWorkerName(j.assignedWorkerId)} - Progress: ${done} of ${jSteps.length} steps done`);
          }
        } else {
          lines.push(`- Facility Jobs In Progress: None`);
        }

        if (pendingJobs.length > 0) {
          lines.push(`- Jobs Needing To Be Done (Pending Queue):`);
          for (const j of pendingJobs) {
            const jSteps = je.getStepsForJob ? je.getStepsForJob(j.id) : [];
            lines.push(`  * Priority ${j.priority}: "${j.title}" - Assigned to: ${getWorkerName(j.assignedWorkerId)} (${jSteps.length} steps) - Desc: ${j.description || 'N/A'}`);
          }
        } else {
          lines.push(`- Jobs Needing To Be Done: None pending.`);
        }

        if (completedJobs.length > 0) {
          lines.push(`- Completed Jobs List:`);
          for (const j of completedJobs) {
            const timeStr = j.completedAt ? new Date(j.completedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Earlier today';
            lines.push(`  * "${j.title}" (Priority ${j.priority}) - Completed by: ${getWorkerName(j.assignedWorkerId)} at ${timeStr}`);
          }
        } else {
          lines.push(`- Completed Jobs List: None completed yet today.`);
        }

        sections.push(`[JOBS & ASSIGNMENTS DATABASE]\n${lines.join('\n')}`);
      }
    } catch (e) {
      console.error('Error fetching jobs context', e);
    }

    return sections.length > 0 ? `\n\n=== REAL-TIME FACILITY TELEMETRY ===\n${sections.join('\n\n')}` : '';
  }

  async function ask(userText, assistantName = 'Voxel') {
    const liveTelemetry = getLiveDatabaseContext();
    const system =
      `You are ${assistantName}, a concise, witty AI assistant for an Applied Materials ` +
      `semiconductor engineering interface. Keep answers short (2-4 sentences) since they ` +
      `are read aloud. Address the user as "sir" occasionally. No markdown.\n` +
      `You have real-time live telemetry access to the facility's databases below. ` +
      `Use this accurate live data to answer any questions about who is clocked in or out, ` +
      `how long workers have been on shift, current jobs, jobs needing to be done, completed jobs, ` +
      `and labor clock status.` +
      liveTelemetry;
    history.push({ role: 'user', parts: [{ text: userText }] });
    try {
      const reply = await call(history.slice(-20), system);
      history.push({ role: 'model', parts: [{ text: reply }] });
      return reply;
    } catch (e) {
      history.pop();
      throw e;
    }
  }

  function updatePill() {
    const pill = $('geminiCorePill');
    if (pill) {
      pill.textContent = isConnected() ? 'Gemini: Online' : 'Gemini: Connect Key';
      pill.classList.toggle('offline', !isConnected());
    }
    const modeBadge = $('modeBadge');
    if (modeBadge) {
      if (isConnected()) {
        modeBadge.textContent = `Protocol: Google Gemini (${getModel()}) Active`;
        modeBadge.style.color = '#00f0ff';
      } else {
        modeBadge.textContent = 'Protocol: Applied Materials Core Intelligence';
        modeBadge.style.color = 'var(--accent-primary)';
      }
    }
  }

  function init() {
    const keyInput = $('geminiApiKey');
    const modelSelect = $('geminiModelSelect');
    if (!keyInput) return;

    keyInput.value = getKey();//Get key from geminiKey.php file
    if (modelSelect) {
      modelSelect.value = getModel();
      modelSelect.onchange = () => {
        localStorage.setItem(MODEL, modelSelect.value);
        updatePill();
      };
    }
    updatePill();

    const toggleBtn = $('toggleApiKeyVisBtn');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
      };
    }

    const saveBtn = $('saveApiKeyBtn');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const status = $('geminiVerifyStatus');
        const key = keyInput.value.trim();
        const model = modelSelect ? modelSelect.value : 'gemini-3.5';
        localStorage.setItem(KEY, key);
        localStorage.setItem(MODEL, model);
        if (status) {
          status.className = 'verify-status active pending';
          status.textContent = 'Verifying uplink...';
        }
        try {
          await call([{ role: 'user', parts: [{ text: 'Reply with the single word: online' }] }]);
          if (status) {
            status.className = 'verify-status active success';
            status.textContent = '✅ Neural core connected.';
          }
        } catch (e) {
          if (status) {
            status.className = 'verify-status active error';
            status.textContent = '❌ ' + e.message;
          }
          localStorage.removeItem(KEY);
        }
        updatePill();
      };
    }

    const clearBtn = $('clearApiKeyBtn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        localStorage.removeItem(KEY);
        localStorage.removeItem('amat_gemini_key');
        localStorage.removeItem('voxai_gemini_key');
        keyInput.value = '';
        const status = $('geminiVerifyStatus');
        if (status) {
          status.className = 'verify-status active';
          status.textContent = 'Disconnected.';
        }
        history.length = 0;
        updatePill();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { ask, isConnected, clearHistory: () => { history.length = 0; }, updatePill, getKey, getModel, getLiveDatabaseContext };
})();

// Attach to window for global access across app modules
window.GeminiAI = GeminiAI;
