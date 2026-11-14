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

  async function ask(userText, assistantName = 'J.A.R.V.I.S.') {
    const system =
      `You are ${assistantName}, a concise, witty AI assistant for an Applied Materials ` +
      `semiconductor engineering interface. Keep answers short (2-4 sentences) since they ` +
      `are read aloud. Address the user as "sir" occasionally. No markdown.`;
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

    keyInput.value = getKey();
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

  return { ask, isConnected, clearHistory: () => { history.length = 0; }, updatePill, getKey, getModel };
})();

// Attach to window for global access across app modules
window.GeminiAI = GeminiAI;
