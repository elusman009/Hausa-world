// pages/api/flutterwave/checkout.js
import { supabase } from "../../../lib/supabase";
import { 
  validateRequestMethod, 
  validateUUID, 
  createErrorResponse, 
  validateUserAuthentication
} from "../../../lib/api-validation";
import { getRequiredEnvVar, validateBackendEnvironment, getBaseUrl } from "../../../lib/env-validation";

export default async function handler(req, res) {
  // Validate request method
  const methodCheck = validateRequestMethod(req, ["GET"]);
  if (!methodCheck.valid) {
    return createErrorResponse(res, 405, methodCheck.error);
  }

  // Validate backend environment
  const envCheck = validateBackendEnvironment();
  if (!envCheck.isValid) {
    return createErrorResponse(res, 500, "Payment service configuration error");
  }

  try {
    // Validate and sanitize input
    const { movieId } = req.query;
    if (!movieId) {
      return createErrorResponse(res, 400, "Missing movieId parameter");
    }
    
    if (!validateUUID(movieId)) {
      return createErrorResponse(res, 400, "Invalid movieId format");
    }

    // Validate user authentication
    const authCheck = await validateUserAuthentication(supabase, req);
    if (!authCheck.valid) {
      return createErrorResponse(res, 401, authCheck.error);
    }
    const user = authCheck.user;

    // Fetch movie
    const { data: movie, error: mErr } = await supabase
      .from("movies")
      .select("*")
      .eq("id", movieId)
      .single();
    if (mErr || !movie) return res.status(404).json({ error: "Movie not found" });

    // Convert kobo to naira for Flutterwave (price_kobo is stored in kobo/cents)
    const amountInNaira = (movie.price_kobo / 100).toFixed(2);
    
    // Prepare Flutterwave payment initialization payload
    const tx_ref = `movie-${movie.id}-${user.id}-${Date.now()}`;

    const body = {
      tx_ref,
      amount: String(amountInNaira),
      currency: "NGN",
      redirect_url: `${getBaseUrl()}/api/flutterwave/callback?movieId=${movie.id}&tx_ref=${tx_ref}`,
      customer: {
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      },
      customizations: {
        title: "Movie Purchase",
        description: `Purchase: ${movie.title}`,
      },
      meta: {
        movieId: movie.id
      },
    };

    const fwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getRequiredEnvVar('FLW_SECRET_KEY')}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await fwRes.json();

    if (!data || data.status !== "success") {
      console.error("Flutterwave init error:", data);
      return createErrorResponse(res, 500, "Payment initialization failed", data);
    }

    // Insert a pending purchase record with tx_ref (helps reconcile later)
    await supabase.from("purchases").insert([
      {
        user_id: user.id,
        movie_id: movie.id,
        amount_kobo: movie.price_kobo,
        provider: "flutterwave",
        tx_ref,
        status: "pending",
      },
    ]);

    // Redirect to hosted checkout
    return res.redirect(data.data.link);
  } catch (err) {
    console.error("checkout error:", err);
    return createErrorResponse(res, 500, "Payment checkout failed", err.message);
  }
}