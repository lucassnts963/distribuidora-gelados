"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

export async function markNotificationsSeenAction() {
  const profile = await getSessionProfile();
  if (!profile) return;

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", profile.userId);
}
