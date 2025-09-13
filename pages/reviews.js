import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isAdmin } from "../../lib/admin";
import { useRouter } from "next/router";

export default function ManageReviews() {
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
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

      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("id, user_id, movie_id, rating, comment, created_at")
        .order("created_at", { ascending: false });

      if (!error) setReviews(reviews);
      setLoading(false);
    }
    load();
  }, [router]);

  async function deleteReview(id) {
    await supabase.from("reviews").delete().eq("id", id);
    setReviews(reviews.filter((r) => r.id !== id));
  }

  if (loading) return <p className="text-center">Loading...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Moderate Reviews</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2">User</th>
            <th className="p-2">Movie</th>
            <th className="p-2">Rating</th>
            <th className="p-2">Comment</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{r.user_id}</td>
              <td className="p-2">{r.movie_id}</td>
              <td className="p-2">{r.rating}</td>
              <td className="p-2">{r.comment}</td>
              <td className="p-2">
                <button
                  onClick={() => deleteReview(r.id)}
                  className="bg-red-500 px-3 py-1 rounded text-white"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}