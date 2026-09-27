"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export default function NewChatModal({
  currentUserId,
  onClose,
  onCreated,
}: {
  currentUserId: string;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}) {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .neq("id", currentUserId)
        .order("full_name");

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setUsers(data ?? []);
      }
      setLoading(false);
    })();
  }, [currentUserId, supabase]);

  async function handlePick(otherUserId: string) {
    setCreatingId(otherUserId);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc(
      "create_direct_conversation",
      { other_user_id: otherUserId },
    );

    if (rpcError) {
      setError(rpcError.message);
      setCreatingId(null);
      return;
    }

    onCreated(data as string);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 text-foreground">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Mulai chat baru</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-full p-1 text-muted [@media(hover:hover)]:hover:bg-panel"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <p className="py-6 text-center text-sm text-muted">
              Memuat daftar pengguna...
            </p>
          )}

          {!loading && users.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Belum ada pengguna lain yang terdaftar.
            </p>
          )}

          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => handlePick(u.id)}
              disabled={creatingId !== null}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors [@media(hover:hover)]:hover:bg-panel disabled:opacity-50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                {u.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{u.full_name}</p>
                <p className="truncate text-xs text-muted">{u.email}</p>
              </div>
              {creatingId === u.id && (
                <span className="ml-auto text-xs text-muted">Membuka...</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
