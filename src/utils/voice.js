/**
 * Voice engine: Speech-to-Text + Text-to-Speech
 *
 * Usa Web Speech API nativa del browser (gratis, sin API key).
 * Opcionalmente ElevenLabs API key para TTS premium.
 *
 * Soporte:
 *   - Chrome/Edge/Safari/Opera: STT + TTS completo
 *   - Firefox: TTS solo, STT NO (Firefox no lo implementa)
 *   - Mobile: depende del OS (iOS Safari = full, Android Chrome = full)
 *
 * Languages:
 *   es -> es-AR (español argentino)
 *   en -> en-US
 *   ko -> ko-KR
 */

const LANG_MAP = {
    es: 'es-AR',
    en: 'en-US',
    ko: 'ko-KR'
};

// ═══════════════════════════════════════════════════════════════════
// STT — Speech Recognition
// ═══════════════════════════════════════════════════════════════════

export function sttIsSupported() {
    return typeof window !== 'undefined' &&
        !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Crea instancia de SpeechRecognition configurada.
 *
 * Callbacks:
 *   onResult(finalText, isFinal) - texto reconocido, isFinal indica si es definitivo
 *   onError(err) - error
 *   onEnd() - reconocimiento terminado
 */
export function createRecognizer({ lang = 'es', onResult, onError, onEnd, continuous = false }) {
    if (!sttIsSupported()) {
        throw new Error('Tu browser no soporta reconocimiento de voz. Usá Chrome, Edge, Safari u Opera.');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();

    rec.lang = LANG_MAP[lang] || LANG_MAP.es;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = '';

    rec.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript += result[0].transcript;
                onResult?.(finalTranscript.trim(), true);
            } else {
                interim += result[0].transcript;
            }
        }
        if (interim && !continuous) {
            onResult?.((finalTranscript + interim).trim(), false);
        }
    };

    rec.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return; // silencioso
        onError?.(new Error(translateRecognitionError(event.error)));
    };

    rec.onend = () => {
        onEnd?.(finalTranscript.trim());
    };

    return {
        start: () => rec.start(),
        stop: () => rec.stop(),
        abort: () => rec.abort()
    };
}

function translateRecognitionError(code) {
    const msgs = {
        'not-allowed': 'Permiso de micrófono denegado. Habilitalo en el ícono del candado de la URL.',
        'audio-capture': 'No encuentro un micrófono conectado.',
        'network': 'Error de red reconociendo la voz.',
        'language-not-supported': 'El idioma elegido no está soportado por tu browser.',
        'service-not-allowed': 'Tu browser o SO bloqueó el servicio de voz.',
        'bad-grammar': 'Error de gramática en el reconocimiento.',
        'no-speech': 'No escuché nada.'
    };
    return msgs[code] || `Error de voz: ${code}`;
}

// ═══════════════════════════════════════════════════════════════════
// TTS — Speech Synthesis
// ═══════════════════════════════════════════════════════════════════

export function ttsIsSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let voicesCache = null;
let voicesPromise = null;

function loadVoices() {
    if (voicesCache) return Promise.resolve(voicesCache);
    if (voicesPromise) return voicesPromise;

    voicesPromise = new Promise((resolve) => {
        const synth = window.speechSynthesis;
        let voices = synth.getVoices();
        if (voices.length > 0) {
            voicesCache = voices;
            resolve(voices);
            return;
        }
        // Algunos browsers cargan voces async
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            voicesCache = voices;
            resolve(voices);
        };
        // Timeout fallback
        setTimeout(() => {
            voicesCache = synth.getVoices();
            resolve(voicesCache);
        }, 1500);
    });
    return voicesPromise;
}

/**
 * Elige la mejor voz para un idioma dado.
 * Prioridad: voz "natural"/"neural" > voz local > voz cualquiera del idioma.
 */
