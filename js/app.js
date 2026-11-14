/**
 * J.A.R.V.I.S. - Main Application Controller
 * Tailored for Applied Materials. Manages vocal sensors, execution engine, HUD visualizers,
 * customizable assistant designation, and Google Gemini AI Neural Core integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Assistant Designation / Name Customization Functions
  window.getAssistantName = function() {
    return localStorage.getItem('amat_assistant_name') || 'J.A.R.V.I.S.';
  };

  window.setAssistantName = function(newName) {
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

    return cleanName;
  };

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

  // Gemini UI elements
  const geminiCoreBtn = document.getElementById('geminiCoreBtn');
  const geminiCorePill = document.getElementById('geminiCorePill');
  const geminiApiKey = document.getElementById('geminiApiKey');
  const geminiModelSelect = document.getElementById('geminiModelSelect');
  const toggleApiKeyVisBtn = document.getElementById('toggleApiKeyVisBtn');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
  const geminiVerifyStatus = document.getElementById('geminiVerifyStatus');

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
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceRate = document.getElementById('voiceRate');
  const rateValue = document.getElementById('rateValue');
  const voicePitch = document.getElementById('voicePitch');
  const pitchValue = document.getElementById('pitchValue');
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  const langSelect = document.getElementById('langSelect');
  const continuousMicCheck = document.getElementById('continuousMicCheck');
  const soundEffectsCheck = document.getElementById('soundEffectsCheck');

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
     1. INITIALIZATION & IDENTITY SETUP
     -------------------------------------------------------------------------- */
  const currentName = window.getAssistantName();
  window.setAssistantName(currentName);

  const savedTheme = localStorage.getItem('voxai_theme') || 'stark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeSelect) themeSelect.value = savedTheme;

  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      const newTheme = e.target.value;
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('voxai_theme', newTheme);
    });
  }

  // Sync Gemini key and model settings
  if (geminiApiKey) {
    geminiApiKey.value = window.aiEngine.getApiKey();
  }
  if (geminiModelSelect) {
    geminiModelSelect.value = window.aiEngine.getModel();
    geminiModelSelect.addEventListener('change', (e) => {
      window.aiEngine.setModel(e.target.value);
      updateModeBadge();
    });
  }

  function updateModeBadge() {
    const hasKey = window.aiEngine.hasApiKey();
    const model = window.aiEngine.getModel();

    if (hasKey) {
      modeBadge.textContent = `Protocol: Google Gemini Cloud (${model}) Active`;
      modeBadge.style.color = '#00f0ff';
      if (geminiCorePill) {
        geminiCorePill.className = 'core-pill online';
        geminiCorePill.textContent = `🟢 Gemini: ${model}`;
      }
    } else {
      modeBadge.textContent = 'Protocol: Applied Materials Core Intelligence';
      modeBadge.style.color = 'var(--accent-primary)';
      if (geminiCorePill) {
        geminiCorePill.className = 'core-pill offline';
        geminiCorePill.textContent = '⚡ Connect Gemini Key';
      }
    }
  }

  updateModeBadge();

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

  // Toggle API Key visibility
  if (toggleApiKeyVisBtn && geminiApiKey) {
    toggleApiKeyVisBtn.addEventListener('click', () => {
      if (geminiApiKey.type === 'password') {
        geminiApiKey.type = 'text';
        toggleApiKeyVisBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>`;
      } else {
        geminiApiKey.type = 'password';
        toggleApiKeyVisBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>`;
      }
    });
  }

  // Gemini Save & Verify Key Handler
  if (saveApiKeyBtn && geminiApiKey) {
    saveApiKeyBtn.addEventListener('click', async () => {
      const keyVal = geminiApiKey.value.trim();
      const modelVal = geminiModelSelect ? geminiModelSelect.value : 'gemini-1.5-flash';

      if (!keyVal) {
        showVerifyStatus('Please enter a valid Google Gemini API Key, sir.', 'error');
        return;
      }

      showVerifyStatus('Testing neural uplink to Google Gemini...', 'pending');
      saveApiKeyBtn.disabled = true;

      try {
        const testResult = await window.aiEngine.testConnection(keyVal, modelVal);

        if (testResult.success) {
          window.aiEngine.setApiKey(keyVal);
          window.aiEngine.setModel(modelVal);
          updateModeBadge();
          showVerifyStatus(`✓ Uplink Established! Model: ${modelVal} ready.`, 'success');
          window.speechEngine.playChime('start');
          window.speechEngine.speak(`Neural uplink to Google Gemini established, sir. Cognitive core is fully operational.`);
        } else {
          showVerifyStatus(`⚠️ Verification failed: ${testResult.error}`, 'error');
        }
      } catch (err) {
        showVerifyStatus(`⚠️ Connection error: ${err.message}`, 'error');
      } finally {
        saveApiKeyBtn.disabled = false;
      }
    });
  }

  // Gemini Clear Key Handler
  if (clearApiKeyBtn && geminiApiKey) {
    clearApiKeyBtn.addEventListener('click', () => {
      geminiApiKey.value = '';
      window.aiEngine.setApiKey('');
      updateModeBadge();
      showVerifyStatus('Key purged. Returned to Applied Materials local intelligence core.', 'pending');
    });
  }

  function showVerifyStatus(msg, type) {
    if (!geminiVerifyStatus) return;
    geminiVerifyStatus.className = `verify-status active ${type}`;
    geminiVerifyStatus.textContent = msg;
  }

  /* --------------------------------------------------------------------------
     2. WELCOME PROTOCOL INJECTION (J.A.R.V.I.S. CADENCE)
     -------------------------------------------------------------------------- */
  function injectWelcomeMessage() {
    const name = window.getAssistantName();
    const hasKey = window.aiEngine.hasApiKey();

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
            <li>🎙️ <strong>Acoustic Protocol:</strong> Click the Arc Reactor icon or hold <code>Spacebar</code> to give verbal commands.</li>
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
     3. SPEECH SENSOR EVENTS
     -------------------------------------------------------------------------- */
  const speechEngine = window.speechEngine;

  speechEngine.onStartCallback = () => {
    micBtn.classList.add('active');
    aiOrb.className = 'ai-orb listening';
    systemStatus.className = 'status-indicator listening';
    systemStatus.querySelector('.status-text').textContent = 'Acoustic Sensors Active...';
    micStatusLabel.textContent = 'Listening to speech telemetry... Speak into microphone';
    liveAudioPill.className = 'live-pill active';
    liveAudioPill.textContent = 'TRANSMITTING';
    interimBox.classList.add('active');
    interimText.textContent = 'Awaiting vocal stream...';

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
    if (interimText) {
      interimText.textContent = `"${interim}"`;
    }
  };

  speechEngine.onResultCallback = (finalTranscript, confidence) => {
    if (speechConfidence) {
      speechConfidence.textContent = `Signal: ${(confidence * 100).toFixed(0)}% Nominal`;
    }
    interimBox.classList.remove('active');
    handleUserInput(finalTranscript, 'voice');
  };

  speechEngine.onErrorCallback = (error) => {
    micBtn.classList.remove('active');
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
    if (!speechEngine.continuousMode) {
      micBtn.classList.remove('active');
      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
      micStatusLabel.textContent = 'Acoustic sensors calibrated. Click mic or type commands.';
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
  };

  speechEngine.onSpeechEndCallback = () => {
    isAiSpeaking = false;
    if (!speechEngine.isListening) {
      aiOrb.className = 'ai-orb';
      systemStatus.className = 'status-indicator';
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
    }
  };

  micBtn.addEventListener('click', () => {
    if (!speechEngine.hasRecognition) {
      alert('Your browser does not support Speech Recognition. Please run on Google Chrome or Microsoft Edge.');
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
    systemStatus.querySelector('.status-text').textContent = 'Consulting neural matrices, sir...';

    // 3. Test actionable command engine first (timers, notes, theme changes, identity)
    const commandResult = window.commandEngine.process(text);

    if (commandResult && commandResult.handled) {
      setTimeout(() => {
        appendAiMessage(commandResult.responseText, commandResult.actionTag);
        systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
        speakText(commandResult.responseText);
      }, 200);
      return;
    }

    // 4. Fallback to Google Gemini AI Neural Core or intelligent heuristic
    try {
      const aiResult = await window.aiEngine.generateResponse(text);
      appendAiMessage(aiResult.text, aiResult.actionTag || '⚡ Gemini Core', aiResult.needsApiKey);
      systemStatus.querySelector('.status-text').textContent = 'All Systems Nominal';
      speakText(aiResult.text);
    } catch (err) {
      console.error('AI telemetry error:', err);
      appendAiMessage(`I processed your directive: "${text}". Standing by for further instructions, sir.`, '⚠️ System Telemetry');
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
     6. QUICK PROTOCOL CHIPS
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
     7. VOCAL TOGGLE BUTTON
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
    window.aiEngine.clearHistory();
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
     9. COUNTDOWNS & ENGINEERING LOGS RENDERERS
     -------------------------------------------------------------------------- */
  window.renderTimersList = () => {
    const timers = window.commandEngine.timers;
    timerCount.textContent = timers.length;

    if (timers.length === 0) {
      timersList.innerHTML = `
        <div class="empty-state" id="emptyTimers">
          <p>No active countdowns, sir.</p>
          <small>Try: <em>"Set timer for 45 seconds"</em></small>
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
          <span class="timer-digits" id="timer-digits-${t.id}">${t.status === 'finished' ? '⏰ EXPIRED' : `${mm}:${ss}`}</span>
        </div>
        <div class="timer-progress">
          <div class="timer-bar" id="timer-bar-${t.id}" style="width: ${pct}%"></div>
        </div>
        <div class="timer-controls">
          <button class="mini-icon-btn" onclick="window.commandEngine.removeTimer(${t.id})">Acknowledge</button>
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
    window.commandEngine.addTimer(60, '1 Minute Rapid Anneal');
  });

  // Notes widget renderer
  window.renderNotesList = () => {
    const notes = window.commandEngine.notes;
    notesCount.textContent = notes.length;

    if (notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state" id="emptyNotes">
          <p>Log is clear, sir.</p>
          <small>Try: <em>"Take note: Calibration complete"</em></small>
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
        <button class="note-delete-btn" title="Purge entry" onclick="window.commandEngine.deleteNote(${note.id})">&times;</button>
      `;
      notesList.appendChild(item);
    });
  };

  clearNotesBtn.addEventListener('click', () => {
    if (confirm('Purge all engineering notes, sir?')) {
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
    if (assistantNameInput) assistantNameInput.value = window.getAssistantName();
    if (geminiApiKey) geminiApiKey.value = window.aiEngine.getApiKey();
    if (geminiModelSelect) geminiModelSelect.value = window.aiEngine.getModel();
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
      speechEngine.speak(`At your service, sir. Vocal synthesis module online for ${window.getAssistantName()}.`);
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

  /* --------------------------------------------------------------------------
     11. AUDIO VISUALIZERS (HEADER WAVE & SIDEBAR EQUALIZER)
     -------------------------------------------------------------------------- */
  let wavePhase = 0;

  function renderVisualizers() {
    requestAnimationFrame(renderVisualizers);

    const isListening = speechEngine.isListening;
    const isSpeaking = isAiSpeaking;
    const audioData = speechEngine.getAudioData();

    // 1. Header Smooth Sinusoidal HUD Waveform
    if (waveCtx && waveformCanvas) {
      const w = waveformCanvas.width;
      const h = waveformCanvas.height;
      waveCtx.clearRect(0, 0, w, h);

      waveCtx.lineWidth = 2;
      let strokeColor = '#00f0ff';
      if (isListening) strokeColor = '#ef4444';
      else if (isSpeaking) strokeColor = '#f59e0b';

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

  renderVisualizers();
});
