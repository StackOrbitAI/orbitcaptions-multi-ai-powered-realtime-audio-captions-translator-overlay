import { useState, useEffect, useRef } from 'react';

// Supported ASR & Translation Languages
const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  zh: 'Chinese'
};

// Hardcoded Deepgram API Key for real-time speech capturing (STT)
const DEEPGRAM_API_KEY = 'eab301b90ae1eb2fb73abce646c20d023b54e2d2';

// Demo mode dialogues (English & Hindi)
const DEMO_DIALOGUES = [
  { en: "Hello everyone, welcome to the OrbitCaptions showcase.", hi: "हैलो एवरीवन, ऑर्बिटकैप्शन शोकेस में आप सभी का स्वागत है।" },
  { en: "This desktop app is built with Electron and React.", hi: "यह डेस्कटॉप ऐप इलेक्ट्रॉन और रिएक्ट के साथ बनाया गया है।" },
  { en: "It floats seamlessly on top of Zoom, MS Teams, or Google Meet.", hi: "यह ज़ूम, एमएस टीम्स या गूगल मीट के ऊपर आसानी से तैरता रहता है।" },
  { en: "You can drag it anywhere on the screen using the top handle.", hi: "आप शीर्ष हैंडल का उपयोग करके इसे स्क्रीन पर कहीं भी खींच सकते हैं।" },
  { en: "The background transparency and text size can be customized in real-time.", hi: "पृष्ठभूमि की पारदर्शिता और टेक्स्ट के आकार को वास्तविक समय में अनुकूलित किया जा सकता है।" },
  { en: "Try speaking now or let this demo show you how it works!", hi: "अभी बोलने का प्रयास करें या इस डेमो को देखने दें कि यह कैसे काम करता है!" },
  { en: "Powered by Deepgram & Google Translate — accurate real-time captioning.", hi: "डीपग्राम और गूगल ट्रांसलेट द्वारा संचालित — सटीक रीयल-टाइम कैप्शनिंग।" },
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
  const [isTranslating, setIsTranslating] = useState(false);

  // Speaker Diarization States
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [lastSpeaker, setLastSpeaker] = useState(null);

  // Customization States
  const [fontSize, setFontSize] = useState('medium');
  const [opacity, setOpacity] = useState(80);
  const [audioSource, setAudioSource] = useState('system');
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [captionTheme, setCaptionTheme] = useState(() => {
    return localStorage.getItem('caption_theme') || 'yellow';
  });

  // Typography & Layout States
  const [captionFont, setCaptionFont] = useState(() => localStorage.getItem('caption_font') || 'Inter');
  const [tempCaptionFont, setTempCaptionFont] = useState(captionFont);

  const [captionAlignment, setCaptionAlignment] = useState(() => localStorage.getItem('caption_alignment') || 'center');
  const [tempCaptionAlignment, setTempCaptionAlignment] = useState(captionAlignment);

  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(() => localStorage.getItem('always_on_top') !== 'false');

  const [deepgramKeywords, setDeepgramKeywords] = useState(() => localStorage.getItem('deepgram_keywords') || '');
  const [tempDeepgramKeywords, setTempDeepgramKeywords] = useState(deepgramKeywords);

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => localStorage.getItem('auto_save_enabled') !== 'false');
  const [tempAutoSaveEnabled, setTempAutoSaveEnabled] = useState(autoSaveEnabled);

  const [shouldAutoSave, setShouldAutoSave] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [logsCopied, setLogsCopied] = useState(false);

  const [sourceLang, setSourceLang] = useState(() => {
    return localStorage.getItem('source_lang') || 'en';
  });
  const [tempSourceLang, setTempSourceLang] = useState(sourceLang);

  const [targetLang, setTargetLang] = useState(() => {
    return localStorage.getItem('target_lang') || 'hi';
  });
  const [tempTargetLang, setTempTargetLang] = useState(targetLang);

  // Reconnection Logic
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const reconnectTimeoutRef = useRef(null);

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Resize Window Helper
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    if (window.electronAPI?.resizeWindow) {
      window.electronAPI.resizeWindow(800, 450);
    }
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    if (window.electronAPI?.resizeWindow) {
      window.electronAPI.resizeWindow(800, 180);
    }
  };

  // Sync window always-on-top state on mount
  useEffect(() => {
    if (window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(isAlwaysOnTop);
    }
  }, []);

  const getFontFamilyStyle = (font) => {
    switch (font) {
      case 'Poppins': return "'Poppins', sans-serif";
      case 'Outfit': return "'Outfit', sans-serif";
      case 'Roboto': return "'Roboto', sans-serif";
      case 'Mukta': return "'Mukta', sans-serif";
      case 'Inter':
      default: return "'Inter', sans-serif";
    }
  };

  // Refs for managing streaming resources
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const demoIndexRef = useRef(0);

  // Refs so closures always read the latest language states
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  useEffect(() => {
    sourceLangRef.current = sourceLang;
    targetLangRef.current = targetLang;
  }, [sourceLang, targetLang]);

  // Translation via Free Google Translate API
  const translateTimerRef   = useRef(null);  // debounce timer (silence-based)
  const translateIntervalRef = useRef(null); // interval timer (continuous speech)
  const lastTranslatedTextRef = useRef('');
  const isTranslatingActiveRef = useRef(false); // prevent concurrent translation calls

  // Refs for rolling display
  const currentEnRef = useRef('');
  const currentHiRef = useRef('');
  const currentSpeakerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Auto-scroll captions to bottom
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [englishText, hindiText, lastEnglishText, lastHindiText]);

  // translates sourceText → targetLang via free web Google Translate API (client=gtx)
  const doRestTranslate = async (sourceText, fromLang, toLang) => {
    if (isTranslatingActiveRef.current) return;
    if (!sourceText || sourceText.trim() === lastTranslatedTextRef.current) return;
    if (fromLang === toLang || toLang === 'none') return;

    isTranslatingActiveRef.current = true;
    try {
      const textToTranslate = sourceText.trim();
      console.log(`[TRANSLATE →] (${fromLang} to ${toLang}):`, textToTranslate.substring(0, 60));

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('[TRANSLATE] HTTP error:', res.status);
        return;
      }
      const data = await res.json();
      const translated = data?.[0]?.map(item => item[0]).join('') || '';
      console.log('[TRANSLATE ←]', translated.substring(0, 60));

      if (translated) {
        lastTranslatedTextRef.current = textToTranslate;
        currentHiRef.current = translated;
        setHindiText(translated);
        setIsTranslating(false);
      }
    } catch (e) {
      console.warn('[TRANSLATE] error:', e.message);
    } finally {
      isTranslatingActiveRef.current = false;
    }
  };

  // Schedule translation
  const scheduleTranslation = (sourceText, fromLang, toLang) => {
    if (toLang === 'none' || fromLang === toLang) return;
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    translateTimerRef.current = setTimeout(() => {
      doRestTranslate(sourceText, fromLang, toLang);
    }, 250);

    if (!translateIntervalRef.current) {
      translateIntervalRef.current = setInterval(() => {
        const from = sourceLangRef.current;
        const to = targetLangRef.current;
        const src = currentEnRef.current;
        if (src && src.trim() !== lastTranslatedTextRef.current && to !== 'none' && from !== to) {
          doRestTranslate(src.trim(), from, to);
        }
      }, 800);
    }
  };

  const stopTranslationTimers = () => {
    if (translateTimerRef.current) { clearTimeout(translateTimerRef.current); translateTimerRef.current = null; }
    if (translateIntervalRef.current) { clearInterval(translateIntervalRef.current); translateIntervalRef.current = null; }
    isTranslatingActiveRef.current = false;
  };

  const cleanupResources = () => {
    stopTranslationTimers();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
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
  const finalizeCurrentSentence = async () => {
    const from = sourceLangRef.current;
    const to = targetLangRef.current;
    const en = currentEnRef.current.trim();
    const hi = currentHiRef.current.trim();
    const spk = currentSpeakerRef.current;

    stopTranslationTimers();
    lastTranslatedTextRef.current = '';
    setIsTranslating(false);

    setEnglishText('');
    setHindiText('');
    currentEnRef.current = '';
    currentHiRef.current = '';
    setActiveSpeaker(null);
    currentSpeakerRef.current = null;

    if (en || hi) {
      let finalEn = en;
      let finalHi = hi;

      // If translation is missing when finalized, perform a final translate
      if (to !== 'none' && from !== to && en && !hi) {
        try {
          console.log(`[FINAL TRANSLATE →] (${from} to ${to}):`, en);
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(en)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const translated = data?.[0]?.map(item => item[0]).join('') || '';
            if (translated) {
              finalHi = translated;
              console.log('[FINAL TRANSLATE ←]', translated);
            }
          }
        } catch (e) {
          console.warn('[FINAL TRANSLATE] error:', e.message);
        }
      }

      setLastEnglishText(finalEn);
      setLastHindiText(finalHi);
      setLastSpeaker(spk);

      if (finalEn || finalHi) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { time: timestamp, en: finalEn, hi: finalHi, speaker: spk }]);
      }
    }
  };

  // Start Deepgram Live Translate stream
  const startDeepgramStream = async () => {
    cleanupResources();
    setEnglishText('');
    setHindiText('');
    setLastEnglishText('');
    setLastHindiText('');
    setError('');
    setTranscriptHistory([]);
    currentEnRef.current = '';
    currentHiRef.current = '';
    currentSpeakerRef.current = null;

    const key = DEEPGRAM_API_KEY;
    if (!key) {
      setError('Deepgram API key configuration error.');
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

      // 2. Create AudioContext at 16kHz
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      // Create noise reduction filter nodes
      // Highpass filter (cuts low hum, e.g. AC, fans)
      const highpass = audioContext.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 100; // cut below 100Hz

      // Lowpass filter (cuts high hiss/static)
      const lowpass = audioContext.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 4000; // cut above 4000Hz

      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      // 3. Open Deepgram Live WebSocket
      const sLang = sourceLangRef.current;
      const tLang = targetLangRef.current;

      const kwParams = deepgramKeywords
        ? deepgramKeywords.split(',').map(k => k.trim()).filter(Boolean).map(k => `&keywords=${encodeURIComponent(k)}`).join('')
        : '';
      const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=nova-3&interim_results=true&smart_format=true&punctuate=true&diarize=true&diarize_model=latest&endpointing=300&language=${sLang}${kwParams}`;
      const socket = new WebSocket(wsUrl, ['token', key]);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to Deepgram.');
        setIsListening(true);
        setError('');
        setReconnectAttempts(0); // reset reconnect count on success

        // Start keepalive timer every 10 seconds
        const keepAliveInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 10000);

        socketRef.current.keepAliveInterval = keepAliveInterval;

        processor.onaudioprocess = (e) => {
          if (socket.readyState === WebSocket.OPEN) {
            const float32 = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            socket.send(int16.buffer);
          }
        };

        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        
        // Connect nodes in series for active hum/noise filtering
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContext.destination);
      };

      socket.onmessage = async (event) => {
        try {
          let textData = '';
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          } else {
            textData = event.data;
          }
          const msg = JSON.parse(textData);

          const transcript = msg?.channel?.alternatives?.[0]?.transcript || '';
          const isFinal = msg?.is_final ?? false;
          const speechFinal = msg?.speech_final ?? false;
          const words = msg?.channel?.alternatives?.[0]?.words || [];

          // Capture active speaker diarization tags
          if (words.length > 0 && words[0].speaker !== undefined) {
            const spk = words[0].speaker;
            setActiveSpeaker(spk);
            currentSpeakerRef.current = spk;
          }

          const from = sourceLangRef.current;
          const to = targetLangRef.current;

          const appendChunk = (prev, chunk) => {
            if (!prev) return chunk;
            if (prev.endsWith(' ') || chunk.startsWith(' ')) return prev + chunk;
            return prev + ' ' + chunk;
          };

          if (transcript) {
            const activeText = appendChunk(currentEnRef.current, transcript);
            if (!isFinal) {
              setEnglishText(activeText);
              if (to !== 'none' && from !== to) {
                setIsTranslating(true);
                scheduleTranslation(activeText, from, to);
              }
            } else {
              currentEnRef.current = activeText;
              setEnglishText(activeText);
              if (to !== 'none' && from !== to) {
                scheduleTranslation(activeText, from, to);
              }
            }
          }

          if (speechFinal) {
            console.log('[SPEECH FINAL] finalizing current sentence');
            setIsTranslating(false);
            finalizeCurrentSentence();
          }
        } catch (e) {
          console.error('Failed to parse Deepgram message:', e);
        }
      };

      socket.onerror = (err) => {
        console.error('Deepgram WebSocket error:', err);
        setError('Deepgram connection error. Check your connection.');
        setIsListening(false);
        cleanupResources();
      };

      socket.onclose = (ev) => {
        console.log('Deepgram WebSocket closed:', ev.code, ev.reason);
        
        // Normal closure (triggered by clicking Stop)
        if (ev.code === 1000 || ev.code === 1001) {
          setIsListening(false);
          return;
        }

        // Unexpected closure (auto-reconnect with exponential backoff)
        const currentAttempts = reconnectAttempts;
        if (currentAttempts < 5) {
          setError(`Deepgram disconnected. Reconnecting (Attempt ${currentAttempts + 1}/5)...`);
          setReconnectAttempts(prev => prev + 1);

          const delay = Math.min(1500 * Math.pow(2, currentAttempts), 12000);
          reconnectTimeoutRef.current = setTimeout(() => {
            startDeepgramStream();
          }, delay);
        } else {
          setError('Deepgram disconnected. Max reconnection attempts reached. Check internet.');
          setIsListening(false);
          cleanupResources();
        }
      };

    } catch (err) {
      console.error('Failed to start Deepgram stream:', err);
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

  const stopStream = async () => {
    setIsListening(false);
    setReconnectAttempts(0);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    await finalizeCurrentSentence();
    cleanupResources();
    if (autoSaveEnabled) {
      setShouldAutoSave(true);
    }
  };

  useEffect(() => {
    if (shouldAutoSave && transcriptHistory.length > 0) {
      const performSilentSave = async () => {
        const content = transcriptHistory.map(item => {
          const spkLabel = item.speaker !== null && item.speaker !== undefined ? `[Speaker ${item.speaker}] ` : '';
          return `[${item.time}]\n${spkLabel}English: "${item.en}"\n${spkLabel}Hindi:   "${item.hi}"\n`;
        }).join('\n');
        const dateStr = new Date().toISOString().slice(0, 10);
        const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
        const filename = `OrbitCaptions_AutoSave_${dateStr}_${timeStr}.txt`;
        
        if (window.electronAPI?.saveFileSilent) {
          const result = await window.electronAPI.saveFileSilent(content, filename);
          if (result?.success) {
            showToast(`Transcript auto-saved to Documents/OrbitCaptions`);
          } else {
            console.error("Auto-save failed:", result?.error);
          }
        }
        setShouldAutoSave(false);
      };
      performSilentSave();
    } else if (shouldAutoSave) {
      setShouldAutoSave(false);
    }
  }, [shouldAutoSave, transcriptHistory]);

  const toggleListening = () => {
    if (isDemoMode) setIsDemoMode(false);
    if (isListening) stopStream();
    else startDeepgramStream();
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
          setLastSpeaker(currentIndex % 2);
        } else {
          setLastEnglishText('');
          setLastHindiText('');
          setLastSpeaker(null);
        }

        setEnglishText(cur.en);
        setHindiText(cur.hi);
        setActiveSpeaker(currentIndex % 2);

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { time: timestamp, en: cur.en, hi: cur.hi, speaker: currentIndex % 2 }]);
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
        setActiveSpeaker(null);
        setLastSpeaker(null);
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
    const content = transcriptHistory.map(item => {
      const spkLabel = item.speaker !== null && item.speaker !== undefined ? `[Speaker ${item.speaker}] ` : '';
      return `[${item.time}]\n${spkLabel}Source:      "${item.en}"\n${spkLabel}Translation: "${item.hi}"\n`;
    }).join('\n');
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
      isListening, isDemoMode, audioSource, captionTheme, sourceLang, targetLang,
      userAgent: navigator.userAgent,
      activeSource: englishText || 'None',
      activeTranslation: hindiText || 'None',
      historyCount: transcriptHistory.length,
      history: transcriptHistory.map(i => `[${i.time}] Spk ${i.speaker}: SRC: "${i.en}" | TGT: "${i.hi}"`).join('\n')
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
      case 'small':  return { 
        activeEn: 'text-[10px] text-slate-400 font-normal', 
        activeHi: 'text-[15px] font-bold text-yellow-400', 
        finalEn: 'text-[9px] text-slate-500 font-light', 
        finalHi: 'text-[12px] font-semibold text-slate-300' 
      };
      case 'large':  return { 
        activeEn: 'text-[15px] text-slate-400 font-normal', 
        activeHi: 'text-[26px] font-extrabold text-yellow-400', 
        finalEn: 'text-[13px] text-slate-500 font-light', 
        finalHi: 'text-[19px] font-semibold text-slate-300' 
      };
      case 'xl':     return { 
        activeEn: 'text-[18px] text-slate-400 font-normal', 
        activeHi: 'text-[34px] font-black text-yellow-400', 
        finalEn: 'text-[15px] text-slate-500 font-light', 
        finalHi: 'text-[24px] font-semibold text-slate-300' 
      };
      default:       // medium
        return { 
          activeEn: 'text-[12px] text-slate-400 font-normal', 
          activeHi: 'text-[20px] font-extrabold text-yellow-400', 
          finalEn: 'text-[11px] text-slate-500 font-light', 
          finalHi: 'text-[15px] font-semibold text-slate-300' 
        };
    }
  };
  const textClasses = getFontSizeClasses();

  // Custom Caption Theme Classes
  const getThemeClasses = () => {
    switch (captionTheme) {
      case 'white':
        return {
          activeHi: 'text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-200 drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]',
          finalHi: 'text-slate-300'
        };
      case 'cyan':
        return {
          activeHi: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-cyan-400 drop-shadow-[0_2px_8px_rgba(34,211,238,0.3)]',
          finalHi: 'text-cyan-300/80'
        };
      default: // yellow
        return {
          activeHi: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]',
          finalHi: 'text-yellow-400/80'
        };
    }
  };
  const themeClasses = getThemeClasses();

  const showEnglish = targetLang === 'none';
  const showHindi = targetLang !== 'none';

  // Render Speaker Badge
  const renderSpeakerTag = (spkId) => {
    if (spkId === null || spkId === undefined) return null;
    const colors = [
      'text-rose-400 bg-rose-500/10 border-rose-500/20',
      'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      'text-violet-400 bg-violet-500/10 border-violet-500/20'
    ];
    const colorClass = colors[spkId % colors.length];
    return (
      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border mr-2 shrink-0 ${colorClass}`}>
        🎙️ Spk {spkId}
      </span>
    );
  };

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
              {isListening ? (audioSource === 'system' ? 'Deepgram Live' : 'Mic Live') : isDemoMode ? 'Demo' : 'Offline'}
            </span>
          </div>
          {/* Deepgram badge */}
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider ml-1">✨ Deepgram</span>
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

          {/* Always on Top Pin Toggle */}
          <button
            onClick={() => {
              const nextState = !isAlwaysOnTop;
              setIsAlwaysOnTop(nextState);
              localStorage.setItem('always_on_top', String(nextState));
              if (window.electronAPI?.setAlwaysOnTop) {
                window.electronAPI.setAlwaysOnTop(nextState);
              }
            }}
            className={`p-1 hover:bg-white/5 rounded-md ml-1 transition-colors ${isAlwaysOnTop ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            title={isAlwaysOnTop ? "Pin: Always on Top (Active)" : "Unpin: Always on Top (Inactive)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={isAlwaysOnTop ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A.5.5 0 0 0 6.36 14h11.28a.5.5 0 0 0 .25-.56l-1.78-.89a2 2 0 0 1-1.11-1.79V4H9v6.76zM15 4h-6M12 4v4"></path>
            </svg>
          </button>

          {/* Settings */}
          <button onClick={handleOpenSettings} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>

          {/* Close */}
          <button onClick={closeApp} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md ml-1" title="Exit">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {/* Captions Display */}
      <div className="flex-grow p-4 flex flex-col overflow-hidden select-none no-drag relative">
        {(isListening || isDemoMode) && (
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-950/70 border border-red-500/30 text-red-200 text-[10px] py-1.5 px-2.5 rounded-lg font-medium mb-2 shrink-0">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span className="flex-1 leading-relaxed select-text cursor-text">{error}</span>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => {
                  const txt = error;
                  if (window.electronAPI?.copyToClipboard) window.electronAPI.copyToClipboard(txt);
                  else navigator.clipboard.writeText(txt).catch(console.error);
                }}
                className="px-1.5 py-0.5 rounded bg-red-800/60 hover:bg-red-700/60 text-red-200 text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Copy error text">
                Copy
              </button>
              <button
                onClick={() => setError('')}
                className="px-1.5 py-0.5 rounded bg-red-800/60 hover:bg-red-700/60 text-red-200 text-[9px] font-bold uppercase tracking-wider transition-all"
                title="Dismiss">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scrollable captions wrapper (auto-scrolls to bottom) */}
        <div
          ref={scrollContainerRef}
          className="flex-grow flex flex-col gap-3 overflow-y-auto no-scrollbar"
        >
          {/* Spacer to push content to bottom without justify-end flex bug */}
          <div className="flex-grow min-h-[0px]" />

          {(!englishText && !hindiText && !error) && (
            <div className="flex flex-col items-center justify-center text-slate-500 text-center gap-2 py-4 animate-pulse shrink-0">
              <div className="flex gap-1 items-center justify-center">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span className="text-xs uppercase tracking-widest font-bold">
                {isListening
                  ? (audioSource === 'system' ? 'Deepgram listening to speakers...' : 'Deepgram listening to mic...')
                  : isDemoMode ? 'Running demo...'
                  : "Ready — click 'Speech' or 'Demo'"}
              </span>
            </div>
          )}

          {/* Rolling: Last finalized (dimmed top) */}
          {((showEnglish && lastEnglishText) || (showHindi && lastHindiText)) && (
            <div className="flex items-start gap-1 border-l-2 border-slate-500/20 pl-3 py-0.5 opacity-60 scale-[0.98] origin-left transition-all duration-300 shrink-0 animate-caption-in">
              {renderSpeakerTag(lastSpeaker)}
              <div className="flex-grow flex flex-col gap-1" style={{ textAlign: captionAlignment }}>
                {showEnglish && lastEnglishText && (
                  <div className={`${textClasses.finalEn} tracking-wide italic drop-shadow-sm`} style={{ fontFamily: getFontFamilyStyle(captionFont) }}>
                    "{lastEnglishText}"
                  </div>
                )}
                {showHindi && lastHindiText && (
                  <div className={`${textClasses.finalHi} leading-relaxed ${themeClasses.finalHi}`} style={{ fontFamily: getFontFamilyStyle(captionFont) }}>
                    {lastHindiText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rolling: Active current (bright bottom) */}
          {((showEnglish && englishText) || (showHindi && hindiText) || isTranslating) && (
            <div className="flex items-start gap-1 border-l-2 border-indigo-400 pl-3 py-0.5 transition-all duration-300 shrink-0 animate-caption-in">
              {renderSpeakerTag(activeSpeaker)}
              <div className="flex-grow flex flex-col gap-1" style={{ textAlign: captionAlignment }}>
                {showEnglish && englishText && (
                  <div className={`${textClasses.activeEn} tracking-wide italic drop-shadow-md`} style={{ fontFamily: getFontFamilyStyle(captionFont) }}>
                    "{englishText}"
                  </div>
                )}
                {showHindi && (
                  hindiText ? (
                    <div className={`${textClasses.activeHi} leading-relaxed ${themeClasses.activeHi}`} style={{ fontFamily: getFontFamilyStyle(captionFont) }}>
                      {hindiText}
                    </div>
                  ) : isTranslating && (translationDirection === 'en-hi') && (
                    <div className="flex items-center gap-1.5" style={{ fontFamily: getFontFamilyStyle(captionFont), justifyContent: captionAlignment === 'center' ? 'center' : captionAlignment === 'right' ? 'flex-end' : 'flex-start' }}>
                      <span className="text-yellow-400/50 text-[11px] font-semibold italic tracking-wide">अनुवाद</span>
                      <span className="w-1 h-1 bg-yellow-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-yellow-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-yellow-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  )
                )}
                {showEnglish && !englishText && isTranslating && (translationDirection === 'hi-en') && (
                  <div className="flex items-center gap-1.5" style={{ fontFamily: getFontFamilyStyle(captionFont), justifyContent: captionAlignment === 'center' ? 'center' : captionAlignment === 'right' ? 'flex-end' : 'flex-start' }}>
                    <span className="text-indigo-400/50 text-[11px] font-semibold italic tracking-wide">Translating</span>
                    <span className="w-1 h-1 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
                  ⚙️ Settings
                </button>
                <button onClick={() => setActiveTab('logs')}
                  className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 ${activeTab === 'logs' ? 'text-indigo-300 border-indigo-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
                  📋 Session Logs
                </button>
              </div>
              <button onClick={handleCloseSettings} className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto pr-1">
              {activeTab === 'config' ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1 text-left">
                  {/* Speaker Language */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Speaker Language (Audio)</label>
                    <select value={tempSourceLang} onChange={(e) => setTempSourceLang(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full cursor-pointer">
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Translation Language */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Translation Language</label>
                    <select value={tempTargetLang} onChange={(e) => setTempTargetLang(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full cursor-pointer">
                      <option value="none">None (No Translation)</option>
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Font Family */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Font Family</label>
                    <select value={tempCaptionFont} onChange={(e) => setTempCaptionFont(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full cursor-pointer">
                      <option value="Inter">Inter</option>
                      <option value="Poppins">Poppins</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Mukta">Mukta</option>
                    </select>
                  </div>

                  {/* Alignment */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Alignment</label>
                    <div className="flex gap-1">
                      {['left', 'center', 'right'].map((align) => (
                        <button
                          key={align}
                          onClick={() => setTempCaptionAlignment(align)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border transition-all ${tempCaptionAlignment === align ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'}`}
                          type="button"
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="flex flex-col gap-1 bg-slate-950/20 col-span-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Caption Theme</label>
                    <div className="flex gap-1">
                      {['yellow', 'white', 'cyan'].map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            localStorage.setItem('caption_theme', t);
                            setCaptionTheme(t);
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border transition-all ${captionTheme === t ? 'bg-indigo-600 text-white border-transparent' : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'}`}
                          type="button"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyword Boosting */}
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Keyword Boosting (Comma-separated)</label>
                    <input
                      type="text"
                      value={tempDeepgramKeywords}
                      onChange={(e) => setTempDeepgramKeywords(e.target.value)}
                      placeholder="e.g. OrbitCaptions, Deepgram, Zoom"
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full"
                    />
                  </div>

                  {/* Auto Save Toggle */}
                  <div className="col-span-2 flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded mt-1">
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold">Auto-Save Transcripts</p>
                      <p className="text-[8px] text-slate-500">Saves transcript silently to Documents/OrbitCaptions when capture stops.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={tempAutoSaveEnabled}
                      onChange={(e) => setTempAutoSaveEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 bg-slate-900 cursor-pointer"
                    />
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
                    className="bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] text-slate-300 font-mono focus:outline-none w-full h-[120px] resize-none overflow-y-auto" />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'config' && (
            <div className="flex justify-end gap-2 border-t border-white/10 pt-2.5">
              <button onClick={() => { 
                setTempSourceLang(sourceLang);
                setTempTargetLang(targetLang);
                setTempCaptionFont(captionFont);
                setTempCaptionAlignment(captionAlignment);
                setTempDeepgramKeywords(deepgramKeywords);
                setTempAutoSaveEnabled(autoSaveEnabled);
                handleCloseSettings();
              }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/5 transition-all">
                Cancel
              </button>
              <button onClick={() => {
                localStorage.setItem('source_lang', tempSourceLang);
                setSourceLang(tempSourceLang);

                localStorage.setItem('target_lang', tempTargetLang);
                setTargetLang(tempTargetLang);

                localStorage.setItem('caption_font', tempCaptionFont);
                setCaptionFont(tempCaptionFont);

                localStorage.setItem('caption_alignment', tempCaptionAlignment);
                setCaptionAlignment(tempCaptionAlignment);

                localStorage.setItem('deepgram_keywords', tempDeepgramKeywords);
                setDeepgramKeywords(tempDeepgramKeywords);

                localStorage.setItem('auto_save_enabled', String(tempAutoSaveEnabled));
                setAutoSaveEnabled(tempAutoSaveEnabled);

                handleCloseSettings();
                setError('');
                showToast("Configuration saved successfully!");
              }} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all">
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-slate-900/95 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg shadow-2xl flex items-center gap-1.5 backdrop-blur-md z-[100] animate-caption-in">
          <span className="text-emerald-400">✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
