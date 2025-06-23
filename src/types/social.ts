export interface AuthTokenDetails {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  scope?: string;
  platform_user_id: string;
  username: string;
  display_name?: string;
}

export interface MessageInformation {
  text: string;
  media_urls?: string[];
  scheduled_at?: Date;
}

export interface PostDetails {
  platform_post_id: string;
  url?: string;
  status: 'published' | 'failed' | 'pending';
  error_message?: string;
}

export interface SocialProvider {
  name: string;
  generateAuthUrl(): Promise<string>;
  authenticate(params: { code: string; codeVerifier: string; state?: string }): Promise<AuthTokenDetails>;
  refreshToken(refreshToken: string): Promise<AuthTokenDetails>;
  post(token: string, info: MessageInformation): Promise<PostDetails>;
  validateToken(token: string): Promise<boolean>;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export type SupportedPlatform = 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'facebook'; 