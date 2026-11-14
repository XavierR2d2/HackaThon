# J.A.R.V.I.S. — Applied Materials Systems Interface

An interactive, holographic voice and text AI assistant built for **Applied Materials**, inspired by Tony Stark's **J.A.R.V.I.S.** from *Iron Man*, powered by **Google Gemini AI**.

- **Google Gemini AI Integration (`gemini-3.5`, `gemini-3.1`, `gemini-3.1-pro`, `gemini-4-hydrogen`, `gemini-4-argon`)**: Endows J.A.R.V.I.S. with real-time generative intelligence to answer any question across science, physics, semiconductor engineering, programming, history, and general knowledge.
- **British Suave Demeanor & Cadence**: Speaks with Paul Bettany's dry wit, sophisticated decorum, and zero chatbot filler.
- **Custom Designation (Editable Name)**: Easily re-designate the assistant to **J.A.R.V.I.S.**, **F.R.I.D.A.Y.**, **E.D.I.T.H.**, or any custom name via voice (*"Change your name to Friday"*) or the UI in **System Protocols (⚙️)**.
- **Dual Modality (Type + Speak)**: Full Web Speech API integration (`SpeechRecognition` & `SpeechSynthesis`).
- **Applied Materials & Engineering Telemetry**: Cleanroom monitoring, wafer fabrication countdowns, atomic layer deposition knowledge, and precision math.
- **Stark Arc HUD Interface**: Arc Reactor theme, live sinusoidal waveform canvas, and real-time frequency equalizer.

---

## ⚡ Connecting the Google Gemini AI API

To allow J.A.R.V.I.S. to answer **any question** with Google's large language model:

1. **Obtain a Free Gemini API Key**:
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
   - Sign in and click **"Create API Key"** (free tier available with generous limits).
2. **Connect Key in J.A.R.V.I.S.**:
   - Click the **"⚡ Connect Gemini Key"** pill in the top header (or open **System Protocols ⚙️**).
   - Paste your API key into the **Gemini API Key** field.
   - Choose your preferred model architecture:
     - `gemini-3.5` *(Default, Fast)*
     - `gemini-3.1`
     - `gemini-3.1-pro` *(Deep Reasoning)*
     - `gemini-4-hydrogen` *(Next-Gen High Performance)*
     - `gemini-4-argon` *(Advanced Materials Core)*
   - Click **Connect & Verify Key**.
   - The status indicator will turn green: `🟢 Gemini: Online`.
3. **Ask Any Question**:
   - You can speak via microphone or type in the prompt box:
     - *"Explain how gate-all-around nanosheet transistors differ from FinFETs in semiconductor fabrication."*
     - *"Write a Python script to calculate wafer yield using the Murphy defect model."*
     - *"What is quantum entanglement and how does it relate to quantum computing?"*
     - *"Summarize the history of materials science in 3 key breakthroughs."*

---

## 🏷️ Customizing the Assistant's Name

You can change the assistant's name at any time:
1. **Via Voice Command**:
   - *"Change your name to F.R.I.D.A.Y."*
   - *"Call yourself J.A.R.V.I.S."*
   - *"Rename yourself to [Any Name]"*
2. **Via UI**:
   - Open **System Protocols (⚙️)** in the top right.
   - Enter your preferred call-sign in the **Assistant Call-Sign / Name** field.
   - Click **Update Designation**.

---

## 🎙️ Sample Commands & Protocols

| Category | Example Directive | J.A.R.V.I.S. Response |
| :--- | :--- | :--- |
| ⚡ **Gemini Question** | *"How does chemical vapor deposition differ from atomic layer deposition?"* | Generates in-depth, structured comparative analysis with J.A.R.V.I.S. decorum |
| 🏷️ **Name Protocol** | *"Change your name to F.R.I.D.A.Y."* | *"As you wish, sir. Protocol updated. I shall now respond to the designation F.R.I.D.A.Y."* |
| 🔬 **Telemetry** | *"Status report"* | *"All Applied Materials fabrication chambers, vacuum levels, and cleanroom atmospheric sensors are operating within optimal tolerances, sir."* |
| ⏱️ **Countdowns** | *"Set timer for 45 seconds for wafer thermal anneal"* | *"Right away, sir. Initiating countdown for 45 seconds. I shall alert you upon completion."* |
| ⚡ **HUD Theme** | *"Change theme to Stark"* | *"Reconfiguring visual interface to the STARK protocol, sir."* |
| 📝 **Engineering Log** | *"Take note: Inspect CVD chamber pressure on tool 4"* | *"Logged into Applied Materials engineering records, sir: 'Inspect CVD chamber pressure on tool 4'."* |
| 🧮 **Precision Math** | *"Calculate 300 millimeter wafer surface area"* | *"A standard 300 millimeter semiconductor wafer has a surface area of approximately 706.86 square centimeters, sir."* |
| 🔊 **Vocal Control** | *"Stop talking"* or *"Mute voice"* | *"Standing by in silent protocol, sir."* |

---

## 🚀 How to Run

Double-click `start.bat` in the project root to start the native local server and launch the browser at `http://localhost:3000`.
