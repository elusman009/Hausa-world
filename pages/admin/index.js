import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { isAdmin } from "../../lib/admin";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/auth"); // redirect to login
        return;
      }

      const admin = await isAdmin(data.user);
      if (!admin) {
        router.push("/"); // not admin → redirect home
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, [router]);

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Menu */}
      <nav className="bg-red-900 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-white">
            MovieBox
          </Link>
          <div className="flex space-x-4">
            <Link href="/" className="hover:text-red-300">Home</Link>
            <Link href="/movies" className="hover:text-red-300">Movies</Link>
            <Link href="/my-purchases" className="hover:text-red-300">My Purchases</Link>
            <Link href="/admin" className="hover:text-red-300 text-red-300">Admin</Link>
            <Link href="/profile" className="hover:text-red-300">Profile</Link>
          </div>
        </div>
      </nav>

      <div className="p-6">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/movies" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <h3 className="text-lg font-semibold">Manage Movies</h3>
              <p className="text-gray-400 text-sm">Add, edit, and delete movies</p>
            </div>
          </Link>
          <Link href="/admin/purchases" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2">💳</div>
              <h3 className="text-lg font-semibold">Manage Purchases</h3>
              <p className="text-gray-400 text-sm">Approve/reject payments</p>
            </div>
          </Link>
          <Link href="/admin/reviews" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="text-lg font-semibold">Moderate Reviews</h3>
              <p className="text-gray-400 text-sm">Manage user reviews</p>
            </div>
          </Link>
          <Link href="/admin/users" className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2">👤</div>
              <h3 className="text-lg font-semibold">Manage Users</h3>
              <p className="text-gray-400 text-sm">Ban/unban users</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}