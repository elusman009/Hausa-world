import { supabase } from "./supabase";

// Ensure profile exists for a new user
export async function ensureProfile(user) {
  if (!user) return;

  // Check if profile already exists
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    // Insert a new profile row
    await supabase.from("profiles").insert([
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata.full_name || "",
        avatar_url: user.user_metadata.avatar_url || "",
        notify_new_movies: true,
      },
    ]);
  }
}