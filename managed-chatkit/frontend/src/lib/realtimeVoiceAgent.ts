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

type RequestVoiceProfileSummaryOptions = {
  propertyUrl: string;
  timeoutMs?: number;
  onStatus?: (message: string) => void;
};

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

function createSummaryPrompt(token: string, propertyUrl: string): string {
  return [
    "Prepare a profile handoff from this voice conversation for a text chat composer.",
    `Required property link: ${propertyUrl}`,
    `Return plain text only. First line must be exactly: ${token}`,
    "Then output 6-10 concise bullet points, each line starting with '- '.",
    "Include these topics when possible: property link, household, kids, pets, bedrooms/bathrooms, budget or valuation cues, location preferences, constraints.",
    "If an item is unknown, state 'Unknown'.",
    "Do not ask follow-up questions.",
  ].join("\n");
}

function formatSummaryForComposer(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((line) => line.startsWith("- "));
  if (bulletLines.length >= 2) {
    return bulletLines.join("\n");
  }

  const inlineBullets = text
    .split(/\s(?=-\s)/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`));

  if (inlineBullets.length >= 2) {
    return inlineBullets.join("\n");
  }

  return `- ${text.trim()}`;
}

function ensurePropertyLinkBullet(summary: string, propertyUrl: string): string {
  if (summary.toLowerCase().includes(propertyUrl.toLowerCase())) {
    return summary;
  }

  return `- Property link: ${propertyUrl}\n${summary}`;
}

function extractTokenizedAssistantMessage(
  history: unknown,
  token: string
): string | null {
  const items = normalizeHistory(history);
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.role !== "assistant") continue;
    if (!item.text.includes(token)) continue;

    const stripped = item.text.replace(token, "").trim();
    return stripped || null;
  }

  return null;
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

export async function requestVoiceProfileSummary(
  options: RequestVoiceProfileSummaryOptions
): Promise<string> {
  if (!activeSession) {
    throw new Error("Voice session is not connected yet.");
  }

  const propertyUrl = options.propertyUrl.trim();
  if (!propertyUrl) {
    throw new Error("Missing property link.");
  }

  const token = `[[PROFILE_SUMMARY_${Math.random().toString(36).slice(2, 10)}]]`;
  const timeoutMs = options.timeoutMs ?? 20_000;

  options.onStatus?.("Requesting bullet profile summary from voice session...");

  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      activeSession?.off("history_updated", onHistoryUpdated);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onHistoryUpdated = (history: unknown) => {
      const tokenizedText = extractTokenizedAssistantMessage(history, token);
      if (!tokenizedText) return;

      const formatted = ensurePropertyLinkBullet(
        formatSummaryForComposer(tokenizedText),
        propertyUrl
      );
      settle(() => resolve(formatted));
    };

    timeoutHandle = setTimeout(() => {
      settle(() =>
        reject(new Error("Timed out waiting for profile summary. Please retry."))
      );
    }, timeoutMs);

    activeSession?.on("history_updated", onHistoryUpdated);
    activeSession?.sendMessage(createSummaryPrompt(token, propertyUrl));
  });
}
