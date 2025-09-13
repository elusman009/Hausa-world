// Admin Supabase client with service role key
// Use this for server-side operations that need elevated permissions

import { createClient } from '@supabase/supabase-js'

// This client bypasses RLS and has full database access
// Only use on the server side for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper functions for common admin operations
export const adminOperations = {
  // Get all users
  async getAllUsers() {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    return { data, error }
  },

  // Update user role
  async updateUserRole(userId, role) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    return { data, error }
  },

  // Get all movies (admin view)
  async getAllMovies() {
    const { data, error } = await supabaseAdmin
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Create movie with file upload
  async createMovie(movieData) {
    const { data, error } = await supabaseAdmin
      .from('movies')
      .insert([movieData])
      .select()
    return { data: data?.[0], error }
  },

  // Update movie
  async updateMovie(movieId, updates) {
    const { data, error } = await supabaseAdmin
      .from('movies')
      .update(updates)
      .eq('id', movieId)
      .select()
    return { data: data?.[0], error }
  },

  // Get all purchases
  async getAllPurchases() {
    const { data, error } = await supabaseAdmin
      .from('purchases')
      .select(`
        *,
        movies(title, genre),
        profiles(email, full_name)
      `)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Update purchase status
  async updatePurchaseStatus(purchaseId, status) {
    const { data, error } = await supabaseAdmin
      .from('purchases')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', purchaseId)
      .select()
    return { data: data?.[0], error }
  },

  // Get storage file info
  async getFileInfo(bucket, filePath) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(filePath)
    return { data, error }
  },

  // Generate signed URL for private files
  async getSignedUrl(bucket, filePath, expiresIn = 3600) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)
    return { data, error }
  },

  // Delete file from storage
  async deleteFile(bucket, filePath) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath])
    return { data, error }
  }
}

export default supabaseAdmin