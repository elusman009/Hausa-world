import { supabase } from "./supabase";

export async function isAdmin(user) {
  if (!user?.email) {
    console.log("No user email found");
    return false;
  }

  // Temporary fix: hard-code your admin email to test functionality
  const tempAdminEmails = ["elusman009@gmail.com"];
  
  // Also try reading from env variable
  const envAdminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);

  const adminEmails = envAdminEmails.length > 0 ? envAdminEmails : tempAdminEmails;

  console.log("Checking admin access for:", user.email);
  console.log("Admin emails configured:", adminEmails);
  console.log("Raw ADMIN_EMAILS:", process.env.ADMIN_EMAILS);

  const isUserAdmin = adminEmails.includes(user.email.toLowerCase());
  console.log("Is user admin?", isUserAdmin);

  return isUserAdmin;
}
