import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
export default function Auth() {
  const signIn = async () => {
    console.log('Starting Google OAuth sign in...')
    try {
      // Dynamic redirect URL that works in both Replit and Vercel
      const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
          // Client-side: use current origin for auth callback
          return `${window.location.origin}/auth/callback`
        }
        // Server-side fallback
        if (process.env.REPLIT_DEV_DOMAIN) {
          return `https://${process.env.REPLIT_DEV_DOMAIN}/auth/callback`
        }
        if (process.env.VERCEL_URL) {
          return `https://${process.env.VERCEL_URL}/auth/callback`
        }
        // Production domain fallback
        return `https://hausaworld.vercel.app/auth/callback`
      }
      
      const redirectUrl = getRedirectUrl()
      console.log('Redirect URL:', redirectUrl)
      
      const result = await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo: redirectUrl } 
      })
      console.log('OAuth result:', result)
    } catch (error) {
      console.error('OAuth error:', error)
    }
  }
  return (
    <div className="container pt-24">
      <div className="card p-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Login</h2>
        <button className="btn-primary mt-4 w-full" onClick={signIn}>Continue with Google</button>
      </div>
    </div>
  )
}
