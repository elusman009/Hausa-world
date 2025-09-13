import Link from "next/link";

export default function PaymentFailed() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white shadow-lg rounded-xl p-8 text-center max-w-md">
        <div className="text-red-600 text-6xl mb-4">✕</div>
        <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-6">
          Oops! Something went wrong and your payment could not be completed.  
          Please try again or choose another method.
        </p>
        <Link
          href="/"
          className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}