// lib/getSignedUrl.js
import { supabase } from "./supabase";

/**
 * Return signed url for private file in 'movies' bucket.
 * ttlSeconds default 3600 (1 hour).
 */
export async function getSignedUrl(filePath, ttlSeconds = 60 * 60) {
  if (!filePath) return null;

  const { data, error } = await supabase.storage
    .from("movies")
    .createSignedUrl(filePath, ttlSeconds);

  if (error) {
    console.error("getSignedUrl error:", error);
    return null;
  }
  return data.signedUrl;
}