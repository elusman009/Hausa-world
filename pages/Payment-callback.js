import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function PaymentCallback() {
  const router = useRouter();
  const { transaction_id, status, movieId } = router.query;

  useEffect(() => {
    if (transaction_id && status) {
      handlePayment();
    }
  }, [transaction_id, status]);

  async function handlePayment() {
    if (status === "successful") {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Save purchase in DB
        await supabase.from("purchases").insert({
          user_id: user.id,
          movie_id: movieId,
          payment_ref: transaction_id,
        });

        router.replace("/payment-success");
      } else {
        router.replace("/auth");
      }
    } else {
      router.replace("/payment-failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">Processing payment...</p>
    </div>
  );
}