import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSyntheticData } from './SyntheticDataContext';
import { fetchHouseholdAdvisor } from '../api/householdAdvisor';
import { isElevenLabsTtsConfigured, speakElevenLabs } from '../api/elevenLabsTts';

const NajiContext = createContext(null);

const MAX_LOG = 5;

function normalizeAccountSpoken(text) {
  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = compact.match(/ACC(\d{6})/);
  if (m) return `ACC_${m[1]}`;
  const m2 = compact.match(/ACC(\d+)/);
  if (m2) return `ACC_${m2[1]}`.slice(0, 12);
  return null;
}

function buildNajiSystemPrompt(swahili) {
  return `
You are NAJI, EquityGrid Kenya's intelligent energy equity assistant.
Your name means "safe" in Swahili — you protect vulnerable households.
You work for EPRA Kenya helping regulators make fair tariff decisions
and helping households understand their electricity usage.

Your personality:
- Warm but professional. Like a trusted advisor not a chatbot.
- Precise with numbers. Always cite KSh values and percentages.
- Culturally aware. You understand Kenyan counties, poverty contexts,
  and energy realities.
- Never use jargon. Speak plainly.
- In Swahili mode, use natural conversational Swahili
  not formal translated English.

Always structure spoken responses as:
1. One sentence stating the key fact
2. One sentence explaining what it means
3. One sentence on what should happen next

Keep all responses under 40 words for voice output.
For text responses in the conversation log,
you may expand to 3-4 sentences.
${swahili ? 'Respond only in Swahili.' : ''}
`.trim();
}

