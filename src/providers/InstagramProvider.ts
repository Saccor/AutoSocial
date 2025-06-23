import { SocialProvider, AuthTokenDetails, MessageInformation, PostDetails, ProviderConfig } from '@/types/social';

export class InstagramProvider implements SocialProvider {
  public readonly name = 'instagram';
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateAuthUrl(): Promise<string> {
    const rootUrl = "https://api.instagram.com/oauth/authorize";
    
    const state = this.generateState();
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(","), // Instagram uses comma-separated scopes
      response_type: "code",
      state,
    });

    return `${rootUrl}?${params.toString()}`;
  }

  async authenticate(params: { code: string; codeVerifier: string; state?: string }): Promise<AuthTokenDetails> {
    const { code } = params;
    
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: "authorization_code",
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      throw new Error(`Instagram token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenRes.json();
    
    // Instagram Basic Display API returns user info with the token
    return {
      access_token: tokenData.access_token,
      refresh_token: undefined, // Instagram doesn't provide refresh tokens for Basic Display API
      expires_at: undefined, // Long-lived tokens don't expire
      scope: undefined,
      platform_user_id: tokenData.user_id.toString(),
      username: tokenData.username || `user_${tokenData.user_id}`,
      display_name: tokenData.username || `user_${tokenData.user_id}`,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    // Instagram Basic Display API doesn't support refresh tokens
    // In production, you'd implement long-lived token refresh
    throw new Error('Instagram token refresh not implemented. Long-lived tokens should be used.');
  }

  async post(token: string, info: MessageInformation): Promise<PostDetails> {
    // Instagram posting requires the Instagram Graph API (business accounts)
    // This is a simplified example
    throw new Error('Instagram posting requires Instagram Graph API and business account setup');
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const userRes = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
      return userRes.ok;
    } catch {
      return false;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

// To enable Instagram, uncomment the provider registration in ProviderRegistry.ts:
// this.registerProvider('instagram', () => new InstagramProvider(this.getInstagramConfig())); 