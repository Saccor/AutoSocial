import { SocialProvider, ProviderConfig, SupportedPlatform } from '@/types/social';
import { TwitterProvider } from './TwitterProvider';

export class ProviderRegistry {
  private static providers: Map<SupportedPlatform, () => SocialProvider> = new Map();

  static {
    // Register all available providers
    this.registerProvider('twitter', () => new TwitterProvider(this.getTwitterConfig()));
    
    // Future providers can be registered here:
    // this.registerProvider('instagram', () => new InstagramProvider(this.getInstagramConfig()));
    // this.registerProvider('linkedin', () => new LinkedInProvider(this.getLinkedInConfig()));
  }

  private static registerProvider(platform: SupportedPlatform, factory: () => SocialProvider): void {
    this.providers.set(platform, factory);
  }

  static getProvider(platform: SupportedPlatform): SocialProvider {
    const factory = this.providers.get(platform);
    if (!factory) {
      throw new Error(`Provider not found for platform: ${platform}`);
    }
    return factory();
  }

  static getSupportedPlatforms(): SupportedPlatform[] {
    return Array.from(this.providers.keys());
  }

  static isSupported(platform: string): platform is SupportedPlatform {
    return this.providers.has(platform as SupportedPlatform);
  }

  // Configuration getters for each platform
  private static getTwitterConfig(): ProviderConfig {
    const clientId = process.env.TWITTER_CLIENT_ID || process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Twitter configuration. Check environment variables.');
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    };
  }

  // Future platform configurations:
  /*
  private static getInstagramConfig(): ProviderConfig {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing Instagram configuration. Check environment variables.');
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: ['user_profile', 'user_media'],
    };
  }
  */
} 