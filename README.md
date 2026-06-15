# 🎙️ Orbit-LiveCaptions AI Meeting Translator

OrbitAI-Captions is a high-performance, real-time desktop speech capture, transcription, and translation overlay application. Built with **Electron**, **React**, and **Vite**, it is designed to float seamlessly over online meeting software (like Zoom, Google Meet, Microsoft Teams, Webex, Discord) and media playback platforms (like YouTube, Facebook, or local video players).

Featuring custom theme layouts, a glowing soundwave visualizer, Right-to-Left (RTL) language flow, and an active window resizing manager, OrbitAI-Captions lets you transcribe, translate, and speak captions aloud using top-tier LLM providers and Google Cloud TTS synthesis.

---

## ✨ Core Premium Features

### 🌐 1. Multilingual Audio & Speech Capture
*   **Decoupled Language Pipelines**: Set separate input (Speaker) and translation (Target) languages.
*   **40+ Worldwide Languages Supported**: Full support for English, Hindi, Spanish, French, German, Japanese, Chinese, Russian, Korean, Arabic, Portuguese, Italian, Dutch, Turkish, Swedish, Indonesian, Ukrainian, Vietnamese, Polish, Filipino, Tamil, Telugu, Bengali, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Urdu, Czech, Danish, Finnish, Greek, Hebrew, Hungarian, Malay, Norwegian, Romanian, Slovak, Thai, and more.
*   **Automatic Right-to-Left (RTL) Layout**: Dynamically detects RTL scripts (Arabic, Hebrew, Urdu) and applies mirroring, aligning paragraphs and layout loaders cleanly from right to left.
*   **Flexible Source Input**: Instantly switch between capturing your **🎙️ Microphone** or capturing your **🔊 System Speakers** (Windows loopback capture) to transcribe audio from other participants, YouTube videos, or podcasts.

### 🤖 2. Dynamic AI Translation Providers (LLMs & Custom)
Configure and swap translation engines directly from the settings panel:
*   **Google Translate (Free & Unlimited)**: Client-side gateway translator. Defaults to work immediately out of the box with zero setup.
*   **Google Gemini AI**: Choose from standard popular models (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-pro-exp-02-05`, `gemini-1.5-flash`, `gemini-1.5-pro`) or select **Custom Model** to type any experimental Google Gemini model ID.
*   **OpenAI GPT API**: Select popular GPTs (`gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `o1-mini`, `o3-mini`) or type a custom model. Fully overrides **Base URL** for compatibility with local LLMs (Ollama, LM Studio) or third-party host gateways (Groq, OpenRouter).
*   **DeepSeek AI**: Predefined dropdown options (`deepseek-chat`, `deepseek-reasoner`) and custom model choices.
*   **Custom OpenAI-Compatible Endpoints**: Complete customizable text boxes for custom URLs, API keys/passwords, and model tags.
*   **Translate Final Sentence Only**: Checkbox toggle to skip interim results and query translation API only on final sentence delivery—optimizing token usage, billing, and latency.

### ⏱️ 3. Translation Real-Time Speed Controls
*   **Delay Slider**: Customize real-time caption translation debounce from **100ms** (fastest, live updates) to **1500ms** (slower batch updates).
*   Allows users to balance network utilization, API request rate limits, and computational overhead.

### 🔊 4. Dual Text-to-Speech (TTS) Synthesis Engines
Automatically read out finalized captions or translations in real-time:
*   **System Web Speech (Free & Local)**: Uses your local operating system's built-in text-to-speech engine. Dynamically lists and filters voices compatible with the selected target language locale.
*   **Google Cloud TTS API (Premium Voices)**: Provide a Google Cloud API Key to access high-fidelity premium voices (including **Neural2** and **Wavenet**). Select popular voice shapes or enter any custom Google voice code (e.g. `hi-IN-Neural2-D`, `en-US-Wavenet-C`, `es-ES-Neural2-F`).
*   **Voice Speed Control**: Adjust playback rate dynamically from **0.5x** to **2.0x** speed.

### 🎨 5. Premium Theme Engine & Visual Layouts
*   **7 Global UI Themes**: Transmute the entire caption overlay layout in one click:
    *   **Midnight Indigo**: Cosmic dark violet and blue accents.
    *   **Cyberpunk Amber**: High-energy neon orange/amber dark theme.
    *   **Emerald Forest**: Rich dark forest green.
    *   **Sunset Crimson**: Deep ruby red.
    *   **Obsidian Dark**: Absolute stealth dark theme with minimal silver lines.
    *   **Electric Violet**: Electric neon purple.
    *   **Glassmorphic Light**: High-end translucent light glass layout.
*   **Bottom Wave Sound Visualizer**: A glowing horizontal audio soundwave at the bottom of the captions display that dynamically grows, blurs, and pulses in color and height matching the speakers' real-time voice amplitude.
*   **Caption Text Themes**: Independently customize the typography color style (Auto-Match Theme, High-Contrast Yellow, High-Contrast White, High-Contrast Cyan).
*   **Custom Google Fonts**: Switch between **Poppins**, **Outfit**, **Roboto**, **Inter**, and **Mukta** (designed beautifully for Devanagari script legibility).
*   **Window Float & Handle**: Floats on top of other applications. Pinned status can be toggled using the **push-pin icon** in the window header.

### 📋 6. Searchable Logs & Auto-Saving
*   **Session logs**: Keep track of speech transcripts in real-time. Features search box filters.
*   **Silent Session Auto-Saving**: When enabled, the app automatically writes the complete meeting transcript file in plain text to `Documents/OrbitCaptions/` as soon as capturing is stopped, named with the active date and timestamp.

---

## 🛠️ Technology Stack
*   **Frontend UI**: React.js, Vite
*   **Desktop Wrapper**: Electron (IPC Communication, Preload Bridges, Desktop source capture APIs)
*   **Styling**: Vanilla CSS & Tailwind CSS
*   **Speech-to-Text (STT) Engine**: Deepgram Live Streaming WebSocket (utilizing the high-accuracy `nova-3` and `diarize` speaker tagging models)

---

## 🚀 How to Run & Build

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18+ recommended) installed.

### Installation
1. Clone the repository and enter the directory:
   ```bash
   git clone https://github.com/StackOrbitAI/Orbit-LiveCaptions-AI-Meeting-Translator.git
   cd Orbit-LiveCaptions-AI-Meeting-Translator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running in Development
Start Vite and run the Electron desktop shell concurrently:
```bash
npm start
```
*Alternatively, you can run `npm run dev` to start Vite, and run `npm run electron:start` in a separate terminal.*

### Compiling and Packaging
Compile Vite production bundles and package a standalone Windows Electron executable (`.exe` installer):
```bash
npm run build
```
The compiled output, portable binaries, and installers will be saved in the `./dist` directory.

---

## 🔒 Security & API Key Policies
*   All keys (Deepgram, Gemini, OpenAI, DeepSeek, Google Cloud TTS) are stored safely inside the local desktop browser sandboxed `localStorage`.
*   Credentials are sent directly to the respective AI provider endpoints and never pass through any third-party middle-man servers.

---

## 💖 Support & Donations (Domain Help & Company Operations)
If you find this project helpful, please consider supporting us:
*   **PayPal**: [Your PayPal Link]
*   **Crypto (Litecoin/LTC)**: `Your LTC Wallet Address`
*   **Binance Pay**: `Your Binance ID/Pay Link`
