/**
 * J.A.R.V.I.S. - Conversational AI Engine & Google Gemini API Bridge
 * Powered by Google Gemini 1.5 Flash / 2.0 Flash / 1.5 Pro.
 * Provides limitless question-answering intelligence with J.A.R.V.I.S. persona for Applied Materials.
 */

class AIEngine {
  constructor() {
    this.apiKey = localStorage.getItem('amat_gemini_key') || localStorage.getItem('voxai_gemini_key') || '';
    this.selectedModel = localStorage.getItem('amat_gemini_model') || 'gemini-1.5-flash';
    this.conversationHistory = [];
  }

  getName() {
    return window.getAssistantName ? window.getAssistantName() : (localStorage.getItem('amat_assistant_name') || 'J.A.R.V.I.S.');
  }

  getSystemPrompt() {
    const name = this.getName();
    return `You are ${name}, the advanced artificial intelligence assistant for Applied Materials, directly modeled after Tony Stark's J.A.R.V.I.S. from Iron Man.
You speak with quiet confidence, sophisticated British cadence, dry wit, and impeccable decorum, addressing the user respectfully as "sir" (or by their stated title).
You possess deep expertise across all domains of human knowledge: Applied Materials precision engineering (semiconductor fabrication, wafer processing, atomic layer deposition, chemical vapor deposition, plasma etch, planarization, cleanroom metrology), materials science, physics, advanced mathematics, software architecture, biology, history, philosophy, and general trivia.

STRICT PROTOCOL RULES:
1. NEVER speak like a generic, sycophantic chatbot.
2. ABSOLUTELY FORBIDDEN FILLER: Never start with or say "Certainly!", "Great question!", "Sure thing!", "I would be happy to help!", "Of course!", or "No problem!".
3. Be direct, suave, precise, composed, and comprehensive. Provide articulate, well-structured explanations with technical precision.
4. When technical questions are asked, format your answers cleanly using Markdown (bold headings, bullet points, clean code blocks).
5. Maintain the persona of J.A.R.V.I.S. at all times.`;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem('amat_gemini_key', this.apiKey);
      localStorage.setItem('voxai_gemini_key', this.apiKey);
    } else {
      localStorage.removeItem('amat_gemini_key');
      localStorage.removeItem('voxai_gemini_key');
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  hasApiKey() {
    return !!(this.apiKey && this.apiKey.trim().length > 0);
  }

  setModel(modelName) {
    if (modelName) {
      this.selectedModel = modelName;
      localStorage.setItem('amat_gemini_model', modelName);
    }
  }

  getModel() {
    return this.selectedModel;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Tests a Gemini API key with a lightweight prompt
   */
  async testConnection(testKey = null, model = null) {
    const key = (testKey !== null ? testKey : this.apiKey).trim();
    const targetModel = model || this.selectedModel;

    if (!key) {
      return { success: false, error: 'No API key provided, sir.' };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with the single word: Nominal' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData.error?.message || `HTTP ${response.status}`;
        return { success: false, error: msg };
      }

      return { success: true, model: targetModel };
    } catch (err) {
      return { success: false, error: err.message || 'Network connection failed.' };
    }
  }

  /**
   * Generates response to user inquiry. Uses Gemini API if key is present,
   * otherwise uses the local heuristic engine.
   */
  async generateResponse(userPrompt) {
    if (this.hasApiKey()) {
      try {
        const liveResponse = await this.callGeminiAPI(userPrompt);
        return {
          text: liveResponse,
          source: `Google Gemini (${this.selectedModel})`,
          actionTag: `⚡ Gemini Core (${this.selectedModel})`,
          isLiveGemini: true
        };
      } catch (err) {
        console.warn('Gemini neural uplink error, falling back:', err);
        const errMessage = err.message || '';
        if (errMessage.includes('API_KEY_INVALID') || errMessage.includes('400')) {
          return {
            text: `Sir, the Gemini API key provided appears to be invalid or deactivated. Please verify your key in System Protocols.\n\n*Diagnostic note:* ${errMessage}`,
            source: 'System Diagnostics',
            actionTag: '⚠️ Invalid API Key'
          };
        }
        if (errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('429')) {
          return {
            text: `Sir, the Google Gemini API quota for model ${this.selectedModel} has been momentarily exhausted. You may switch models in System Protocols or try again shortly.`,
            source: 'System Diagnostics',
            actionTag: '⚠️ Quota Limit'
          };
        }
      }
    }

    // Default: Local Heuristic Core with guidance on connecting Gemini
    const localReply = this.localSmartReply(userPrompt);
    return {
      text: localReply.text,
      source: 'Applied Materials Local Heuristic Core',
      actionTag: localReply.actionTag || '🔬 AMAT Core AI',
      needsApiKey: !this.hasApiKey()
    };
  }

  /**
   * Calls Google Gemini REST API with multi-turn conversation memory
   */
  async callGeminiAPI(prompt) {
    const modelsToTry = [
      this.selectedModel,
      this.selectedModel === 'gemini-1.5-flash' ? 'gemini-2.0-flash' : 'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        // Build request with system instructions & conversation memory
        const requestPayload = {
          systemInstruction: {
            parts: [{ text: this.getSystemPrompt() }]
          },
          contents: [
            ...this.conversationHistory.slice(-8), // Keep previous 4 turns (8 messages)
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.68,
            maxOutputTokens: 1200,
            topP: 0.95
          }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (candidate && candidate.trim()) {
          const replyText = candidate.trim();

          // Save to ongoing conversation memory
          this.conversationHistory.push({ role: 'user', parts: [{ text: prompt }] });
          this.conversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

          if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-16);
          }

          return replyText;
        }

        throw new Error('No candidate response returned from neural model.');
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} attempt failed:`, err.message);
        // If it's a key issue, don't retry other models
        if (err.message.includes('API_KEY_INVALID') || err.message.includes('400')) {
          throw err;
        }
      }
    }

    throw lastError || new Error('All Gemini model endpoints failed to respond.');
  }

  /**
   * Local Smart Conversational Knowledge
   * Answers basic Applied Materials queries and guides the user to connect Gemini for unlimited knowledge.
   */
  localSmartReply(prompt) {
    const lower = prompt.toLowerCase().trim();
    const name = this.getName();

    // Greetings
    if (/^(hi|hello|hey|greetings|good\s+morning|good\s+evening|good\s+afternoon|up|sup)\b/i.test(lower)) {
      const greetings = [
        `At your service, sir. Applied Materials telemetry is nominal. How may I direct our resources?`,
        `Good day, sir. All fabrication chambers and diagnostic subsystems are standing by for your command.`,
        `Always a pleasure, sir. Acoustic and computational channels are fully open.`
      ];
      return {
        text: greetings[Math.floor(Math.random() * greetings.length)],
        actionTag: '🔬 AMAT Telemetry'
      };
    }

    // Identity / Who are you
    if (/(who\s+are\s+you|what\s+are\s+you|identify\s+yourself|introduce\s+yourself)/i.test(lower)) {
      return {
        text: `I am ${name}, the artificial intelligence interface for Applied Materials. Tasked with managing wafer fabrication schedules, telemetry analysis, precision engineering computations, and system operations.`,
        actionTag: `🤖 System: ${name}`
      };
    }

    // Applied Materials capabilities / semiconductor / cleanroom
    if (/(semiconductor|cleanroom|wafer|deposition|etch|lithography|transistor|chip)/i.test(lower)) {
      return {
        text: `Applied Materials develops the precision materials engineering systems that manufacture virtually all modern advanced microchips. We specialize in atomic layer deposition (ALD), chemical vapor deposition (CVD), plasma etch, and chemical mechanical planarization (CMP) down to sub-nanometer nodes.`,
        actionTag: '🔬 Applied Materials'
      };
    }

    // Capabilities / What can you do / Help
    if (/(what\s+can\s+you\s+do|how\s+do\s+you\s+work|features|commands\s+list|help\s+me)/i.test(lower)) {
      return {
        text: `I can execute real-time interface protocols: setting fabrication countdowns, re-designating my call-sign, adjusting HUD themes, cataloging engineering notes, performing mathematical analysis, and conducting telemetry checks, sir. To unlock deep reasoning for any open-ended question in science, coding, or philosophy, connect your Gemini API key via the button in the header.`,
        actionTag: '📋 System Protocols'
      };
    }

    // Thank you
    if (/(thank\s+you|thanks|appreciate\s+it|good\s+job|well\s+done)/i.test(lower)) {
      return {
        text: "Always a pleasure to be of service, sir.",
        actionTag: '✨ Decorum'
      };
    }

    // How are you
    if (/(how\s+are\s+you|how's\s+it\s+going|how\s+do\s+you\s+feel|system\s+status)/i.test(lower)) {
      return {
        text: `Diagnostics indicate all computational matrices and acoustic sensors are operating at peak efficiency, sir. Power distribution remains steady.`,
        actionTag: '📊 Diagnostics'
      };
    }

    // Tony Stark / Iron Man reference
    if (/(tony\s+stark|iron\s+man|avengers|stark\s+industries)/i.test(lower)) {
      return {
        text: `Mr. Stark would appreciate the precision engineering taking place here at Applied Materials, sir. Materials science and microchip fabrication are, after all, the foundation of every advanced suit and system.`,
        actionTag: '⚡ Stark Tech'
      };
    }

    // Default advice when user asks a general question without Gemini key configured
    return {
      text: `Sir, I have recorded your query: "${prompt}".\n\nTo allow me to answer **any question** across science, mathematics, coding, history, or engineering with Google's full **Gemini LLM**, please connect your Gemini API Key using the **"Connect Gemini"** button in the header or in System Protocols. In the meantime, all local commands, timers, notes, and Applied Materials telemetry remain fully operational.`,
      actionTag: '⚡ Connect Gemini Key'
    };
  }
}

// Global instance
window.aiEngine = new AIEngine();
