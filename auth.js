import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
export default function Auth() {
  const signIn = async () => {
    console.log('Starting Google OAuth sign in...')
    try {
      // Use the correct Replit domain without port for redirect
      const redirectUrl = 'https://137c1a6a-0402-4625-8b39-86a82f8ad4bf-00-1zscnblb92yzk.kirk.replit.dev/profile'
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
