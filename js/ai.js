/**
 * VoxAI - Conversational AI Engine & API Bridge
 * Handles conversational queries with a built-in knowledge engine,
 * plus optional integration with Google Gemini API when an API key is provided.
 */

class AIEngine {
  constructor() {
    this.apiKey = localStorage.getItem('voxai_gemini_key') || '';
    this.history = [];
    this.systemPrompt = `You are VoxAI, an intelligent voice and text assistant built for speed and clarity. Keep voice responses concise (1 to 3 sentences) unless asked for details.`;
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (this.apiKey) {
      localStorage.setItem('voxai_gemini_key', this.apiKey);
    } else {
      localStorage.removeItem('voxai_gemini_key');
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  hasApiKey() {
    return !!this.apiKey;
  }

  /**
   * Responds to user prompt. Uses Gemini API if key is present, otherwise built-in engine.
   */
  async generateResponse(userPrompt) {
    // If user provided a Gemini key, attempt live Gemini API call
    if (this.hasApiKey()) {
      try {
        const liveResponse = await this.callGeminiAPI(userPrompt);
        return {
          text: liveResponse,
          source: 'Gemini 1.5 Flash (Cloud API)',
          actionTag: '✨ Gemini Cloud AI'
        };
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local engine:', err);
      }
    }

    // Default: Fast intelligent local conversational engine
    const localReply = this.localSmartReply(userPrompt);
    return {
      text: localReply,
      source: 'VoxAI Built-in Neural Engine',
      actionTag: '⚡ Local AI'
    };
  }

  /**
   * Calls Google Gemini REST API (gemini-1.5-flash)
   */
  async callGeminiAPI(prompt) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${this.systemPrompt}\nUser says: ${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      return candidate.trim();
    }
    throw new Error('No candidate returned from Gemini API.');
  }

  /**
   * Local Smart Conversational Knowledge & Intent Matcher
   */
  localSmartReply(prompt) {
    const lower = prompt.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|greetings|good\s+morning|good\s+evening|what's\s+up|sup)\b/i.test(lower)) {
      const greetings = [
        "Hello! I'm VoxAI. You can speak or type to me anytime. Try asking me to set a timer or take a note!",
        "Hey there! Ready to assist. You can talk to me with voice commands or type your questions.",
        "Good to hear from you! What would you like to accomplish today?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // Identity / Who are you
    if (/(who\s+are\s+you|what\s+are\s+you|what\s+is\s+voxai|introduce\s+yourself)/i.test(lower)) {
      return "I am VoxAI, an interactive voice and text AI assistant. I can execute live commands on this website, manage your timers, capture notes, calculate math, switch themes, and speak back to you.";
    }

    // Capabilities / What can you do / Help
    if (/(what\s+can\s+you\s+do|how\s+do\s+you\s+work|features|commands\s+list|help\s+me)/i.test(lower)) {
      return "I can listen to your voice or read your typed text! You can command me to: 1) Set countdown timers, 2) Change the UI theme (try 'Change theme to cyberpunk'), 3) Save notes and tasks, 4) Solve math and calculate tips, 5) Search Google, or 6) Converse and speak responses aloud.";
    }

    // Thank you
    if (/(thank\s+you|thanks|appreciate\s+it|good\s+job|awesome)/i.test(lower)) {
      return "You're very welcome! I'm always here if you have more commands or questions.";
    }

    // How are you
    if (/(how\s+are\s+you|how's\s+it\s+going|how\s+do\s+you\s+feel)/i.test(lower)) {
      return "All systems are operational and my audio visualizer is running smoothly! How can I assist your workflow?";
    }

    // Weather query
    if (/(weather|forecast|rain|temperature)/i.test(lower)) {
      return "To check live weather in your exact city, try asking: 'Search for current weather in [Your City]' and I will pull up real-time radar for you!";
    }

    // Coding / Web development
    if (/(javascript|python|html|css|coding|programming|api)/i.test(lower)) {
      return "I love tech and software engineering! This application combines the browser's Web Speech API (SpeechRecognition & SpeechSynthesis) with the Web Audio API for real-time waveform visualization.";
    }

    // General knowledge questions
    if (/^why\s+is\s+the\s+sky\s+blue/i.test(lower)) {
      return "The sky appears blue because of Rayleigh scattering. Earth's atmosphere scatters shorter wavelengths of light (blue and violet) much more than longer wavelengths.";
    }

    if (/capital\s+of\s+([a-zA-Z\s]+)/i.test(lower)) {
      const countryMatch = lower.match(/capital\s+of\s+([a-zA-Z\s]+)/i);
      const country = countryMatch[1].trim();
      const capitals = {
        'france': 'Paris',
        'japan': 'Tokyo',
        'germany': 'Berlin',
        'italy': 'Rome',
        'canada': 'Ottawa',
        'australia': 'Canberra',
        'spain': 'Madrid',
        'united states': 'Washington, D.C.',
        'usa': 'Washington, D.C.',
        'uk': 'London',
        'united kingdom': 'London'
      };
      if (capitals[country]) {
        return `The capital of ${country.toUpperCase()} is ${capitals[country]}.`;
      }
    }

    // Fallback intelligent summary
    const reflections = [
      `I noted: "${prompt}". I've recorded this in your session transcript. You can also give me actionable commands like setting timers or taking notes!`,
      `Interesting query! While in local offline mode, I've logged your input: "${prompt}". For open-ended generative writing, you can also link a Gemini API key in Settings!`,
      `Understood. I processed your request: "${prompt}". If this was meant as an action, try commands like "Set timer for 2 minutes" or "Take note: [your task]".`
    ];

    return reflections[Math.floor(Math.random() * reflections.length)];
  }
}

// Global instance
window.aiEngine = new AIEngine();
