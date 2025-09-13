// pages/dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getSignedUrl } from "../lib/getsignednurl";

export default function Dashboard() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      // redirect to auth or show message
      return;
    }

    const { data, error } = await supabase
      .from("purchases")
      .select("id, status, created_at, movies (id, title, file_path, poster_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setPurchases(data);
    }
    setLoading(false);
  }

  async function handleDownload(filePath) {
    const url = await getSignedUrl(filePath);
    if (url) window.open(url, "_blank");
    else alert("Could not create download link.");
  }

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Purchases</h1>
      {purchases.length === 0 && <p>No purchases yet.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {purchases.map((p) => (
          <div key={p.id} className="bg-gray-800 p-4 rounded text-white">
            <h3 className="font-semibold">{p.movies?.title}</h3>
            <p className="text-sm text-gray-400">Status: {p.status}</p>
            <p className="text-sm text-gray-400">Bought: {new Date(p.created_at).toLocaleString()}</p>
            {p.status === "paid" && p.movies?.file_path && (
              <button onClick={() => handleDownload(p.movies.file_path)} className="mt-3 bg-green-600 px-4 py-2 rounded">
                Download
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}