// pages/movies/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { getSignedUrl } from "../../lib/getsignednurl";

export default function MovieDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState("newest");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Purchase state
  const [showPurchase, setShowPurchase] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    if (id) {
      fetchMovie();
      fetchReviews();
      checkPurchase();
    }
  }, [id, sort]);

  async function fetchMovie() {
    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (!error) setMovie(data);
    setLoading(false);
  }

  async function fetchReviews() {
    let query = supabase.from("reviews").select("*").eq("movie_id", id);

    if (sort === "newest") query = query.order("created_at", { ascending: false });
    if (sort === "oldest") query = query.order("created_at", { ascending: true });
    if (sort === "highest") query = query.order("rating", { ascending: false });
    if (sort === "lowest") query = query.order("rating", { ascending: true });

    const { data, error } = await query;
    if (!error) setReviews(data);
  }

  async function addReview() {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("You must be logged in to leave a review.");
      return;
    }

    const { error } = await supabase.from("reviews").insert([
      {
        movie_id: id,
        user_id: user.id,
        rating,
        comment,
      },
    ]);

    if (!error) {
      setComment("");
      fetchReviews();
    }
  }

  // --- Check if user purchased movie ---
  async function checkPurchase() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("purchases")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("movie_id", id)
      .eq("status", "paid")
      .maybeSingle();

    if (!error && data) {
      setHasPurchased(true);
      if (movie?.file_path) {
        const url = await getSignedUrl(movie.file_path);
        if (url) setDownloadUrl(url);
      }
    }
  }

  // --- Payment logic ---
  async function payWithFlutterwave() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      alert("You must log in first.");
      router.push("/auth");
      return;
    }
    // open checkout API
    window.location.href = `/api/flutterwave/checkout?movieId=${id}`;
  }

  async function submitManualPayment() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert("You must log in first.");
      return;
    }
    if (!proofFile) {
      alert("Please upload proof of payment.");
      return;
    }

    const fileExt = proofFile.name.split(".").pop();
    const filePath = `proofs/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("payment_proofs").upload(filePath, proofFile);
    if (uploadError) return alert("Upload failed: " + uploadError.message);

    const { error } = await supabase.from("purchases").insert([
      {
        user_id: user.id,
        movie_id: id,
        method: "bank_transfer",
        proof_url: filePath,
        status: "pending",
      },
    ]);

    if (!error) {
      alert("Payment proof submitted. Admin will review.");
      setShowPurchase(false);
    }
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (!movie) return <p className="text-center mt-10">Movie not found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4 text-white">
      {/* Poster */}
      {movie.poster_url && (
        <div className="relative w-full max-h-[500px] rounded-lg shadow-lg overflow-hidden">
          <Image 
            src={movie.poster_url} 
            alt={movie.title} 
            width={800}
            height={500}
            className="w-full object-cover rounded-lg" 
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      )}

      {/* Details */}
      <div className="mt-6">
        <h1 className="text-3xl font-bold">{movie.title}</h1>
        <p className="text-gray-400 mt-1">{movie.genre} • {movie.year}</p>
        <p className="mt-4 text-gray-200">{movie.description}</p>

        {/* Buy or Download */}
        <div className="mt-6">
          {hasPurchased && downloadUrl ? (
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
              Download Movie
            </a>
          ) : (
            <button onClick={() => setShowPurchase(true)} className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
              Buy & Download (₦{(movie.price_kobo / 100).toFixed(2)})
            </button>
          )}
        </div>

        {/* Trailer */}
        {movie.trailer_url && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Trailer</h2>
            <iframe className="w-full h-64 md:h-96 rounded-lg" src={movie.trailer_url} title={`${movie.title} Trailer`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
      </div>

      {/* Reviews */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-3">Reviews</h2>
        <p className="text-gray-400 mb-4">⭐ Average Rating: {avgRating}</p>
        <div className="mb-4">
          <label className="mr-2 font-semibold">Sort by:</label>
          <select value={sort} onChange={(e)=> setSort(e.target.value)} className="border px-2 py-1 rounded">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>

        {/* Add Review */}
        <div className="mb-6">
          <h3 className="font-semibold">Leave a Review</h3>
          <div className="flex items-center gap-2 mt-2">
            <label>Rating:</label>
            <select value={rating} onChange={(e)=> setRating(Number(e.target.value))} className="border rounded px-2 py-1">
              {[5,4,3,2,1].map((r)=> <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <textarea value={comment} onChange={(e)=> setComment(e.target.value)} placeholder="Write your review..." className="w-full border rounded mt-2 p-2"></textarea>
          <button onClick={addReview} className="bg-blue-600 text-white px-4 py-2 mt-2 rounded hover:bg-blue-700">Submit Review</button>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          {reviews.length === 0 ? <p>No reviews yet.</p> : reviews.map((review)=> (
            <div key={review.id} className="border p-3 rounded shadow-sm bg-gray-50 text-black">
              <p className="font-semibold">⭐ {review.rating}</p>
              <p>{review.comment}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(review.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchase && !hasPurchased && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Buy {movie.title} (${movie.price})</h2>
            <button onClick={payWithFlutterwave} className="w-full bg-green-600 text-white py-2 rounded mb-3 hover:bg-green-700">Pay with Flutterwave</button>

            <div className="border-t pt-3 mt-3">
              <h3 className="font-semibold mb-2">Manual Bank Transfer</h3>
              <input type="file" accept="image/*" onChange={(e)=> setProofFile(e.target.files[0])} className="mb-3" />
              <button onClick={submitManualPayment} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Proof</button>
            </div>

            <button onClick={()=> setShowPurchase(false)} className="w-full bg-gray-400 text-white py-2 rounded mt-4 hover:bg-gray-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
