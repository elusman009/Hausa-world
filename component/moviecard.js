import Link from "next/link";
import Image from "next/image";

export default function MovieCard({ movie }) {
  return (
    <div className="border rounded-lg shadow hover:shadow-lg transition p-3 bg-white">
      {/* Poster */}
      {movie.poster_url ? (
        <div className="relative w-full h-48">
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover rounded"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gray-200 flex items-center justify-center rounded">
          <span className="text-gray-500">No Poster</span>
        </div>
      )}

      <div className="mt-3">
        <h3 className="font-semibold text-lg">{movie.title}</h3>
        <p className="text-sm text-gray-600">{movie.genre}</p>
        <p className="font-bold mt-1">₦{(movie.price_kobo / 100).toFixed(2)}</p>

        <Link
          href={`/movies/${movie.id}`}
          className="block mt-2 text-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
