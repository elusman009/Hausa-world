// pages/api/flutterwave/callback.js
import { supabase } from "../../../lib/supabase";
import { validateRequestMethod, createErrorResponse } from "../../../lib/api-validation";
import { getRequiredEnvVar } from "../../../lib/env-validation";

export default async function handler(req, res) {
  // Validate request method
  const methodCheck = validateRequestMethod(req, ["GET", "POST"]);
  if (!methodCheck.valid) {
    return createErrorResponse(res, 405, methodCheck.error);
  }

  try {
    // Flutterwave will include transaction_id and status in query or body depending on flow
    const { status, transaction_id, tx_ref, movieId } = req.query;

    // If params missing, show a friendly page or redirect
    if (!tx_ref || !transaction_id) {
      // fallback: check POST body
    }

    // Verify transaction with Flutterwave
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: {
        Authorization: `Bearer ${getRequiredEnvVar('FLW_SECRET_KEY')}`,
      },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData || verifyData.status !== "success") {
      console.error("verify failed", verifyData);
      return res.redirect("/payment-failed");
    }

    const tx = verifyData.data;
    if (tx.status === "successful") {
      // Find purchase by tx_ref and mark paid
      const { error: upErr } = await supabase
        .from("purchases")
        .update({ status: "paid", tx_ref: tx_ref })
        .eq("tx_ref", tx_ref);

      // If no record existed, try insert
      if (upErr) {
        try {
          // Get user by email from profiles table
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", tx.customer?.email)
            .single();
            
          // Get movie details for amount
          const { data: movie } = await supabase
            .from("movies")
            .select("price_kobo")
            .eq("id", movieId || tx.meta?.movieId)
            .single();
            
          await supabase.from("purchases").insert([
            {
              user_id: profile?.id || null,
              movie_id: movieId || tx.meta?.movieId || null,
              amount_kobo: movie?.price_kobo || 0,
              provider: "flutterwave",
              tx_ref,
              status: "paid",
            },
          ]);
        } catch (e) {
          console.error("insert fallback error", e);
        }
      }

      // redirect to payment success page
      return res.redirect("/payment-success");
    }

    return res.redirect("/payment-failed");
  } catch (err) {
    console.error("callback error:", err);
    return res.redirect("/payment-failed");
  }
}
