/**
 * ElevenLabs TTS via dev proxy `/elevenlabs` (see vite.config.js).
 * Set VITE_ELEVENLABS_VOICE_ID; API key via proxy env (VITE_ELEVENLABS_API_KEY or ELEVENLABS_API_KEY on server).
 */
const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '';
const modelId = import.meta.env.VITE_ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

export function isElevenLabsTtsConfigured() {
  return Boolean(voiceId);
}

/** @param {{ current: HTMLAudioElement | null } | null | undefined} [audioRef] set while playing so caller can cancel */
export async function speakElevenLabs(text, audioRef) {
  if (!voiceId || !text) return false;
  const res = await fetch(`/elevenlabs/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: String(text).slice(0, 2500),
      model_id: modelId,
    }),
  });
  if (!res.ok) return false;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  if (audioRef) audioRef.current = audio;
  return new Promise((resolve) => {
    const done = (ok) => {
      if (audioRef?.current === audio) audioRef.current = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.play().then(() => {}).catch(() => done(false));
  });
}
