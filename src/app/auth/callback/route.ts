import { createServerSupabase, createAdminClient } from '@/lib/auth-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=auth_failed`)
    }

    // Get the user to create profile if needed
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Use admin client to create user profile (bypasses RLS)
      const adminClient = createAdminClient()
      const { error: profileError } = await adminClient
        .from('users')
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
      
      if (profileError) {
        console.error('Error creating user profile:', profileError)
      } else {
        console.log('User profile created/updated successfully for:', user.id)
      }
    }
  }

  // Redirect to home page
  return NextResponse.redirect(`${requestUrl.origin}/`)
} 