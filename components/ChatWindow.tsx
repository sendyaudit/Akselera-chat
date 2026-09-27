"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Message, Profile } from "@/types";

export default function ChatWindow({
  otherUser,
  currentUserId,
  messages,
  onSend,
  sending,
}: {
  otherUser: Profile | null;
  currentUserId: string;
  messages: Message[];
  onSend: (content: string) => Promise<void>;
  sending: boolean;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await onSend(content);
  }

  if (!otherUser) {
    return (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-muted">
        Pilih percakapan di sebelah kiri, atau mulai chat baru.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {otherUser.full_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold">{otherUser.full_name}</p>
          <p className="text-xs text-muted">{otherUser.email}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted">
            Belum ada pesan. Mulai percakapan dengan {otherUser.full_name}.
          </p>
        )}

        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "bg-foreground text-background"
                    : "bg-panel text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={`mt-1 text-right text-[10px] ${
                    mine ? "text-background/70" : "text-muted"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tulis pesan..."
          className="flex-1 rounded-full border border-border bg-panel px-4 py-2.5 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          className="rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
