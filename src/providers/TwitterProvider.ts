import { SocialProvider, AuthTokenDetails, MessageInformation, PostDetails, ProviderConfig } from '@/types/social';

export class TwitterProvider implements SocialProvider {
  public readonly name = 'twitter';
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  async generateAuthUrl(): Promise<string> {
    const rootUrl = "https://twitter.com/i/oauth2/authorize";
    
    // TODO: Implement proper PKCE code challenge generation
    const codeChallenge = "challenge";
    const state = this.generateState();
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "plain", // Should be "S256" in production
    });

    return `${rootUrl}?${params.toString()}`;
  }

  async authenticate(params: { code: string; codeVerifier: string; state?: string }): Promise<AuthTokenDetails> {
    const { code, codeVerifier } = params;
    
    // Exchange authorization code for access token
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(
          this.config.clientId + ":" + this.config.clientSecret
        ).toString("base64"),
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      throw new Error(`Twitter token exchange failed: ${errorData}`);
    }

    const tokenData = await tokenRes.json();
    
    // Fetch user information
    const userRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch Twitter user info');
    }

    const userData = await userRes.json();

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || undefined,
      expires_at: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      scope: tokenData.scope,
      platform_user_id: userData.data.id,
      username: userData.data.username,
      display_name: userData.data.name || userData.data.username,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(
          this.config.clientId + ":" + this.config.clientSecret
        ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      throw new Error(`Twitter token refresh failed: ${errorData}`);
    }

    const tokenData = await tokenRes.json();

    // Get user info with new token
    const userRes = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch Twitter user info during refresh');
    }

    const userData = await userRes.json();

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken, // Use new if provided, fallback to old
      expires_at: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      scope: tokenData.scope,
      platform_user_id: userData.data.id,
      username: userData.data.username,
      display_name: userData.data.name || userData.data.username,
    };
  }

  async post(token: string, info: MessageInformation): Promise<PostDetails> {
    const postRes = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: info.text,
        // TODO: Add media support
      }),
    });

    if (!postRes.ok) {
      const errorData = await postRes.text();
      return {
        platform_post_id: '',
        status: 'failed',
        error_message: `Twitter post failed: ${errorData}`,
      };
    }

    const postData = await postRes.json();

    return {
      platform_post_id: postData.data.id,
      url: `https://twitter.com/user/status/${postData.data.id}`,
      status: 'published',
    };
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const userRes = await fetch("https://api.twitter.com/2/users/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      return userRes.ok;
    } catch {
      return false;
    }
  }

  private generateState(): string {
    // TODO: Implement proper cryptographically secure random state
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
} 