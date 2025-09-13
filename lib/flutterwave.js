// lib/flutterwave.js
export const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

export function getFlutterwaveConfig(user, movie) {
  return {
    public_key: FLW_PUBLIC_KEY,
    tx_ref: `${user.id}-${movie.id}-${Date.now()}`,
    amount: movie.price,
    currency: "USD",
    payment_options: "card, banktransfer",
    customer: {
      email: user.email,
      name: user.full_name || "User",
    },
    customizations: {
      title: "Movie Purchase",
      description: `Buying ${movie.title}`,
      logo: "/logo.png",
    },
    redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-callback?movieId=${movie.id}`,
  };
}