import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import MovieBoxNavbar from "../component/nav";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth"); // redirect if not logged in
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error) {
        setProfile(data);
      }
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        notify_new_movies: profile.notify_new_movies,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (!error) {
      alert("Profile updated ✅");
    } else {
      alert("Failed to update profile ❌");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center">Loading profile...</p>
      </div>
    </div>
  );
  
  if (!profile) return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center">No profile found.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />

      <div className="p-6 max-w-md mx-auto">
        {/* Avatar + Name + Email */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={profile.avatar_url || "/default-avatar.png"}
          alt="Avatar"
          className="w-24 h-24 rounded-full mb-3 border-4 border-red-600"
        />
        <h2 className="text-xl font-bold">{profile.full_name || "No Name"}</h2>
        <p className="text-gray-400">{profile.email}</p>
      </div>

      {/* Editable Fields */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Full Name</label>
        <input
          type="text"
          value={profile.full_name || ""}
          onChange={(e) =>
            setProfile({ ...profile, full_name: e.target.value })
          }
          className="w-full p-2 rounded bg-gray-800"
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          id="notify"
          type="checkbox"
          checked={profile.notify_new_movies}
          onChange={(e) =>
            setProfile({ ...profile, notify_new_movies: e.target.checked })
          }
          className="mr-2"
        />
        <label htmlFor="notify">Email me when new movies are uploaded</label>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded w-full mb-4"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded w-full"
      >
        Logout
      </button>
      </div>
    </div>
  );
}