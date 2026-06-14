import { useState, useEffect, useRef } from 'react';

// Gemini Live Translate Model
const GEMINI_MODEL = 'gemini-3.5-live-translate-preview';

// Demo mode dialogues (English & Hindi)
const DEMO_DIALOGUES = [
  { en: "Hello everyone, welcome to the OrbitCaptions showcase.", hi: "हैलो एवरीवन, ऑर्बिटकैप्शन शोकेस में आप सभी का स्वागत है।" },
  { en: "This desktop app is built with Electron and React.", hi: "यह डेस्कटॉप ऐप इलेक्ट्रॉन और रिएक्ट के साथ बनाया गया है।" },
  { en: "It floats seamlessly on top of Zoom, MS Teams, or Google Meet.", hi: "यह ज़ूम, एमएस टीम्स या गूगल मीट के ऊपर आसानी से तैरता रहता है।" },
  { en: "You can drag it anywhere on the screen using the top handle.", hi: "आप शीर्ष हैंडल का उपयोग करके इसे स्क्रीन पर कहीं भी खींच सकते हैं।" },
  { en: "The background transparency and text size can be customized in real-time.", hi: "पृष्ठभूमि की पारदर्शिता और टेक्स्ट के आकार को वास्तविक समय में अनुकूलित किया जा सकता है।" },
  { en: "Try speaking now or let this demo show you how it works!", hi: "अभी बोलने का प्रयास करें या इस डेमो को देखने दें कि यह कैसे काम करता है!" },
  { en: "Powered by Google Gemini Live Translate — the most accurate real-time translation.", hi: "गूगल जेमिनी लाइव ट्रांसलेट द्वारा संचालित — सबसे सटीक रीयल-टाइम अनुवाद।" },
  { en: "This is a game-changer for multilingual remote meetings.", hi: "यह बहुभाषी रिमोट बैठकों के लिए एक गेम-चेंजर है।" },
];

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [englishText, setEnglishText] = useState('');
  const [hindiText, setHindiText] = useState('');
  const [lastEnglishText, setLastEnglishText] = useState('');
  const [lastHindiText, setLastHindiText] = useState('');
  const [error, setError] = useState('');

  // Customization States
  const [fontSize, setFontSize] = useState('medium');
  const [opacity, setOpacity] = useState(80);
  const [audioSource, setAudioSource] = useState('system');
  const [transcriptHistory, setTranscriptHistory] = useState([]);

  // API and Settings States
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || '';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [activeTab, setActiveTab] = useState('config');
  const [logsCopied, setLogsCopied] = useState(false);

  // Refs for managing streaming resources
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const demoIndexRef = useRef(0);

  // Refs for rolling display
  const currentEnRef = useRef('');
  const currentHiRef = useRef('');

  // Cleanup all active resources
  const cleanupResources = () => {
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) { /* ignore */ }
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) { /* ignore */ }
    }
    audioContextRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
  };

  // Finalize current sentence into the rolling display
  const finalizeCurrentSentence = () => {
    const en = currentEnRef.current.trim();
    const hi = currentHiRef.current.trim();
    if (en || hi) {
      setLastEnglishText(en);
      setLastHindiText(hi);
      setEnglishText('');
      setHindiText('');
      currentEnRef.current = '';
      currentHiRef.current = '';

      if (en && hi) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { time: timestamp, en, hi }]);
      }
    }
  };

  // Start Gemini Live Translate stream
  const startGeminiStream = async () => {
    cleanupResources();
    setEnglishText('');
    setHindiText('');
    setLastEnglishText('');
    setLastHindiText('');
    setError('');
    setTranscriptHistory([]);
    currentEnRef.current = '';
    currentHiRef.current = '';

    const key = apiKey.trim();
    if (!key) {
      setError('Gemini API key missing. Open ⚙️ Settings and enter your key.');
      return;
    }

    try {
      // 1. Capture audio stream
      let stream;
      if (audioSource === 'system') {
        if (!window.electronAPI?.getDesktopSourceId) {
          throw new Error('Desktop audio capture is only supported inside the Electron app.');
        }
        const sourceId = await window.electronAPI.getDesktopSourceId();
        if (!sourceId) throw new Error('Could not find system audio source.');

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId,
            }
          }
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      // 2. Create AudioContext at 16kHz (Gemini Live requires 16kHz PCM16 mono)
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // 3. Open Gemini Live Translate WebSocket
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${key}`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Gemini Live Translate WebSocket connected.');

        // 4. Send CORRECT setup message for gemini-3.5-live-translate-preview
        // IMPORTANT: This model does NOT support system_instruction or function calling
        // Use translation_config with target_language_code instead
        const setupMsg = {
          setup: {
            model: `models/${GEMINI_MODEL}`,
            generation_config: {
              response_modalities: ['TEXT'],
            },
            translation_config: {
              target_language_code: 'hi-IN',  // Hindi (India)
            }
          }
        };
        console.log('Sending Gemini setup:', JSON.stringify(setupMsg));
        socket.send(JSON.stringify(setupMsg));

        // 5. Stream raw PCM16 audio chunks to Gemini
        processor.onaudioprocess = (e) => {
          if (socket.readyState === WebSocket.OPEN) {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            // Convert Int16Array to base64
            const bytes = new Uint8Array(int16.buffer);
            let binary = '';
            bytes.forEach(b => binary += String.fromCharCode(b));
            const base64 = btoa(binary);

            const audioMsg = {
              realtime_input: {
                media_chunks: [{
                  mime_type: 'audio/pcm;rate=16000',
                  data: base64
                }]
              }
            };
            socket.send(JSON.stringify(audioMsg));
          }
        };

        // Silent gain node — required to fire onaudioprocess without audio feedback
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);

        setIsListening(true);
      };

      // 6. Handle incoming Gemini Live Translate responses
      // Live Translate model outputs:
      //   msg.outputTranscription.text  → translated Hindi text (what we want to show)
      //   msg.inputTranscription.text   → English source transcription
      //   msg.serverContent.turnComplete → end of utterance
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('Gemini msg:', JSON.stringify(msg).substring(0, 300));

          // English source transcription (interim + final)
          const inputText = msg?.inputTranscription?.text || '';
          if (inputText.trim()) {
            currentEnRef.current = inputText.trim();
            setEnglishText(inputText.trim());
          }

          // Hindi translated output (this is what Gemini Live Translate provides)
          const outputText = msg?.outputTranscription?.text || '';
          if (outputText.trim()) {
            currentHiRef.current = outputText.trim();
            setHindiText(outputText.trim());
          }

          // Also check modelTurn parts (fallback for some response formats)
          const parts = msg?.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.text && part.text.trim()) {
              // If we got no output transcription, use model parts as Hindi
              if (!outputText) {
                currentHiRef.current = part.text.trim();
                setHindiText(part.text.trim());
              }
            }
          }

          // Turn complete = finalize this sentence into history
          const isTurnComplete = msg?.serverContent?.turnComplete === true;
          if (isTurnComplete) {
            finalizeCurrentSentence();
          }

        } catch (e) {
          console.error('Failed to parse Gemini message:', e);
        }
      };

      socket.onerror = (err) => {
        console.error('Gemini WebSocket error:', err);
        setError('Gemini connection error. Check your API key in ⚙️ Settings.');
        setIsListening(false);
        cleanupResources();
      };

      socket.onclose = (ev) => {
        console.log('Gemini WebSocket closed:', ev.code, ev.reason);
        setIsListening(false);
        // Show error for unexpected closes (not user-initiated)
        if (ev.code !== 1000 && ev.code !== 1001) {
          const reason = ev.reason || `Code ${ev.code}`;
          setError(`Gemini disconnected: ${reason}. Check API key in ⚙️ Settings.`);
        }
      };

    } catch (err) {
      console.error('Failed to start Gemini stream:', err);
      if (err.name === 'NotAllowedError') {
        setError(audioSource === 'system'
          ? 'Screen recording permission denied.'
          : 'Microphone permission denied.');
      } else {
        setError(err.message || 'Failed to start audio capture.');
      }
      setIsListening(false);
      cleanupResources();
    }
  };

  const stopStream = () => {
    setIsListening(false);
    finalizeCurrentSentence();
    cleanupResources();
  };

  const toggleListening = () => {
    if (isDemoMode) setIsDemoMode(false);
    if (isListening) stopStream();
    else startGeminiStream();
  };

  // Demo Mode
  useEffect(() => {
    if (isDemoMode) {
      if (isListening) stopStream();
      demoIndexRef.current = 0;

      const runDemoStep = () => {
        const currentIndex = demoIndexRef.current;
        const cur = DEMO_DIALOGUES[currentIndex];
        const prevIndex = (currentIndex - 1 + DEMO_DIALOGUES.length) % DEMO_DIALOGUES.length;

        if (currentIndex > 0) {
          const prev = DEMO_DIALOGUES[prevIndex];
          setLastEnglishText(prev.en);
          setLastHindiText(prev.hi);
        } else {
          setLastEnglishText('');
          setLastHindiText('');
        }

        setEnglishText(cur.en);
        setHindiText(cur.hi);

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { time: timestamp, en: cur.en, hi: cur.hi }]);
        demoIndexRef.current = (currentIndex + 1) % DEMO_DIALOGUES.length;
      };

      runDemoStep();
      demoIntervalRef.current = setInterval(runDemoStep, 4500);
    } else {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        setEnglishText('');
        setHindiText('');
        setLastEnglishText('');
        setLastHindiText('');
      }
    }
    return () => { if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); };
  }, [isDemoMode]);

  useEffect(() => { return () => cleanupResources(); }, []);

  const toggleDemoMode = () => {
    if (isListening) stopStream();
    setError('');
    setTranscriptHistory([]);
    setIsDemoMode(!isDemoMode);
  };

  // Download transcript
  const downloadTranscript = async () => {
    if (transcriptHistory.length === 0) {
      setError('No transcript yet. Start listening or use Demo mode.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    const content = transcriptHistory.map(item =>
      `[${item.time}]\nEnglish: "${item.en}"\nHindi:   "${item.hi}"\n`
    ).join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `OrbitCaptions_Transcript_${dateStr}.txt`;

    if (window.electronAPI?.saveFile) {
      const result = await window.electronAPI.saveFile(content, filename);
      if (result?.error) {
        setError(`Save failed: ${result.error}`);
        setTimeout(() => setError(''), 4000);
      }
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    }
  };

  // Get log text
  const getLogText = () => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      error: error || 'None',
      isListening, isDemoMode, audioSource,
      apiKeyConfigured: apiKey ? `${apiKey.substring(0, 8)}...` : 'None',
      userAgent: navigator.userAgent,
      activeEnglish: englishText || 'None',
      activeHindi: hindiText || 'None',
      historyCount: transcriptHistory.length,
      history: transcriptHistory.map(i => `[${i.time}] EN: "${i.en}" | HI: "${i.hi}"`).join('\n')
    }, null, 2);
  };

  // Copy logs
  const copyLogs = async () => {
    const text = getLogText();
    if (window.electronAPI?.copyToClipboard) {
      const result = await window.electronAPI.copyToClipboard(text);
      if (result?.success) { setLogsCopied(true); setTimeout(() => setLogsCopied(false), 2000); }
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setLogsCopied(true); setTimeout(() => setLogsCopied(false), 2000);
      }).catch(console.error);
    }
  };

  const closeApp = () => {
    cleanupResources();
    if (window.electronAPI) window.electronAPI.closeApp();
    else window.close();
  };

  // Font size classes
  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'small':  return { activeEn: 'text-[11px] text-indigo-200 font-medium', activeHi: 'text-[15px] font-bold text-yellow-400', finalEn: 'text-[10px] text-slate-400 font-light', finalHi: 'text-[13px] font-semibold text-slate-300' };
      case 'large':  return { activeEn: 'text-[14px] text-indigo-200 font-medium', activeHi: 'text-[28px] font-extrabold text-yellow-400', finalEn: 'text-[12px] text-slate-400 font-light', finalHi: 'text-[20px] font-semibold text-slate-300' };
      case 'xl':     return { activeEn: 'text-[16px] text-indigo-200 font-medium', activeHi: 'text-[36px] font-black text-yellow-400', finalEn: 'text-[14px] text-slate-400 font-light', finalHi: 'text-[26px] font-semibold text-slate-300' };
      default:       return { activeEn: 'text-[12px] text-indigo-200 font-medium', activeHi: 'text-[22px] font-extrabold text-yellow-400', finalEn: 'text-[11px] text-slate-400 font-light', finalHi: 'text-[16px] font-semibold text-slate-300' };
    }
  };
  const textClasses = getFontSizeClasses();

  return (
    <div
      className="flex flex-col h-full w-full rounded-2xl border border-white/10 overflow-hidden text-white shadow-2xl transition-all duration-300"
      style={{ backgroundColor: `rgba(10, 15, 30, ${opacity / 100})`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Top Drag & Control Bar */}
      <div className="drag-region h-10 bg-slate-950/60 flex items-center justify-between px-4 cursor-move border-b border-white/5 select-none">

        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-wider uppercase">OrbitCaptions</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`w-2 h-2 rounded-full ${(isListening || isDemoMode) ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              {isListening ? (audioSource === 'system' ? 'Gemini Live' : 'Mic Live') : isDemoMode ? 'Demo' : 'Offline'}
            </span>
          </div>
          {/* Gemini badge */}
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wider ml-1">✨ Gemini</span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3 no-drag">
          <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-3">

            {/* Audio Source Toggle */}
            <button
              onClick={() => setAudioSource(audioSource === 'system' ? 'mic' : 'system')}
              disabled={isListening}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${isListening ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} ${audioSource === 'system' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border-white/5'}`}
              title={audioSource === 'system' ? 'Capturing Speaker/System Audio' : 'Capturing Microphone'}
            >
              {audioSource === 'system' ? '🔊 Speakers' : '🎙️ Mic'}
            </button>

            {/* Opacity Slider */}
            <div className="flex items-center gap-1.5 ml-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 0-10 10h20a10 10 0 0 0-10-10z" fill="currentColor"></path></svg>
              <input type="range" min="20" max="100" value={opacity} onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none" title={`Opacity: ${opacity}%`} />
            </div>

            {/* Font Size */}
            <div className="flex items-center bg-slate-900/60 rounded-md p-0.5 border border-white/5 ml-1">
              {['S', 'M', 'L', 'XL'].map((size, idx) => {
                const key = ['small', 'medium', 'large', 'xl'][idx];
                return (
                  <button key={size} onClick={() => setFontSize(key)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${fontSize === key ? 'bg-indigo-500/80 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}>
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Logs */}
            <button onClick={copyLogs}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${logsCopied ? 'bg-emerald-600 text-white border-transparent' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800'}`}
              title="Copy Debug Logs">
              {logsCopied ? '📋 Copied!' : '📋 Logs'}
            </button>

            {/* Download */}
            <button onClick={downloadTranscript}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${transcriptHistory.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-[0_0_8px_rgba(79,70,229,0.3)]' : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-slate-800'}`}
              title="Download Transcript">
              📥 DL
            </button>

            {/* Demo */}
            <button onClick={toggleDemoMode}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${isDemoMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800'}`}>
              Demo
            </button>

            {/* Start/Stop */}
            <button onClick={toggleListening}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all border ${isListening ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              {isListening ? 'Stop' : 'Speech'}
            </button>
          </div>

          {/* Settings */}
          <button onClick={() => setIsSettingsOpen(true)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>

          {/* Close */}
          <button onClick={closeApp} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1" title="Exit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Captions Display */}
      <div className="flex-grow p-4 flex flex-col justify-center gap-3 overflow-hidden select-none no-drag relative">
        {(isListening || isDemoMode) && (
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-200 text-xs py-2 px-3 rounded-lg text-center font-medium flex flex-col items-center gap-1.5">
            <span className="font-bold">⚠️ Notice</span>
            <span>{error}</span>
          </div>
        )}

        {(!englishText && !hindiText && !error) && (
          <div className="flex flex-col items-center justify-center text-slate-500 text-center gap-2 py-4 animate-pulse">
            <div className="flex gap-1 items-center justify-center">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-xs uppercase tracking-widest font-bold">
              {isListening
                ? (audioSource === 'system' ? 'Gemini listening to speakers...' : 'Gemini listening to mic...')
                : isDemoMode ? 'Running demo...'
                : !apiKey ? "⚠️ Enter Gemini API key in ⚙️ Settings first"
                : "Ready — click 'Speech' or 'Demo'"}
            </span>
          </div>
        )}

        {/* Rolling: Last finalized (dimmed top) */}
        {lastEnglishText && (
          <div className="flex flex-col gap-1 border-l-2 border-slate-500/20 pl-3 py-0.5 opacity-60 scale-[0.98] origin-left transition-all duration-300">
            <div className={`${textClasses.finalEn} tracking-wide italic drop-shadow-sm`} style={{ fontFamily: "'Inter', sans-serif" }}>
              "{lastEnglishText}"
            </div>
            {lastHindiText && (
              <div className={`${textClasses.finalHi} leading-relaxed`} style={{ fontFamily: "'Mukta', sans-serif" }}>
                {lastHindiText}
              </div>
            )}
          </div>
        )}

        {/* Rolling: Active current (bright bottom) */}
        {(englishText || hindiText) && (
          <div className="flex flex-col gap-1 border-l-2 border-indigo-400 pl-3 py-0.5 transition-all duration-300">
            {englishText && (
              <div className={`${textClasses.activeEn} tracking-wide italic drop-shadow-md line-clamp-2`} style={{ fontFamily: "'Inter', sans-serif" }}>
                "{englishText}"
              </div>
            )}
            {hindiText && (
              <div className={`${textClasses.activeHi} leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]`} style={{ fontFamily: "'Mukta', sans-serif" }}>
                {hindiText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Activity bar */}
      {(isListening || isDemoMode) && (
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-purple-500 w-full opacity-60 animate-pulse"></div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-md flex flex-col justify-between p-4 z-50 no-drag">
          <div className="flex flex-col gap-3 h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2 select-none">
              <div className="flex gap-3">
                <button onClick={() => setActiveTab('config')}
                  className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 ${activeTab === 'config' ? 'text-indigo-300 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                  ⚙️ API Key
                </button>
                <button onClick={() => setActiveTab('logs')}
                  className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 ${activeTab === 'logs' ? 'text-indigo-300 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                  📋 Session Logs
                </button>
              </div>
              <button onClick={() => { setTempApiKey(apiKey); setIsSettingsOpen(false); }} className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto pr-1">
              {activeTab === 'config' ? (
                <div className="flex flex-col gap-2 py-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Google Gemini API Key</label>
                  <input type="password" value={tempApiKey} onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Paste your Gemini API key here..."
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full font-mono" />
                  <span className="text-[9px] text-slate-500">
                    Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 no-drag">aistudio.google.com/apikey</a>
                  </span>
                  <div className="mt-1 p-2 bg-blue-950/40 border border-blue-500/20 rounded-lg">
                    <p className="text-[9px] text-blue-300 font-semibold">✨ Powered by Gemini 3.5 Live Translate</p>
                    <p className="text-[8px] text-slate-400 mt-0.5">English audio → Hindi text in one step. No separate translation API needed.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 h-full py-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Raw Debug Data & History</span>
                    <button onClick={copyLogs}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${logsCopied ? 'bg-emerald-600 text-white border-transparent' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'}`}>
                      {logsCopied ? 'Copied!' : 'Copy to Clipboard'}
                    </button>
                  </div>
                  <textarea readOnly value={getLogText()}
                    className="bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] text-slate-300 font-mono focus:outline-none w-full h-[75px] resize-none overflow-y-auto" />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'config' && (
            <div className="flex justify-end gap-2 border-t border-white/10 pt-2.5">
              <button onClick={() => { setTempApiKey(apiKey); setIsSettingsOpen(false); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 transition-all">
                Cancel
              </button>
              <button onClick={() => {
                localStorage.setItem('gemini_api_key', tempApiKey);
                setApiKey(tempApiKey);
                setIsSettingsOpen(false);
                setError('');
              }} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all">
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
