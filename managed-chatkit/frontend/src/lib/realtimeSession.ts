type RealtimeSessionResponse = {
  client_secret?: string;
  expires_at?: number;
  error?: string;
};

export async function createRealtimeSession(model = "gpt-realtime") {
  const response = await fetch("/api/create-realtime-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session: { type: "realtime", model },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as RealtimeSessionResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to create realtime session");
  }

  if (!payload.client_secret) {
    throw new Error("Missing client secret in response");
  }

  return {
    clientSecret: payload.client_secret,
    expiresAt: payload.expires_at,
  };
}
