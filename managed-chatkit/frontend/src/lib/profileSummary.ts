import type { VoiceTranscriptItem } from "./realtimeVoiceAgent";

type CreateProfileSummaryParams = {
  propertyUrl: string;
  transcript: VoiceTranscriptItem[];
};

export async function createProfileSummary({
  propertyUrl,
  transcript,
}: CreateProfileSummaryParams): Promise<string> {
  const response = await fetch("/api/summarize-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyUrl,
      transcript: transcript.map((item) => ({
        role: item.role,
        text: item.text,
      })),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    summary?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to summarize profile");
  }
  if (!payload.summary) {
    throw new Error("Summary response was empty");
  }

  return payload.summary;
}
