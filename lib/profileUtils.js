import { supabase } from "./supabase";

// Ensure profile exists for a new user
export async function ensureProfile(user) {
  if (!user) return;

  // Use upsert to handle both insert and update cases
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url || "",
        notify_new_movies: true,
      },
      { 
        onConflict: 'id',
        ignoreDuplicates: false 
      }
    );

  if (error) {
    console.error('Error upserting profile:', error);
    throw new Error(`Failed to create/update profile: ${error.message}`);
  }

  return data;
}
