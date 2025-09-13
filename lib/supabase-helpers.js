// Helper functions for common Supabase operations
// These work with the regular client and respect RLS policies

import { supabase } from './supabase'

// Movie operations
export const movieHelpers = {
  // Get all movies with pagination and filters
  async getMovies({ 
    page = 1, 
    limit = 20, 
    genre, 
    year, 
    rating, 
    search,
    trending = false 
  } = {}) {
    let query = supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (genre) query = query.eq('genre', genre)
    if (year) query = query.eq('year', year)
    if (rating) query = query.gte('rating', rating)
    if (search) query = query.ilike('title', `%${search}%`)
    if (trending) query = query.eq('is_trending', true)

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    return { data, error, count }
  },

  // Get single movie by ID
  async getMovieById(id) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Get trending movies
  async getTrendingMovies(limit = 12) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('is_trending', true)
      .limit(limit)
      .order('rating', { ascending: false })
    return { data, error }
  },

  // Search movies
  async searchMovies(query, limit = 20) {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,genre.ilike.%${query}%`)
      .limit(limit)
      .order('rating', { ascending: false })
    return { data, error }
  }
}

// User operations
export const userHelpers = {
  // Get current user profile
  async getCurrentUserProfile() {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { data: null, error: authError }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    return { data, error }
  },

  // Update user profile
  async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
    return { data: data?.[0], error }
  },

  // Check if user is admin
  async isAdmin() {
    const { data } = await this.getCurrentUserProfile()
    return data?.role === 'admin'
  }
}

// Purchase operations
export const purchaseHelpers = {
  // Get user purchases
  async getUserPurchases() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: null }

    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        movies(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Check if user purchased movie
  async hasPurchased(movieId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('movie_id', movieId)
      .eq('status', 'paid')
      .single()
    
    return !error && !!data
  },

  // Create purchase record
  async createPurchase(movieId, amount_kobo, provider = 'flutterwave', tx_ref = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('purchases')
      .insert([{
        movie_id: movieId,
        user_id: user.id,
        amount_kobo,
        provider,
        tx_ref,
        status: 'pending'
      }])
      .select()
    return { data: data?.[0], error }
  }
}

// Review operations
export const reviewHelpers = {
  // Get movie reviews
  async getMovieReviews(movieId, { sort = 'newest', limit = 50 } = {}) {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('movie_id', movieId)
      .limit(limit)

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'highest':
        query = query.order('rating', { ascending: false })
        break
      case 'lowest':
        query = query.order('rating', { ascending: true })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query
    return { data, error }
  },

  // Add review
  async addReview(movieId, rating, comment) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        movie_id: movieId,
        user_id: user.id,
        rating,
        comment
      }])
      .select()
    return { data: data?.[0], error }
  },

  // Update review
  async updateReview(reviewId, rating, comment) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('reviews')
      .update({ rating, comment })
      .eq('id', reviewId)
      .eq('user_id', user.id) // Ensure user owns the review
      .select()
    return { data: data?.[0], error }
  },

  // Delete review
  async deleteReview(reviewId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: { message: 'Not authenticated' } }

    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id) // Ensure user owns the review
    return { data, error }
  }
}

// File operations
export const fileHelpers = {
  // Upload file to storage
  async uploadFile(bucket, file, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file)
    return { data, error }
  },

  // Get public URL
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Get signed URL (for private files)
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    return { data, error }
  },

  // Delete file
  async deleteFile(bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path])
    return { data, error }
  }
}

// Real-time operations
export const realtimeHelpers = {
  // Subscribe to new movies
  subscribeToMovies(callback) {
    return supabase
      .channel('movies-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'movies'
      }, callback)
      .subscribe()
  },

  // Subscribe to user purchases
  subscribeToUserPurchases(userId, callback) {
    return supabase
      .channel(`purchases-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchases',
        filter: `user_id=eq.${userId}`
      }, callback)
      .subscribe()
  },

  // Subscribe to movie reviews
  subscribeToMovieReviews(movieId, callback) {
    return supabase
      .channel(`reviews-${movieId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reviews',
        filter: `movie_id=eq.${movieId}`
      }, callback)
      .subscribe()
  }
}

// Utility functions
export const utils = {
  // Format price from kobo to naira
  formatPrice(priceKobo) {
    return `₦${(priceKobo / 100).toFixed(2)}`
  },

  // Format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString()
  },

  // Generate movie slug
  generateSlug(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  },

  // Validate email
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  },

  // Check if user is admin based on email
  isAdminEmail(email) {
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    return adminEmails.includes(email)
  }
}