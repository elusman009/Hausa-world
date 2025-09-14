import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import { ensureProfile } from '../../lib/profileUtils'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First: Exchange the OAuth code for a session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(window.location.href)
        
        if (sessionError) {
          console.error('Session exchange error:', sessionError.message)
          router.push('/auth?error=session_failed')
          return
        }

        // Second: Get the session (should now exist)
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth error:', error.message)
          router.push('/auth?error=auth_failed')
          return
        }

        if (data.session) {
          // User successfully logged in - ensure profile exists
          try {
            await ensureProfile(data.session.user)
          } catch (error) {
            console.error('Error ensuring profile:', error)
            // Continue anyway - profile might exist from database trigger
          }
          router.push('/profile')
        } else {
          console.log('No session after code exchange')
          router.push('/auth')
        }
      } catch (error) {
        console.error('Callback error:', error)
        router.push('/auth?error=callback_failed')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing your login...</p>
      </div>
    </div>
  )
}
