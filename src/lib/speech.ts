/**
 * Text-to-speech for the AI (so the orb can "speak" darkly like Jarvis).
 */

export const speakText = (
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void; onError?: () => void }
): boolean => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    callbacks?.onError?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    // Prefer a natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en[-_]GB/i.test(v.lang)) || voices.find((v) => /en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang || 'en-US';

    utterance.onstart = () => callbacks?.onStart?.();
    utterance.onend = () => {
      callbacks?.onEnd?.();
    };
    utterance.onerror = () => {
      callbacks?.onError?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    callbacks?.onError?.();
    return false;
  }
};

export const stopSpeaking = (): void => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export const isSpeakingNow = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window
    ? window.speechSynthesis.speaking
    : false;

// Warm the voice list (Chrome loads voices async)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}