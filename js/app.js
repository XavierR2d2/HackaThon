/**
 * VoxAI - Main Application Controller
 * Orchestrates UI interactions, speech workflows, visualizers, and state.
 */

document.addEventListener('DOMContentLoaded', () => {
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
  const quickChips = document.querySelectorAll('.chip-btn');
  const modeBadge = document.getElementById('modeBadge');

  // Modals
  const settingsModal = document.getElementById('settingsModal');
  const settingsModalBtn = document.getElementById('settingsModalBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const helpModal = document.getElementById('helpModal');
  const helpModalBtn = document.getElementById('helpModalBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');

  // Settings form elements
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceRate = document.getElementById('voiceRate');
  const rateValue = document.getElementById('rateValue');
  const voicePitch = document.getElementById('voicePitch');
  const pitchValue = document.getElementById('pitchValue');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const langSelect = document.getElementById('langSelect');
  const continuousMicCheck = document.getElementById('continuousMicCheck');
  const soundEffectsCheck = document.getElementById('soundEffectsCheck');
  const geminiApiKey = document.getElementById('geminiApiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');

  // Sidebar widget elements
  const timersList = document.getElementById('timersList');
  const timerCount = document.getElementById('timerCount');
  const notesList = document.getElementById('notesList');
  const notesCount = document.getElementById('notesCount');
  const clearNotesBtn = document.getElementById('clearNotesBtn');
  const addQuickTimerBtn = document.getElementById('addQuickTimerBtn');
  const speechConfidence = document.getElementById('speechConfidence');
  const speechDuration = document.getElementById('speechDuration');
  const liveAudioPill = document.getElementById('liveAudioPill');

  // Visualizer Canvases
  const waveformCanvas = document.getElementById('waveformCanvas');
  const waveCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;
  const liveBarsCanvas = document.getElementById('liveBarsCanvas');
  const barsCtx = liveBarsCanvas ? liveBarsCanvas.getContext('2d') : null;

  let listeningStartTime = 0;
  let listeningDurationTimer = null;
  let isAiSpeaking = false;

  /* --------------------------------------------------------------------------
     1. INITIALIZATION & THEME SETUP
     -------------------------------------------------------------------------- */
  const savedTheme = localStorage.getItem('voxai_theme') || 'midnight';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeSelect) themeSelect.value = savedTheme;

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('voxai_theme', newTheme);
    });
  }

  // Populate Gemini API Key field
  if (geminiApiKey) {
    geminiApiKey.value = window.aiEngine.getApiKey();
    updateModeBadge();
  }

  function updateModeBadge() {
    if (window.aiEngine.hasApiKey()) {
      modeBadge.textContent = 'Engine: Google Gemini Cloud AI Active';
      modeBadge.style.color = 'var(--accent-secondary)';
    } else {
      modeBadge.textContent = 'Engine: Built-in Smart Command Agent';
      modeBadge.style.color = 'var(--accent-primary)';
    }
  }

  /* --------------------------------------------------------------------------
     2. WELCOME MESSAGE INJECTION
     -------------------------------------------------------------------------- */
  function injectWelcomeMessage() {
    const welcomeHtml = `
      <div class="message-row ai">
        <div class="avatar">AI</div>
        <div class="message-bubble">
          <div class="msg-header">
            <span class="msg-sender">VoxAI Assistant</span>
            <span class="input-badge">System Initialized</span>
          </div>
          <p>Welcome! I am your <strong>Voice-to-Text & Command Assistant</strong>. You can:</p>
          <ul style="padding-left: 1.25rem; margin: 0.5rem 0; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.25rem;">
            <li>🎙️ <strong>Speak directly:</strong> Click the microphone or hold <code>Spacebar</code> to give voice commands.</li>
            <li>⌨️ <strong>Type normally:</strong> Type any message or command in the input box below.</li>
            <li>⚡ <strong>Try instant actions:</strong> <em>"Set timer for 45 seconds"</em>, <em>"Change theme to Cyberpunk"</em>, or <em>"Note: prepare project demo"</em>.</li>
          </ul>
          <div class="action-tag success">Ready for Voice & Text Commands</div>
          <div class="bubble-footer">
            <button class="mini-icon-btn speak-msg-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              Read aloud
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
     3. SPEECH ENGINE EVENT WIRE-UP
     -------------------------------------------------------------------------- */
  const speechEngine = window.speechEngine;

  speechEngine.onStartCallback = () => {
    micBtn.classList.add('active');
    aiOrb.className = 'ai-orb listening';
    systemStatus.className = 'status-indicator listening';
    systemStatus.querySelector('.status-text').textContent = 'Listening to speech...';
    micStatusLabel.textContent = 'Listening... Speak clearly into your microphone';
    liveAudioPill.className = 'live-pill active';
    liveAudioPill.textContent = 'MIC ON';
    interimBox.classList.add('active');
    interimText.textContent = 'Listening...';

    listeningStartTime = Date.now();
    clearInterval(listeningDurationTimer);
    listeningDurationTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - listeningStartTime) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      if (speechDuration) speechDuration.textContent = `Duration: ${mm}:${ss}`;
    }, 500);
  };

  speechEngine.onInterimCallback = (interim) => {
    if (interimText) {
      interimText.textContent = `"${interim}"`;
    }
  };

  speechEngine.onResultCallback = (finalTranscript, confidence) => {
    if (speechConfidence) {
      speechConfidence.textContent = `Confidence: ${(confidence * 100).toFixed(0)}%`;
    }
    interimBox.classList.remove('active');
    handleUserInput(finalTranscript, 'voice');
  };

  speechEngine.onErrorCallback = (error) => {
    micBtn.classList.remove('active');
    aiOrb.className = 'ai-orb';
    systemStatus.className = 'status-indicator';
    systemStatus.querySelector('.status-text').textContent = 'Microphone idle';
    micStatusLabel.textContent = `Mic status: ${error === 'not-allowed' ? 'Access denied. Please permit microphone permissions.' : error}`;
    liveAudioPill.className = 'live-pill';
    liveAudioPill.textContent = 'IDLE';
    interimBox.classList.remove('active');
    clearInterval(listeningDurationTimer);
  };

  speechEngine.onEndCallback = () => {
    if (!speechEngine.continuousMode) {
      micBtn.classList.remove('active');
      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'System Ready';
      micStatusLabel.textContent = 'Microphone ready. Click mic or type commands.';
      liveAudioPill.className = 'live-pill';
      liveAudioPill.textContent = 'IDLE';
      interimBox.classList.remove('active');
      clearInterval(listeningDurationTimer);
    }
  };

  speechEngine.onSpeechStartCallback = () => {
    isAiSpeaking = true;
    aiOrb.className = 'ai-orb speaking';
    systemStatus.className = 'status-indicator speaking';
    systemStatus.querySelector('.status-text').textContent = 'AI Speaking...';
  };

  speechEngine.onSpeechEndCallback = () => {
    isAiSpeaking = false;
    if (!speechEngine.isListening) {
      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'System Ready';
    }
  };

  // Mic Button Click handler
  micBtn.addEventListener('click', () => {
    if (!speechEngine.hasRecognition) {
      alert('Your browser does not support Speech Recognition. Please try Google Chrome, Microsoft Edge, or a modern Chromium browser.');
      return;
    }
    speechEngine.toggleListening();
  });

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

  // Global hotkey: Press Space to toggle mic when not typing in an input
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

    // 1. Render User message in feed
    appendUserMessage(text, inputType);

    // 2. Set system to processing
    aiOrb.className = 'ai-orb';
    systemStatus.querySelector('.status-text').textContent = 'Processing request...';

    // 3. Test actionable command engine first
    const commandResult = window.commandEngine.process(text);

    if (commandResult && commandResult.handled) {
      // Direct command handled!
      setTimeout(() => {
        appendAiMessage(commandResult.responseText, commandResult.actionTag);
        systemStatus.querySelector('.status-text').textContent = 'System Ready';
        speechEngine.speak(commandResult.responseText);
      }, 250);
      return;
    }

    // 4. Fallback to intelligent conversational AI engine
    try {
      const aiResult = await window.aiEngine.generateResponse(text);
      appendAiMessage(aiResult.text, aiResult.actionTag || '⚡ AI Response');
      systemStatus.querySelector('.status-text').textContent = 'System Ready';
      speechEngine.speak(aiResult.text);
    } catch (err) {
      console.error('AI response error:', err);
      appendAiMessage(`I processed your input: "${text}". For full generative answers, you can add an optional Gemini API key in Settings.`, '⚠️ System Note');
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
          <span class="msg-sender">You</span>
          <span class="input-badge">${isVoice ? '🎙️ Spoken Voice' : '⌨️ Typed Text'} • ${timeStr}</span>
        </div>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function appendAiMessage(text, actionTag = null) {
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = 'message-row ai';

    let tagHtml = '';
    if (actionTag) {
      tagHtml = `<div class="action-tag success">${escapeHtml(actionTag)}</div>`;
    }

    row.innerHTML = `
      <div class="avatar">AI</div>
      <div class="message-bubble">
        <div class="msg-header">
          <span class="msg-sender">VoxAI</span>
          <span class="input-badge">${timeStr}</span>
        </div>
        <p>${escapeHtml(text)}</p>
        ${tagHtml}
        <div class="bubble-footer">
          <button class="mini-icon-btn speak-msg-btn" title="Read this message aloud">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Read aloud
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

  function bindMessageActions(container) {
    // Read aloud button
    container.querySelectorAll('.speak-msg-btn').forEach(btn => {
      btn.onclick = (e) => {
        const bubble = e.target.closest('.message-bubble');
        const p = bubble.querySelector('p');
        if (p) speechEngine.speak(p.textContent);
      };
    });

    // Copy button
    container.querySelectorAll('.copy-msg-btn').forEach(btn => {
      btn.onclick = (e) => {
        const bubble = e.target.closest('.message-bubble');
        const p = bubble.querySelector('p');
        if (p) {
          navigator.clipboard.writeText(p.textContent);
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
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* --------------------------------------------------------------------------
     6. CHIP BUTTONS (QUICK COMMANDS)
     -------------------------------------------------------------------------- */
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-command');
      if (cmd) {
        handleUserInput(cmd, 'text');
      }
    });
  });

  /* --------------------------------------------------------------------------
     7. TTS TOGGLE BUTTON
     -------------------------------------------------------------------------- */
  ttsToggleBtn.addEventListener('click', () => {
    speechEngine.ttsEnabled = !speechEngine.ttsEnabled;
    if (speechEngine.ttsEnabled) {
      ttsToggleBtn.classList.add('active');
      ttsToggleBtn.querySelector('.btn-label').textContent = 'Voice: ON';
    } else {
      ttsToggleBtn.classList.remove('active');
      ttsToggleBtn.querySelector('.btn-label').textContent = 'Voice: OFF';
      speechEngine.stopSpeaking();
    }
  });

  /* --------------------------------------------------------------------------
     8. CLEAR & EXPORT TRANSCRIPT
     -------------------------------------------------------------------------- */
  window.clearSessionChat = () => {
    chatMessages.innerHTML = '';
    injectWelcomeMessage();
  };

  clearChatBtn.addEventListener('click', () => {
    if (confirm('Clear chat session history?')) {
      window.clearSessionChat();
    }
  });

  exportChatBtn.addEventListener('click', () => {
    const textLines = [];
    document.querySelectorAll('.message-row').forEach(row => {
      const sender = row.classList.contains('user') ? 'User' : 'VoxAI';
      const text = row.querySelector('.message-bubble p')?.textContent || '';
      textLines.push(`[${sender}] ${text}`);
    });
    const blob = new Blob([textLines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VoxAI_Transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  /* --------------------------------------------------------------------------
     9. ACTIVE TIMERS & NOTES WIDGET RENDERERS
     -------------------------------------------------------------------------- */
  window.renderTimersList = () => {
    const timers = window.commandEngine.timers;
    timerCount.textContent = timers.length;

    if (timers.length === 0) {
      timersList.innerHTML = `
        <div class="empty-state" id="emptyTimers">
          <p>No active timers.</p>
          <small>Try saying: <em>"Set timer for 2 minutes"</em></small>
        </div>
      `;
      return;
    }

    timersList.innerHTML = '';
    timers.forEach(t => {
      const item = document.createElement('div');
      item.className = `timer-item ${t.status === 'finished' ? 'ringing' : ''}`;
      item.id = `timer-item-${t.id}`;

      const pct = t.totalSeconds > 0 ? (t.remaining / t.totalSeconds) * 100 : 0;
      const mm = String(Math.floor(t.remaining / 60)).padStart(2, '0');
      const ss = String(t.remaining % 60).padStart(2, '0');

      item.innerHTML = `
        <div class="timer-header">
          <span class="timer-label">${escapeHtml(t.label)}</span>
          <span class="timer-digits" id="timer-digits-${t.id}">${t.status === 'finished' ? '⏰ DONE!' : `${mm}:${ss}`}</span>
        </div>
        <div class="timer-progress">
          <div class="timer-bar" id="timer-bar-${t.id}" style="width: ${pct}%"></div>
        </div>
        <div class="timer-controls">
          <button class="mini-icon-btn" onclick="window.commandEngine.removeTimer(${t.id})">Dismiss</button>
        </div>
      `;
      timersList.appendChild(item);
    });
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

  addQuickTimerBtn.addEventListener('click', () => {
    window.commandEngine.addTimer(60, '1 Minute Quick Timer');
  });

  // Notes widget renderer
  window.renderNotesList = () => {
    const notes = window.commandEngine.notes;
    notesCount.textContent = notes.length;

    if (notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state" id="emptyNotes">
          <p>No notes saved yet.</p>
          <small>Try saying: <em>"Note: Buy coffee beans"</em></small>
        </div>
      `;
      return;
    }

    notesList.innerHTML = '';
    notes.forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item';
      item.innerHTML = `
        <div class="note-text">
          <div>${escapeHtml(note.text)}</div>
          <small style="color: var(--text-dim); font-size: 0.68rem;">${note.time}</small>
        </div>
        <button class="note-delete-btn" title="Delete note" onclick="window.commandEngine.deleteNote(${note.id})">&times;</button>
      `;
      notesList.appendChild(item);
    });
  };

  clearNotesBtn.addEventListener('click', () => {
    if (confirm('Clear all notes?')) {
      window.commandEngine.notes = [];
      localStorage.setItem('voxai_notes', '[]');
      window.renderNotesList();
    }
  });

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

  // Populate Voices in Settings
  function populateVoiceSelect() {
    if (!voiceSelect || !speechEngine.hasSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="">Default System Voice</option>';
    voices.forEach((v, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${v.name} (${v.lang})`;
      if (speechEngine.selectedVoice && speechEngine.selectedVoice.name === v.name) {
        opt.selected = true;
      }
      voiceSelect.appendChild(opt);
    });
  }

  if (voiceSelect) {
    voiceSelect.addEventListener('change', (e) => {
      const voices = window.speechSynthesis.getVoices();
      if (e.target.value !== '') {
        speechEngine.selectedVoice = voices[parseInt(e.target.value, 10)];
      } else {
        speechEngine.selectedVoice = null;
      }
    });
  }

  if (voiceRate) {
    voiceRate.addEventListener('input', (e) => {
      speechEngine.rate = parseFloat(e.target.value);
      if (rateValue) rateValue.textContent = `${speechEngine.rate.toFixed(1)}x`;
    });
  }

  if (voicePitch) {
    voicePitch.addEventListener('input', (e) => {
      speechEngine.pitch = parseFloat(e.target.value);
      if (pitchValue) pitchValue.textContent = speechEngine.pitch.toFixed(1);
    });
  }

  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', () => {
      speechEngine.speak('Hello! This is a test of your configured VoxAI voice engine.');
    });
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

  if (saveApiKeyBtn && geminiApiKey) {
    saveApiKeyBtn.addEventListener('click', () => {
      window.aiEngine.setApiKey(geminiApiKey.value);
      updateModeBadge();
      alert('Gemini API key saved! VoxAI will now utilize Gemini Cloud AI.');
    });
  }

  if (clearApiKeyBtn && geminiApiKey) {
    clearApiKeyBtn.addEventListener('click', () => {
      geminiApiKey.value = '';
      window.aiEngine.setApiKey('');
      updateModeBadge();
      alert('Gemini API key cleared. Reverted to built-in smart command agent.');
    });
  }

  /* --------------------------------------------------------------------------
     11. AUDIO VISUALIZERS (HEADER WAVE & SIDEBAR FREQUENCY BARS)
     -------------------------------------------------------------------------- */
  let wavePhase = 0;

  function renderVisualizers() {
    requestAnimationFrame(renderVisualizers);

    const isListening = speechEngine.isListening;
    const isSpeaking = isAiSpeaking;
    const audioData = speechEngine.getAudioData();

    // 1. Header Smooth Waveform
    if (waveCtx && waveformCanvas) {
      const w = waveformCanvas.width;
      const h = waveformCanvas.height;
      waveCtx.clearRect(0, 0, w, h);

      waveCtx.lineWidth = 2;
      let strokeColor = '#6366f1';
      if (isListening) strokeColor = '#ef4444';
      else if (isSpeaking) strokeColor = '#06b6d4';

      waveCtx.strokeStyle = strokeColor;
      waveCtx.beginPath();

      const centerY = h / 2;
      const amplitude = (isListening || isSpeaking) ? 14 : 3;
      const frequency = (isListening || isSpeaking) ? 0.05 : 0.02;

      for (let x = 0; x < w; x++) {
        const y = centerY + Math.sin(x * frequency + wavePhase) * amplitude;
        if (x === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
      }
      waveCtx.stroke();
      wavePhase += (isListening || isSpeaking) ? 0.12 : 0.025;
    }

    // 2. Sidebar Multi-Bar Frequency Equalizer
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
          // Dynamic simulated frequency waves when media stream isn't accessible
          const dynamicSine = Math.sin(wavePhase * 1.5 + i * 0.4) * 0.5 + 0.5;
          barHeight = Math.max(5, dynamicSine * (bh * 0.75));
        } else if (isSpeaking) {
          const dynamicSine = Math.cos(wavePhase * 2 + i * 0.3) * 0.5 + 0.5;
          barHeight = Math.max(4, dynamicSine * (bh * 0.6));
        }

        const x = i * (barWidth + 2);
        const y = bh - barHeight;

        let barColor = 'rgba(99, 102, 241, 0.4)';
        if (isListening) barColor = 'rgba(239, 68, 68, 0.8)';
        else if (isSpeaking) barColor = 'rgba(6, 182, 212, 0.8)';

        barsCtx.fillStyle = barColor;
        barsCtx.fillRect(x, y, barWidth, barHeight);
      }
    }
  }

  renderVisualizers();
});
