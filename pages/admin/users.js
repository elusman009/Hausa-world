import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isAdmin } from "../../lib/admin";
import { useRouter } from "next/router";

export default function ManageUsers() {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [banFilter, setBanFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        router.push("/auth");
        return;
      }
      const admin = await isAdmin(data.user);
      if (!admin) {
        router.push("/");
        return;
      }
      setUser(data.user);

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, banned, created_at")
        .order("created_at", { ascending: false });

      if (!error) setProfiles(profiles);
      setLoading(false);
    }
    load();
  }, [router]);

  async function toggleBan(id, banned) {
    await supabase.from("profiles").update({ banned }).eq("id", id);
    setProfiles(
      profiles.map((p) => (p.id === id ? { ...p, banned } : p))
    );
  }

  const filtered = profiles.filter((p) => {
    const matchSearch =
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      (p.full_name && p.full_name.toLowerCase().includes(search.toLowerCase()));
    const matchBan =
      banFilter === "all"
        ? true
        : banFilter === "banned"
        ? p.banned
        : !p.banned;
    return matchSearch && matchBan;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Users</h1>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-1/2"
        />
        <select
          value={banFilter}
          onChange={(e) => setBanFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All</option>
          <option value="banned">Banned</option>
          <option value="not_banned">Not Banned</option>
        </select>
      </div>

      {/* Users Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2">Email</th>
            <th className="p-2">Name</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.email}</td>
              <td className="p-2">{p.full_name || "N/A"} </td>
              <td className="p-2">
                {p.banned ? (
                  <span className="text-red-600 font-semibold">Banned</span>
                ) : (
                  <span className="text-green-600 font-semibold">Active</span>
                )}
              </td>
              <td className="p-2 space-x-2">
                {p.banned ? (
                  <button
                    onClick={() => toggleBan(p.id, false)}
                    className="bg-green-500 px-3 py-1 rounded text-white"
                  >
                    Unban
                  </button>
                ) : (
                  <button
                    onClick={() => toggleBan(p.id, true)}
                    className="bg-red-500 px-3 py-1 rounded text-white"
                  >
                    Ban
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
          className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages || 1}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          disabled={page === totalPages}
          className="px-3 py-1 bg-gray-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
