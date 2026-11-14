# VoxAI — Voice-to-Text & AI Command Assistant

An interactive, responsive HTML5/CSS/JavaScript web application that features:
- **Dual-Input Modality**: Type with your keyboard or speak with your microphone in real-time.
- **Continuous & Push-to-Talk Speech Recognition**: Powered by the browser's Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).
- **Interactive Action & Command Engine**: Execute live UI actions using your voice or typed text.
- **Audio Feedback & Waveform Visualizer**: Real-time canvas audio visualizer and synthesized sound effects built with the Web Audio API.
- **Text-to-Speech (TTS) Voice Responses**: Speaks replies aloud with customizable browser voices, speech rate, and pitch.
- **Theme Switcher**: 5 futuristic and modern themes (Midnight, Cyberpunk, Emerald Matrix, Sunset, Crisp Light).
- **Offline Zero-Config Engine + Optional Gemini AI Cloud Bridge**: Works 100% out-of-the-box offline, with an optional field to plug in a Google Gemini API Key for extended generative LLM capabilities.

---

## 🚀 Quick Start

### Option 1: Using Python Local Server (Recommended for Microphone Permissions)
Browsers (Chrome, Edge, Brave) enforce security policies that require Speech Recognition to run on `http://localhost` or `https://` (microphone access can be restricted on raw `file:///` URLs in some browsers).

Run this in your terminal or command prompt:
```bash
python -m http.server 3000
```
Then open your browser to:
[http://localhost:3000](http://localhost:3000)

### Option 2: Using Node.js `serve` / `npx`
```bash
npx serve .
```

### Option 3: Double-Click `index.html`
You can also directly open `index.html` in Chrome or Edge.

---

## 🎙️ Supported Voice Commands & Actions

You can either **speak** these commands into your microphone or **type** them into the input bar:

| Category | Example Voice Commands | What it Does |
| :--- | :--- | :--- |
| ⏱️ **Timers & Alarms** | *"Set a timer for 45 seconds"*, *"Timer 2 minutes"*, *"Cancel timer"* | Starts an interactive visual countdown widget with sound alerts |
| 🎨 **Theme Switching** | *"Change theme to Cyberpunk"*, *"Switch to Sunset"*, *"Theme Emerald"* | Dynamically switches color schemes and glowing UI aesthetics |
| 📝 **Notes & Tasks** | *"Take a note: Prepare hackathon pitch"*, *"Add task: Deploy website"* | Saves persistent editable sticky notes in the sidebar |
| 🧮 **Math & Calculation**| *"Calculate 15% tip on 84 dollars"*, *"What is 45 times 12"*, *"Square root of 144"* | Safely evaluates arithmetic expressions, tips, and percentages |
| 🌐 **Search & Navigation**| *"Search for Web Speech API"*, *"Open YouTube"*, *"Open GitHub"* | Directly searches Google or navigates to popular developer resources |
| 🕒 **Time & Date** | *"What time is it?"*, *"What is today's date?"* | Reports exact time and formatted date |
| 🔊 **Voice Controls** | *"Stop talking"*, *"Mute voice"*, *"Unmute voice"* | Interrupted/silenced speech playback on demand |
| 🧹 **Chat Management** | *"Clear chat"*, *"Reset conversation"* | Clears the session log |
| 😂 **Fun & Utilities** | *"Tell me a joke"*, *"Give me a hackathon project idea"*, *"Flip a coin"* | Plays jokes, trivia, and brainstorms ideas |

---

## ⌨️ Controls & Shortcuts

- **Click the Mic Button** or **Hold/Press Spacebar** to start speaking.
- **Enter key**: Submit typed command.
- **Quick Action Chips**: Click any suggestion chip above the input bar to test instant commands.
- **Settings Modal (⚙️)**: Choose AI voices, adjust speech speed and pitch, change recognition language (e.g. English, Spanish, French, German, Japanese, Chinese, Hindi), or save a Gemini API Key.
- **Export (📥)**: Download your entire voice and text session transcript as a clean `.txt` file.

---

## 🛠️ Technology Stack

- **HTML5 & CSS3**: Responsive grid & flexbox layout, CSS custom properties, glassmorphism, responsive breakpoints.
- **Web Speech API**:
  - `SpeechRecognition` / `webkitSpeechRecognition` for real-time speech-to-text with interim streaming.
  - `SpeechSynthesis` for AI voice playback.
- **Web Audio API**: Real-time microphone frequency analyzer and programmatic synthesized alert tones.
- **HTML5 Canvas**: Smooth dynamic sinusoidal waveform and multi-band audio equalizer.
- **LocalStorage**: Preserves notes, active theme, and preferences across sessions.
