import { useMemo } from "react";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { createClientSecretFetcher, workflowId } from "../lib/chatkitSession";

type ChatKitPanelProps = {
  className?: string;
};

export function ChatKitPanel({ className }: ChatKitPanelProps) {
  const getClientSecret = useMemo(
    () => createClientSecretFetcher(workflowId),
    []
  );

  const chatkit = useChatKit({
    api: { getClientSecret },
  });

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