async function pickBestVoice(lang) {
    const voices = await loadVoices();
    const targetLang = LANG_MAP[lang] || LANG_MAP.es;
    const langPrefix = targetLang.split('-')[0]; // "es", "en", "ko"

    // Filtrar por idioma exacto primero
    let candidates = voices.filter(v => v.lang === targetLang);
    // Si no hay, buscar por prefijo
    if (candidates.length === 0) {
        candidates = voices.filter(v => v.lang.startsWith(langPrefix + '-'));
    }
    if (candidates.length === 0) return null;

    // Priorizar voces "enhanced"/"premium"/"neural" (mejor calidad)
    const premium = candidates.find(v =>
        /enhanced|premium|neural|natural|wavenet/i.test(v.name)
    );
    if (premium) return premium;

    // Priorizar voces locales (no red)
    const local = candidates.find(v => v.localService);
    if (local) return local;

    return candidates[0];
}

/**
 * Habla un texto en el idioma dado.
 * Retorna una promesa que resuelve cuando termina.
 *
 * Si se pasa elevenLabsKey, usa ElevenLabs en lugar de Web Speech API.
 */
export async function speak(text, { lang = 'es', rate = 1.0, pitch = 1.0, volume = 1.0, elevenLabsKey = null, onStart, onEnd } = {}) {
    if (!text) return;

    // ElevenLabs premium path
    if (elevenLabsKey) {
        try {
            return await speakElevenLabs(text, { lang, elevenLabsKey, onStart, onEnd });
        } catch (err) {
            console.warn('ElevenLabs failed, falling back to native:', err);
            // cae al native
        }
    }

    // Native Web Speech API
    if (!ttsIsSupported()) throw new Error('Tu browser no soporta síntesis de voz.');

    const synth = window.speechSynthesis;
    // Cortar cualquier voz en curso antes de hablar
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = LANG_MAP[lang] || LANG_MAP.es;
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = volume;

    const voice = await pickBestVoice(lang);
    if (voice) utter.voice = voice;

    return new Promise((resolve, reject) => {
        utter.onstart = () => onStart?.();
        utter.onend = () => {
            onEnd?.();
            resolve();
        };
        utter.onerror = (e) => {
            onEnd?.();
            // "canceled" no es un error real — el usuario interrumpió
            if (e.error === 'canceled' || e.error === 'interrupted') resolve();
            else reject(new Error(`TTS error: ${e.error}`));
        };
        synth.speak(utter);
    });
}

export function stopSpeaking() {
    if (ttsIsSupported()) {
        window.speechSynthesis.cancel();
    }
}

export function isSpeaking() {
    return ttsIsSupported() && window.speechSynthesis.speaking;
}

// ═══════════════════════════════════════════════════════════════════
// ElevenLabs premium TTS (opcional)
// ═══════════════════════════════════════════════════════════════════

const ELEVENLABS_VOICES = {
    // IDs estables de ElevenLabs para cada idioma
    // Ver https://elevenlabs.io/app/voice-library para elegir otros
    es: '21m00Tcm4TlvDq8ikWAM', // "Rachel" - multilingual
    en: '21m00Tcm4TlvDq8ikWAM',
    ko: 'EXAVITQu4vr4xnSDxMaL'  // "Bella" - multilingual
};

async function speakElevenLabs(text, { lang, elevenLabsKey, onStart, onEnd }) {
    const voiceId = ELEVENLABS_VOICES[lang] || ELEVENLABS_VOICES.es;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    onStart?.();
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.7 }
        })
    });
    if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 120)}`);
    }
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            onEnd?.();
            resolve();
        };
        audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            onEnd?.();
            reject(new Error('Audio playback failed'));
        };
        audio.play().catch(reject);
    });
}

// ═══════════════════════════════════════════════════════════════════
// Voice availability info (para UI)
// ═══════════════════════════════════════════════════════════════════
export async function getVoiceCapabilities() {
    const voices = ttsIsSupported() ? await loadVoices() : [];
    return {
        sttSupported: sttIsSupported(),
        ttsSupported: ttsIsSupported(),
        voicesCount: voices.length,
        voicesByLang: {
            es: voices.filter(v => v.lang.startsWith('es')).length,
            en: voices.filter(v => v.lang.startsWith('en')).length,
            ko: voices.filter(v => v.lang.startsWith('ko')).length
        }
    };
}
