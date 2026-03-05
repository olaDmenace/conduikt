const EL_BASE = "https://api.elevenlabs.io/v1";

export interface VoiceoverRequest {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function generateVoiceover(
  req: VoiceoverRequest
): Promise<Buffer> {
  const voiceId = req.voiceId ?? process.env.ELEVENLABS_DEFAULT_VOICE_ID!;

  const res = await fetch(`${EL_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: req.text,
      model_id: "eleven_turbo_v2",
      voice_settings: {
        stability: req.stability ?? 0.5,
        similarity_boost: req.similarityBoost ?? 0.75,
        style: 0.2,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error: ${err}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function listVoices() {
  const res = await fetch(`${EL_BASE}/voices`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.voices ?? [];
}
