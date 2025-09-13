import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function MovieBoxNavbar() {
  const [user, setUser] = useState(null);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchPurchaseCount(user.id);
        subscribeToPurchases(user.id);
      }
    });

    // listen for login/logout changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (newUser) {
          fetchPurchaseCount(newUser.id);
          subscribeToPurchases(newUser.id);
        } else {
          setPurchaseCount(0);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function fetchPurchaseCount(userId) {
    const { count, error } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid");

    if (!error) setPurchaseCount(count || 0);
  }

  function subscribeToPurchases(userId) {
    supabase
      .channel("purchases-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "purchases",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchPurchaseCount(userId) // refresh count on change
      )
      .subscribe();
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="bg-gradient-to-r from-black to-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Language Selector */}
        <div className="flex items-center justify-between py-2 border-b border-gray-800">
          <div className="flex items-center space-x-2 text-sm text-white/80">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.07692 11.1529C8.88077 11.1529 11.1538 8.87979 11.1538 6.07595C11.1538 3.2721 8.88077 0.999023 6.07692 0.999023M6.07692 11.1529C3.27308 11.1529 1 8.87979 1 6.07595C1 3.2721 3.27308 0.999023 6.07692 0.999023M6.07692 11.1529C7.46154 11.1529 7.92308 8.84518 7.92308 6.07595C7.92308 3.30672 7.46154 0.999023 6.07692 0.999023M6.07692 11.1529C4.69231 11.1529 4.23077 8.84518 4.23077 6.07595C4.23077 3.30672 4.69231 0.999023 6.07692 0.999023M1.46154 7.9221H10.6923M1.46154 4.22979H10.6923" stroke="white" strokeOpacity="0.8"/>
            </svg>
            <span>ENGLISH</span>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 5.5L7 2.5H1L4 5.5Z" fill="white" fillOpacity="0.8"/>
            </svg>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-green-400 rounded"></div>
              <span className="text-xl font-bold">Hausaworld</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.pathname === '/' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Home</span>
              </Link>
              <Link href="/movies?type=tv" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.query.type === 'tv' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">TV show</span>
              </Link>
              <Link href="/movies" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.pathname === '/movies' && !router.query.type && !router.query.category && !router.query.sort ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Movie</span>
              </Link>
              <Link href="/movies?category=animation" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.query.category === 'animation' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Animation</span>
              </Link>
              <Link href="/movies?type=live" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.query.type === 'live' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Sport Live</span>
              </Link>
              <Link href="/movies?category=novel" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.query.category === 'novel' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Novel</span>
                <span className="bg-red-500 text-xs px-1 rounded">HOT</span>
              </Link>
              <Link href="/movies?sort=most-watched" className={`flex items-center space-x-2 hover:text-cyan-400 transition-colors ${router.query.sort === 'most-watched' ? 'text-white' : 'text-white/60'}`}>
                <span className="text-sm font-medium">Most Watched</span>
              </Link>
            </div>
          </div>

          {/* Right side with search and user menu */}
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button type="submit" className="absolute right-3 top-2.5">
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link href="/my-purchases" className="relative flex items-center text-white/60 hover:text-cyan-400 text-sm">
                    My Purchases
                    {purchaseCount > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {purchaseCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/profile" className="text-white/60 hover:text-cyan-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <Link href="/admin" className="text-white/60 hover:text-cyan-400 text-sm">
                    Admin
                  </Link>
                  <button
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setUser(null);
                      setPurchaseCount(0);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/auth" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                  Login
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden text-white/60 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 w-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <button type="submit" className="absolute right-3 top-2.5">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
              
              <div className="space-y-2">
                <Link href="/" className={`block py-2 hover:text-cyan-400 transition-colors ${router.pathname === '/' ? 'text-white' : 'text-white/60'}`}>Home</Link>
                <Link href="/movies?type=tv" className={`block py-2 hover:text-cyan-400 transition-colors ${router.query.type === 'tv' ? 'text-white' : 'text-white/60'}`}>TV show</Link>
                <Link href="/movies" className={`block py-2 hover:text-cyan-400 transition-colors ${router.pathname === '/movies' && !router.query.type && !router.query.category && !router.query.sort ? 'text-white' : 'text-white/60'}`}>Movie</Link>
                <Link href="/movies?category=animation" className={`block py-2 hover:text-cyan-400 transition-colors ${router.query.category === 'animation' ? 'text-white' : 'text-white/60'}`}>Animation</Link>
                <Link href="/movies?type=live" className={`block py-2 hover:text-cyan-400 transition-colors ${router.query.type === 'live' ? 'text-white' : 'text-white/60'}`}>Sport Live</Link>
                <Link href="/movies?category=novel" className={`flex items-center justify-between py-2 hover:text-cyan-400 transition-colors ${router.query.category === 'novel' ? 'text-white' : 'text-white/60'}`}>
                  <span>Novel</span>
                  <span className="bg-red-500 text-xs px-1 rounded">HOT</span>
                </Link>
                <Link href="/movies?sort=most-watched" className={`block py-2 hover:text-cyan-400 transition-colors ${router.query.sort === 'most-watched' ? 'text-white' : 'text-white/60'}`}>Most Watched</Link>
                
                {/* User-specific sections */}
                <div className="border-t border-gray-800 pt-2 mt-2">
                  {user ? (
                    <>
                      <Link href="/my-purchases" className="flex items-center justify-between text-white/60 hover:text-cyan-400 py-2">
                        <span>My Purchases</span>
                        {purchaseCount > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {purchaseCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/profile" className="block text-white/60 hover:text-cyan-400 py-2">Profile</Link>
                      <Link href="/admin" className="block text-white/60 hover:text-cyan-400 py-2">Admin</Link>
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          setUser(null);
                          setPurchaseCount(0);
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm transition-colors mt-2"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link href="/auth" className="block bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm transition-colors text-center">
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
