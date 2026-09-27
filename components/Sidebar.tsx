"use client";

import { useMemo, useState } from "react";
import type { ConversationSummary, Profile } from "@/types";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Sidebar({
  currentUser,
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onLogout,
}: {
  currentUser: Profile;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.otherUser.full_name.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  return (
    <div className="flex h-full w-full flex-col border-r border-border sm:w-80">
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <Logo className="h-7" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {currentUser.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {currentUser.full_name}
          </p>
          <p className="truncate text-xs text-muted">{currentUser.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium [@media(hover:hover)]:hover:bg-panel"
        >
          Keluar
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari chat"
          className="flex-1 rounded-full border border-border bg-panel px-3.5 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          onClick={onNewChat}
          className="shrink-0 rounded-full bg-foreground px-3.5 py-2 text-sm font-semibold text-background [@media(hover:hover)]:hover:opacity-90"
        >
          + Chat baru
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Belum ada percakapan. Klik &quot;+ Chat baru&quot; untuk mulai.
          </p>
        )}

        {filtered.map((c) => {
          const active = c.conversationId === activeConversationId;
          return (
            <button
              key={c.conversationId}
              onClick={() => onSelect(c.conversationId)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-foreground/30 ${
                active ? "bg-panel" : "[@media(hover:hover)]:hover:bg-panel/60"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {c.otherUser.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">
                    {c.otherUser.full_name}
                  </p>
                  {c.lastMessageAt && (
                    <span className="shrink-0 text-[11px] text-muted">
                      {formatTimestamp(c.lastMessageAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted">
                  {c.lastMessage ?? "Belum ada pesan"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Kemarin";
  }

  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
