# 🎙️ OrbitCaptions

OrbitCaptions is a premium, lightweight, real-time speech capturing and translation desktop overlay built with **Electron**, **React**, and **Vite**. It floats seamlessly on top of video conferencing software (like Zoom, Google Meet, MS Teams) to translate and caption audio streams dynamically.

Designed with user simplicity in mind, it operates completely **plug-and-play** (no Gemini or translation API keys required) using Deepgram's state-of-the-art ASR models and Google's public translate gateway.

---

## ✨ Premium Features

### 🌍 1. Multi-Language Audio Capture & Real-Time Translation
- Decoupled from static language pairs.
- Supports live speech capture and translation across **7 global languages**:
  - English (`en`)
  - Hindi (`hi`)
  - Spanish (`es`)
  - French (`fr`)
  - German (`de`)
  - Japanese (`ja`)
  - Chinese (`zh`)
- Easily select Speaker Language (Audio) and Translation Language from the settings. Translation can also be set to "None" for single-language captioning.

### 📐 2. Dynamic Window Resizing (IPC-driven)
- Utilizes custom Electron IPC channels (`resize-window`) to resize the window dynamically.
- Opening Settings automatically expands the overlay window to `800px x 450px`, showing all configuration options clearly.
- Saving or Canceling settings cleanly shrinks the window back to its compact size (`800px x 180px`), keeping the overlay unobtrusive.

### 🔇 3. Advanced Web Audio Noise Reduction
- **Biquad Filters**: Integrated highpass and lowpass filters in the audio capture pipeline:
  - **Highpass filter (cuts below 100Hz)**: Filters out low-frequency environmental hums like AC units and fan noises.
  - **Lowpass filter (cuts above 4000Hz)**: Removes high-pitched static hiss and microphone feedback.
- Captures clear voice streams for high-precision transcription.

### 🎙️ 4. Speaker Diarization
- Displays customized inline speaker tags (e.g., `🎙️ Spk 0`, `🎙️ Spk 1`) with unique background and border themes.
- Differentiates speakers instantly, making it highly effective for multi-person remote meetings.

### 🔁 5. Connection Resilience
- Automated retry logic utilizing an **exponential backoff reconnection loop**.
- If your internet drops, the application automatically triggers reconnect attempts (1 to 5), scaling delays from `1.5s` up to `12s` to maintain stream stability.

### 🎨 6. Custom Visual Themes
Choose between multiple vibrant text gradients:
- **Yellow (Default)**: Bright amber glowing gradient.
- **White**: Minimalist high-contrast layout.
- **Cyan**: Neon cyber-cyan lighting drop shadow.

### 🔤 7. Custom Font Styles
- Select from premium Google Fonts directly from the settings panel:
  - **Poppins**
  - **Outfit**
  - **Roboto**
  - **Inter**
  - **Mukta** (designed beautifully for Hindi/Devanagari script support)

### 📏 8. Caption Layout Alignment
- Adjust caption rendering layouts with alignment selectors:
  - **Left**
  - **Center**
  - **Right** (aligns text and load progress indicators cleanly)

### 📥 9. Silent Session Auto-Saving
- Automatically writes complete transcripts to `Documents/OrbitCaptions/` silently as soon as speech capture stops.
- Files are named uniquely using date and time formatting (e.g., `OrbitCaptions_AutoSave_YYYY-MM-DD_HH-MM-SS.txt`).

### 🚀 10. Keyword Boosting
- Supply comma-separated custom vocabulary boosting arrays in the configuration panel.
- Spoken brand names, acronyms, or specific tech terms (e.g., `OrbitCaptions`, `Deepgram`) are weighted heavily inside Deepgram's streaming vocabulary.

### 📌 11. Dynamic Always-on-Top Floating
- Toggling the push-pin icon dynamically sets the Electron window always-on-top level, allowing the overlay to stay pinned or sink behind other apps.

---

## 🛠️ Technology Stack
- **Frontend**: React (Hooks, Context), Vite (Hot Module Replacement)
- **Desktop Framework**: Electron (IPC Communication, Preload Bridges, Desktop capturers)
- **Styling**: Tailwind CSS
- **STT Engine**: Deepgram Live ASR (Nova-3, Diarize model)
- **Translation Engine**: Public Keyless Google Translate API (`translate_a/single?client=gtx`)

---

## 🚀 How to Run & Build

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) installed on your system.

### Installation
1. Clone the repository and navigate to the directory:
   ```bash
   cd OrbitCaptions
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Mode
Launch the application with Hot Module Replacement active:
```bash
npm run dev
```

### Packaging/Distribution
Compile a standalone production package for Windows:
```bash
npm run build
```
This outputs compiled installers and directories under the `./dist` folder.
