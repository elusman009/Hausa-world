import { NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    // Refresh session to ensure it's valid
    const { data: { session }, error } = await supabase.auth.getSession();
    const url = req.nextUrl.clone();
    
    // Handle admin routes
    if (url.pathname.startsWith('/admin')) {
      if (error || !session?.user?.email) {
        console.log('Admin access denied: No valid session');
        return NextResponse.redirect(new URL('/auth', req.url));
      }
      
      // Require ADMIN_EMAILS environment variable to be set
      const adminEmails = process.env.ADMIN_EMAILS;
      if (!adminEmails) {
        console.error('ADMIN_EMAILS environment variable is not configured');
        return NextResponse.redirect(new URL('/auth?error=admin_config', req.url));
      }
      
      const allowed = adminEmails.split(',').map(s => s.trim()).filter(Boolean);
      
      if (!allowed.includes(session.user.email)) {
        console.log(`Admin access denied for email: ${session.user.email}`);
        return NextResponse.redirect(new URL('/?error=admin_access', req.url));
      }
      
      console.log(`Admin access granted for: ${session.user.email}`);
    }
    
    // Note: /profile and /my-purchases now use client-side auth guards
    // to avoid conflicts with OAuth callback flow
    
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.redirect(new URL('/auth?error=middleware', req.url));
  }
  
  return res;
}

// Enable middleware for admin routes only (auth callback must be unprotected)
export const config = {
  matcher: ['/admin/:path*']
}
