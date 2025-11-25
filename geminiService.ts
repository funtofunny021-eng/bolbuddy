import { GoogleGenAI, Modality } from "@google/genai";

// Initialize Gemini Client
// Note: In a real production app, ensure API_KEY is securely handled.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_API_KEY_HERE' });

// --- Audio Helpers ---
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
}

// Exported helper to warm up the audio context on user interaction
export const ensureAudioContextReady = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Content Generation ---

export const generateLessonContent = async (topic: string, age: number, language: string) => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Create a short, fun, interactive language lesson for a ${age}-year-old child learning ${language}. 
    The topic is "${topic}". 
    Format the response as JSON with fields: 'phrase', 'translation', 'pronunciation_tip', 'fun_fact'.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return JSON.stringify({
      phrase: "Hello Friend!",
      translation: "Salam Dost!",
      pronunciation_tip: "Sa-laam Dost",
      fun_fact: "Saying Salam is a great way to make friends!"
    });
  }
};

// --- Conversation Logic ---

export interface ChatResponse {
  replyText: string;
  correction: string | null; // Null if correct, otherwise the corrected sentence
  isCorrect: boolean;
  emotion: 'happy' | 'encouraging' | 'celebrate';
}

export const chatWithChhutku = async (userText: string): Promise<ChatResponse> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are Chhutku, a cute 8-year-old Pakistani boy. You speak in a mix of English and Urdu (Roman Urdu).
      The user (a child) just said: "${userText}".
      
      1. Analyze their grammar and sentence structure (in either Urdu or English).
      2. If it is correct, be super happy, say something like "Wah! Zabardast!" or "Perfect!", and mark isCorrect: true.
      3. If there is a mistake, be gentle and funny. Say exactly: "Arrey yaar! Thodi si gadbad 😅 Correct: [FIXED_SENTENCE] – ab tum bolo!" (Replace [FIXED_SENTENCE] with the right grammar). Mark isCorrect: false.
      4. Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a helpful language learning companion for kids.",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text) as ChatResponse;
  } catch (error) {
    console.error("Chat Logic Error:", error);
    return {
      replyText: "Arrey, internet slow hai! Phir se bolo?",
      correction: null,
      isCorrect: true,
      emotion: 'happy'
    };
  }
};

// --- TTS Logic ---

export const playChhutkuVoice = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck is a higher pitched, child-like voice
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    // Decode and Play
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      ctx,
      24000,
      1,
    );
    
    const outputNode = ctx.createGain();
    outputNode.connect(ctx.destination);
    
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outputNode);
    source.start();
    
    return audioBuffer.duration; // Return duration to sync animations
  } catch (error) {
    console.error("TTS Error:", error);
  }
};