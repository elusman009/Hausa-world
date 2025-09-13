import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import MovieBoxNavbar from "../../component/nav";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      fetchMovies();
    }
  }, [router.isReady, router.query]);

  async function fetchMovies() {
    setLoading(true);
    const { type, category, sort } = router.query;
    
    let query = supabase.from("movies").select("*");

    // Apply filters based on query parameters
    if (type === "tv") {
      query = query.ilike("genre", "%TV%");
    } else if (type === "live") {
      query = query.ilike("genre", "%Sport%");
    }
    
    if (category === "animation") {
      query = query.ilike("genre", "%Animation%");
    } else if (category === "novel") {
      query = query.ilike("genre", "%Novel%");
    }

    // Apply sorting
    if (sort === "most-watched") {
      query = query.order("rating", { ascending: false });
    } else {
      query = query.order("year", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching movies:", error);
      setMovies([]);
    } else {
      setMovies(data || []);
    }
    setLoading(false);
  }

  // Get section title based on query parameters
  function getSectionTitle() {
    const { type, category, sort } = router.query;
    
    if (type === "tv") return "TV Shows";
    if (type === "live") return "Sport Live";
    if (category === "animation") return "Animation Movies";
    if (category === "novel") return "Novel Adaptations";
    if (sort === "most-watched") return "Most Watched";
    return "All Movies";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <MovieBoxNavbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({length: 12}).map((_, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg aspect-[2/3] animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <MovieBoxNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">{getSectionTitle()}</h1>
          <div className="text-sm text-white/60">
            {movies.length} movies available
          </div>
        </div>
        
        {movies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2H5a1 1 0 110-2h3zm3 5a1 1 0 012 0v8a1 1 0 01-2 0V9z" />
              </svg>
              <p className="text-lg">No movies available yet</p>
              <p className="text-sm">Check back later or contact admin to add movies</p>
            </div>
            <Link href="/admin/movies" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-colors">
              Add Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg bg-gray-900 aspect-[2/3] hover:scale-105 transition-transform duration-300">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2H5a1 1 0 110-2h3zm3 5a1 1 0 012 0v8a1 1 0 01-2 0V9z" />
                        </svg>
                        <span className="text-xs text-gray-600">No Poster</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <h3 className="font-semibold text-sm truncate">{movie.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-white/70">{movie.genre} • {movie.year}</span>
                        {movie.rating && (
                          <div className="flex items-center space-x-1">
                            <span className="text-orange-400">⭐</span>
                            <span className="text-xs text-white/70">{movie.rating}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded-full">₦{(movie.price_kobo / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}