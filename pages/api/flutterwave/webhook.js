// pages/api/flutterwave/webhook.js
import { supabase } from "../../../lib/supabase";
import { 
  validateRequestMethod, 
  validateFlutterwaveWebhook, 
  createErrorResponse 
} from "../../../lib/api-validation";

export default async function handler(req, res) {
  // Validate request method
  const methodCheck = validateRequestMethod(req, ["POST"]);
  if (!methodCheck.valid) {
    return createErrorResponse(res, 405, methodCheck.error);
  }

  // Validate webhook signature
  const webhookCheck = validateFlutterwaveWebhook(req);
  if (!webhookCheck.valid) {
    console.warn(`Webhook validation failed: ${webhookCheck.error}`);
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;
  // Flutterwave posts events; check event names
  try {
    if (event.event === "charge.completed" && event.data?.status === "successful") {
      const tx = event.data;
      const tx_ref = tx.tx_ref;
      const email = tx.customer?.email;
      // Get user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();

      const user_id = profile?.id || null;

      // Try find existing purchase by tx_ref
      const { data: existing } = await supabase
        .from("purchases")
        .select("*")
        .eq("tx_ref", tx_ref)
        .maybeSingle();

      if (existing) {
        await supabase.from("purchases").update({ status: "paid" }).eq("tx_ref", tx_ref);
      } else {
        // fallback: attempt insert
        // Get movie details for amount
        const movieId = tx.meta?.movieId;
        const { data: movie } = movieId ? await supabase
          .from("movies")
          .select("price_kobo")
          .eq("id", movieId)
          .single() : { data: null };
          
        await supabase.from("purchases").insert([
          {
            user_id,
            movie_id: movieId || null,
            amount_kobo: movie?.price_kobo || 0,
            provider: "flutterwave",
            status: "paid",
            tx_ref,
          },
        ]);
      }

      return res.status(200).send("ok");
    }
    return res.status(200).send("ignored");
  } catch (e) {
    console.error("webhook error", e);
    return createErrorResponse(res, 500, "Webhook processing failed", e.message);
  }
}