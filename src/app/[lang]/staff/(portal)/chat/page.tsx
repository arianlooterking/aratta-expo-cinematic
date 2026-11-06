import type { Metadata } from "next";
import { Suspense } from "react";
import { Chat } from "@/components/portal/chat/Chat";

export const metadata: Metadata = { title: "Aratta Staff · Chat" };

export default function ChatPage() {
  return (
    <Suspense>
      <Chat />
    </Suspense>
  );
}
