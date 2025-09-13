// pages/admin/movies.js
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import AdminSidebar from "../../component/AdminSidebar";
import { isAdmin } from "../../lib/admin";
import { useRouter } from "next/router";

export default function AdminMoviesPage() {
  const [user, setUser] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    id: null,
    title: "",
    description: "",
    year: "",
    genre: "",
    price: "",
    poster: null,
    file: null,
    trailer_url: "",
  });
  const router = useRouter();

  useEffect(() => {
    load();
  }, [router]);

  async function load() {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.push("/auth");
      return;
    }
    const admin = await isAdmin(data.user);
    if (!admin) {
      router.push("/");
      return;
    }
    setUser(data.user);
    fetchMovies();
  }

  async function fetchMovies() {
    const { data, error } = await supabase.from("movies").select("*").order("created_at", { ascending: false });
    if (!error) setMovies(data);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      id: null,
      title: "",
      description: "",
      year: "",
      genre: "",
      price: "",
      poster: null,
      file: null,
      trailer_url: "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // upload poster (optional)
    let posterUrl = null;
    if (form.poster) {
      const posterName = `posters/${Date.now()}_${form.poster.name}`;
      const { error: upErr } = await supabase.storage.from("public").upload(posterName, form.poster);
      if (!upErr) {
        posterUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${posterName}`;
      }
    }

    // upload file to movies bucket
    let filePath = null;
    if (form.file) {
      const ext = form.file.name.split(".").pop();
      const filename = `movies/${Date.now()}.${ext}`;
      const { error: fileErr } = await supabase.storage.from("movies").upload(filename, form.file);
      if (fileErr) {
        alert("Upload error: " + fileErr.message);
        return;
      }
      filePath = filename;
    }

    if (form.id) {
      // update
      const { error } = await supabase
        .from("movies")
        .update({
          title: form.title,
          description: form.description,
          year: Number(form.year),
          genre: form.genre,
          price: Number(form.price),
          poster_url: posterUrl || form.poster_url || null,
          file_path: filePath || form.file_path || null,
          trailer_url: form.trailer_url || null,
        })
        .eq("id", form.id);

      if (error) return alert("Update failed: " + error.message);
      resetForm();
      fetchMovies();
    } else {
      // insert
      const { error } = await supabase.from("movies").insert([
        {
          title: form.title,
          description: form.description,
          year: Number(form.year),
          genre: form.genre,
          price: Number(form.price),
          poster_url: posterUrl,
          file_path: filePath,
          trailer_url: form.trailer_url,
        },
      ]);
      if (error) return alert("Insert failed: " + error.message);
      resetForm();
      fetchMovies();
    }
  }

  async function handleEdit(m) {
    setForm({
      id: m.id,
      title: m.title,
      description: m.description,
      year: m.year,
      genre: m.genre,
      price: m.price,
      poster: null,
      file: null,
      poster_url: m.poster_url,
      file_path: m.file_path,
      trailer_url: m.trailer_url,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Delete movie?")) return;
    const { error } = await supabase.from("movies").delete().eq("id", id);
    if (error) return alert("Delete failed: " + error.message);
    fetchMovies();
  }

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-6 bg-gray-900 min-h-screen text-white">
        <h1 className="text-2xl font-bold mb-4">Manage Movies</h1>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded mb-6 space-y-3">
          <h2 className="text-lg font-semibold">{form.id ? "Edit Movie" : "Add Movie"}</h2>

          <input value={form.title} onChange={(e)=> setForm({...form, title: e.target.value})} placeholder="Title" className="w-full p-2 rounded bg-gray-700 border" required />
          <textarea value={form.description} onChange={(e)=> setForm({...form, description: e.target.value})} placeholder="Description" className="w-full p-2 rounded bg-gray-700 border" required />
          <div className="flex gap-2">
            <input value={form.year} onChange={(e)=> setForm({...form, year: e.target.value})} placeholder="Year" type="number" className="p-2 rounded bg-gray-700 border" required />
            <input value={form.genre} onChange={(e)=> setForm({...form, genre: e.target.value})} placeholder="Genre" className="p-2 rounded bg-gray-700 border" required />
            <input value={form.price} onChange={(e)=> setForm({...form, price: e.target.value})} placeholder="Price" type="number" className="p-2 rounded bg-gray-700 border" required />
          </div>

          <input type="url" value={form.trailer_url} onChange={(e)=> setForm({...form, trailer_url: e.target.value})} placeholder="Trailer embed URL (youtube/iframe link)" className="w-full p-2 rounded bg-gray-700 border" />

          <div className="flex gap-2">
            <label className="block">
              <span className="text-sm text-gray-300">Poster (optional)</span>
              <input type="file" accept="image/*" onChange={(e)=> setForm({...form, poster: e.target.files[0]})} className="mt-1"/>
            </label>

            <label className="block">
              <span className="text-sm text-gray-300">Movie file (.mp4)</span>
              <input type="file" accept="video/*" onChange={(e)=> setForm({...form, file: e.target.files[0]})} className="mt-1"/>
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-red-600 px-4 py-2 rounded">Save</button>
            <button type="button" onClick={resetForm} className="bg-gray-600 px-4 py-2 rounded">Reset</button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {movies.map((m) => (
            <div key={m.id} className="bg-gray-800 p-4 rounded">
              <div className="flex gap-3 items-start">
                <img src={m.poster_url || "/placeholder.jpg"} alt="" className="w-28 h-40 object-cover rounded" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{m.title}</h3>
                  <p className="text-sm text-gray-300">{m.genre} • {m.year}</p>
                  <p className="mt-2 text-sm">${m.price}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={()=> handleEdit(m)} className="bg-blue-600 px-3 py-1 rounded">Edit</button>
                    <button onClick={()=> handleDelete(m.id)} className="bg-red-600 px-3 py-1 rounded">Delete</button>
                    {m.file_path && <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${m.file_path}`} target="_blank" rel="noreferrer" className="text-sm underline">View File</a>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}