import { useEffect, useMemo } from "react";
import { ChatKit, useChatKit, type UseChatKitReturn } from "@openai/chatkit-react";
import { createClientSecretFetcher, workflowId } from "../lib/chatkitSession";

export type ChatKitComposerControl = Pick<
  UseChatKitReturn,
  "setComposerValue" | "focusComposer"
>;

type ChatKitPanelProps = {
  className?: string;
  onReady?: (control: ChatKitComposerControl) => void;
};

export function ChatKitPanel({ className, onReady }: ChatKitPanelProps) {
  const getClientSecret = useMemo(
    () => createClientSecretFetcher(workflowId),
    []
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
  });

  const composerControl = useMemo(
    () => ({
      setComposerValue: chatkit.setComposerValue,
      focusComposer: chatkit.focusComposer,
    }),
    [chatkit.focusComposer, chatkit.setComposerValue]
  );

  useEffect(() => {
    onReady?.(composerControl);
  }, [composerControl, onReady]);

  const panelClassName = [
    "chat-shell panel-card flex h-[68vh] min-h-[520px] w-full overflow-hidden rounded-[1.5rem] p-2 sm:h-[70vh] sm:min-h-[620px] sm:p-3",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={panelClassName}>
      <ChatKit
        control={chatkit.control}
        className="h-full w-full overflow-hidden rounded-[1.05rem] border border-[var(--line)] bg-white"
      />
    </div>
  );
}
