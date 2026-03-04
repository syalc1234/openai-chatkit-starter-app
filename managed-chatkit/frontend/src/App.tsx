import { useState } from "react";
import {
  ChatKitPanel,
  type ChatKitComposerControl,
} from "./components/ChatKitPanel";
import {
  connectRealtimeVoiceSession,
  requestVoiceProfileSummary,
  type VoiceTranscriptItem,
} from "./lib/realtimeVoiceAgent";

type SetupCounterOptions = {
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
  onConnected?: (expiresAt?: number) => void;
  onHistory?: (items: VoiceTranscriptItem[]) => void;
};

export async function setupCounter(options: SetupCounterOptions = {}) {
  return connectRealtimeVoiceSession(options);
}

export default function App() {
  const [isSettingUpRealtime, setIsSettingUpRealtime] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<string>(
    "Click setup to start live voice conversation."
  );
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<VoiceTranscriptItem[]>([]);
  const [voiceHistory, setVoiceHistory] = useState<VoiceTranscriptItem[]>([]);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [summaryStatus, setSummaryStatus] = useState(
    "Paste a property link, then generate profile summary."
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [chatComposerControl, setChatComposerControl] =
    useState<ChatKitComposerControl | null>(null);

  const onSetupRealtime = async () => {
    setIsSettingUpRealtime(true);
    setRealtimeError(null);

    try {
      await setupCounter({
        onStatus: setRealtimeStatus,
        onError: setRealtimeError,
        onConnected: (expiresAt) => {
          if (!expiresAt) return;
          setRealtimeStatus(
            `Live voice session ready. Expires at ${new Date(
              expiresAt * 1000
            ).toLocaleTimeString()}.`
          );
        },
        onHistory: (items) => {
          setVoiceHistory(items);
          setTranscript(items.slice(-8));
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create realtime session";
      setRealtimeError(message);
      setRealtimeStatus("Unable to start live voice session.");
    } finally {
      setIsSettingUpRealtime(false);
    }
  };

  const onGenerateSummary = async () => {
    const trimmedPropertyUrl = propertyUrl.trim();
    if (!trimmedPropertyUrl) {
      setSummaryError("Paste a property link before generating summary.");
      return;
    }
    if (!voiceHistory.length) {
      setSummaryError("No voice interview content yet. Start a realtime session first.");
      return;
    }
    if (!chatComposerControl) {
      setSummaryError("Chat composer is not ready yet. Please retry.");
      return;
    }

    setSummaryError(null);
    setIsGeneratingSummary(true);

    try {
      const summary = await requestVoiceProfileSummary({
        propertyUrl: trimmedPropertyUrl,
        onStatus: setSummaryStatus,
      });

      await chatComposerControl.setComposerValue({ text: summary });
      await chatComposerControl.focusComposer();
      setSummaryStatus("Summary drafted in chat composer.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate profile summary";
      setSummaryError(message);
      setSummaryStatus("Unable to generate summary.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const valuationSignals = [
    { label: "Estimated Value Range", value: "$742k - $781k" },
    { label: "Confidence Score", value: "86 / 100" },
    { label: "Active Comparables", value: "12 listings" },
  ];

  const checklist = [
    "Share your ideal neighborhoods, commute tolerance, and price ceiling.",
    "Tell the agent your must-haves (beds, baths, yard, schools, parking).",
    "Ask for side-by-side comparisons before making a shortlist.",
    "Request tradeoffs: value upside vs. move-in readiness.",
  ];

  return (
    <main className="relative min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="panel-card fade-in-up p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="eyebrow">Real Estate Recommender</p>
              <h1 className="font-display mt-2 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl lg:text-5xl">
                Find The Right Home Faster
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                Chat with your agent to get neighborhood-fit insights, pricing
                comparisons, and personalized property recommendations in one place.
              </p>
            </div>
            <div className="w-full max-w-[264px] overflow-hidden rounded-xl border border-[var(--line)] bg-white">
              <img
                src="/HOUSE.png"
                alt="Modern home exterior"
                className="h-[8.4rem] w-full object-contain"
              />
            </div>

            <div className="w-full max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">
                Session Status
              </p>
              <p className="mt-1">Connected to managed workflow</p>
              <button
                id="setup-counter"
                type="button"
                onClick={() => {
                  void onSetupRealtime();
                }}
                disabled={isSettingUpRealtime}
                className="mt-3 rounded-lg border border-[var(--accent)] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)] transition hover:bg-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSettingUpRealtime ? "Setting up..." : "Setup Realtime Session"}
              </button>
              <p id="setup-counter-status" className="mt-2 text-xs text-[var(--foreground)]">
                {realtimeStatus}
              </p>
              {realtimeError ? (
                <p className="mt-2 text-xs text-red-700">{realtimeError}</p>
              ) : null}

              <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]">
                  Property Link
                </p>
                <input
                  type="url"
                  value={propertyUrl}
                  onChange={(event) => {
                    setPropertyUrl(event.target.value);
                    if (summaryError) setSummaryError(null);
                  }}
                  placeholder="https://property-listing-url"
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[var(--accent)] transition focus:ring-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    void onGenerateSummary();
                  }}
                  disabled={isGeneratingSummary}
                  className="mt-3 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingSummary ? "Generating..." : "Generate Profile Summary"}
                </button>
                <p className="mt-2 text-xs text-[var(--foreground)]">{summaryStatus}</p>
                {summaryError ? (
                  <p className="mt-2 text-xs text-red-700">{summaryError}</p>
                ) : null}
              </div>

              {transcript.length ? (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--line)] bg-white p-2">
                  {transcript.map((item) => (
                    <p key={item.id} className="mb-1 text-xs leading-relaxed text-[var(--muted)]">
                      <span className="font-semibold text-[var(--foreground)]">
                        {item.role === "assistant" ? "Assistant" : "You"}:
                      </span>{" "}
                      {item.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <aside className="space-y-4">
            <section className="panel-card fade-in-up p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Start Here
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Step 1
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    Setup Voice Or Chat
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Start a session and describe what you want in a home.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Step 2
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    Compare Recommendations
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    Ask for neighborhood, value, and upside tradeoffs.
                  </p>
                </div>
              </div>
            </section>

            <section className="panel-card fade-in-up p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Best Results Checklist
              </h2>
              <div className="mt-4 space-y-2">
                {checklist.map((item, index) => (
                  <div
                    key={item}
                    className="fade-in-up flex gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]"
                    style={{ animationDelay: `${0.08 * (index + 2)}s` }}
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--accent)] text-xs font-semibold text-[var(--accent)]">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                First-time buyer
              </span>
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                20-30 min commute
              </span>
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
                Walkable area
              </span>
            </div>
            <ChatKitPanel
              className="w-full"
              onReady={(control) => {
                setChatComposerControl((current) => current ?? control);
              }}
            />
          </section>
        </div>

        <section
          className="panel-card mt-6 fade-in-up p-5 sm:p-6"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[var(--foreground)]">Session Status</p>
              <p className="mt-1">Connected to managed workflow</p>
            </div>
            <button
              id="setup-counter"
              type="button"
              onClick={() => {
                void onSetupRealtime();
              }}
              disabled={isSettingUpRealtime}
              className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSettingUpRealtime ? "Setting up..." : "Setup Realtime Session"}
            </button>
          </div>

          <p id="setup-counter-status" className="mt-2 text-sm text-[var(--foreground)]">
            {realtimeStatus}
          </p>
          {realtimeError ? (
            <p className="mt-2 text-sm text-red-700">{realtimeError}</p>
          ) : null}

          {transcript.length ? (
            <div className="mt-3 max-h-44 overflow-y-auto rounded-lg border border-[var(--line)] bg-white p-3">
              {transcript.map((item) => (
                <p key={item.id} className="mb-1.5 text-sm leading-relaxed text-[var(--muted)]">
                  <span className="font-semibold text-[var(--foreground)]">
                    {item.role === "assistant" ? "Agent" : "You"}:
                  </span>{" "}
                  {item.text}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] bg-gradient-to-b from-[var(--bg-accent)] to-transparent" />
      <div className="pointer-events-none absolute -left-24 bottom-8 -z-10 h-64 w-64 rounded-full bg-[var(--bg-orb)] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-20 -z-10 h-72 w-72 rounded-full bg-[var(--bg-orb-secondary)] blur-3xl" />
    </main>
  );
}
