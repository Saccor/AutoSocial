import { NextRequest, NextResponse } from 'next/server';
import { ProviderRegistry } from '@/providers/ProviderRegistry';
import { SocialAccountService } from '@/services/SocialAccountService';
import { createServerSupabase } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  console.log('Twitter OAuth callback initiated');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for authentication with Supabase
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('User not authenticated:', authError);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=not_authenticated`
      );
    }

    if (error) {
      console.error('OAuth error from Twitter:', error);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=oauth_denied`
      );
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(
        `${request.nextUrl.origin}/?error=missing_params`
      );
    }

    console.log('Processing Twitter OAuth for user:', user.id);

    // Get the Twitter provider and exchange the code for tokens
    const twitterProvider = ProviderRegistry.getProvider('twitter');
    
    const tokenDetails = await twitterProvider.authenticate({
      code,
      codeVerifier: "challenge", // TODO: Use proper PKCE implementation
      state: state || undefined,
    });
    console.log('Token exchange successful for user:', tokenDetails.platform_user_id);

    // Save the account with the authenticated user ID
    const savedAccount = await SocialAccountService.saveAccount(
      user.id,
      'twitter', 
      tokenDetails
    );

    console.log('Twitter account saved successfully:', {
      id: savedAccount.id,
      user_id: savedAccount.user_id,
      platform: savedAccount.platform,
      account_identifier: savedAccount.account_identifier
    });

    // Redirect back to the main page with success message
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?success=twitter_connected`
    );

  } catch (error) {
    console.error('Provider authentication error:', error);
    
    // Redirect with error
    return NextResponse.redirect(
      `${request.nextUrl.origin}/?error=db_save_failed`
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 