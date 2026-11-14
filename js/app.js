/**
 * J.A.R.V.I.S. - Main Application Controller
 * Tailored for Applied Materials. Manages vocal sensors, execution engine, HUD visualizers,
 * customizable assistant designation, and Google Gemini AI Neural Core integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Assistant Designation / Name Customization Functions
  window.getAssistantName = function () {
    const stored = localStorage.getItem('amat_assistant_name');
    if (!stored || stored === 'J.A.R.V.I.S.' || stored === 'Jarvis') {
      return 'Voxel';
    }
    return stored;
  };

  window.setAssistantName = function (newName) {
    if (!newName || !newName.trim()) return;
    const cleanName = newName.trim();
    localStorage.setItem('amat_assistant_name', cleanName);

    // Update Header Brand Label
    const brandLabel = document.getElementById('assistantNameLabel');
    if (brandLabel) brandLabel.textContent = cleanName;

    // Update Document Title
    document.title = `${cleanName} - Applied Materials Systems Interface`;

    // Update Settings Modal Input
    const nameInput = document.getElementById('assistantNameInput');
    if (nameInput) nameInput.value = cleanName;

    // Update AI Sender labels in existing chat
    document.querySelectorAll('.message-row.ai .msg-sender').forEach(el => {
      el.textContent = `${cleanName} (Applied Materials)`;
    });

    // Update HUD & sensor status text
    const sysStatus = document.getElementById('systemStatus');
    if (sysStatus) {
      const statusText = sysStatus.querySelector('.status-text');
      if (statusText) statusText.textContent = `Standing by • Call "${cleanName}"`;
    }
    const micLabel = document.getElementById('micStatusLabel');
    if (micLabel && window.speechEngine && window.speechEngine.isListening) {
      micLabel.textContent = `Acoustic sensors active. Always listening for "${cleanName}"...`;
    }

    return cleanName;
  };

  // Operational Transcript (Start-up Screen) Controller
  window.openOperationalTranscript = function () {
    const isLaborOpen = window.laborEngine && window.laborEngine.isLaborOpen && window.laborEngine.isLaborOpen();
    const isJobsOpen = window.jobsEngine && window.jobsEngine.isJobsOpen && window.jobsEngine.isJobsOpen();

    if (window.laborEngine && window.laborEngine.isLaborOpen && window.laborEngine.isLaborOpen()) {
      window.laborEngine.closeManageLabor();
    }
    if (window.jobsEngine && window.jobsEngine.isJobsOpen && window.jobsEngine.isJobsOpen()) {
      window.jobsEngine.closeJobs();
    }

    const chatSection = document.querySelector('.chat-section');
    const actionSidebar = document.querySelector('.action-sidebar');
    const manageLaborSection = document.getElementById('manageLaborSection');
    const jobsSection = document.getElementById('jobsSection');
    const navTranscriptBtn = document.getElementById('navTranscriptBtn');
    const navLaborBtn = document.getElementById('navManageLaborBtn');
    const navJobsBtn = document.getElementById('navJobsBtn');

    if (manageLaborSection) manageLaborSection.style.display = 'none';
    if (jobsSection) jobsSection.style.display = 'none';
    if (chatSection) {
      chatSection.style.display = '';
      chatSection.classList.remove('fade-out');
      chatSection.classList.add('fade-in');
    }
    if (actionSidebar) {
      actionSidebar.style.display = '';
      actionSidebar.classList.remove('fade-out');
      actionSidebar.classList.add('fade-in');
    }

    if (navTranscriptBtn) navTranscriptBtn.classList.add('active');
    if (navLaborBtn) navLaborBtn.classList.remove('active');
    if (navJobsBtn) navJobsBtn.classList.remove('active');

    // Ensure acoustic sensors remain actively listening across tabs
    if (window.speechEngine && window.speechEngine.continuousMode && !window.speechEngine.isListening && !window.speechEngine.manualStop) {
      window.speechEngine.startListening();
    }

    if (!isLaborOpen && !isJobsOpen) {
      return 'You are already on the Operational Transcript screen, sir.';
    }
    return 'Opening Operational Transcript screen, sir.';
  };

  const navTranscriptBtn = document.getElementById('navTranscriptBtn');
  if (navTranscriptBtn) {
    navTranscriptBtn.addEventListener('click', () => {
      window.openOperationalTranscript();
    });
  }

  // Elements
  const chatMessages = document.getElementById('chatMessages');
  const inputForm = document.getElementById('inputForm');
  const textInput = document.getElementById('textInput');
  const micBtn = document.getElementById('micBtn');
  const sendBtn = document.getElementById('sendBtn');
  const micStatusLabel = document.getElementById('micStatusLabel');
  const aiOrb = document.getElementById('aiOrb');
  const systemStatus = document.getElementById('systemStatus');
  const interimBox = document.getElementById('interimBox');
  const interimText = document.getElementById('interimText');
  const ttsToggleBtn = document.getElementById('ttsToggleBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const exportChatBtn = document.getElementById('exportChatBtn');
  const themeSelect = document.getElementById('themeSelect');
  const modeBadge = document.getElementById('modeBadge');

  // Gemini Header / Modal Link
  const geminiCoreBtn = document.getElementById('geminiCoreBtn');
  const geminiApiKey = document.getElementById('geminiApiKey');

  // Modals
  const settingsModal = document.getElementById('settingsModal');
  const settingsModalBtn = document.getElementById('settingsModalBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const helpModal = document.getElementById('helpModal');
  const helpModalBtn = document.getElementById('helpModalBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');

  // Settings form elements
  const assistantNameInput = document.getElementById('assistantNameInput');
  const saveAssistantNameBtn = document.getElementById('saveAssistantNameBtn');
  const voiceGenderSelect = document.getElementById('voiceGenderSelect');
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceRate = document.getElementById('voiceRate');
  const rateValue = document.getElementById('rateValue');
  const voicePitch = document.getElementById('voicePitch');
  const pitchValue = document.getElementById('pitchValue');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const langSelect = document.getElementById('langSelect');
  const continuousMicCheck = document.getElementById('continuousMicCheck');
  const soundEffectsCheck = document.getElementById('soundEffectsCheck');

  // Sidebar widget elements (guarded for decommissioned widgets)
  const timersList = document.getElementById('timersList');
  const timerCount = document.getElementById('timerCount');
  const notesList = document.getElementById('notesList');
  const notesCount = document.getElementById('notesCount');
  const clearNotesBtn = document.getElementById('clearNotesBtn');
  const addQuickTimerBtn = document.getElementById('addQuickTimerBtn');
  const speechConfidence = document.getElementById('speechConfidence');
  const speechDuration = document.getElementById('speechDuration');
  const liveAudioPill = document.getElementById('liveAudioPill');

  // Visualizer Canvases (Sidebar Multi-Bar Frequency Equalizer)
  const liveBarsCanvas = document.getElementById('liveBarsCanvas');
  const barsCtx = liveBarsCanvas ? liveBarsCanvas.getContext('2d') : null;

  let listeningStartTime = 0;
  let listeningDurationTimer = null;
  let isAiSpeaking = false;

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & IDENTITY SETUP
     -------------------------------------------------------------------------- */
  const currentName = window.getAssistantName();
  window.setAssistantName(currentName);

  // Normalize theme to one of the 3 allowed HUD protocols: stark, dark, light
  const rawTheme = localStorage.getItem('voxai_theme') || 'stark';
  const validThemes = ['stark', 'dark', 'light'];
  const activeTheme = validThemes.includes(rawTheme) ? rawTheme : (rawTheme === 'midnight' ? 'dark' : 'stark');
  document.documentElement.setAttribute('data-theme', activeTheme);
  if (themeSelect) themeSelect.value = activeTheme;

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('voxai_theme', newTheme);
    });
  }

  // Assistant Name Input Handlers
  if (saveAssistantNameBtn && assistantNameInput) {
    saveAssistantNameBtn.addEventListener('click', () => {
      const updated = window.setAssistantName(assistantNameInput.value);
      if (updated) {
        window.speechEngine.speak(`Designation updated to ${updated}, sir.`);
        alert(`Assistant designation updated to "${updated}".`);
      }
    });

    assistantNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAssistantNameBtn.click();
      }
    });
  }

  // Gemini Core Quick Header Button: opens modal & focuses key input
  if (geminiCoreBtn) {
    geminiCoreBtn.addEventListener('click', () => {
      openModal(settingsModal);
      if (geminiApiKey) {
        setTimeout(() => geminiApiKey.focus(), 200);
      }
    });
  }

  /* --------------------------------------------------------------------------
     2. WELCOME PROTOCOL INJECTION (J.A.R.V.I.S. CADENCE)
     -------------------------------------------------------------------------- */
  function injectWelcomeMessage() {
    const name = window.getAssistantName();
    const hasKey = window.GeminiAI ? window.GeminiAI.isConnected() : false;

    const welcomeHtml = `
      <div class="message-row ai">
        <div class="avatar">AI</div>
        <div class="message-bubble">
          <div class="msg-header">
            <span class="msg-sender">${escapeHtml(name)} (Applied Materials)</span>
            <span class="input-badge">Telemetry Nominal</span>
          </div>
          <p>Good day, sir. I am <strong>${escapeHtml(name)}</strong>, the artificial intelligence interface for <strong>Applied Materials</strong>.</p>
          <p style="margin-top: 0.35rem; font-size: 0.88rem; color: var(--text-muted);">
            All wafer fabrication matrices, vacuum chambers, and acoustic sensors are calibrated and standing by.
          </p>
          <ul style="padding-left: 1.25rem; margin: 0.5rem 0; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.25rem;">
            <li>🎙️ <strong>Always-Listening Sensor:</strong> Say my designation aloud (e.g. <em>"${escapeHtml(name)}, what is the cleanroom status?"</em>) to issue directives hands-free.</li>
            <li>⌨️ <strong>Terminal Console:</strong> Enter any inquiry or directive into the prompt bar below.</li>
            <li>⚡ <strong>Google Gemini Neural Core:</strong> ${hasKey ? '<strong style="color:#00f0ff">Online & Ready to answer any question</strong>.' : 'Connect your Gemini API Key in the top header to answer any question across science, coding, and materials physics.'}</li>
            <li>🏷️ <strong>Custom Designation:</strong> Command me <em>"Change your name to [Name]"</em> or adjust it in System Protocols (⚙️).</li>
          </ul>
          <div class="action-tag success">Applied Materials Systems Online</div>
          <div class="bubble-footer">
            <button class="mini-icon-btn speak-msg-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              Vocal playback
            </button>
          </div>
        </div>
      </div>
    `;
    chatMessages.innerHTML = welcomeHtml;
    bindMessageActions(chatMessages);
  }

  injectWelcomeMessage();

  /* --------------------------------------------------------------------------
     3. SPEECH SENSOR EVENTS & DYNAMIC WAKE-WORD SYSTEM
     -------------------------------------------------------------------------- */
  const speechEngine = window.speechEngine;
  let userIsTyping = false;
  let awaitingDirectiveUntil = 0;
  let isWakeWordLocked = false;

  // Track manual typing in textInput to avoid overwriting operator input
  textInput.addEventListener('focus', () => { userIsTyping = true; });
  textInput.addEventListener('blur', () => {
    if (!textInput.value.trim()) userIsTyping = false;
  });
  textInput.addEventListener('input', () => {
    userIsTyping = !!textInput.value.trim();
  });

  /**
   * Checks whether a transcript contains the assistant's current designated name,
   * handling punctuation, spacing, letter spacing (J.A.R.V.I.S. vs Jarvis),
   * conversational prefixes ("hey", "ok", "hello"), and extracts the directive.
   */
  function parseWakeWord(transcript) {
    if (!transcript || typeof transcript !== 'string') return null;

    const rawName = (window.getAssistantName ? window.getAssistantName() : 'Voxel').trim();
    const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!cleanName) return null;

    // Comprehensive list of wake-word aliases and phonetic misrecognitions of "Voxel"
    // e.g. "voxal", "voxyl", "voxle", "vocal", "vocals", "boxel", "foxel", "vaxil", "vaxel", "voxels"
    const aliases = [
      'voxel', 'voxels', 'voxel\'s', 'voxels\'', 'voxal', 'voxall', 'voxyl', 'voxle',
      'vocal', 'vocals', 'vaxil', 'vaxel', 'boxel', 'foxel',
      'jarvis', 'friday', 'edith'
    ];
    if (!aliases.includes(cleanName)) {
      aliases.unshift(cleanName);
    }

    const spacedLetters = cleanName.split('').join('[\\s\\.]*');
    const escapedClean = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = `(?:${escapedClean}|${spacedLetters}|${aliases.join('|')})`;

    // Match wake word at start or with conversational prefix ("hey", "hi", "ok", "okay", "hello")
    const prefixWakeRegex = new RegExp(`(?:^|\\b)(?:hey|hi|hello|ok|okay)\\s+${namePattern}\\b`, 'i');
    const directWakeRegex = new RegExp(`(?:^|\\b)${namePattern}\\b`, 'i');

    const lowerTranscript = transcript.toLowerCase();
    const match = lowerTranscript.match(prefixWakeRegex) || lowerTranscript.match(directWakeRegex);

    if (!match) {
      return null;
    }

    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    let after = transcript.substring(matchEnd).trim();
    let before = transcript.substring(0, matchStart).trim();

    after = after.replace(/^[,\s:\.\-!\?]+/, '').replace(/[,\s:\.\-!\?]+$/, '').trim();
    before = before.replace(/^[,\s:\.\-!\?]+/, '').replace(/[,\s:\.\-!\?]+$/, '').trim();

    const directive = after || before || '';

    return {
      wakeWordDetected: true,
      matchedName: match[0],
      directive: directive
    };
  }

  // Toast notification for global feedback across tabs
  window.showActionToast = function (text, tag = 'Voxel Directive') {
    let container = document.getElementById('actionToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'actionToastContainer';
      container.className = 'action-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'action-toast';
    toast.innerHTML = `
      <div class="toast-dot"></div>
      <div class="toast-content">
        <strong style="font-size:0.75rem; text-transform:uppercase; color:var(--accent-primary); display:block; letter-spacing:0.04em;">${escapeHtml(tag)}</strong>
        <span style="font-size:0.88rem; color:var(--text-main); font-weight:500;">${escapeHtml(text)}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 4500);
  };

  speechEngine.onStartCallback = () => {
    micBtn.classList.add('active');
    const headerMicBtn = document.getElementById('headerMicBtn');
    const headerMicLabel = document.getElementById('headerMicLabel');
    if (headerMicBtn) headerMicBtn.classList.add('active');
    if (headerMicLabel) headerMicLabel.textContent = 'Mic: ON';

    aiOrb.className = 'ai-orb listening';
    systemStatus.className = 'status-indicator listening';
    const name = window.getAssistantName();
    systemStatus.querySelector('.status-text').textContent = `Standing by • Call "${name}"`;
    micStatusLabel.textContent = `Acoustic sensors active. Always listening for "${name}"...`;
    liveAudioPill.className = 'live-pill active';
    liveAudioPill.textContent = 'LISTENING';

    listeningStartTime = Date.now();
    clearInterval(listeningDurationTimer);
    listeningDurationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - listeningStartTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      if (speechDuration) speechDuration.textContent = `Elapsed: ${mm}:${ss}`;
    }, 500);
  };

  speechEngine.onInterimCallback = (interim) => {
    if (isAiSpeaking) return;

    const isUnlocked = Date.now() < awaitingDirectiveUntil;
    const parsed = parseWakeWord(interim);

    if (parsed && parsed.wakeWordDetected) {
      if (!isWakeWordLocked) {
        isWakeWordLocked = true;
        speechEngine.playChime('activation');
      }

      if (parsed.directive) {
        if (!userIsTyping) {
          textInput.value = parsed.directive;
        }
        interimBox.classList.add('active');
        interimText.textContent = `Directive: "${parsed.directive}"`;
      } else {
        if (!userIsTyping) {
          textInput.value = '';
        }
        interimBox.classList.add('active');
        interimText.textContent = `Awaiting directive for ${window.getAssistantName()}...`;
      }

      systemStatus.querySelector('.status-text').textContent = `${window.getAssistantName()} Active • Capturing Directive...`;
    } else if (isUnlocked && interim.trim()) {
      if (!userIsTyping) {
        textInput.value = interim.trim();
      }
      interimBox.classList.add('active');
      interimText.textContent = `Directive: "${interim.trim()}"`;
      systemStatus.querySelector('.status-text').textContent = `${window.getAssistantName()} Listening...`;
    } else {
      // Background conversation without wake word: DO NOT type into the prompt box
      if (!userIsTyping) {
        textInput.value = '';
      }
      interimBox.classList.remove('active');
      const name = window.getAssistantName();
      systemStatus.querySelector('.status-text').textContent = `Standing by • Call "${name}"`;
    }
  };

  speechEngine.onResultCallback = (finalTranscript, confidence) => {
    if (isAiSpeaking) return;

    if (speechConfidence) {
      speechConfidence.textContent = `Signal: ${(confidence * 100).toFixed(0)}% Nominal`;
    }

    const isUnlocked = Date.now() < awaitingDirectiveUntil;
    const parsed = parseWakeWord(finalTranscript);

    isWakeWordLocked = false;
    interimBox.classList.remove('active');

    if (parsed && parsed.wakeWordDetected) {
      if (parsed.directive) {
        awaitingDirectiveUntil = 0;
        const directiveText = parsed.directive;
        textInput.value = '';
        userIsTyping = false;
        handleUserInput(directiveText, 'voice');
      } else {
        // User only invoked the assistant's name (e.g. "Jarvis" or "Hey Jarvis")
        awaitingDirectiveUntil = Date.now() + 10000;
        textInput.value = '';
        userIsTyping = false;
        const name = window.getAssistantName();
        const ackReply = `At your service, sir. Standing by for directives.`;
        appendAiMessage(ackReply, `🤖 ${name} Standing By`);
        if (window.showActionToast) {
          window.showActionToast(ackReply, `🤖 ${name} Standing By`);
        }
        speechEngine.speak(ackReply);
        systemStatus.querySelector('.status-text').textContent = `Listening for directive, sir...`;
        micStatusLabel.textContent = `Awaiting your directive, sir... (10s window)`;
      }
    } else if (isUnlocked && finalTranscript.trim()) {
      awaitingDirectiveUntil = 0;
      const directiveText = finalTranscript.trim();
      textInput.value = '';
      userIsTyping = false;
      handleUserInput(directiveText, 'voice');
    } else {
      // Speech did not contain the assistant's name: discard silently
      if (!userIsTyping) {
        textInput.value = '';
      }
    }
  };

  speechEngine.onErrorCallback = (error) => {
    if (error === 'no-speech' || error === 'aborted') {
      return; // Harmless ambient events during continuous background listening
    }
    micBtn.classList.remove('active');
    const headerMicBtn = document.getElementById('headerMicBtn');
    const headerMicLabel = document.getElementById('headerMicLabel');
    if (headerMicBtn) headerMicBtn.classList.remove('active');
    if (headerMicLabel) headerMicLabel.textContent = 'Mic: OFF';

    aiOrb.className = 'ai-orb';
    systemStatus.className = 'status-indicator';
    systemStatus.querySelector('.status-text').textContent = 'Sensor Standby';
    micStatusLabel.textContent = `Acoustic status: ${error === 'not-allowed' ? 'Access denied. Please permit microphone permissions.' : error}`;
    liveAudioPill.className = 'live-pill';
    liveAudioPill.textContent = 'STANDBY';
    interimBox.classList.remove('active');
    clearInterval(listeningDurationTimer);
  };

  speechEngine.onEndCallback = () => {
    if (!speechEngine.continuousMode || speechEngine.manualStop) {
      micBtn.classList.remove('active');
      const headerMicBtn = document.getElementById('headerMicBtn');
      const headerMicLabel = document.getElementById('headerMicLabel');
      if (headerMicBtn) headerMicBtn.classList.remove('active');
      if (headerMicLabel) headerMicLabel.textContent = 'Mic: OFF';

      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'Sensor Standby';
      micStatusLabel.textContent = 'Acoustic sensors paused. Click mic to engage always-listening.';
      liveAudioPill.className = 'live-pill';
      liveAudioPill.textContent = 'STANDBY';
      interimBox.classList.remove('active');
      clearInterval(listeningDurationTimer);
    }
  };

  speechEngine.onSpeechStartCallback = () => {
    isAiSpeaking = true;
    aiOrb.className = 'ai-orb speaking';
    systemStatus.className = 'status-indicator speaking';
    systemStatus.querySelector('.status-text').textContent = `${window.getAssistantName()} Vocalizing...`;
    micStatusLabel.textContent = `${window.getAssistantName()} is speaking...`;
  };

  speechEngine.onSpeechEndCallback = () => {
    isAiSpeaking = false;
    const headerMicBtn = document.getElementById('headerMicBtn');
    const headerMicLabel = document.getElementById('headerMicLabel');
    if (speechEngine.isListening) {
      aiOrb.className = 'ai-orb listening';
      systemStatus.className = 'status-indicator listening';
      const name = window.getAssistantName();
      systemStatus.querySelector('.status-text').textContent = `Standing by • Call "${name}"`;
      micStatusLabel.textContent = `Acoustic sensors active. Always listening for "${name}"...`;
      liveAudioPill.className = 'live-pill active';
      liveAudioPill.textContent = 'LISTENING';
      if (headerMicBtn) headerMicBtn.classList.add('active');
      if (headerMicLabel) headerMicLabel.textContent = 'Mic: ON';
    } else {
      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
      if (headerMicBtn) headerMicBtn.classList.remove('active');
      if (headerMicLabel) headerMicLabel.textContent = 'Mic: OFF';
    }
  };

  micBtn.addEventListener('click', () => {
    if (!speechEngine.hasRecognition) {
      alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
      return;
    }
    speechEngine.toggleListening();
  });

  const headerMicBtn = document.getElementById('headerMicBtn');
  if (headerMicBtn) {
    headerMicBtn.addEventListener('click', () => {
      if (!speechEngine.hasRecognition) {
        alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
        return;
      }
      speechEngine.toggleListening();
    });
  }

  if (aiOrb) {
    aiOrb.style.cursor = 'pointer';
    aiOrb.setAttribute('tabindex', '0');
    aiOrb.setAttribute('role', 'button');
    aiOrb.setAttribute('aria-label', 'Toggle Acoustic Sensors (Arc Reactor)');
    aiOrb.addEventListener('click', () => {
      if (!speechEngine.hasRecognition) {
        alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
        return;
      }
      speechEngine.toggleListening();
    });
    aiOrb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        speechEngine.toggleListening();
      }
    });
  }

  /* --------------------------------------------------------------------------
     4. FORM SUBMISSION (TEXT INPUT)
     -------------------------------------------------------------------------- */
  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';
    handleUserInput(text, 'text');
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== textInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      speechEngine.toggleListening();
    }
  });

  /* --------------------------------------------------------------------------
     5. USER INPUT HANDLING & COMMAND DISPATCH
     -------------------------------------------------------------------------- */
  async function handleUserInput(text, inputType = 'text') {
    if (!text.trim()) return;

    // 1. Show user message in chat
    appendUserMessage(text, inputType);

    // 2. Try the local command handler first (timers, themes, notes, calculations, rename)
    const commandResult = window.commandEngine.process(text);

    if (commandResult && commandResult.handled) {
      appendAiMessage(commandResult.responseText, commandResult.actionTag);
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
      if (window.showActionToast) {
        window.showActionToast(commandResult.responseText, commandResult.actionTag || 'Voxel Telemetry');
      }
      speechEngine.speak(commandResult.responseText);
      return;
    }

    // 3. If local handler did NOT handle it, and Gemini is connected, call GeminiAI.ask
    sendBtn.disabled = true;
    aiOrb.className = 'ai-orb listening';
    systemStatus.querySelector('.status-text').textContent = 'Consulting Gemini neural core, sir...';

    try {
      if (window.GeminiAI && window.GeminiAI.isConnected()) {
        const assistantName = window.getAssistantName ? window.getAssistantName() : 'Voxel';
        const reply = await window.GeminiAI.ask(text, assistantName);
        appendAiMessage(reply, '⚡ Gemini AI');
        if (window.showActionToast) {
          window.showActionToast(reply, '⚡ Gemini AI');
        }
        speechEngine.speak(reply);
      } else {
        const notConnectedReply = 'Please connect a Gemini API key in Settings, sir.';
        appendAiMessage(notConnectedReply, '⚠️ Key Required', true);
        if (window.showActionToast) {
          window.showActionToast(notConnectedReply, '⚠️ Key Required');
        }
        speechEngine.speak(notConnectedReply);
      }
    } catch (err) {
      const errMsg = `Neural uplink error: ${err.message || err}`;
      appendAiMessage(errMsg, '⚠️ Uplink Error');
      if (window.showActionToast) {
        window.showActionToast(errMsg, '⚠️ Uplink Error');
      }
      speechEngine.speak(errMsg);
    } finally {
      sendBtn.disabled = false;
      aiOrb.className = 'ai-orb';
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
    }
  }

  function appendUserMessage(text, type = 'text') {
    const isVoice = type === 'voice';
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'message-row user';
    row.innerHTML = `
      <div class="avatar">${isVoice ? '🎙️' : 'U'}</div>
      <div class="message-bubble">
        <div class="msg-header">
          <span class="msg-sender">Operator</span>
          <span class="input-badge">${isVoice ? '🎙️ Vocal Sensor' : '⌨️ Terminal Input'} • ${timeStr}</span>
        </div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function appendAiMessage(rawText, actionTag = null, needsApiKey = false) {
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const name = window.getAssistantName();
    const row = document.createElement('div');
    row.className = 'message-row ai';

    let tagHtml = '';
    if (actionTag) {
      tagHtml = `<div class="action-tag success">${escapeHtml(actionTag)}</div>`;
    }

    let quickKeyBtn = '';
    if (needsApiKey) {
      quickKeyBtn = `
        <div style="margin-top: 0.6rem;">
          <button type="button" class="primary-btn quick-connect-key-btn" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
            ⚡ Connect Gemini Key (Free from Google)
          </button>
        </div>
      `;
    }

    const formattedContent = formatMarkdown(rawText);

    row.innerHTML = `
      <div class="avatar">AI</div>
      <div class="message-bubble">
        <div class="msg-header">
          <span class="msg-sender">${escapeHtml(name)} (Applied Materials)</span>
          <span class="input-badge">${timeStr}</span>
        </div>
        <div class="msg-content">${formattedContent}</div>
        ${quickKeyBtn}
        ${tagHtml}
        <div class="bubble-footer">
          <button class="mini-icon-btn speak-msg-btn" title="Read this message aloud">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Vocal playback
          </button>
          <button class="mini-icon-btn copy-msg-btn" title="Copy text">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
        </div>
      </div>
    `;
    chatMessages.appendChild(row);
    bindMessageActions(row);
    scrollToBottom();
  }

  // Expose globally for external controllers (e.g. LaborEngine)
  window.appendAiMessage = appendAiMessage;
  window.appendUserMessage = appendUserMessage;

  /**
   * Safe and clean Markdown Formatter for Gemini outputs
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // Escape raw HTML entities first to prevent injection
    let html = escapeHtml(text);

    // Code blocks with language header
    html = html.replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<div class="code-block"><div class="code-header">${lang || 'terminal'}</div><pre><code>${code.trim()}</code></pre></div>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold text (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic text (*text*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered lists
    html = html.replace(/(?:^|\n)[*-]\s+(.+)/g, (match, item) => {
      return `\n<li class="chat-list-item">${item}</li>`;
    });
    html = html.replace(/(<li class="chat-list-item">[\s\S]+?<\/li>)/g, '<ul>$1</ul>');

    // Double line breaks into paragraphs, single into breaks
    html = html.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  /**
   * Speaks concise text summary aloud, avoiding reading long code blocks or raw symbols
   */
  function speakText(rawText) {
    if (!speechEngine.ttsEnabled || !rawText) return;

    // Strip code blocks and markdown symbols for speech
    let spoken = rawText
      .replace(/```[\s\S]*?```/g, 'Code block provided on screen.')
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    // Limit vocal speech to initial 2-3 sentences or ~280 characters to keep J.A.R.V.I.S. snappy
    const sentences = spoken.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      spoken = sentences.slice(0, 3).join(' ');
    } else if (spoken.length > 280) {
      spoken = spoken.substring(0, 280) + '... Full details displayed on your HUD, sir.';
    }

    speechEngine.speak(spoken);
  }

  function bindMessageActions(container) {
    container.querySelectorAll('.speak-msg-btn').forEach(btn => {
      btn.onclick = (e) => {
        const bubble = e.target.closest('.message-bubble');
        const content = bubble.querySelector('.msg-content') || bubble.querySelector('p');
        if (content) speakText(content.textContent);
      };
    });

    container.querySelectorAll('.copy-msg-btn').forEach(btn => {
      btn.onclick = (e) => {
        const bubble = e.target.closest('.message-bubble');
        const content = bubble.querySelector('.msg-content') || bubble.querySelector('p');
        if (content) {
          navigator.clipboard.writeText(content.textContent);
          btn.innerHTML = '✓ Copied!';
          setTimeout(() => {
            btn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg> Copy`;
          }, 1500);
        }
      };
    });

    // Quick Connect Key buttons inside chat messages
    container.querySelectorAll('.quick-connect-key-btn').forEach(btn => {
      btn.onclick = () => {
        openModal(settingsModal);
        if (geminiApiKey) {
          setTimeout(() => geminiApiKey.focus(), 200);
        }
      };
    });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* --------------------------------------------------------------------------
     6. VOCAL TOGGLE BUTTON
     -------------------------------------------------------------------------- */
  ttsToggleBtn.addEventListener('click', () => {
    speechEngine.ttsEnabled = !speechEngine.ttsEnabled;
    if (speechEngine.ttsEnabled) {
      ttsToggleBtn.classList.add('active');
      ttsToggleBtn.querySelector('.btn-label').textContent = 'Vocal: ON';
    } else {
      ttsToggleBtn.classList.remove('active');
      ttsToggleBtn.querySelector('.btn-label').textContent = 'Vocal: OFF';
      speechEngine.stopSpeaking();
    }
  });

  /* --------------------------------------------------------------------------
     8. PURGE & EXPORT LOG
     -------------------------------------------------------------------------- */
  window.clearSessionChat = () => {
    chatMessages.innerHTML = '';
    if (window.GeminiAI && window.GeminiAI.clearHistory) {
      window.GeminiAI.clearHistory();
    }
    injectWelcomeMessage();
  };

  clearChatBtn.addEventListener('click', () => {
    if (confirm('Purge operational transcript, sir?')) {
      window.clearSessionChat();
    }
  });

  exportChatBtn.addEventListener('click', () => {
    const textLines = [];
    const name = window.getAssistantName();
    document.querySelectorAll('.message-row').forEach(row => {
      const sender = row.classList.contains('user') ? 'Operator' : name;
      const text = row.querySelector('.msg-content')?.textContent || row.querySelector('.message-bubble p')?.textContent || '';
      textLines.push(`[${sender}] ${text}`);
    });
    const blob = new Blob([textLines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AppliedMaterials_${name}_Transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* --------------------------------------------------------------------------
     9. DECOMMISSIONED TIMERS & NOTES HANDLERS (CLEANUP / FALLBACKS)
     -------------------------------------------------------------------------- */
  window.renderTimersList = () => {
    if (!timersList || !timerCount) return;
    const timers = window.commandEngine ? window.commandEngine.timers : [];
    timerCount.textContent = timers.length;
  };

  window.updateTimerDisplay = (id, remaining, total) => {
    const digitsEl = document.getElementById(`timer-digits-${id}`);
    const barEl = document.getElementById(`timer-bar-${id}`);
    if (digitsEl && barEl) {
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      digitsEl.textContent = `${mm}:${ss}`;
      const pct = (remaining / total) * 100;
      barEl.style.width = `${pct}%`;
    }
  };

  if (addQuickTimerBtn) {
    addQuickTimerBtn.addEventListener('click', () => {
      if (window.commandEngine) window.commandEngine.addTimer(60, '1 Minute Rapid Anneal');
    });
  }

  // Notes widget renderer (guarded)
  window.renderNotesList = () => {
    if (!notesList || !notesCount) return;
    const notes = window.commandEngine ? window.commandEngine.notes : [];
    notesCount.textContent = notes.length;
  };

  if (clearNotesBtn) {
    clearNotesBtn.addEventListener('click', () => {
      if (confirm('Purge all engineering notes, sir?')) {
        if (window.commandEngine) window.commandEngine.notes = [];
        localStorage.setItem('voxai_notes', '[]');
        window.renderNotesList();
      }
    });
  }

  // Initial renders
  window.renderTimersList();
  window.renderNotesList();

  /* --------------------------------------------------------------------------
     10. SETTINGS & HELP MODALS
     -------------------------------------------------------------------------- */
  function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  settingsModalBtn.addEventListener('click', () => {
    populateVoiceSelect();
    if (assistantNameInput) assistantNameInput.value = window.getAssistantName();
    if (window.GeminiAI && window.GeminiAI.updatePill) window.GeminiAI.updatePill();
    openModal(settingsModal);
  });
  closeSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

  helpModalBtn.addEventListener('click', () => openModal(helpModal));
  closeHelpBtn.addEventListener('click', () => closeModal(helpModal));

  [settingsModal, helpModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal(settingsModal);
      closeModal(helpModal);
    }
  });

  // Voice Gender Classification Helper
  function getVoiceGender(voice) {
    if (!voice) return 'neutral';
    const name = voice.name.toLowerCase();
    const femaleCues = [
      'female', 'hazel', 'susan', 'samantha', 'victoria', 'karen', 'catherine',
      'jenny', 'aria', 'ava', 'emma', 'sonia', 'julie', 'elena', 'anna', 'klara',
      'chiara', 'eva', 'fiona', 'moira', 'tessa', 'heera', 'natural (female)', 'cortana'
    ];
    for (const cue of femaleCues) {
      if (name.includes(cue)) return 'female';
    }
    const maleCues = [
      'male', 'george', 'oliver', 'arthur', 'daniel', 'ryan', 'guy', 'mark',
      'james', 'richard', 'thomas', 'stefan', 'paul', 'ravi', 'hemant', 'alex', 'fred',
      'bruce', 'cosimo', 'luca', 'natural (male)', 'bettany'
    ];
    for (const cue of maleCues) {
      if (name.includes(cue)) return 'male';
    }
    return 'neutral';
  }

  // Explicit Exclusion Filter:
  // - Female: Remove Microsoft Zira
  // - Male: Remove Microsoft David (en-US), Microsoft - English (United States) (en-US), and Google US English (en-US)
  function isExcludedVoice(voice, gender) {
    if (!voice || !voice.name) return false;
    const name = voice.name.toLowerCase();
    const lang = (voice.lang || '').toLowerCase();

    if (gender === 'female') {
      // Exclude Microsoft Zira
      if (name.includes('zira')) return true;
    } else if (gender === 'male') {
      // Exclude Microsoft David
      if (name.includes('david')) return true;
      // Exclude Google US English
      if (name.includes('google us english') || (name.includes('google') && lang.includes('en-us') && !name.includes('uk') && !lang.includes('gb'))) return true;
      // Exclude Microsoft - English (United States)
      if (name.includes('microsoft') && (lang.includes('en-us') || name.includes('united states') || name.includes('desktop'))) return true;
    }
    return false;
  }

  // Priority scoring for UK English voices: Google UK English Male/Female at top
  function scoreVoice(v, gender) {
    const name = v.name.toLowerCase();
    const lang = (v.lang || '').toLowerCase();

    if (gender === 'female') {
      // Google UK English Female is #1
      if (name.includes('google') && (name.includes('uk') || lang.includes('gb')) && (name.includes('female') || getVoiceGender(v) === 'female')) return 100;
      if (name.includes('google') && (name.includes('uk') || lang.includes('gb'))) return 90;
      if (lang.includes('gb') || lang.includes('ie')) return 70;
      return 10;
    } else {
      // Google UK English Male is #1
      if (name.includes('google') && (name.includes('uk') || lang.includes('gb')) && (name.includes('male') || getVoiceGender(v) === 'male')) return 100;
      if (name.includes('google') && (name.includes('uk') || lang.includes('gb'))) return 90;
      if (lang.includes('gb') && (name.includes('male') || name.includes('george') || name.includes('oliver') || name.includes('arthur'))) return 80;
      if (lang.includes('gb')) return 70;
      return 10;
    }
  }

  // Populate Voices in Settings with Male / Female / All filter
  function populateVoiceSelect() {
    if (!voiceSelect || !speechEngine.hasSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    const genderFilter = voiceGenderSelect ? voiceGenderSelect.value : (localStorage.getItem('amat_voice_gender') || 'male');
    if (voiceGenderSelect) voiceGenderSelect.value = genderFilter;

    voiceSelect.innerHTML = '';

    // Filter and sort voices
    let filtered = voices.filter(v => {
      if (isExcludedVoice(v, genderFilter)) return false;
      if (genderFilter === 'female') {
        return getVoiceGender(v) === 'female';
      } else if (genderFilter === 'male') {
        return getVoiceGender(v) === 'male' || (getVoiceGender(v) !== 'female' && v.lang.startsWith('en'));
      }
      return true;
    });

    if (filtered.length === 0) {
      filtered = voices.filter(v => !isExcludedVoice(v, genderFilter));
      if (filtered.length === 0) filtered = voices;
    }

    // Sort to prioritize Google UK English Female/Male at top
    filtered.sort((a, b) => scoreVoice(b, genderFilter) - scoreVoice(a, genderFilter));

    filtered.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const g = getVoiceGender(v);
      const isGoogleUk = v.name.includes('Google') && (v.name.includes('UK') || (v.lang && v.lang.includes('GB')));
      const icon = g === 'female' ? '👩' : (g === 'male' ? '👨' : '🗣️');
      const gLabel = g === 'female' ? 'Female' : (g === 'male' ? 'Male' : 'Voice');
      const star = isGoogleUk ? ' ⭐' : '';
      opt.textContent = `${icon}${star} [${gLabel}] ${v.name} (${v.lang})`;

      if (speechEngine.selectedVoice && speechEngine.selectedVoice.name === v.name) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });

    // Check if current selected voice is excluded or invalid
    const isCurrentExcluded = speechEngine.selectedVoice && isExcludedVoice(speechEngine.selectedVoice, genderFilter);
    if (voiceSelect.selectedIndex === -1 || isCurrentExcluded) {
      voiceSelect.selectedIndex = 0;
      const chosenName = voiceSelect.value;
      speechEngine.selectedVoice = voices.find(v => v.name === chosenName) || filtered[0];
      if (speechEngine.selectedVoice) {
        localStorage.setItem('amat_voice_name', speechEngine.selectedVoice.name);
      }
    }
  }

  // Restore saved voice preferences from localStorage
  const savedVoiceGender = localStorage.getItem('amat_voice_gender') || 'male';
  if (voiceGenderSelect) voiceGenderSelect.value = savedVoiceGender;
  if (voiceRate) {
    voiceRate.value = speechEngine.rate;
    if (rateValue) rateValue.textContent = `${speechEngine.rate.toFixed(1)}x`;
  }
  if (voicePitch) {
    voicePitch.value = speechEngine.pitch;
    if (pitchValue) pitchValue.textContent = `${speechEngine.pitch.toFixed(1)}`;
  }

  if (voiceGenderSelect) {
    voiceGenderSelect.addEventListener('change', (e) => {
      const newGender = e.target.value;
      localStorage.setItem('amat_voice_gender', newGender);
      const voices = window.speechSynthesis.getVoices();

      if (newGender === 'female') {
        // Priority: Google UK English Female (en-GB)
        const femaleVoice = voices.find(v =>
          !isExcludedVoice(v, 'female') &&
          v.name.includes('Google') && (v.name.includes('UK') || v.lang.includes('GB')) &&
          (v.name.includes('Female') || getVoiceGender(v) === 'female')
        ) || voices.find(v =>
          !isExcludedVoice(v, 'female') &&
          (v.lang === 'en-GB' || v.lang.startsWith('en-GB') || v.lang.startsWith('en-IE')) &&
          getVoiceGender(v) === 'female'
        ) || voices.find(v => !isExcludedVoice(v, 'female') && getVoiceGender(v) === 'female')
          || voices.find(v => !isExcludedVoice(v, 'female')) || voices[0];

        if (femaleVoice) {
          speechEngine.selectedVoice = femaleVoice;
          localStorage.setItem('amat_voice_name', femaleVoice.name);
        }
      } else if (newGender === 'male') {
        // Priority: Google UK English Male (en-GB)
        const maleVoice = voices.find(v =>
          !isExcludedVoice(v, 'male') &&
          v.name.includes('Google') && (v.name.includes('UK') || v.lang.includes('GB')) &&
          (v.name.includes('Male') || getVoiceGender(v) === 'male')
        ) || voices.find(v =>
          !isExcludedVoice(v, 'male') &&
          (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) &&
          (v.name.includes('Male') || v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Arthur'))
        ) || voices.find(v => !isExcludedVoice(v, 'male') && (v.lang === 'en-GB' || v.lang.startsWith('en-GB')))
          || voices.find(v => !isExcludedVoice(v, 'male')) || voices[0];

        if (maleVoice) {
          speechEngine.selectedVoice = maleVoice;
          localStorage.setItem('amat_voice_name', maleVoice.name);
        }
      }
      populateVoiceSelect();
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', (e) => {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.name === e.target.value);
      if (match) {
        speechEngine.selectedVoice = match;
        localStorage.setItem('amat_voice_name', match.name);
      }
    });
  }

  if (voiceRate) {
    voiceRate.addEventListener('input', (e) => {
      speechEngine.rate = parseFloat(e.target.value);
      if (rateValue) rateValue.textContent = `${speechEngine.rate.toFixed(2)}x`;
      localStorage.setItem('amat_voice_rate', speechEngine.rate);
    });
  }

  if (voicePitch) {
    voicePitch.addEventListener('input', (e) => {
      speechEngine.pitch = parseFloat(e.target.value);
      if (pitchValue) pitchValue.textContent = speechEngine.pitch.toFixed(2);
      localStorage.setItem('amat_voice_pitch', speechEngine.pitch);
    });
  }

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      const g = getVoiceGender(speechEngine.selectedVoice);
      const gStr = g === 'female' ? 'Female' : (g === 'male' ? 'Male' : 'Standard');
      speechEngine.speak(`At your service, sir. Vocal telemetry operational with ${gStr} profile for ${window.getAssistantName()}.`);
    });
  }

  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      populateVoiceSelect();
    };
  }

  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      speechEngine.language = e.target.value;
    });
  }

  if (continuousMicCheck) {
    continuousMicCheck.addEventListener('change', (e) => {
      speechEngine.continuousMode = e.target.checked;
    });
  }

  if (soundEffectsCheck) {
    soundEffectsCheck.addEventListener('change', (e) => {
      speechEngine.soundEffects = e.target.checked;
    });
  }

  /* --------------------------------------------------------------------------
     11. AUDIO VISUALIZERS (SIDEBAR EQUALIZER)
     -------------------------------------------------------------------------- */
  let wavePhase = 0;

  function renderVisualizers() {
    requestAnimationFrame(renderVisualizers);

    const isListening = speechEngine.isListening;
    const isSpeaking = isAiSpeaking;
    const audioData = speechEngine.getAudioData();

    // Sidebar Multi-Bar Frequency Equalizer
    if (barsCtx && liveBarsCanvas) {
      const bw = liveBarsCanvas.width;
      const bh = liveBarsCanvas.height;
      barsCtx.clearRect(0, 0, bw, bh);

      const numBars = 24;
      const barWidth = bw / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;

        if (audioData && audioData.length > 0) {
          const val = audioData[i % audioData.length];
          barHeight = Math.max(4, (val / 255) * bh * 0.9);
        } else if (isListening) {
          const dynamicSine = Math.sin(wavePhase * 1.5 + i * 0.4) * 0.5 + 0.5;
          barHeight = Math.max(5, dynamicSine * (bh * 0.75));
        } else if (isSpeaking) {
          const dynamicSine = Math.cos(wavePhase * 2 + i * 0.3) * 0.5 + 0.5;
          barHeight = Math.max(4, dynamicSine * (bh * 0.6));
        }

        const x = i * (barWidth + 2);
        const y = bh - barHeight;

        let barColor = 'rgba(0, 240, 255, 0.45)';
        if (isListening) barColor = 'rgba(239, 68, 68, 0.85)';
        else if (isSpeaking) barColor = 'rgba(245, 158, 11, 0.85)';

        barsCtx.fillStyle = barColor;
        barsCtx.fillRect(x, y, barWidth, barHeight);
      }
    }
  }

  /* --------------------------------------------------------------------------
     12. ALWAYS-LISTENING INITIALIZATION (STANDBY FOR WAKE WORD)
     -------------------------------------------------------------------------- */
  function initAutoListening() {
    if (!speechEngine.hasRecognition) {
      if (micStatusLabel) {
        micStatusLabel.textContent = 'Acoustic sensors unavailable in this browser. Use terminal text prompt.';
      }
      return;
    }

    speechEngine.continuousMode = true;
    if (continuousMicCheck) continuousMicCheck.checked = true;

    // Attempt direct start
    speechEngine.startListening();

    // Browser user-gesture fallback
    const startOnUserGesture = () => {
      if (!speechEngine.isListening && !speechEngine.manualStop) {
        speechEngine.startListening();
      }
    };
    document.addEventListener('click', startOnUserGesture, { once: true });
    document.addEventListener('keydown', startOnUserGesture, { once: true });
  }

  initAutoListening();
  renderVisualizers();
});
