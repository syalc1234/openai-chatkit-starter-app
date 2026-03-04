import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import { createRealtimeSession } from "./realtimeSession";

export type VoiceTranscriptItem = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
};

type SetupRealtimeOptions = {
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
  onConnected?: (expiresAt?: number) => void;
  onHistory?: (items: VoiceTranscriptItem[]) => void;
};

let activeSession: RealtimeSession | null = null;

function readTextFromContent(content: unknown): string {
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;

    const value = part as Record<string, unknown>;
    const text = value.text;
    const transcript = value.transcript;

    if (typeof text === "string" && text.trim()) {
      parts.push(text.trim());
      continue;
    }
    if (typeof transcript === "string" && transcript.trim()) {
      parts.push(transcript.trim());
    }
  }

  return parts.join(" ").trim();
}

function normalizeHistory(history: unknown): VoiceTranscriptItem[] {
  if (!Array.isArray(history)) return [];

  const normalized: VoiceTranscriptItem[] = [];
  for (const item of history) {
    if (!item || typeof item !== "object") continue;

    const value = item as Record<string, unknown>;
    if (value.type !== "message") continue;

    const role =
      value.role === "assistant" || value.role === "system" ? value.role : "user";
    const text = readTextFromContent(value.content);
    if (!text) continue;

    const id =
      typeof value.itemId === "string" && value.itemId
        ? value.itemId
        : typeof value.id === "string" && value.id
          ? value.id
          : `${role}-${normalized.length}`;

    normalized.push({ id, role, text });
  }

  return normalized;
}

function buildAgent() {
  return new RealtimeAgent({
    name: "Property Valuation Voice Copilot",
    instructions:
      "You are a real estate valuation assistant for licensed agents. Speak clearly and ask one question at a time. Understand what they have in mind for an ideal house. Summarise assumptions.",
  });
}

export async function connectRealtimeVoiceSession(
  options: SetupRealtimeOptions = {}
) {
  try {
    if (activeSession) {
      options.onStatus?.("Voice session is already connected. Start speaking.");
      return activeSession;
    }

    options.onStatus?.("Requesting realtime client secret...");
    const { clientSecret, expiresAt } = await createRealtimeSession("gpt-realtime");

    const session = new RealtimeSession(buildAgent(), {
      model: "gpt-realtime",
    });

    session.on("history_updated", (history: unknown) => {
      options.onHistory?.(normalizeHistory(history));
    });

    session.on("audio_interrupted", () => {
      options.onStatus?.("Audio interrupted. Continue speaking.");
    });

    options.onStatus?.("Connecting microphone and speaker...");
    await session.connect({ apiKey: clientSecret });
    activeSession = session;

    options.onConnected?.(expiresAt);
    options.onStatus?.("Live voice session connected. You can start talking.");

    // Kick off with a greeting so the user immediately hears a response.
    session.sendMessage(
      "Introduce yourself briefly, then ask what property the agent wants to value."
    );

    return session;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect voice session";
    options.onError?.(message);
    throw error;
  }
}
