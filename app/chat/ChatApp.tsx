"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ConversationSummary, Message, Profile } from "@/types";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import NewChatModal from "@/components/NewChatModal";

export default function ChatApp({ currentUser }: { currentUser: Profile }) {
  const supabase = createClient();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  const loadConversations = useCallback(async () => {
    const { data: myRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUser.id);

    const ids = (myRows ?? []).map((r) => r.conversation_id);
    if (ids.length === 0) {
      setConversations([]);
      return;
    }

    const { data: otherRows } = await supabase
      .from("conversation_participants")
      .select("conversation_id, profiles!inner(id, email, full_name)")
      .in("conversation_id", ids)
      .neq("user_id", currentUser.id);

    const { data: lastMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    const lastByConversation = new Map<
      string,
      { content: string; created_at: string }
    >();
    (lastMessages ?? []).forEach((m) => {
      if (!lastByConversation.has(m.conversation_id)) {
        lastByConversation.set(m.conversation_id, {
          content: m.content,
          created_at: m.created_at,
        });
      }
    });

    type OtherRow = { conversation_id: string; profiles: Profile };
    const summaries: ConversationSummary[] = (
      (otherRows ?? []) as unknown as OtherRow[]
    ).map((row) => {
      const last = lastByConversation.get(row.conversation_id);
      return {
        conversationId: row.conversation_id,
        otherUser: row.profiles,
        lastMessage: last?.content ?? null,
        lastMessageAt: last?.created_at ?? null,
      };
    });

    summaries.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    setConversations(summaries);
  }, [currentUser.id, supabase]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(data ?? []);
    },
    [supabase],
  );

  useEffect(() => {
    // Ambil daftar chat saat komponen pertama kali dimuat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId, loadMessages]);

  // Realtime: pesan masuk langsung muncul tanpa refresh (fitur bonus)
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((prev) => {
            if (newMessage.conversation_id !== activeId) return prev;
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });

          loadConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  async function handleSend(content: string) {
    if (!activeId) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: currentUser.id,
      content,
    });

    if (!error) {
      await loadMessages(activeId);
      await loadConversations();
    }
    setSending(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleConversationCreated(conversationId: string) {
    setShowNewChat(false);
    setActiveId(conversationId);
    loadConversations();
  }

  const activeConversation = conversations.find(
    (c) => c.conversationId === activeId,
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div
        className={`${
          showSidebarMobile ? "flex" : "hidden"
        } h-full w-full sm:flex sm:w-auto`}
      >
        <Sidebar
          currentUser={currentUser}
          conversations={conversations}
          activeConversationId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            setShowSidebarMobile(false);
          }}
          onNewChat={() => setShowNewChat(true)}
          onLogout={handleLogout}
        />
      </div>

      <div
        className={`${
          showSidebarMobile ? "hidden" : "flex"
        } h-full flex-1 flex-col sm:flex`}
      >
        {!showSidebarMobile && (
          <button
            onClick={() => setShowSidebarMobile(true)}
            className="border-b border-border px-4 py-2.5 text-left text-sm font-medium sm:hidden"
          >
            ← Kembali ke daftar chat
          </button>
        )}
        <ChatWindow
          otherUser={activeConversation?.otherUser ?? null}
          currentUserId={currentUser.id}
          messages={messages}
          onSend={handleSend}
          sending={sending}
        />
      </div>

      {showNewChat && (
        <NewChatModal
          currentUserId={currentUser.id}
          onClose={() => setShowNewChat(false)}
          onCreated={handleConversationCreated}
        />
      )}
    </div>
  );
}
