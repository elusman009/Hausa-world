import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import MovieBoxNavbar from "../component/nav";

export default function MyPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("You must log in to view purchases.");
      return;
    }

    const { data, error } = await supabase
      .from("purchases")
      .select("id, status, created_at, movies (title, file_url, price)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setPurchases(data);
    setLoading(false);
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />
      <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Purchases</h1>

      {purchases.length === 0 ? (
        <p>You have no purchases yet.</p>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="border rounded-lg p-4 shadow-sm bg-gray-50"
            >
              <h2 className="text-xl font-semibold">
                {purchase.movies?.title || "Unknown Movie"}
              </h2>
              <p className="text-gray-600">
                Purchased on:{" "}
                {new Date(purchase.created_at).toLocaleDateString()}
              </p>
              <p className="text-gray-600">Price: ${purchase.movies?.price}</p>
              <p className="mt-2">
                <span
                  className={`px-2 py-1 rounded text-white ${
                    purchase.status === "paid"
                      ? "bg-green-600"
                      : purchase.status === "pending"
                      ? "bg-yellow-500"
                      : "bg-red-600"
                  }`}
                >
                  {purchase.status}
                </span>
              </p>

              {purchase.status === "paid" && purchase.movies?.file_url && (
                <a
                  href={
                    supabase.storage
                      .from("movies")
                      .getPublicUrl(purchase.movies.file_url).data.publicUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Download Movie
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}