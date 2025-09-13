import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function AdminSidebar() {
  const router = useRouter();

  const links = [
    { href: "/admin/manage-users", label: "Users" },
    { href: "/admin/manage-movies", label: "Movies" },
    { href: "/admin/manage-purchases", label: "Purchases" },
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth"); // send back to login
  }

  return (
    <div className="w-56 bg-gray-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-bold mb-6">Admin Panel</h2>
        <ul className="space-y-3">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-3 py-2 rounded ${
                  router.pathname === link.href
                    ? "bg-gray-700 font-semibold"
                    : "hover:bg-gray-700"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Logout button at bottom */}
      <button
        onClick={handleLogout}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded w-full"
      >
        Logout
      </button>
    </div>
  );
}
