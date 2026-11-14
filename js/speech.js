/**
 * VoxAI - Speech Recognition & Audio Synthesis Engine
 * Handles Web Speech Recognition (STT), Speech Synthesis (TTS), and Web Audio API visualizer/effects.
 */

class SpeechEngine {
  constructor() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.hasRecognition = !!SpeechRecognition;
    this.hasSynthesis = 'speechSynthesis' in window;

    // STT configuration
    this.recognition = this.hasRecognition ? new SpeechRecognition() : null;
    this.isListening = false;
    this.continuousMode = true; // Always listen in background for wake word
    this.isSilentRestart = false;
    this.language = 'en-US';

    // TTS configuration
    this.ttsEnabled = true;
    this.isSpeaking = false;
    this.selectedVoice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.availableVoices = [];

    // Web Audio API context for sound effects & visualizer
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.soundEffects = true;
    this.alarmLoopInterval = null;

    // Callbacks
    this.onStartCallback = null;
    this.onEndCallback = null;
    this.onResultCallback = null;
    this.onInterimCallback = null;
    this.onErrorCallback = null;
    this.onSpeechStartCallback = null;
    this.onSpeechEndCallback = null;

    this.initRecognition();
    this.initSynthesis();
  }

  /**
   * Initializes Web Speech API Recognition
   */
  initRecognition() {
    if (!this.recognition) {
      console.warn('Speech Recognition API is not supported in this browser.');
      return;
    }

    this.recognition.continuous = true; // Continuous listening across utterances
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (!this.isSilentRestart) {
        this.playChime('start');
      }
      this.isSilentRestart = false;
      this.startMicStream();
      if (this.onStartCallback) this.onStartCallback();
    };

    this.recognition.onresult = (event) => {
      // Discard audio picked up from device speakers while AI speaks
      if (this.isSpeaking) return;

      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0.95;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0].transcript;
        if (res.isFinal) {
          finalTranscript += transcript;
          confidence = res[0].confidence || confidence;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript && this.onInterimCallback) {
        this.onInterimCallback(interimTranscript);
      }

      if (finalTranscript && this.onResultCallback) {
        this.onResultCallback(finalTranscript.trim(), confidence);
      }
    };

    this.recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are benign during continuous background listening
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.warn('Speech recognition error:', event.error);
      this.isListening = false;
      this.stopMicStream();
      if (this.onErrorCallback) this.onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.stopMicStream();
      if (this.onEndCallback) this.onEndCallback();

      // Continuous mode restart if user enabled continuous listening
      if (this.continuousMode && !this.manualStop) {
        this.isSilentRestart = true;
        setTimeout(() => {
          if (this.continuousMode && !this.isListening) {
            this.startListening();
          }
        }, 150);
      }
    };
  }

  /**
   * Initializes Web Speech Synthesis (TTS)
   */
  initSynthesis() {
    if (!this.hasSynthesis) {
      console.warn('Speech Synthesis API is not supported in this browser.');
      return;
    }

    // Restore saved pitch & rate from localStorage if present
    const savedRate = localStorage.getItem('amat_voice_rate');
    if (savedRate) this.rate = parseFloat(savedRate);
    const savedPitch = localStorage.getItem('amat_voice_pitch');
    if (savedPitch) this.pitch = parseFloat(savedPitch);

    // Helper to filter out explicitly excluded voice engines
    const isExcludedVoice = (v, gender) => {
      if (!v || !v.name) return false;
      const name = v.name.toLowerCase();
      const lang = (v.lang || '').toLowerCase();

      if (gender === 'female') {
        // Exclude Microsoft Zira
        if (name.includes('zira')) return true;
      } else if (gender === 'male') {
        // Exclude Microsoft David
        if (name.includes('david')) return true;
        // Exclude Google US English
        if (name.includes('google us english') || (name.includes('google') && lang.includes('en-us') && !name.includes('uk') && !lang.includes('gb'))) return true;
        // Exclude Microsoft - English (United States) (en-US)
        if (name.includes('microsoft') && (lang.includes('en-us') || name.includes('united states') || name.includes('desktop'))) return true;
      }
      return false;
    };

    const loadVoices = () => {
      this.availableVoices = window.speechSynthesis.getVoices();

      // Check saved gender preference (male vs female)
      const savedGender = localStorage.getItem('amat_voice_gender') || 'male';

      // Check if a specific voice was saved by user and is not excluded
      const savedVoiceName = localStorage.getItem('amat_voice_name');
      if (savedVoiceName) {
        const found = this.availableVoices.find(v => v.name === savedVoiceName && !isExcludedVoice(v, savedGender));
        if (found) {
          this.selectedVoice = found;
          return;
        }
      }

      if (savedGender === 'female') {
        // Priority 1: Google UK English Female (en-GB)
        const gUkFemale = this.availableVoices.find(v => 
          !isExcludedVoice(v, 'female') &&
          v.name.includes('Google') && (v.name.includes('UK') || v.lang.includes('GB')) &&
          (v.name.includes('Female') || v.name.toLowerCase().includes('female'))
        );
        // Priority 2: Other British / en-GB female voices (Hazel, Susan, Victoria, etc., but never Zira)
        const enGbFemale = this.availableVoices.find(v => 
          !isExcludedVoice(v, 'female') &&
          (v.lang === 'en-GB' || v.lang.startsWith('en-GB') || v.lang.startsWith('en-IE')) &&
          (v.name.includes('Female') || v.name.includes('Hazel') || v.name.includes('Susan') || v.name.includes('Victoria') || v.name.includes('Jenny') || v.name.includes('Aria'))
        );
        const fallbackFemale = this.availableVoices.find(v => !isExcludedVoice(v, 'female') && v.name.toLowerCase().includes('female'));

        this.selectedVoice = gUkFemale || enGbFemale || fallbackFemale || this.availableVoices.find(v => !isExcludedVoice(v, 'female')) || this.availableVoices[0];
        if (this.selectedVoice) {
          localStorage.setItem('amat_voice_name', this.selectedVoice.name);
        }
        return;
      }

      // Default: Male voice
      // Priority 1: Google UK English Male (en-GB)
      const gUkMale = this.availableVoices.find(v => 
        !isExcludedVoice(v, 'male') &&
        v.name.includes('Google') && (v.name.includes('UK') || v.lang.includes('GB')) &&
        (v.name.includes('Male') || v.name.toLowerCase().includes('male'))
      );
      // Priority 2: Other British en-GB male voices (George, Oliver, Arthur, Ryan - never David or Google US English)
      const enGbMale = this.availableVoices.find(v => 
        !isExcludedVoice(v, 'male') &&
        (v.lang === 'en-GB' || v.lang.startsWith('en-GB')) && 
        (v.name.includes('Male') || v.name.includes('George') || v.name.includes('Oliver') || v.name.includes('Arthur') || v.name.includes('Daniel') || v.name.includes('Ryan'))
      );
      const enGbAny = this.availableVoices.find(v => !isExcludedVoice(v, 'male') && (v.lang === 'en-GB' || v.lang.startsWith('en-GB')));

      this.selectedVoice = gUkMale || enGbMale || enGbAny || this.availableVoices.find(v => !isExcludedVoice(v, 'male')) || this.availableVoices[0];
      if (this.selectedVoice) {
        localStorage.setItem('amat_voice_name', this.selectedVoice.name);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Starts repeating audible alarm chime loop until acknowledged
   */
  startAlarm() {
    if (this.alarmLoopInterval) return;
    this.playChime('alarm');
    this.alarmLoopInterval = setInterval(() => {
      if (this.soundEffects) {
        this.playChime('alarm');
      }
    }, 1500);
  }

  /**
   * Silences ongoing alarm loop
   */
  stopAlarm() {
    if (this.alarmLoopInterval) {
      clearInterval(this.alarmLoopInterval);
      this.alarmLoopInterval = null;
    }
  }

  /**
   * Starts Speech Recognition
   */
  startListening() {
    if (!this.recognition) return false;
    this.manualStop = false;
    try {
      this.recognition.lang = this.language;
      this.recognition.start();
      return true;
    } catch (e) {
      if (e.name !== 'InvalidStateError') {
        console.warn('Recognition start caught error:', e);
      }
      return false;
    }
  }

  /**
   * Stops Speech Recognition
   */
  stopListening() {
    this.manualStop = true;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.playChime('stop');
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    }
    this.isListening = false;
    this.stopMicStream();
  }

  /**
   * Toggles speech recognition state
   */
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  /**
   * Speaks the given text using SpeechSynthesis
   */
  speak(text, onComplete = null) {
    if (!this.hasSynthesis || !this.ttsEnabled || !text) {
      if (onComplete) onComplete();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown/symbols for clean spoken audio
    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'link')
      .trim();

    if (!cleanText) {
      if (onComplete) onComplete();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isSpeaking = true;
      if (this.onSpeechStartCallback) this.onSpeechStartCallback();
    };

    utterance.onend = () => {
      setTimeout(() => {
        this.isSpeaking = false;
      }, 350);
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      if (onComplete) onComplete();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis utterance error:', e);
      this.isSpeaking = false;
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
      if (onComplete) onComplete();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stops ongoing speech synthesis
   */
  stopSpeaking() {
    this.isSpeaking = false;
    if (this.hasSynthesis) {
      window.speechSynthesis.cancel();
      if (this.onSpeechEndCallback) this.onSpeechEndCallback();
    }
  }

  /**
   * Generates gentle chimes/beeps with Web Audio API
   */
  playChime(type = 'start') {
    if (!this.soundEffects) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'start') {
        // High ascending chime (Ready to listen)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'stop') {
        // Low descending tone (Finished listening)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(370, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'activation') {
        // High-tech affirmative blip (Wake word locked)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else if (type === 'alarm') {
        // Repeated double chime for Timer alert
        const now = ctx.currentTime;
        const playBeep = (freq, startTime, dur) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + dur);
        };
        playBeep(987.77, now, 0.15);
        playBeep(1318.51, now + 0.18, 0.25);
        playBeep(987.77, now + 0.45, 0.15);
        playBeep(1318.51, now + 0.63, 0.35);
      }
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  /**
   * Initializes Microphone Media Stream for Real-time Analyser
   */
  async startMicStream() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      const source = this.audioCtx.createMediaStreamSource(stream);
      source.connect(this.analyser);
    } catch (err) {
      // User may decline microphone media stream or browser may restrict
      // We will fallback to smooth simulated frequency data in visualizer
      this.analyser = null;
    }
  }

  stopMicStream() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }

  /**
   * Returns current audio frequency data for visualizers
   */
  getAudioData() {
    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);
      return dataArray;
    }
    return null;
  }
}

// Global instance
window.speechEngine = new SpeechEngine();
