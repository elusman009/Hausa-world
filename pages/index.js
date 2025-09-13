import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import MovieBoxNavbar from "../component/nav";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Get search query from URL if present
    const { q } = router.query;
    if (q) {
      setSearchQuery(q);
    }
  }, [router.query]);

  useEffect(() => {
    fetchMovies();
  }, [refreshKey]);

  // Set initial timestamp on client side only to avoid hydration mismatch
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  async function fetchMovies() {
    setLoading(true);
    
    // Force fresh data by adding a timestamp to break any caching
    const timestamp = Date.now();
    
    let query = supabase
      .from("movies")
      .select("*")
      .order("year", { ascending: false });

    if (searchQuery) {
      query = query.ilike("title", `%${searchQuery}%`);
    }
    if (selectedGenre) {
      query = query.ilike("genre", `%${selectedGenre}%`);
    }
    if (selectedYear) {
      query = query.eq("year", Number(selectedYear));
    }
    if (selectedRating) {
      query = query.gte("rating", Number(selectedRating));
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching movies:", error);
      setMovies([]);
    } else {
      console.log(`Fresh movie data fetched at ${timestamp}:`, data);
      setMovies(data || []);
      setLastUpdated(new Date().toLocaleTimeString());
    }
    setLoading(false);
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMovies();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedGenre, selectedYear, selectedRating]);

  const genres = ["Action", "Comedy", "Drama", "Horror", "Romance", "Thriller", "Sci-Fi", "Animation"];
  const years = Array.from({length: 10}, (_, i) => 2025 - i);
  const ratings = [
    { value: "9", label: "9+ ⭐ Excellent" },
    { value: "8", label: "8+ ⭐ Very Good" },
    { value: "7", label: "7+ ⭐ Good" },
    { value: "6", label: "6+ ⭐ Decent" },
    { value: "5", label: "5+ ⭐ Average" }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Home - Hausaworld | Latest Movies & Trending Content</title>
        <meta name="description" content="Browse the latest movies and trending content on Hausaworld. Filter by genre, year, and rating to find your perfect movie. Premium streaming with secure payments." />
        <meta property="og:title" content="Home - Hausaworld | Latest Movies & Trending Content" />
        <meta property="og:description" content="Browse the latest movies and trending content on Hausaworld. Filter by genre, year, and rating to find your perfect movie. Premium streaming with secure payments." />
        <meta name="keywords" content="movies, streaming, hausaworld, latest movies, trending movies, movie platform" />
      </Head>
      <MovieBoxNavbar />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-8">
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">All Genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre} className="bg-gray-900">{genre}</option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">All Years</option>
            {years.map(year => (
              <option key={year} value={year} className="bg-gray-900">{year}</option>
            ))}
          </select>

          <select
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="">All Ratings</option>
            {ratings.map(rating => (
              <option key={rating.value} value={rating.value} className="bg-gray-900">{rating.label}</option>
            ))}
          </select>

          <div className="text-sm text-white/60">
            {movies.length} movies found
          </div>
        </div>

        {/* Refresh Button for Replit caching issues */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              setRefreshKey(Date.now());
              setMovies([]);
              setLoading(true);
            }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            🔄 Refresh Movies
          </button>
          <div className="text-sm text-white/60">
            {lastUpdated && `Last updated: ${lastUpdated}`}
          </div>
        </div>

        {/* Trending Section */}
        <section className="mb-12" key={refreshKey}>
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-2">
            <span>Trending Now</span>
            <span className="text-orange-500">🔥</span>
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({length: 12}).map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-lg aspect-[2/3] animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movies.slice(0, 12).map((movie) => (
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
                          <span className="text-xs text-white/70">{movie.year}</span>
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
        </section>

        {/* All Movies Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Latest Movies</h2>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({length: 18}).map((_, i) => (
                <div key={i} className="bg-gray-900/50 rounded-lg aspect-[2/3] animate-pulse"></div>
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2H5a1 1 0 110-2h3zm3 5a1 1 0 012 0v8a1 1 0 01-2 0V9z" />
                </svg>
                <p className="text-lg">No movies found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
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
        </section>
      </div>

      {/* Footer Quick Access */}
      <div className="bg-gray-900 border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/profile" className="text-white/60 hover:text-cyan-400 text-sm">Profile</Link>
              <Link href="/my-purchases" className="text-white/60 hover:text-cyan-400 text-sm">My Purchases</Link>
              <Link href="/admin" className="text-white/60 hover:text-cyan-400 text-sm">Admin</Link>
            </div>
            <div className="text-sm text-white/40">
              © 2025 Hausaworld. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
