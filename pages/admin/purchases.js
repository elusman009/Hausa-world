import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isAdmin } from "../../lib/admin";
import { useRouter } from "next/router";

export default function ManagePurchases() {
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

      const { data: purchases, error } = await supabase
        .from("purchases")
        .select(
          `id, status, proof_url, created_at,
           profiles(email), 
           movies(title)`
        )
        .order("created_at", { ascending: false });

      if (!error) setPurchases(purchases);
      setLoading(false);
    }
    load();
  }, [router]);

  async function updateStatus(id, status) {
    await supabase.from("purchases").update({ status }).eq("id", id);
    setPurchases(
      purchases.map((p) => (p.id === id ? { ...p, status } : p))
    );
  }

  const filtered = purchases.filter((p) => {
    const email = p.profiles?.email?.toLowerCase() || "";
    const movie = p.movies?.title?.toLowerCase() || "";
    const matchSearch =
      email.includes(search.toLowerCase()) ||
      movie.includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "all" ? true : p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manage Purchases</h1>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by user email or movie title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded w-1/2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Purchases Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2">User</th>
            <th className="p-2">Movie</th>
            <th className="p-2">Status</th>
            <th className="p-2">Proof</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.profiles?.email || "Unknown"}</td>
              <td className="p-2">{p.movies?.title || "Unknown"}</td>
              <td className="p-2 capitalize">{p.status}</td>
              <td className="p-2">
                {p.proof_url ? (
                  <a
                    href={p.proof_url}
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    View Proof
                  </a>
                ) : (
                  "N/A"
                )}
              </td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => updateStatus(p.id, "paid")}
                  className="bg-green-500 px-3 py-1 rounded text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateStatus(p.id, "rejected")}
                  className="bg-red-500 px-3 py-1 rounded text-white"
                >
                  Reject
                </button>
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