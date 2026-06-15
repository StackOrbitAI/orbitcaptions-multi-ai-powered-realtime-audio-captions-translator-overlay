import { useState, useEffect, useRef } from 'react';

// Supported ASR & Translation Languages
const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  ja: 'Japanese (日本語)',
  zh: 'Chinese (中文)',
  pt: 'Portuguese (Português)',
  it: 'Italian (Italiano)',
  ru: 'Russian (Русский)',
  ko: 'Korean (한국어)',
  nl: 'Dutch (Nederlands)',
  tr: 'Turkish (Türkçe)',
  sv: 'Swedish (Svenska)',
  id: 'Indonesian (Bahasa Indonesia)',
  uk: 'Ukrainian (Українська)',
  ar: 'Arabic (العربية)',
  vi: 'Vietnamese (Tiếng Việt)',
  pl: 'Polish (Polski)',
  fil: 'Filipino (Tagalog)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  bn: 'Bengali (বাংলা)',
  kn: 'Kannada (ಕನ್ನಡ)',
  ml: 'Malayalam (മലയാളം)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  ur: 'Urdu (اردو)',
  cs: 'Czech (Čeština)',
  da: 'Danish (Dansk)',
  fi: 'Finnish (Suomi)',
  el: 'Greek (Ελληνικά)',
  he: 'Hebrew (עברית)',
  hu: 'Hungarian (Magyar)',
  ms: 'Malay (Bahasa Melayu)',
  no: 'Norwegian (Norsk)',
  ro: 'Romanian (Română)',
  sk: 'Slovak (Slovenčina)',
  th: 'Thai (ไทย)'
};

const isRtl = (langCode) => ['ar', 'he', 'ur'].includes(langCode);
const getLangDir = (langCode) => isRtl(langCode) ? 'rtl' : 'ltr';

// Hardcoded Deepgram API Key for real-time speech capturing (STT)
const DEEPGRAM_API_KEY = 'eab301b90ae1eb2fb73abce646c20d023b54e2d2';

