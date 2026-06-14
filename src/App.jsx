import { useState, useEffect, useRef } from 'react';

// Hardcoded Deepgram API Key provided by the user
const DEEPGRAM_API_KEY = '379843eb33b0d607259b4b0c08b951de36e77afe';

// Demo mode dialogues (English & Hindi)
const DEMO_DIALOGUES = [
  { en: "Hello everyone, welcome to the OrbitCaptions showcase.", hi: "हैलो एवरीवन, ऑर्बिटकैप्शन शोकेस में आप सभी का स्वागत है।" },
  { en: "This desktop app is built with Electron and React.", hi: "यह डेस्कटॉप ऐप इलेक्ट्रॉन और रिएक्ट के साथ बनाया गया है।" },
  { en: "It floats seamlessly on top of Zoom, MS Teams, or Google Meet.", hi: "यह ज़ूम, एमएस टीम्स या गूगल मीट के ऊपर आसानी से तैरता रहता है।" },
  { en: "You can drag it anywhere on the screen using the top handle.", hi: "आप शीर्ष हैंडल का उपयोग करके इसे स्क्रीन पर कहीं भी खींच सकते हैं।" },
  { en: "The background transparency and text size can be customized in real-time.", hi: "पृष्ठभूमि की पारदर्शिता और टेक्स्ट के आकार को वास्तविक समय में अनुकूलित किया जा सकता है।" },
  { en: "Try speaking now or let this demo show you how it works!", hi: "अभी बोलने का प्रयास करें या इस डेमो को देखने दें कि यह कैसे काम करता है!" },
  { en: "We are translating English speech to Hindi instantly using Google translation API.", hi: "हम गूगल अनुवाद एपीआई का उपयोग करके अंग्रेजी भाषण का तुरंत हिंदी में अनुवाद कर रहे हैं।" },
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
  const [fontSize, setFontSize] = useState('medium'); // small, medium, large, xl
  const [opacity, setOpacity] = useState(80); // percentage (10-100)
  const [audioSource, setAudioSource] = useState('system'); // 'system' (speaker/Zoom output) or 'mic' (microphone)
  const [transcriptHistory, setTranscriptHistory] = useState([]); // holds [{ time, en, hi }]
  
  // API and Settings States
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('deepgram_api_key') || DEEPGRAM_API_KEY;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [logsCopied, setLogsCopied] = useState(false);
  
  // Refs for managing streaming resources
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const demoIndexRef = useRef(0);
  
  // Refs for managing transcription-to-translation queue and timers
  const lastTranslatedTextRef = useRef('');
  const isTranslatingRef = useRef(false);
  const pendingTranslationRef = useRef(null); // holds { text: string, isFinal: boolean }
  const lastTranslationTimeRef = useRef(0);
  const translationTimeoutRef = useRef(null);

  // Translation function using free Google Translate API - supports full paragraphs
  const translateText = async (text) => {
    if (!text.trim()) return '';
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data[0]) {
        // Map over all translated parts and join them to prevent truncated text
        return data[0]
          .map(item => item && item[0])
          .filter(Boolean)
          .join('');
      }
    } catch (err) {
      console.error("Translation error:", err);
    }
    return '';
  };

  // Perform translation run and process pending queue when done
  const performTranslation = async (text, isFinal) => {
    if (!text.trim()) return;
    isTranslatingRef.current = true;
    try {
      const translated = await translateText(text);
      if (translated) {
        if (isFinal) {
          // Push finalized translation to the top rolling display
          setLastEnglishText(text);
          setLastHindiText(translated);
          // Clear active display for new words
          setEnglishText('');
          setHindiText('');

          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setTranscriptHistory(prev => {
            const exists = prev.some(item => item.en === text && item.time === timestamp);
            if (exists) return prev;
            return [...prev, { time: timestamp, en: text, hi: translated }];
          });
        } else {
          // Update the active real-time display
          setEnglishText(text);
          setHindiText(translated);
        }
        lastTranslatedTextRef.current = text;
      }
    } catch (e) {
      console.error("Translation run error:", e);
    } finally {
      isTranslatingRef.current = false;
      lastTranslationTimeRef.current = Date.now();

      // Immediately process next item if a newer text arrived during translation
      if (pendingTranslationRef.current) {
        const { text: nextText, isFinal: nextIsFinal } = pendingTranslationRef.current;
        if (nextText !== lastTranslatedTextRef.current || nextIsFinal) {
          pendingTranslationRef.current = null;
          performTranslation(nextText, nextIsFinal);
        } else {
          pendingTranslationRef.current = null;
        }
      }
    }
  };

  // Schedule interim translations using a low-latency 200ms throttle/debounce mechanism
  const scheduleInterimTranslation = (text) => {
    if (isTranslatingRef.current) {
      pendingTranslationRef.current = { text, isFinal: false };
      return;
    }
    
    const now = Date.now();
    const timeSinceLast = now - lastTranslationTimeRef.current;
    const minInterval = 200; // Fast 200ms translation interval
    
    if (timeSinceLast >= minInterval) {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
        translationTimeoutRef.current = null;
      }
      lastTranslationTimeRef.current = now;
      performTranslation(text, false);
    } else {
      if (translationTimeoutRef.current) {
        pendingTranslationRef.current = { text, isFinal: false };
        return;
      }
      
      pendingTranslationRef.current = { text, isFinal: false };
      const delay = minInterval - timeSinceLast;
      translationTimeoutRef.current = setTimeout(() => {
        translationTimeoutRef.current = null;
        if (pendingTranslationRef.current) {
          const { text: nextText, isFinal: nextIsFinal } = pendingTranslationRef.current;
          pendingTranslationRef.current = null;
          performTranslation(nextText, nextIsFinal);
        }
      }, delay);
    }
  };

  // Central text update controller (routes to final vs interim flows)
  const handleTextUpdate = (text, isFinal) => {
    setEnglishText(text);
    
    if (isFinal) {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
        translationTimeoutRef.current = null;
      }
      
      if (isTranslatingRef.current) {
        pendingTranslationRef.current = { text, isFinal: true };
      } else {
        performTranslation(text, true);
      }
    } else {
      scheduleInterimTranslation(text);
    }
  };

  // Cleanup all active resources
  const cleanupResources = () => {
    // 1. Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error("Error stopping media recorder:", e);
      }
    }
    mediaRecorderRef.current = null;

    // 2. Stop microphone/desktop capture tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 3. Close Deepgram WebSocket
    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {
        console.error("Error closing socket:", e);
      }
      socketRef.current = null;
    }

    // 4. Stop Demo Interval
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }

    // 5. Clean up translation queue timers
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
      translationTimeoutRef.current = null;
    }
    pendingTranslationRef.current = null;
    isTranslatingRef.current = false;
    lastTranslatedTextRef.current = '';
    setLastEnglishText('');
    setLastHindiText('');
  };

  // Deepgram Live Speech-to-Text WebSocket Stream Setup
  const startDeepgramStream = async () => {
    cleanupResources();
    setEnglishText('');
    setHindiText('');
    setLastEnglishText('');
    setLastHindiText('');
    setError('');
    setTranscriptHistory([]); // Reset history when starting fresh

    try {
      let stream;

      // 1. Capture system audio (speakers/Zoom output) or physical microphone
      if (audioSource === 'system') {
        if (!window.electronAPI || !window.electronAPI.getDesktopSourceId) {
          throw new Error("Desktop audio capture is only supported inside the desktop application.");
        }

        const sourceId = await window.electronAPI.getDesktopSourceId();
        if (!sourceId) {
          throw new Error("Could not find system audio device.");
        }

        // Constraints for capturing desktop system audio in Electron
        // Disables browser filters (echo cancellation/noise suppression) for clear loopback
        const constraints = {
          audio: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          },
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          }
        };

        // Capture display audio stream
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Stop the video track immediately as we only want audio track (saves CPU/memory)
        stream.getVideoTracks().forEach(track => track.stop());
      } else {
        // Capture physical microphone
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = stream;

      // 2. Connect to Deepgram's streaming API via WebSocket
      // Added language=en to lock the transcription model to English for maximum accuracy
      const wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=300';
      const socket = new WebSocket(wsUrl, ['token', apiKey]);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log(`Connected to Deepgram successfully using ${audioSource === 'system' ? 'System Audio' : 'Microphone'}.`);
        setIsListening(true);

        // 3. Start recording audio and send chunks to Deepgram
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        // Capture and send audio slices every 100ms (reduces latency by 150ms)
        mediaRecorder.start(100);
      };

      socket.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          const transcript = response.channel?.alternatives[0]?.transcript || '';
          const isFinal = response.is_final;
          
          if (transcript.trim()) {
            handleTextUpdate(transcript, isFinal);
          }
        } catch (e) {
          console.error("Failed to parse Deepgram message:", e);
        }
      };

      socket.onerror = (err) => {
        console.error("Deepgram WebSocket error:", err);
        setError("Deepgram connection error. Verify your API key and connection.");
        setIsListening(false);
        cleanupResources();
      };

      socket.onclose = () => {
        console.log("Deepgram connection closed.");
        setIsListening(false);
      };

    } catch (err) {
      console.error("Failed to start Deepgram stream:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(audioSource === 'system' 
          ? "Screen recording permission denied. Please allow screen/audio share in OS settings."
          : "Microphone permission denied. Please check your system settings."
        );
      } else {
        setError(err.message || "Failed to initialize audio capture. Try Demo Mode.");
      }
      setIsListening(false);
      cleanupResources();
    }
  };

  const stopDeepgramStream = () => {
    setIsListening(false);
    cleanupResources();
  };

  const toggleListening = () => {
    if (isDemoMode) setIsDemoMode(false);

    if (isListening) {
      stopDeepgramStream();
    } else {
      startDeepgramStream();
    }
  };

  // Demo Mode Loop
  useEffect(() => {
    if (isDemoMode) {
      if (isListening) {
        stopDeepgramStream();
      }

      demoIndexRef.current = 0;
      const runDemoStep = () => {
        const currentIndex = demoIndexRef.current;
        const currentDialogue = DEMO_DIALOGUES[currentIndex];
        
        // Rolling display simulation: show the previous dialogue on top dimmed
        const prevIndex = (currentIndex - 1 + DEMO_DIALOGUES.length) % DEMO_DIALOGUES.length;
        if (currentIndex !== 0 || demoIndexRef.current > 0) {
          const prevDialogue = DEMO_DIALOGUES[prevIndex];
          setLastEnglishText(prevDialogue.en);
          setLastHindiText(prevDialogue.hi);
        } else {
          setLastEnglishText('');
          setLastHindiText('');
        }

        setEnglishText(currentDialogue.en);
        setHindiText(currentDialogue.hi);

        // Push demo dialogues to history for testing download button
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { time: timestamp, en: currentDialogue.en, hi: currentDialogue.hi }]);

        demoIndexRef.current = (demoIndexRef.current + 1) % DEMO_DIALOGUES.length;
      };

      runDemoStep(); // run immediately
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

    return () => {
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    };
  }, [isDemoMode]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const toggleDemoMode = () => {
    if (isListening) {
      stopDeepgramStream();
    }
    setError('');
    setTranscriptHistory([]); // Reset history when toggling demo mode
    setIsDemoMode(!isDemoMode);
  };

  const downloadTranscript = () => {
    if (transcriptHistory.length === 0) return;
    
    // Generate formatted text content
    const content = transcriptHistory.map(item => 
      `[${item.time}]\nEnglish: "${item.en}"\nHindi:   "${item.hi}"\n`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Generate name with today's date
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `OrbitCaptions_Transcript_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      error: error || 'None',
      isListening,
      isDemoMode,
      audioSource,
      apiKeyConfigured: apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}` : 'None',
      userAgent: navigator.userAgent,
      activeEnglish: englishText || 'None',
      activeHindi: hindiText || 'None',
      historyCount: transcriptHistory.length,
      history: transcriptHistory.map(item => `[${item.time}] EN: "${item.en}" | HI: "${item.hi}"`).join('\n')
    };

    const logText = JSON.stringify(logData, null, 2);
    navigator.clipboard.writeText(logText).then(() => {
      setLogsCopied(true);
      setTimeout(() => setLogsCopied(false), 2000);
    }).catch(err => {
      console.error("Failed to copy logs:", err);
    });
  };

  const closeApp = () => {
    cleanupResources();
    if (window.electronAPI) {
      window.electronAPI.closeApp();
    } else {
      window.close();
    }
  };

  // Font Size Classes Mapping for Active and Finalized rolling layouts
  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'small':
        return {
          activeEn: 'text-[11px] text-indigo-200 font-medium',
          activeHi: 'text-[15px] font-bold text-yellow-400',
          finalEn: 'text-[10px] text-slate-400 font-light',
          finalHi: 'text-[13px] font-semibold text-slate-300'
        };
      case 'large':
        return {
          activeEn: 'text-[14px] text-indigo-200 font-medium',
          activeHi: 'text-[28px] font-extrabold text-yellow-400',
          finalEn: 'text-[12px] text-slate-400 font-light',
          finalHi: 'text-[20px] font-semibold text-slate-300'
        };
      case 'xl':
        return {
          activeEn: 'text-[16px] text-indigo-200 font-medium',
          activeHi: 'text-[36px] font-black text-yellow-400',
          finalEn: 'text-[14px] text-slate-400 font-light',
          finalHi: 'text-[26px] font-semibold text-slate-300'
        };
      case 'medium':
      default:
        return {
          activeEn: 'text-[12px] text-indigo-200 font-medium',
          activeHi: 'text-[22px] font-extrabold text-yellow-400',
          finalEn: 'text-[11px] text-slate-400 font-light',
          finalHi: 'text-[16px] font-semibold text-slate-300'
        };
    }
  };

  const textClasses = getFontSizeClasses();

  return (
    <div 
      className="flex flex-col h-full w-full rounded-2xl border border-white/10 overflow-hidden text-white shadow-2xl transition-all duration-300"
      style={{ 
        backgroundColor: `rgba(10, 15, 30, ${opacity / 100})`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      {/* Top Drag & Control Bar */}
      <div className="drag-region h-10 bg-slate-950/60 flex items-center justify-between px-4 cursor-move border-b border-white/5 select-none">
        
        {/* Left: Brand Name (Draggable) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-wider uppercase">OrbitCaptions</span>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`w-2 h-2 rounded-full ${(isListening || isDemoMode) ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              {isListening ? (audioSource === 'system' ? 'System Audio Live' : 'Mic Live') : isDemoMode ? 'Demo Active' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Right: Controls & Actions (Not Draggable) */}
        <div className="flex items-center gap-3 no-drag">
          {/* Customization Options */}
          <div className="flex items-center gap-2 mr-2 border-r border-white/10 pr-3">
            
            {/* Audio Source Toggle Button */}
            <button
              onClick={() => setAudioSource(audioSource === 'system' ? 'mic' : 'system')}
              disabled={isListening}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${isListening ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} ${audioSource === 'system' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-900/60 text-slate-400 border-white/5'}`}
              title={audioSource === 'system' ? "Capturing Speaker/System Audio (Zoom output)" : "Capturing Microphone Audio (Your voice)"}
            >
              {audioSource === 'system' ? '🔊 Speakers' : '🎙️ Mic'}
            </button>

            {/* Opacity Selector */}
            <div className="flex items-center gap-1.5 ml-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 2a10 10 0 0 0-10 10h20a10 10 0 0 0-10-10z" fill="currentColor"></path>
              </svg>
              <input 
                type="range" 
                min="20" 
                max="100" 
                value={opacity} 
                onChange={(e) => setOpacity(parseInt(e.target.value))}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
                title={`Opacity: ${opacity}%`}
              />
            </div>

            {/* Font Size Selector */}
            <div className="flex items-center bg-slate-900/60 rounded-md p-0.5 border border-white/5 ml-1">
              {['S', 'M', 'L', 'XL'].map((size, idx) => {
                const sizeKeys = ['small', 'medium', 'large', 'xl'];
                const key = sizeKeys[idx];
                return (
                  <button
                    key={size}
                    onClick={() => setFontSize(key)}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${fontSize === key ? 'bg-indigo-500/80 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle Buttons */}
          <div className="flex items-center gap-2">
            {/* Logs Copy Button */}
            <button 
              onClick={copyLogs}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${logsCopied ? 'bg-emerald-600 text-white border-transparent shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800'}`}
              title="Copy Debug Logs & History to Clipboard"
            >
              {logsCopied ? '📋 Copied!' : '📋 Logs'}
            </button>

            {/* Download Button */}
            <button 
              onClick={downloadTranscript}
              disabled={transcriptHistory.length === 0}
              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${transcriptHistory.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-[0_0_8px_rgba(79,70,229,0.3)]' : 'bg-slate-900/40 text-slate-600 border-white/5 cursor-not-allowed'}`}
              title="Download Entire Meeting Transcript (.txt)"
            >
              📥 DL
            </button>

            {/* Demo Button */}
            <button 
              onClick={toggleDemoMode}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${isDemoMode ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800'}`}
              title="Toggle Simulated Demo Captions"
            >
              Demo
            </button>

            {/* Microphone Button */}
            <button 
              onClick={toggleListening}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all border ${isListening ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              {isListening ? 'Stop' : 'Speech'}
            </button>
          </div>

          {/* Settings Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1"
            title="Configure API Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          {/* Close Button */}
          <button 
            onClick={closeApp} 
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1"
            title="Exit Application"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Captions Display Box */}
      <div className="flex-grow p-4 flex flex-col justify-center gap-3 overflow-hidden select-none no-drag relative">
        {/* Soft Background Accent Glows */}
        {(isListening || isDemoMode) && (
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-200 text-xs py-2 px-3 rounded-lg text-center font-medium shadow-inner flex flex-col items-center gap-1.5 animate-fadeIn">
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
              {isListening ? (audioSource === 'system' ? "Listening to Zoom/Speaker..." : "Listening to Microphone...") : isDemoMode ? "Generating simulation..." : "Ready to caption. Click 'Speech' or 'Demo'"}
            </span>
          </div>
        )}

        {/* Rolling Layout: Last Finalized Caption (Dimmed on top) */}
        {lastEnglishText && (
          <div className="flex flex-col gap-1 border-l-2 border-slate-500/20 pl-3 py-0.5 opacity-60 scale-[0.98] origin-left transition-all duration-300 animate-fadeIn">
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

        {/* Rolling Layout: Current Active Caption (Bright at the bottom) */}
        {(englishText || hindiText) && (
          <div className="flex flex-col gap-1 border-l-2 border-indigo-400 pl-3 py-0.5 transition-all duration-300">
            {englishText && (
              <div 
                className={`${textClasses.activeEn} tracking-wide italic drop-shadow-md line-clamp-2`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                "{englishText}"
              </div>
            )}
            {hindiText && (
              <div 
                className={`${textClasses.activeHi} leading-relaxed text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]`}
                style={{ fontFamily: "'Mukta', sans-serif" }}
              >
                {hindiText}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mic sound level bar simulation */}
      {(isListening || isDemoMode) && (
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-purple-500 w-full origin-left scale-x-100 transition-transform duration-300 opacity-60 animate-pulse"></div>
      )}

      {/* Settings Modal Overlay */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 z-50 animate-fadeIn no-drag">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                API Settings
              </span>
              <button 
                onClick={() => {
                  setTempApiKey(apiKey);
                  setIsSettingsOpen(false);
                }} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Deepgram API Key</label>
              <input 
                type="password" 
                value={tempApiKey} 
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="Enter your Deepgram API Key..." 
                className="bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full font-mono"
              />
              <span className="text-[9px] text-slate-500">
                You can get a free API key with $200 credits from <a href="https://console.deepgram.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300 no-drag">console.deepgram.com</a>.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button 
              onClick={() => {
                setTempApiKey(apiKey);
                setIsSettingsOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                localStorage.setItem('deepgram_api_key', tempApiKey);
                setApiKey(tempApiKey);
                setIsSettingsOpen(false);
                setError('');
              }}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