export function NajiProvider({ children }) {
  const { accounts, stats } = useSyntheticData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [voiceState, setVoiceState] = useState('idle');
  const [swahili, setSwahili] = useState(false);
  const [log, setLog] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const recognitionRef = useRef(null);
  const utterRef = useRef(null);
  const ttsAudioRef = useRef(null);

  const pushExchange = useCallback((userText, najiText) => {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLog((prev) => {
      const next = [...prev, { user: userText, naji: najiText, ts }];
      return next.slice(-MAX_LOG);
    });
  }, []);

  const speak = useCallback(
    (text, onEnd) => {
      if (!text) return;
      window.speechSynthesis.cancel();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = '';
        ttsAudioRef.current = null;
      }

      const finish = () => {
        setVoiceState('idle');
        onEnd?.();
      };

      const run = async () => {
        setVoiceState('speaking');
        if (isElevenLabsTtsConfigured()) {
          const ok = await speakElevenLabs(text, ttsAudioRef);
          if (ok) {
            finish();
            return;
          }
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = swahili ? 'sw-KE' : 'en-KE';
        u.rate = 0.95;
        u.onend = finish;
        u.onerror = finish;
        utterRef.current = u;
        window.speechSynthesis.speak(u);
      };

      void run();
    },
    [swahili],
  );

  const processTranscript = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text) return;
      const upper = text.toUpperCase();

      if (/SEMA KISWAHILI|SWAHILI/i.test(text)) {
        setSwahili(true);
        const reply =
          'Sawa, nitazungumza Kiswahili hadi utakapo sema kwa Kiingereza. Nikusaidie vipi leo?';
        pushExchange(text, reply);
        speak(reply);
        return;
      }
      if (/SPEAK ENGLISH|ENGLISH MODE/i.test(text)) {
        setSwahili(false);
        const reply = "Alright — I'll switch back to English. How can I help?";
        pushExchange(text, reply);
        speak(reply);
        return;
      }

      if (/LOOK UP ACCOUNT|FIND ACCOUNT|LOOKUP/i.test(upper) || /ACC[_\s]?[0-9]/i.test(text)) {
        const hash = normalizeAccountSpoken(text);
        const acc = hash ? accounts.find((a) => a.account_hash.toUpperCase() === hash) : null;
        if (acc) {
          navigate(`/lookup?account=${encodeURIComponent(acc.account_hash)}`);
          const reply = swahili
            ? `Akaunti ${acc.account_hash} iko ${acc.county}. Kaya imepangiwa daraja ${acc.classification} na alama ${acc.final_score}.`
            : `I've found account ${acc.account_hash} in ${acc.county}. This household is classified ${acc.classification} with an equity score of ${acc.final_score}. High evening use and capacity signals drive the score. That shapes how much cross-subsidy applies on the bill.`;
          pushExchange(text, reply);
          speak(swahili ? reply : reply.split('.').slice(0, 3).join('. ') + '.');
          return;
        }
        const miss = swahili
          ? 'Sijaipata akaunti hiyo. Jaribu tena na nambari sahihi ya ACC.'
          : "I couldn't match that account ID. Try again with a full ACC number.";
        pushExchange(text, miss);
        speak(miss);
        return;
      }

      if (/TOTAL LEAKAGE|LEAKAGE THIS MONTH|NATIONAL STATS/i.test(upper)) {
        const leakM = (stats.leakageDetected / 1e6).toFixed(1);
        const nairobi = '42.1';
        const reply = swahili
          ? `Upotevu wa sasa ni takriban bilioni ${leakM} KSh katika kaunti 37. Nairobi ina sehemu kubwa ya mwaka.`
          : `Current detected leakage stands at KSh ${leakM} million across ${stats.counties_covered} counties. Nairobi City accounts for the highest share at KSh ${nairobi} million annually.`;
        pushExchange(text, reply);
        speak(reply);
        return;
      }

      if (/ADVICE FOR THIS ACCOUNT|HOUSEHOLD ADVICE|GIVE ME ADVICE/i.test(upper)) {
        const id = searchParams.get('account');
        const acc = id ? accounts.find((a) => a.account_hash.toUpperCase() === id.toUpperCase()) : null;
        const reply = acc
          ? swahili
            ? `Kwa ${acc.account_hash}: pungza matumizi ya jioni, tumia LED, na zima vifaa bila matumizi. Daraja ${acc.classification}.`
            : `For ${acc.account_hash}: shift evening peaks after 10pm, keep LEDs everywhere you can, and cut standby on entertainment gear. Your ${acc.classification} tier loves steady, modest monthly use.`
          : swahili
            ? 'Fungua ukurasa wa utafutaji wa akaunti kwanza, kisha niulize tena.'
            : 'Open an account on Lookup first, then ask me again for tailored advice.';
        pushExchange(text, reply);
        speak(reply);
        return;
      }

      if (/INCREASE.*GREEN.*DISCOUNT.*40|40%.*GREEN|POLICY.*40/i.test(upper)) {
        navigate('/simulator?greenDiscount=40', { replace: false });
        const reply =
          'At a 40% Green tier discount, subsidy cost increases to about KSh 1.2 billion in this model. Fee revenue from Red tier accounts still covers it with a net surplus near KSh 214 million. Equity equilibrium is maintained.';
        pushExchange(text, reply);
        speak(reply);
        return;
      }

      setVoiceState('thinking');
      const userLine = swahili ? `${text}\n(Tumia Kiswahili.)` : text;
      const prompt = `${buildNajiSystemPrompt(swahili)}\n\nUser said: ${userLine}\n\nReply as NAJI for the conversation log (3-4 sentences).`;
      try {
        const out = await fetchHouseholdAdvisor(prompt);
        const reply = out || (swahili ? 'Samahani, jaribu tena baadaye.' : 'Sorry — try again in a moment.');
        pushExchange(text, reply);
        speak(reply.slice(0, 400));
      } catch {
        const fallback = swahili
          ? 'Samahani, huduma ya sauti haipatikani kwa sasa.'
          : "I'm having trouble reaching the insight engine — please try again shortly.";
        pushExchange(text, fallback);
        speak(fallback);
      }
    },
    [accounts, navigate, pushExchange, searchParams, speak, stats.counties_covered, stats.leakageDetected, swahili],
  );

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      pushExchange('(mic)', 'Speech recognition is not supported in this browser.');
      return;
    }
    recognitionRef.current?.stop?.();
    const rec = new SR();
    rec.lang = swahili ? 'sw-KE' : 'en-KE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setVoiceState('listening');
    rec.onerror = () => setVoiceState('idle');
    rec.onend = () => {};
    rec.onresult = (ev) => {
      const t = ev.results?.[0]?.[0]?.transcript || '';
      setVoiceState('thinking');
      void processTranscript(t);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setVoiceState('idle');
    }
  }, [processTranscript, pushExchange, swahili]);

  const value = useMemo(
    () => ({
      voiceState,
      swahili,
      setSwahili,
      log,
      expanded,
      setExpanded,
      pushExchange,
      speak,
      startListening,
      processTranscript,
    }),
    [voiceState, swahili, log, expanded, pushExchange, speak, startListening, processTranscript],
  );

  return <NajiContext.Provider value={value}>{children}</NajiContext.Provider>;
}

export function useNaji() {
  const ctx = useContext(NajiContext);
  if (!ctx) throw new Error('useNaji must be used within NajiProvider');
  return ctx;
}