// Demo mode dialogues (English & Hindi)
const DEMO_DIALOGUES = [
  { en: "Hello everyone, welcome to the OrbitAI-Captions showcase.", hi: "हैलो एवरीवन, ऑर्बिटकैप्शन शोकेस में आप सभी का स्वागत है।" },
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
    return localStorage.getItem('caption_theme') || 'match';
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
  const [activeTab, setActiveTab] = useState('general');
  const [logsCopied, setLogsCopied] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Global Themes & Quick Switcher States
  const [appTheme, setAppTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'indigo';
  });
  const [showQuickLangBar, setShowQuickLangBar] = useState(() => {
    return localStorage.getItem('show_quick_lang_bar') !== 'false';
  });

  // LLM Translation & TTS States
  const [translateProvider, setTranslateProvider] = useState(() => localStorage.getItem('translate_provider') || 'google');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.0-flash');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(() => localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1');
  const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('openai_model') || 'gpt-4o-mini');
  const [deepseekApiKey, setDeepseekApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState(() => localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com/v1');
  const [deepseekModel, setDeepseekModel] = useState(() => localStorage.getItem('deepseek_model') || 'deepseek-chat');
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('custom_api_key') || '');
  const [customBaseUrl, setCustomBaseUrl] = useState(() => localStorage.getItem('custom_base_url') || '');
  const [customModel, setCustomModel] = useState(() => localStorage.getItem('custom_model') || '');
  const [translateFinalOnly, setTranslateFinalOnly] = useState(() => localStorage.getItem('translate_final_only') !== 'false');
  const [translationDebounce, setTranslationDebounce] = useState(() => parseInt(localStorage.getItem('translation_debounce')) || 250);
  const [deepgramApiKey, setDeepgramApiKey] = useState(() => localStorage.getItem('deepgram_api_key') || '');
  const [deepgramModel, setDeepgramModel] = useState(() => localStorage.getItem('deepgram_model') || 'nova-3');

  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('tts_enabled') === 'true');
  const [ttsEngine, setTtsEngine] = useState(() => localStorage.getItem('tts_engine') || 'system');
  const [googleTtsApiKey, setGoogleTtsApiKey] = useState(() => localStorage.getItem('google_tts_api_key') || '');
  const [ttsRate, setTtsRate] = useState(() => parseFloat(localStorage.getItem('tts_rate')) || 1.0);
  const [ttsVoiceName, setTtsVoiceName] = useState(() => localStorage.getItem('tts_voice_name') || '');
  const [googleTtsVoiceName, setGoogleTtsVoiceName] = useState(() => localStorage.getItem('google_tts_voice_name') || 'auto');
  const [availableVoices, setAvailableVoices] = useState([]);

  // Temp Settings States
  const [tempCaptionTheme, setTempCaptionTheme] = useState(captionTheme);
  const [tempAppTheme, setTempAppTheme] = useState(appTheme);
  const [tempTranslateProvider, setTempTranslateProvider] = useState(translateProvider);
  const [tempGeminiApiKey, setTempGeminiApiKey] = useState(geminiApiKey);
  const [tempGeminiModel, setTempGeminiModel] = useState(geminiModel);
  const [tempOpenaiApiKey, setTempOpenaiApiKey] = useState(openaiApiKey);
  const [tempOpenaiBaseUrl, setTempOpenaiBaseUrl] = useState(openaiBaseUrl);
  const [tempOpenaiModel, setTempOpenaiModel] = useState(openaiModel);
  const [tempDeepseekApiKey, setTempDeepseekApiKey] = useState(deepseekApiKey);
  const [tempDeepseekBaseUrl, setTempDeepseekBaseUrl] = useState(deepseekBaseUrl);
  const [tempDeepseekModel, setTempDeepseekModel] = useState(deepseekModel);
  const [tempCustomApiKey, setTempCustomApiKey] = useState(customApiKey);
  const [tempCustomBaseUrl, setTempCustomBaseUrl] = useState(customBaseUrl);
  const [tempCustomModel, setTempCustomModel] = useState(customModel);
  const [tempTranslateFinalOnly, setTempTranslateFinalOnly] = useState(translateFinalOnly);
  const [tempTranslationDebounce, setTempTranslationDebounce] = useState(translationDebounce);
  const [tempDeepgramApiKey, setTempDeepgramApiKey] = useState(deepgramApiKey);
  const [tempDeepgramModel, setTempDeepgramModel] = useState(deepgramModel);

  const [tempTtsEnabled, setTempTtsEnabled] = useState(ttsEnabled);
  const [tempTtsEngine, setTempTtsEngine] = useState(ttsEngine);
  const [tempGoogleTtsApiKey, setTempGoogleTtsApiKey] = useState(googleTtsApiKey);
  const [tempTtsRate, setTempTtsRate] = useState(ttsRate);
  const [tempTtsVoiceName, setTempTtsVoiceName] = useState(ttsVoiceName);
  const [tempGoogleTtsVoiceName, setTempGoogleTtsVoiceName] = useState(googleTtsVoiceName);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

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

  const updateSourceLanguage = (newLang) => {
    localStorage.setItem('source_lang', newLang);
    setSourceLang(newLang);
    setTempSourceLang(newLang);
    if (isListening) {
      setTimeout(() => {
        startDeepgramStream();
      }, 100);
    }
  };

  const updateTargetLanguage = (newLang) => {
    localStorage.setItem('target_lang', newLang);
    setTargetLang(newLang);
    setTempTargetLang(newLang);
    if (newLang !== 'none' && sourceLang !== newLang && currentEnRef.current) {
      doRestTranslate(currentEnRef.current, sourceLang, newLang);
    }
  };

  // Resize Window Helper
  // Resize Window Helper
  const handleOpenSettings = () => {
    setTempCaptionFont(captionFont);
    setTempCaptionAlignment(captionAlignment);
    setTempDeepgramKeywords(deepgramKeywords);
    setTempAutoSaveEnabled(autoSaveEnabled);
    setTempSourceLang(sourceLang);
    setTempTargetLang(targetLang);

    setTempCaptionTheme(captionTheme);
    setTempAppTheme(appTheme);
    setTempTranslateProvider(translateProvider);
    setTempGeminiApiKey(geminiApiKey);
    setTempGeminiModel(geminiModel);
    setTempOpenaiApiKey(openaiApiKey);
    setTempOpenaiBaseUrl(openaiBaseUrl);
    setTempOpenaiModel(openaiModel);
    setTempDeepseekApiKey(deepseekApiKey);
    setTempDeepseekBaseUrl(deepseekBaseUrl);
    setTempDeepseekModel(deepseekModel);
    setTempCustomApiKey(customApiKey);
    setTempCustomBaseUrl(customBaseUrl);
    setTempCustomModel(customModel);
    setTempTranslateFinalOnly(translateFinalOnly);
    setTempTranslationDebounce(translationDebounce);
    setTempDeepgramApiKey(deepgramApiKey);
    setTempDeepgramModel(deepgramModel);
    
    setTempTtsEnabled(ttsEnabled);
    setTempTtsEngine(ttsEngine);
    setTempGoogleTtsApiKey(googleTtsApiKey);
    setTempTtsRate(ttsRate);
    setTempTtsVoiceName(ttsVoiceName);
    setTempGoogleTtsVoiceName(googleTtsVoiceName);

    setIsSettingsOpen(true);
    if (window.electronAPI?.resizeWindow) {
      window.electronAPI.resizeWindow(800, 480);
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
  const volumeMeterRef = useRef(null);
  const bottomVisualizerRef = useRef(null);
  const demoVolumeIntervalRef = useRef(null);

  // Refs so closures always read the latest language states
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const translationDebounceRef = useRef(translationDebounce);
  useEffect(() => {
    sourceLangRef.current = sourceLang;
    targetLangRef.current = targetLang;
    translationDebounceRef.current = translationDebounce;
  }, [sourceLang, targetLang, translationDebounce]);

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
  // translates sourceText → targetLang via selected provider
  const performTranslation = async (text, fromLang, toLang) => {
    if (!text || text.trim() === '' || fromLang === toLang || toLang === 'none') return '';
    const srcText = text.trim();

    const fromLangName = SUPPORTED_LANGUAGES[fromLang] || fromLang;
    const toLangName = SUPPORTED_LANGUAGES[toLang] || toLang;

    try {
      if (translateProvider === 'google') {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(srcText)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          return data?.[0]?.map(item => item[0]).join('') || '';
        }
        throw new Error(`Google Translate HTTP status ${res.status}`);
      }

      if (translateProvider === 'gemini') {
        if (!geminiApiKey) throw new Error('Gemini API Key is missing.');
        // Google Gemini API Model Guidance: Tuned models use the tunedModels/ prefix path, standard/experimental models use models/
        const modelPath = geminiModel.startsWith('tunedModels/') || geminiModel.startsWith('models/') 
          ? geminiModel 
          : `models/${geminiModel}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Translate the following text from ${fromLangName} to ${toLangName}. Output ONLY the direct translation, no explanations, no quotes, no extra text:\n\n${srcText}`
              }]
            }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        }
        const errData = await res.text();
        throw new Error(`Gemini HTTP error ${res.status}: ${errData}`);
      }

      if (translateProvider === 'openai' || translateProvider === 'deepseek' || translateProvider === 'custom') {
        let apiKey = '';
        let baseURL = '';
        let model = '';

        if (translateProvider === 'openai') {
          apiKey = openaiApiKey;
          baseURL = openaiBaseUrl || 'https://api.openai.com/v1';
          model = openaiModel || 'gpt-4o-mini';
        } else if (translateProvider === 'deepseek') {
          apiKey = deepseekApiKey;
          baseURL = deepseekBaseUrl || 'https://api.deepseek.com/v1';
          model = deepseekModel || 'deepseek-chat';
        } else {
          apiKey = customApiKey;
          baseURL = customBaseUrl;
          model = customModel;
        }

        if (!apiKey) throw new Error(`${translateProvider.toUpperCase()} API Key is missing.`);
        if (!baseURL) throw new Error(`${translateProvider.toUpperCase()} Base URL is missing.`);
        if (!model) throw new Error(`${translateProvider.toUpperCase()} Model name is missing.`);

        const cleanBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
        const res = await fetch(`${cleanBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: `You are a precise translator. Translate from ${fromLangName} to ${toLangName}. Respond ONLY with the translation. No conversational text, no quotes.`
              },
              {
                role: 'user',
                content: srcText
              }
            ],
            temperature: 0.2
          })
        });

        if (res.ok) {
          const data = await res.json();
          return data?.choices?.[0]?.message?.content?.trim() || '';
        }
        const errData = await res.text();
        throw new Error(`${translateProvider.toUpperCase()} HTTP error ${res.status}: ${errData}`);
      }

    } catch (err) {
      console.error('[TRANSLATION ERROR]', err.message);
      setError(`Translation Error (${translateProvider}): ${err.message}`);
      setTimeout(() => setError(''), 6000);
    }
    return '';
  };

  const speakText = async (text, langCode) => {
    if (!ttsEnabled || !text) return;

    if (ttsEngine === 'system') {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = ttsRate;

      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (ttsVoiceName) {
        selectedVoice = voices.find(v => v.name === ttsVoiceName);
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) ||
                        voices.find(v => v.lang.toLowerCase().includes(langCode.toLowerCase()));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      } else {
        utterance.lang = langCode;
      }

      console.log(`[TTS SPEAK SYSTEM] (${langCode}):`, text.substring(0, 60), `Voice: ${selectedVoice?.name || 'Default'}`);
      window.speechSynthesis.speak(utterance);
    } else if (ttsEngine === 'google-cloud') {
      if (!googleTtsApiKey) {
        console.warn('[TTS SPEAK GC] API Key is missing.');
        return;
      }

      // Map language code to Google Cloud language code + region
      const langLocaleMap = {
        en: 'en-US', hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ja: 'ja-JP',
        zh: 'zh-CN', pt: 'pt-BR', it: 'it-IT', ru: 'ru-RU', ko: 'ko-KR', nl: 'nl-NL',
        tr: 'tr-TR', sv: 'sv-SE', id: 'id-ID', uk: 'uk-UA', ar: 'ar-XA', vi: 'vi-VN',
        pl: 'pl-PL', fil: 'fil-PH', ta: 'ta-IN', te: 'te-IN', bn: 'bn-IN', kn: 'kn-IN',
        ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN', pa: 'pa-IN', ur: 'ur-PK', cs: 'cs-CZ',
        da: 'da-DK', fi: 'fi-FI', el: 'el-GR', he: 'he-IL', hu: 'hu-HU', ms: 'ms-MY',
        no: 'no-NO', ro: 'ro-RO', sk: 'sk-SK', th: 'th-TH'
      };
      const fullLocale = langLocaleMap[langCode.toLowerCase()] || langCode;

      // Select voice name
      let selectedVoiceName = googleTtsVoiceName;
      if (!selectedVoiceName || selectedVoiceName === 'auto') {
        const autoMap = {
          en: 'en-US-Neural2-F', hi: 'hi-IN-Neural2-D', es: 'es-ES-Neural2-F',
          fr: 'fr-FR-Neural2-A', de: 'de-DE-Neural2-F', ja: 'ja-JP-Neural2-B',
          zh: 'zh-CN-Neural2-F', pt: 'pt-BR-Neural2-A', it: 'it-IT-Neural2-A',
          ru: 'ru-RU-Wavenet-A', ko: 'ko-KR-Neural2-B', nl: 'nl-NL-Wavenet-A',
          tr: 'tr-TR-Wavenet-A', sv: 'sv-SE-Wavenet-A', id: 'id-ID-Wavenet-A',
          uk: 'uk-UA-Wavenet-A', ar: 'ar-XA-Wavenet-A', vi: 'vi-VN-Neural2-D',
          pl: 'pl-PL-Wavenet-A', fil: 'fil-PH-Wavenet-A', ta: 'ta-IN-Wavenet-A',
          te: 'te-IN-Wavenet-A', bn: 'bn-IN-Wavenet-A', kn: 'kn-IN-Wavenet-A',
          ml: 'ml-IN-Wavenet-A', mr: 'mr-IN-Wavenet-A', gu: 'gu-IN-Wavenet-A',
          pa: 'pa-IN-Wavenet-A', ur: 'ur-PK-Wavenet-A', cs: 'cs-CZ-Wavenet-A',
          da: 'da-DK-Wavenet-A', fi: 'fi-FI-Wavenet-A', el: 'el-GR-Wavenet-A',
          he: 'he-IL-Wavenet-A', hu: 'hu-HU-Wavenet-A', ms: 'ms-MY-Wavenet-A',
          no: 'no-NO-Wavenet-A', ro: 'ro-RO-Wavenet-A', sk: 'sk-SK-Wavenet-A',
          th: 'th-TH-Wavenet-A'
        };
        selectedVoiceName = autoMap[langCode.toLowerCase()] || `${fullLocale}-Wavenet-A`;
      }

      console.log(`[TTS SPEAK GC] (${fullLocale}):`, text.substring(0, 60), `Voice: ${selectedVoiceName}`);

      try {
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleTtsApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: text },
            voice: { languageCode: fullLocale, name: selectedVoiceName },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: ttsRate
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const audioContent = data.audioContent;
          if (audioContent) {
            const snd = new Audio(`data:audio/mp3;base64,${audioContent}`);
            snd.play();
          }
        } else {
          const errData = await res.text();
          console.error('[TTS SPEAK GC ERROR]', res.status, errData);
          setError(`Google TTS Error: Status ${res.status}`);
          setTimeout(() => setError(''), 5000);
        }
      } catch (e) {
        console.error('[TTS SPEAK GC FETCH ERROR]', e);
        setError(`Google TTS Error: ${e.message}`);
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  const doRestTranslate = async (sourceText, fromLang, toLang) => {
    if (isTranslatingActiveRef.current) return;
    if (!sourceText || sourceText.trim() === lastTranslatedTextRef.current) return;
    if (fromLang === toLang || toLang === 'none') return;

    isTranslatingActiveRef.current = true;
    try {
      const textToTranslate = sourceText.trim();
      setIsTranslating(true);
      const translated = await performTranslation(textToTranslate, fromLang, toLang);
      
      if (translated) {
        lastTranslatedTextRef.current = textToTranslate;
        currentHiRef.current = translated;
        setHindiText(translated);
      }
    } catch (e) {
      console.warn('[TRANSLATE] error:', e.message);
    } finally {
      isTranslatingActiveRef.current = false;
      setIsTranslating(false);
    }
  };

  // Schedule translation
  const scheduleTranslation = (sourceText, fromLang, toLang) => {
    if (toLang === 'none' || fromLang === toLang) return;
    
    // Skip interim translation for LLM providers if translateFinalOnly is enabled
    const isLLM = translateProvider !== 'google';
    if (isLLM && translateFinalOnly) {
      return;
    }

    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
    translateTimerRef.current = setTimeout(() => {
      doRestTranslate(sourceText, fromLang, toLang);
    }, translationDebounceRef.current);

    if (!translateIntervalRef.current) {
      translateIntervalRef.current = setInterval(() => {
        const from = sourceLangRef.current;
        const to = targetLangRef.current;
        const src = currentEnRef.current;
        if (src && src.trim() !== lastTranslatedTextRef.current && to !== 'none' && from !== to) {
          doRestTranslate(src.trim(), from, to);
        }
      }, Math.max(500, translationDebounceRef.current * 3));
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
    if (demoVolumeIntervalRef.current) {
      clearInterval(demoVolumeIntervalRef.current);
      demoVolumeIntervalRef.current = null;
    }
    if (volumeMeterRef.current) {
      volumeMeterRef.current.style.height = '4px';
      volumeMeterRef.current.style.opacity = '0.4';
    }
    if (bottomVisualizerRef.current) {
      bottomVisualizerRef.current.style.height = '3px';
      bottomVisualizerRef.current.style.opacity = '0.4';
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
          const translated = await performTranslation(en, from, to);
          if (translated) {
            finalHi = translated;
            console.log('[FINAL TRANSLATE ←]', translated);
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

        // Play translation audio via Google Web Speech Synthesis TTS
        const textToSpeak = (to !== 'none' && from !== to) ? finalHi : finalEn;
        const langToSpeak = (to !== 'none' && from !== to) ? to : from;
        speakText(textToSpeak, langToSpeak);
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

    const key = deepgramApiKey || DEEPGRAM_API_KEY;
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
      const modelParam = deepgramModel || 'nova-3';
      const wsUrl = `wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1&model=${modelParam}&interim_results=true&smart_format=true&punctuate=true&diarize=true&diarize_model=latest&endpointing=300&language=${sLang}${kwParams}`;
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
          const float32 = e.inputBuffer.getChannelData(0);

          // Calculate volume level (Root Mean Square)
          let sum = 0;
          for (let i = 0; i < float32.length; i++) {
            sum += float32[i] * float32[i];
          }
          const rms = Math.sqrt(sum / float32.length);
          const level = Math.min(100, Math.round(rms * 400));
          if (volumeMeterRef.current) {
            volumeMeterRef.current.style.height = `${Math.max(4, level)}px`;
            volumeMeterRef.current.style.opacity = level > 10 ? '1' : '0.4';
          }
          if (bottomVisualizerRef.current) {
            bottomVisualizerRef.current.style.height = `${Math.max(3, Math.min(12, level / 8))}px`;
            bottomVisualizerRef.current.style.opacity = level > 5 ? '0.9' : '0.4';
            bottomVisualizerRef.current.style.filter = `blur(${Math.max(0, (level - 20) / 20)}px)`;
          }

          if (socket.readyState === WebSocket.OPEN) {
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
        const filename = `OrbitAI-Captions_AutoSave_${dateStr}_${timeStr}.txt`;
        
        if (window.electronAPI?.saveFileSilent) {
          const result = await window.electronAPI.saveFileSilent(content, filename);
          if (result?.success) {
            showToast(`Transcript auto-saved to Documents/OrbitAI-Captions`);
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

      // Simulate volume level for demo mode visual interest
      demoVolumeIntervalRef.current = setInterval(() => {
        const simulatedLevel = Math.floor(Math.random() * 45) + (Math.sin(Date.now() / 200) * 15) + 20;
        const level = Math.max(5, Math.min(100, Math.round(simulatedLevel)));
        if (volumeMeterRef.current) {
          volumeMeterRef.current.style.height = `${Math.max(4, level)}px`;
          volumeMeterRef.current.style.opacity = level > 10 ? '1' : '0.4';
        }
        if (bottomVisualizerRef.current) {
          bottomVisualizerRef.current.style.height = `${Math.max(3, Math.min(12, level / 8))}px`;
          bottomVisualizerRef.current.style.opacity = level > 5 ? '0.9' : '0.4';
          bottomVisualizerRef.current.style.filter = `blur(${Math.max(0, (level - 20) / 20)}px)`;
        }
      }, 100);
    } else {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      if (demoVolumeIntervalRef.current) {
        clearInterval(demoVolumeIntervalRef.current);
        demoVolumeIntervalRef.current = null;
      }
      setEnglishText('');
      setHindiText('');
      setLastEnglishText('');
      setLastHindiText('');
      setActiveSpeaker(null);
      setLastSpeaker(null);
    }
    return () => { 
      if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); 
      if (demoVolumeIntervalRef.current) clearInterval(demoVolumeIntervalRef.current); 
    };
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
    const filename = `OrbitAI-Captions_Transcript_${dateStr}.txt`;

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

  const getThemeStyles = (themeId) => {
    switch (themeId) {
      case 'amber':
        return {
          bg: 'rgba(15, 10, 5, opacityVar)',
          accentText: 'text-amber-400',
          accentBg: 'bg-amber-600 hover:bg-amber-500',
          accentBorder: 'border-amber-500/30',
          accentBorderActive: 'border-amber-500/50',
          accentGradient: 'from-yellow-400 via-amber-300 to-orange-500',
          textMuted: 'text-amber-400/60',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]',
          finalTranscript: 'text-amber-400/80',
          baseText: 'text-white',
          inputBg: 'bg-amber-950/20 border-white/10',
          tabActive: 'text-amber-300 border-amber-500',
          visualizerColor: 'from-amber-400 via-yellow-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
          indicatorColor: 'bg-amber-500',
          pinActive: 'text-amber-400',
          dragBg: 'bg-amber-950/60',
          btnSecondary: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60',
        };
      case 'emerald':
        return {
          bg: 'rgba(5, 15, 10, opacityVar)',
          accentText: 'text-emerald-400',
          accentBg: 'bg-emerald-600 hover:bg-emerald-500',
          accentBorder: 'border-emerald-500/30',
          accentBorderActive: 'border-emerald-500/50',
          accentGradient: 'from-teal-400 via-emerald-300 to-green-500',
          textMuted: 'text-emerald-400/60',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-200 to-green-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]',
          finalTranscript: 'text-emerald-400/80',
          baseText: 'text-white',
          inputBg: 'bg-emerald-950/20 border-white/10',
          tabActive: 'text-emerald-300 border-emerald-500',
          visualizerColor: 'from-teal-400 via-emerald-400 to-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          indicatorColor: 'bg-emerald-500',
          pinActive: 'text-emerald-400',
          dragBg: 'bg-emerald-950/60',
          btnSecondary: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60',
        };
      case 'crimson':
        return {
          bg: 'rgba(20, 5, 10, opacityVar)',
          accentText: 'text-rose-400',
          accentBg: 'bg-rose-600 hover:bg-rose-500',
          accentBorder: 'border-rose-500/30',
          accentBorderActive: 'border-rose-500/50',
          accentGradient: 'from-rose-400 via-pink-300 to-red-500',
          textMuted: 'text-rose-400/60',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-300 via-pink-200 to-red-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.3)]',
          finalTranscript: 'text-rose-400/80',
          baseText: 'text-white',
          inputBg: 'bg-rose-950/20 border-white/10',
          tabActive: 'text-rose-300 border-rose-500',
          visualizerColor: 'from-rose-400 via-pink-400 to-red-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
          indicatorColor: 'bg-rose-500',
          pinActive: 'text-rose-400',
          dragBg: 'bg-rose-950/60',
          btnSecondary: 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/60',
        };
      case 'obsidian':
        return {
          bg: 'rgba(0, 0, 0, opacityVar)',
          accentText: 'text-slate-200',
          accentBg: 'bg-slate-700 hover:bg-slate-600',
          accentBorder: 'border-slate-600/30',
          accentBorderActive: 'border-slate-600/50',
          accentGradient: 'from-slate-400 via-slate-200 to-white',
          textMuted: 'text-slate-400',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-slate-100 to-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]',
          finalTranscript: 'text-slate-300',
          baseText: 'text-white',
          inputBg: 'bg-slate-900/50 border-white/15',
          tabActive: 'text-white border-white',
          visualizerColor: 'from-slate-500 via-slate-300 to-white shadow-[0_0_8px_rgba(255,255,255,0.4)]',
          indicatorColor: 'bg-slate-400',
          pinActive: 'text-white',
          dragBg: 'bg-slate-950/80',
          btnSecondary: 'bg-slate-900/60 text-slate-200 border-white/10 hover:bg-slate-800',
        };
      case 'violet':
        return {
          bg: 'rgba(15, 5, 25, opacityVar)',
          accentText: 'text-purple-400',
          accentBg: 'bg-purple-600 hover:bg-purple-500',
          accentBorder: 'border-purple-500/30',
          accentBorderActive: 'border-purple-500/50',
          accentGradient: 'from-purple-400 via-fuchsia-300 to-indigo-500',
          textMuted: 'text-purple-400/60',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-indigo-400 drop-shadow-[0_2px_8px_rgba(168,85,247,0.3)]',
          finalTranscript: 'text-purple-400/80',
          baseText: 'text-white',
          inputBg: 'bg-purple-950/20 border-white/10',
          tabActive: 'text-purple-300 border-purple-500',
          visualizerColor: 'from-purple-400 via-fuchsia-400 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]',
          indicatorColor: 'bg-purple-500',
          pinActive: 'text-purple-400',
          dragBg: 'bg-purple-950/60',
          btnSecondary: 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:bg-purple-900/60',
        };
      case 'light':
        return {
          bg: 'rgba(245, 247, 250, opacityVar)',
          accentText: 'text-indigo-600',
          accentBg: 'bg-indigo-600 hover:bg-indigo-500',
          accentBorder: 'border-indigo-200',
          accentBorderActive: 'border-indigo-400',
          accentGradient: 'from-indigo-600 via-blue-500 to-indigo-700',
          textMuted: 'text-slate-500',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 drop-shadow-[0_1px_4px_rgba(79,70,229,0.15)]',
          finalTranscript: 'text-slate-700 font-semibold',
          baseText: 'text-slate-900',
          inputBg: 'bg-white border-slate-200',
          tabActive: 'text-indigo-600 border-indigo-600',
          visualizerColor: 'from-indigo-500 via-blue-500 to-indigo-700 shadow-[0_0_8px_rgba(79,70,229,0.3)]',
          indicatorColor: 'bg-indigo-600',
          pinActive: 'text-indigo-600',
          dragBg: 'bg-slate-200/90',
          btnSecondary: 'bg-slate-100 text-indigo-700 border-indigo-200 hover:bg-slate-200',
        };
      case 'indigo':
      default:
        return {
          bg: 'rgba(10, 15, 30, opacityVar)',
          accentText: 'text-indigo-400',
          accentBg: 'bg-indigo-600 hover:bg-indigo-500',
          accentBorder: 'border-indigo-500/30',
          accentBorderActive: 'border-indigo-500/50',
          accentGradient: 'from-blue-400 via-indigo-300 to-purple-400',
          textMuted: 'text-indigo-400/60',
          activeTranscript: 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-200 to-purple-400 drop-shadow-[0_2px_8px_rgba(99,102,241,0.3)]',
          finalTranscript: 'text-indigo-400/80',
          baseText: 'text-white',
          inputBg: 'bg-slate-900 border-white/10',
          tabActive: 'text-indigo-300 border-indigo-500',
          visualizerColor: 'from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
          indicatorColor: 'bg-indigo-500',
          pinActive: 'text-indigo-400',
          dragBg: 'bg-slate-950/60',
          btnSecondary: 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-slate-800',
        };
    }
  };

  const theme = getThemeStyles(appTheme);

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
      case 'yellow':
        return {
          activeHi: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.3)]',
          finalHi: 'text-yellow-400/80'
        };
      default: // match (Global App Theme colors)
        return {
          activeHi: theme.activeTranscript,
          finalHi: theme.finalTranscript
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
      className={`flex flex-col h-full w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all duration-300 ${theme.baseText}`}
      style={{ backgroundColor: theme.bg.replace('opacityVar', opacity / 100), backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
    >
      {/* Top Drag & Control Bar */}
      <div className={`drag-region h-10 flex items-center justify-between px-4 cursor-move border-b border-white/5 select-none ${theme.dragBg}`}>

        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r ${theme.accentGradient} tracking-wider uppercase`}>OrbitAI-Captions</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className={`w-2 h-2 rounded-full ${(isListening || isDemoMode) ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}></span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mr-1">
              {isListening ? (audioSource === 'system' ? 'Deepgram Live' : 'Mic Live') : isDemoMode ? 'Demo' : 'Offline'}
            </span>
            {isListening && (
              <div className="flex items-end h-3.5 w-1 bg-slate-800 rounded-sm overflow-hidden" title="Input Audio Volume Meter">
                <div ref={volumeMeterRef} className="w-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-75" style={{ height: '4px', opacity: 0.4 }}></div>
              </div>
            )}
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
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${fontSize === key ? `${theme.accentBg} text-white shadow-sm` : 'text-slate-400 hover:text-slate-200'}`}>
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
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all border ${isListening ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : `${theme.accentBg} text-white border-transparent`}`}>
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
            className={`p-1 hover:bg-white/5 rounded-md ml-1 transition-colors ${isAlwaysOnTop ? theme.accentText : 'text-slate-400 hover:text-white'}`}
            title={isAlwaysOnTop ? "Pin: Always on Top (Active)" : "Unpin: Always on Top (Inactive)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={isAlwaysOnTop ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.89A.5.5 0 0 0 6.36 14h11.28a.5.5 0 0 0 .25-.56l-1.78-.89a2 2 0 0 1-1.11-1.79V4H9v6.76zM15 4h-6M12 4v4"></path>
            </svg>
          </button>

          {/* Quick Language Bar Toggle */}
          <button
            onClick={() => {
              const nextState = !showQuickLangBar;
              setShowQuickLangBar(nextState);
              localStorage.setItem('show_quick_lang_bar', String(nextState));
            }}
            className={`p-1 hover:bg-white/5 rounded-md ml-1 transition-colors ${showQuickLangBar ? theme.accentText : 'text-slate-400 hover:text-white'}`}
            title={showQuickLangBar ? "Hide Quick Language Bar" : "Show Quick Language Bar"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
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

      {/* Quick Language Switcher Bar */}
      {showQuickLangBar && (
        <div className={`no-drag flex items-center justify-between px-4 py-1.5 border-b border-white/5 select-none gap-2 ${theme.dragBg} text-[10px]`}>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Source:</span>
            <select 
              value={sourceLang} 
              onChange={(e) => updateSourceLanguage(e.target.value)}
              className="bg-slate-900/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[120px] truncate"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (targetLang !== 'none') {
                const src = sourceLang;
                const tgt = targetLang;
                localStorage.setItem('source_lang', tgt);
                localStorage.setItem('target_lang', src);
                setSourceLang(tgt);
                setTargetLang(src);
                setTempSourceLang(tgt);
                setTempTargetLang(src);
                if (isListening) {
                  setTimeout(() => {
                    startDeepgramStream();
                  }, 100);
                }
              }
            }}
            disabled={targetLang === 'none'}
            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all border ${targetLang === 'none' ? 'opacity-30 cursor-not-allowed border-white/5 text-slate-600' : `${theme.btnSecondary}`}`}
            title="Swap Source and Target Languages"
          >
            ⇄ Swap
          </button>

          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <span className="text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Translate to:</span>
            <select 
              value={targetLang} 
              onChange={(e) => updateTargetLanguage(e.target.value)}
              className="bg-slate-900/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[120px] truncate"
            >
              <option value="none">None (No Translation)</option>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
              <div className="flex-grow flex flex-col gap-1 font-sans" style={{ textAlign: captionAlignment }}>
                {showEnglish && lastEnglishText && (
                  <div 
                    dir={getLangDir(sourceLang)}
                    className={`${textClasses.finalEn} tracking-wide italic drop-shadow-sm`} 
                    style={{ fontFamily: getFontFamilyStyle(captionFont) }}
                  >
                    "{lastEnglishText}"
                  </div>
                )}
                {showHindi && lastHindiText && (
                  <div 
                    dir={getLangDir(targetLang)}
                    className={`${textClasses.finalHi} leading-relaxed ${themeClasses.finalHi}`} 
                    style={{ fontFamily: getFontFamilyStyle(captionFont) }}
                  >
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
              <div className="flex-grow flex flex-col gap-1 font-sans" style={{ textAlign: captionAlignment }}>
                {showEnglish && englishText && (
                  <div 
                    dir={getLangDir(sourceLang)}
                    className={`${textClasses.activeEn} tracking-wide italic drop-shadow-md`} 
                    style={{ fontFamily: getFontFamilyStyle(captionFont) }}
                  >
                    "{englishText}"
                  </div>
                )}
                {showHindi && (
                  hindiText ? (
                    <div 
                      dir={getLangDir(targetLang)}
                      className={`${textClasses.activeHi} leading-relaxed ${themeClasses.activeHi}`} 
                      style={{ fontFamily: getFontFamilyStyle(captionFont) }}
                    >
                      {hindiText}
                    </div>
                  ) : isTranslating && (
                    <div className="flex items-center gap-1.5" style={{ fontFamily: getFontFamilyStyle(captionFont), justifyContent: captionAlignment === 'center' ? 'center' : captionAlignment === 'right' ? 'flex-end' : 'flex-start' }}>
                      <span className={`${theme.accentText} opacity-75 text-[11px] font-semibold italic tracking-wide`}>
                        {targetLang === 'hi' ? 'अनुवाद...' : `Translating to ${SUPPORTED_LANGUAGES[targetLang] || ''}...`}
                      </span>
                      <span className={`w-1 h-1 ${theme.indicatorColor} opacity-70 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></span>
                      <span className={`w-1 h-1 ${theme.indicatorColor} opacity-70 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></span>
                      <span className={`w-1 h-1 ${theme.indicatorColor} opacity-70 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic bottom visualizer wave */}
      {(isListening || isDemoMode) && (
        <div 
          ref={bottomVisualizerRef}
          className={`h-[3px] bg-gradient-to-r ${theme.visualizerColor} w-full opacity-60 transition-all duration-75`}
        ></div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-slate-955/98 backdrop-blur-md flex flex-col justify-between p-4 z-50 no-drag">
          <div className="flex flex-col gap-3 h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex justify-between items-center border-b border-white/10 pb-2 select-none">
              <div className="flex gap-3">
                {[
                  { id: 'general', label: '⚙️ General' },
                  { id: 'translation', label: '🌐 Translation' },
                  { id: 'audio_tts', label: '🔊 Audio & TTS' },
                  { id: 'logs', label: '📋 Session Logs' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all border-b-2 ${activeTab === tab.id ? `${theme.tabActive}` : 'text-slate-400 border-transparent hover:text-slate-200'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button onClick={handleCloseSettings} className="text-slate-400 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto pr-1">
              {activeTab === 'general' && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1 text-left">
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
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border transition-all ${tempCaptionAlignment === align ? `${theme.accentBg} text-white border-transparent` : `${theme.btnSecondary}`}`}
                          type="button"
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Caption Theme */}
                  <div className="flex flex-col gap-1 bg-slate-95/20 col-span-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Caption Font Theme</label>
                    <div className="flex gap-1">
                      {[
                        { id: 'match', name: 'Theme Default' },
                        { id: 'yellow', name: 'Yellow' },
                        { id: 'white', name: 'White' },
                        { id: 'cyan', name: 'Cyan' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTempCaptionTheme(t.id)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border transition-all ${tempCaptionTheme === t.id ? `${theme.accentBg} text-white border-transparent` : `${theme.btnSecondary}`}`}
                          type="button"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Global App Theme */}
                  <div className="flex flex-col gap-1 bg-slate-95/20 col-span-2">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Global App Interface Theme</label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'indigo', name: 'Indigo' },
                        { id: 'amber', name: 'Amber' },
                        { id: 'emerald', name: 'Emerald' },
                        { id: 'crimson', name: 'Crimson' },
                        { id: 'obsidian', name: 'Obsidian' },
                        { id: 'violet', name: 'Violet' },
                        { id: 'light', name: 'Light Glass' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTempAppTheme(t.id)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border transition-all ${tempAppTheme === t.id ? `${theme.accentBg} text-white border-transparent` : `${theme.btnSecondary}`}`}
                          type="button"
                        >
                          {t.name}
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
                      placeholder="e.g. OrbitAI-Captions, Deepgram, Zoom"
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full"
                    />
                  </div>

                  {/* Auto Save Toggle */}
                  <div className="col-span-2 flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded mt-1">
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold">Auto-Save Transcripts</p>
                      <p className="text-[8px] text-slate-500">Saves transcript silently to Documents/OrbitAI-Captions when speech capture stops.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={tempAutoSaveEnabled}
                      onChange={(e) => setTempAutoSaveEnabled(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 bg-slate-900 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'translation' && (
                <div className="flex flex-col gap-3 text-left py-1">
                  <div className="grid grid-cols-2 gap-4">
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
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Translation Language</label>
                        <button
                          type="button"
                          onClick={() => {
                            const src = tempSourceLang;
                            const tgt = tempTargetLang;
                            if (tgt !== 'none') {
                              setTempSourceLang(tgt);
                              setTempTargetLang(src);
                            }
                          }}
                          disabled={tempTargetLang === 'none'}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all uppercase tracking-wider border ${tempTargetLang === 'none' ? 'opacity-30 cursor-not-allowed border-white/5 text-slate-600' : `${theme.btnSecondary}`}`}
                          title="Swap Speaker and Translation Languages"
                        >
                          ⇄ Swap
                        </button>
                      </div>
                      <select value={tempTargetLang} onChange={(e) => setTempTargetLang(e.target.value)}
                        className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full cursor-pointer">
                        <option value="none">None (No Translation)</option>
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                          <option key={code} value={code}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Translation Engine Provider */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Translation Service Provider</label>
                    <select value={tempTranslateProvider} onChange={(e) => setTempTranslateProvider(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-550 w-full cursor-pointer">
                      <option value="google">Google Translate (Free & Unlimited)</option>
                      <option value="gemini">Google Gemini AI API</option>
                      <option value="openai">OpenAI GPT Models API</option>
                      <option value="deepseek">DeepSeek AI API</option>
                      <option value="custom">Custom OpenAI-Compatible (Ollama, Local hosting)</option>
                    </select>
                  </div>

                  {/* Dynamic API Configuration Sub-Panels */}
                  {tempTranslateProvider === 'gemini' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-900/40 border border-white/5 rounded-lg">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Gemini API Key</label>
                        <input type="password" value={tempGeminiApiKey} onChange={(e) => setTempGeminiApiKey(e.target.value)}
                          placeholder="AIzaSy..." className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full" />
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gemini Model Choice</label>
                        <select 
                          value={['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(tempGeminiModel) ? tempGeminiModel : 'custom'} 
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setTempGeminiModel('gemini-2.0-flash-lite-preview-02-05');
                            } else {
                              setTempGeminiModel(e.target.value);
                            }
                          }}
                          className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Latest Flash)</option>
                          <option value="gemini-2.0-flash">gemini-2.0-flash (Recommended)</option>
                          <option value="gemini-2.0-pro-exp-02-05">gemini-2.0-pro-exp-02-05 (Experimental Pro)</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                          <option value="custom">Custom Model Name...</option>
                        </select>
                      </div>
                      {!['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-flash', 'gemini-1.5-pro'].includes(tempGeminiModel) && (
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom Gemini Model Name</label>
                          <input 
                            type="text" 
                            value={tempGeminiModel} 
                            onChange={(e) => setTempGeminiModel(e.target.value)} 
                            placeholder="Enter custom Gemini model ID..." 
                            className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {tempTranslateProvider === 'openai' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-900/40 border border-white/5 rounded-lg">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">OpenAI API Key</label>
                        <input type="password" value={tempOpenaiApiKey} onChange={(e) => setTempOpenaiApiKey(e.target.value)}
                          placeholder="sk-proj-..." className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">OpenAI Base URL</label>
                        <input type="text" value={tempOpenaiBaseUrl} onChange={(e) => setTempOpenaiBaseUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1" className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">OpenAI Model Choice</label>
                        <select 
                          value={['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o3-mini', 'gpt-4-turbo'].includes(tempOpenaiModel) ? tempOpenaiModel : 'custom'} 
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setTempOpenaiModel('gpt-4');
                            } else {
                              setTempOpenaiModel(e.target.value);
                            }
                          }}
                          className="bg-slate-955 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini (Recommended)</option>
                          <option value="gpt-4o">gpt-4o</option>
                          <option value="o1-mini">o1-mini</option>
                          <option value="o3-mini">o3-mini</option>
                          <option value="gpt-4-turbo">gpt-4-turbo</option>
                          <option value="custom">Custom Model Name...</option>
                        </select>
                      </div>
                      {!['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o3-mini', 'gpt-4-turbo'].includes(tempOpenaiModel) && (
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom OpenAI Model Name</label>
                          <input 
                            type="text" 
                            value={tempOpenaiModel} 
                            onChange={(e) => setTempOpenaiModel(e.target.value)} 
                            placeholder="Enter custom OpenAI model ID..." 
                            className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {tempTranslateProvider === 'deepseek' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-900/40 border border-white/5 rounded-lg">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">DeepSeek API Key</label>
                        <input type="password" value={tempDeepseekApiKey} onChange={(e) => setTempDeepseekApiKey(e.target.value)}
                          placeholder="sk-..." className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">DeepSeek Base URL</label>
                        <input type="text" value={tempDeepseekBaseUrl} onChange={(e) => setTempDeepseekBaseUrl(e.target.value)}
                          placeholder="https://api.deepseek.com/v1" className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">DeepSeek Model Choice</label>
                        <select 
                          value={['deepseek-chat', 'deepseek-reasoner'].includes(tempDeepseekModel) ? tempDeepseekModel : 'custom'} 
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setTempDeepseekModel('deepseek-coder');
                            } else {
                              setTempDeepseekModel(e.target.value);
                            }
                          }}
                          className="bg-slate-955 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                        >
                          <option value="deepseek-chat">deepseek-chat (Recommended)</option>
                          <option value="deepseek-reasoner">deepseek-reasoner</option>
                          <option value="custom">Custom Model Name...</option>
                        </select>
                      </div>
                      {!['deepseek-chat', 'deepseek-reasoner'].includes(tempDeepseekModel) && (
                        <div className="flex flex-col gap-1 col-span-2">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom DeepSeek Model Name</label>
                          <input 
                            type="text" 
                            value={tempDeepseekModel} 
                            onChange={(e) => setTempDeepseekModel(e.target.value)} 
                            placeholder="Enter custom DeepSeek model ID..." 
                            className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {tempTranslateProvider === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-900/40 border border-white/5 rounded-lg">
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Custom API Key / Password</label>
                        <input type="password" value={tempCustomApiKey} onChange={(e) => setTempCustomApiKey(e.target.value)}
                          placeholder="Optional credentials..." className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom Endpoint Base URL</label>
                        <input type="text" value={tempCustomBaseUrl} onChange={(e) => setTempCustomBaseUrl(e.target.value)}
                          placeholder="e.g. http://localhost:11434/v1" className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom Model Name</label>
                        <input type="text" value={tempCustomModel} onChange={(e) => setTempCustomModel(e.target.value)}
                          placeholder="e.g. llama3, qwen2" className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full" />
                      </div>
                    </div>
                  )}

                  {/* Translation Speed/Delay Control */}
                  <div className="flex flex-col gap-1.5 p-2 bg-slate-900/40 border border-white/5 rounded-lg mt-1">
                    <div className="flex justify-between items-center select-none">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Translation Real-Time Delay</label>
                      <span className="text-[9px] text-indigo-300 font-bold font-mono">{tempTranslationDebounce}ms</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="1500" 
                      step="50" 
                      value={tempTranslationDebounce} 
                      onChange={(e) => setTempTranslationDebounce(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none" 
                    />
                    <p className="text-[8px] text-slate-500">Lower values translate faster during speech. Higher values batch sentences to optimize API tokens.</p>
                  </div>

                  {/* LLM Optimization Toggles */}
                  {tempTranslateProvider !== 'google' && (
                    <div className="flex items-center justify-between p-2 bg-slate-900/60 border border-white/5 rounded mt-1">
                      <div>
                        <p className="text-[10px] text-slate-300 font-semibold">Translate Final Sentence Only (Recommended)</p>
                        <p className="text-[8px] text-slate-500">Skips real-time interim results to optimize API cost, token consumption, and response lag.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempTranslateFinalOnly}
                        onChange={(e) => setTempTranslateFinalOnly(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 bg-slate-900 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'audio_tts' && (
                <div className="flex flex-col gap-4 text-left py-1">
                  {/* Capture Source */}
                  <div className="flex flex-col gap-1.5 p-2 bg-slate-900/60 border border-white/5 rounded-lg">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Audio Capture Device Profile</span>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-300 font-semibold">
                          Active Target: {audioSource === 'system' ? '🔊 System Speakers' : '🎙️ Microphone Input'}
                        </p>
                        <p className="text-[8px] text-slate-500">Speakers captures other people speaking. Microphone captures your voice.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAudioSource(audioSource === 'system' ? 'mic' : 'system')}
                        disabled={isListening}
                        className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${isListening ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-500' : `${theme.accentBg} text-white border-transparent`}`}
                      >
                        Change to {audioSource === 'system' ? 'Mic' : 'Speakers'}
                      </button>
                    </div>
                  </div>

                  {/* Speech-to-Text (STT) Engine Settings */}
                  <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-900/60 border border-white/5 rounded-lg">
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Deepgram API Key (Optional)</label>
                      <input 
                        type="password" 
                        value={tempDeepgramApiKey} 
                        onChange={(e) => setTempDeepgramApiKey(e.target.value)}
                        placeholder="Leave blank to use default built-in key..." 
                        className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Deepgram Caption Model Choice</label>
                      <select 
                        value={['nova-3', 'nova-2', 'nova-2-meeting', 'enhanced', 'base'].includes(tempDeepgramModel) ? tempDeepgramModel : 'custom'} 
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            setTempDeepgramModel('nova-2-phonecall');
                          } else {
                            setTempDeepgramModel(e.target.value);
                          }
                        }}
                        className="bg-slate-955 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                      >
                        <option value="nova-3">nova-3 (Default, Most Accurate)</option>
                        <option value="nova-2">nova-2 (Standard General)</option>
                        <option value="nova-2-meeting">nova-2-meeting (Meeting Optimized)</option>
                        <option value="enhanced">enhanced (Conversational)</option>
                        <option value="base">base (Low Latency Legacy)</option>
                        <option value="custom">Custom STT Model Name...</option>
                      </select>
                    </div>
                    {!['nova-3', 'nova-2', 'nova-2-meeting', 'enhanced', 'base'].includes(tempDeepgramModel) && (
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Custom STT Model ID</label>
                        <input 
                          type="text" 
                          value={tempDeepgramModel} 
                          onChange={(e) => setTempDeepgramModel(e.target.value)} 
                          placeholder="e.g. nova-2-finance" 
                          className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Text-to-Speech Playback Toggle */}
                  <div className="flex flex-col gap-2.5 p-2.5 bg-slate-900/60 border border-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-300 font-semibold">Enable Real-Time TTS Voice Translation</p>
                        <p className="text-[8px] text-slate-500">Automatically speaks finalized translations or captions aloud using Google / local voices.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tempTtsEnabled}
                        onChange={(e) => setTempTtsEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 bg-slate-900 cursor-pointer"
                      />
                    </div>

                    {tempTtsEnabled && (
                      <div className="flex flex-col gap-2.5 mt-1 border-t border-white/5 pt-2">
                        <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TTS Engine Provider</label>
                        <select 
                          value={tempTtsEngine} 
                          onChange={(e) => setTempTtsEngine(e.target.value)}
                          className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                        >
                          <option value="system">System Web Speech (Free & Local)</option>
                          <option value="google-cloud">Google Cloud TTS API (Premium Wavenet / Neural2)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Conditional TTS Settings */}
                  {tempTtsEnabled && (
                    <div className="flex flex-col gap-3 p-2.5 bg-slate-900/40 border border-white/5 rounded-lg">
                      {/* System Web Speech Engine Settings */}
                      {tempTtsEngine === 'system' && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Select Playback Voice Profile</label>
                          {availableVoices.length === 0 ? (
                            <div className="text-slate-500 text-[10px] italic">Loading system voices...</div>
                          ) : (
                            <select 
                              value={tempTtsVoiceName} 
                              onChange={(e) => setTempTtsVoiceName(e.target.value)}
                              className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                            >
                              <option value="">Default Speech Voice</option>
                              {availableVoices
                                .filter(v => {
                                  const targetL = tempTargetLang !== 'none' ? tempTargetLang : tempSourceLang;
                                  return v.lang.toLowerCase().startsWith(targetL.toLowerCase()) || 
                                         v.lang.toLowerCase().includes(targetL.toLowerCase());
                                })
                                .map((voice, idx) => (
                                  <option key={idx} value={voice.name}>
                                    {voice.name} ({voice.lang}) {voice.localService ? ' [Local]' : ''}
                                  </option>
                                ))
                              }
                            </select>
                          )}
                          <p className="text-[8px] text-slate-500">Filtered automatically to show voices compatible with target: <span className="font-bold text-indigo-400">{SUPPORTED_LANGUAGES[tempTargetLang !== 'none' ? tempTargetLang : tempSourceLang]}</span>.</p>
                        </div>
                      )}

                      {/* Google Cloud TTS Engine Settings */}
                      {tempTtsEngine === 'google-cloud' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Google Cloud API Key</label>
                            <input 
                              type="password" 
                              value={tempGoogleTtsApiKey} 
                              onChange={(e) => setTempGoogleTtsApiKey(e.target.value)}
                              placeholder="Enter Google Cloud API credentials key..." 
                              className="bg-slate-955 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-amber-500 w-full"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Google Cloud Voice Selection</label>
                            <select 
                              value={['auto', 'custom'].includes(tempGoogleTtsVoiceName) || tempGoogleTtsVoiceName.includes('-') ? (['auto', 'custom'].includes(tempGoogleTtsVoiceName) ? tempGoogleTtsVoiceName : 'predefined') : 'auto'} 
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setTempGoogleTtsVoiceName('en-US-Neural2-F');
                                } else if (e.target.value === 'predefined') {
                                  const targetL = tempTargetLang !== 'none' ? tempTargetLang : tempSourceLang;
                                  if (targetL === 'hi') {
                                    setTempGoogleTtsVoiceName('hi-IN-Neural2-D');
                                  } else {
                                    setTempGoogleTtsVoiceName('en-US-Neural2-F');
                                  }
                                } else {
                                  setTempGoogleTtsVoiceName('auto');
                                }
                              }}
                              className="bg-slate-950 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none w-full cursor-pointer"
                            >
                              <option value="auto">Auto-Select Best Premium Voice (Recommended)</option>
                              {tempTargetLang === 'en' || (tempTargetLang === 'none' && tempSourceLang === 'en') ? (
                                <>
                                  <option value="en-US-Neural2-F">en-US-Neural2-F (Female, Neural)</option>
                                  <option value="en-US-Neural2-D">en-US-Neural2-D (Male, Neural)</option>
                                  <option value="en-US-Wavenet-C">en-US-Wavenet-C (Female, Wavenet)</option>
                                  <option value="en-US-Wavenet-D">en-US-Wavenet-D (Male, Wavenet)</option>
                                </>
                              ) : null}
                              {tempTargetLang === 'hi' || (tempTargetLang === 'none' && tempSourceLang === 'hi') ? (
                                <>
                                  <option value="hi-IN-Neural2-D">hi-IN-Neural2-D (Female, Neural)</option>
                                  <option value="hi-IN-Neural2-C">hi-IN-Neural2-C (Male, Neural)</option>
                                  <option value="hi-IN-Wavenet-D">hi-IN-Wavenet-D (Female, Wavenet)</option>
                                  <option value="hi-IN-Wavenet-C">hi-IN-Wavenet-C (Male, Wavenet)</option>
                                </>
                              ) : null}
                              <option value="predefined">Other Premium Locale Voice</option>
                              <option value="custom">Custom Voice Name...</option>
                            </select>
                          </div>

                          {tempGoogleTtsVoiceName !== 'auto' && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Voice Name / Code</label>
                              <input 
                                type="text" 
                                value={tempGoogleTtsVoiceName} 
                                onChange={(e) => setTempGoogleTtsVoiceName(e.target.value)}
                                placeholder="e.g. es-ES-Neural2-F" 
                                className="bg-slate-950 border border-white/10 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none w-full"
                              />
                              <p className="text-[8px] text-slate-500">Provide exact GC Voice Name (e.g. <code>fr-FR-Neural2-A</code>) for premium synthesized audio speech.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Common Speech Rate */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center select-none">
                          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Voice Speed / Rate</label>
                          <span className="text-[9px] text-indigo-300 font-bold font-mono">{tempTtsRate}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2.0" 
                          step="0.1" 
                          value={tempTtsRate} 
                          onChange={(e) => setTempTtsRate(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="flex flex-col gap-2 h-full py-1 overflow-hidden text-left">
                  {/* Search and Action Bar */}
                  <div className="flex justify-between items-center gap-2 select-none">
                    <input
                      type="text"
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      placeholder="Search meeting transcripts..."
                      className="bg-slate-900 border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 flex-grow"
                    />
                    <button onClick={copyLogs}
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${logsCopied ? 'bg-emerald-600 text-white border-transparent' : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-500'} shrink-0`}>
                      {logsCopied ? 'Copied!' : 'Copy Logs'}
                    </button>
                  </div>

                  {/* Structured Transcript Search List */}
                  <div className="flex-grow bg-slate-900/60 border border-white/5 rounded-lg p-2 overflow-y-auto flex flex-col gap-2 h-[130px]">
                    {transcriptHistory.length === 0 ? (
                      <div className="text-slate-500 text-[10px] italic py-8 text-center select-none font-medium">No sentences captured in this session yet.</div>
                    ) : (
                      transcriptHistory
                        .filter(item => {
                          const query = logSearchQuery.toLowerCase();
                          return item.en.toLowerCase().includes(query) || item.hi.toLowerCase().includes(query);
                        })
                        .map((item, idx) => {
                          const hasSpeaker = item.speaker !== null && item.speaker !== undefined;
                          return (
                            <div key={idx} className="border-b border-white/5 pb-1.5 last:border-0 text-[10px]">
                              <div className="flex items-center gap-1.5 text-slate-500 mb-0.5 select-none text-[9px] font-semibold">
                                <span>[{item.time}]</span>
                                {hasSpeaker && <span className="text-indigo-400 font-extrabold">Spk {item.speaker}</span>}
                              </div>
                              <div className="text-slate-300 font-serif italic">"{item.en}"</div>
                              {item.hi && <div className="text-yellow-400/90 font-medium leading-normal mt-0.5">{item.hi}</div>}
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Raw Debug Toggle Indicator */}
                  <details className="mt-1 group cursor-pointer border border-white/5 rounded-lg p-1.5 bg-slate-900/40 select-none">
                    <summary className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hover:text-white flex justify-between items-center">
                      <span>Show Technical Raw Logs</span>
                      <span className="text-[8px] opacity-60 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <textarea readOnly value={getLogText()}
                      className="bg-slate-950 border border-white/10 rounded-lg p-2 text-[9px] text-slate-400 font-mono focus:outline-none w-full h-[80px] mt-1.5 select-text cursor-text" />
                  </details>
                </div>
              )}
            </div>
          </div>

          {/* Settings Modal Footer Actions */}
          <div className="flex justify-end items-center gap-3 border-t border-white/10 pt-3 mt-1 select-none shrink-0">
            <button
              type="button"
              onClick={handleCloseSettings}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${theme.btnSecondary}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const needsRestart = 
                  deepgramApiKey !== tempDeepgramApiKey ||
                  deepgramModel !== tempDeepgramModel ||
                  deepgramKeywords !== tempDeepgramKeywords ||
                  sourceLang !== tempSourceLang ||
                  targetLang !== tempTargetLang;

                localStorage.setItem('caption_font', tempCaptionFont);
                localStorage.setItem('caption_alignment', tempCaptionAlignment);
                localStorage.setItem('caption_theme', tempCaptionTheme);
                localStorage.setItem('app_theme', tempAppTheme);
                localStorage.setItem('translate_provider', tempTranslateProvider);
                localStorage.setItem('gemini_api_key', tempGeminiApiKey);
                localStorage.setItem('gemini_model', tempGeminiModel);
                localStorage.setItem('openai_api_key', tempOpenaiApiKey);
                localStorage.setItem('openai_base_url', tempOpenaiBaseUrl);
                localStorage.setItem('openai_model', tempOpenaiModel);
                localStorage.setItem('deepseek_api_key', tempDeepseekApiKey);
                localStorage.setItem('deepseek_base_url', tempDeepseekBaseUrl);
                localStorage.setItem('deepseek_model', tempDeepseekModel);
                localStorage.setItem('custom_api_key', tempCustomApiKey);
                localStorage.setItem('custom_base_url', tempCustomBaseUrl);
                localStorage.setItem('custom_model', tempCustomModel);
                localStorage.setItem('translate_final_only', String(tempTranslateFinalOnly));
                localStorage.setItem('translation_debounce', String(tempTranslationDebounce));
                localStorage.setItem('deepgram_api_key', tempDeepgramApiKey);
                localStorage.setItem('deepgram_model', tempDeepgramModel);
                localStorage.setItem('tts_enabled', String(tempTtsEnabled));
                localStorage.setItem('tts_engine', tempTtsEngine);
                localStorage.setItem('google_tts_api_key', tempGoogleTtsApiKey);
                localStorage.setItem('tts_rate', String(tempTtsRate));
                localStorage.setItem('tts_voice_name', tempTtsVoiceName);
                localStorage.setItem('google_tts_voice_name', tempGoogleTtsVoiceName);
                localStorage.setItem('deepgram_keywords', tempDeepgramKeywords);
                localStorage.setItem('auto_save_enabled', String(tempAutoSaveEnabled));
                localStorage.setItem('source_lang', tempSourceLang);
                localStorage.setItem('target_lang', tempTargetLang);

                setCaptionFont(tempCaptionFont);
                setCaptionAlignment(tempCaptionAlignment);
                setCaptionTheme(tempCaptionTheme);
                setAppTheme(tempAppTheme);
                setTranslateProvider(tempTranslateProvider);
                setGeminiApiKey(tempGeminiApiKey);
                setGeminiModel(tempGeminiModel);
                setOpenaiApiKey(tempOpenaiApiKey);
                setOpenaiBaseUrl(tempOpenaiBaseUrl);
                setOpenaiModel(tempOpenaiModel);
                setDeepseekApiKey(tempDeepseekApiKey);
                setDeepseekBaseUrl(tempDeepseekBaseUrl);
                setDeepseekModel(tempDeepseekModel);
                setCustomApiKey(tempCustomApiKey);
                setCustomBaseUrl(tempCustomBaseUrl);
                setCustomModel(tempCustomModel);
                setTranslateFinalOnly(tempTranslateFinalOnly);
                setTranslationDebounce(tempTranslationDebounce);
                setDeepgramApiKey(tempDeepgramApiKey);
                setDeepgramModel(tempDeepgramModel);
                setTtsEnabled(tempTtsEnabled);
                setTtsEngine(tempTtsEngine);
                setGoogleTtsApiKey(tempGoogleTtsApiKey);
                setTtsRate(tempTtsRate);
                setTtsVoiceName(tempTtsVoiceName);
                setGoogleTtsVoiceName(tempGoogleTtsVoiceName);
                setDeepgramKeywords(tempDeepgramKeywords);
                setAutoSaveEnabled(tempAutoSaveEnabled);
                setSourceLang(tempSourceLang);
                setTargetLang(tempTargetLang);

                handleCloseSettings();
                showToast('Settings saved successfully!');

                if (isListening && needsRestart) {
                  setTimeout(() => {
                    startDeepgramStream();
                  }, 200);
                }
              }}
              className={`px-5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all ${theme.accentBg}`}
            >
              Save Settings
            </button>
          </div>

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
