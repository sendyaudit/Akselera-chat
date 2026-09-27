import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatApp from "./ChatApp";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", user.id)
    .single();

  return (
    <ChatApp
      currentUser={
        profile ?? { id: user.id, email: user.email ?? "", full_name: "Saya" }
      }
    />
  );
}
