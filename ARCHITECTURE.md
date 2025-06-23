# Social Media Provider Architecture

This project implements a scalable, provider-based architecture for social media OAuth integrations that makes adding new platforms simple and consistent.

## Architecture Overview

### Core Components

1. **Provider Interface** (`src/types/social.ts`)
   - Defines the contract all social media providers must implement
   - Ensures consistent behavior across platforms

2. **Provider Registry** (`src/providers/ProviderRegistry.ts`)
   - Manages all available social media providers
   - Handles configuration and instantiation
   - Central place to register new platforms

3. **Social Account Service** (`src/services/SocialAccountService.ts`)
   - Handles database operations for social accounts
   - Manages token refresh logic
   - Provider-agnostic account management

4. **Individual Providers** (`src/providers/`)
   - Platform-specific implementations
   - Currently includes: TwitterProvider, InstagramProvider (example)

## Key Benefits

### 🔧 Scalable Provider System
- Each platform implements the same `SocialProvider` interface
- Adding new platforms requires minimal code changes
- Consistent error handling and authentication flow

### 🔐 Secure Token Management
- Automatic token refresh with 5-minute buffer
- Proper OAuth 2.0 with PKCE support
- Server-side token storage and validation
- Environment-based configuration

### 📊 Unified Database Schema
- All social accounts stored in consistent format
- Supports multiple accounts per platform
- Comprehensive metadata storage

### 🚀 Easy Integration
- Generic components work with any supported platform
- Environment variable configuration
- Type-safe implementation

## Adding a New Platform

To add a new social media platform (e.g., LinkedIn):

### 1. Create the Provider
```typescript
// src/providers/LinkedInProvider.ts
export class LinkedInProvider implements SocialProvider {
  public readonly name = 'linkedin';
  
  async generateAuthUrl(): Promise<string> {
    // LinkedIn-specific OAuth URL generation
  }
  
  async authenticate(params): Promise<AuthTokenDetails> {
    // LinkedIn token exchange logic
  }
  
  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    // LinkedIn token refresh logic
  }
  
  async post(token: string, info: MessageInformation): Promise<PostDetails> {
    // LinkedIn posting API
  }
  
  async validateToken(token: string): Promise<boolean> {
    // LinkedIn token validation
  }
}
```

### 2. Add Environment Variables
```env
# .env.local
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_LINKEDIN_REDIRECT_URI=http://localhost:3000/api/oauth/callback/linkedin
```

### 3. Register the Provider
```typescript
// src/providers/ProviderRegistry.ts
static {
  this.registerProvider('linkedin', () => new LinkedInProvider(this.getLinkedInConfig()));
}

private static getLinkedInConfig(): ProviderConfig {
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    redirectUri: process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI!,
    scopes: ['r_liteprofile', 'w_member_social'],
  };
}
```

### 4. Add Platform to Types
```typescript
// src/types/social.ts
export type SupportedPlatform = 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'facebook';
```

### 5. Create Callback Route
```
src/app/api/oauth/callback/linkedin/route.ts
```

That's it! The new platform will automatically appear in the UI and work with all existing infrastructure.

## Database Schema

The `social_accounts` table stores all connected accounts:

```sql
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform_user_id, platform)
);
```

## Usage Examples

### Connect a Platform
```tsx
<SocialConnectButton platform="twitter" />
<SocialConnectButton platform="instagram" />
```

### Get Valid Token (with auto-refresh)
```typescript
const token = await SocialAccountService.getValidToken('twitter', 'user123');
```

### Post to Platform
```typescript
const provider = ProviderRegistry.getProvider('twitter');
const result = await provider.post(token, { text: 'Hello world!' });
```

## Security Features

- **CSRF Protection**: State parameter validation
- **PKCE Support**: Code challenge/verifier for public clients
- **Token Encryption**: Database encryption at rest (when configured)
- **Server-side Secrets**: Client secrets never exposed to frontend
- **Automatic Refresh**: Tokens refreshed before expiration
- **Scope Validation**: Platform-specific permission scopes

## File Structure

```
src/
├── types/
│   └── social.ts              # Type definitions
├── providers/
│   ├── ProviderRegistry.ts    # Provider management
│   ├── TwitterProvider.ts     # Twitter implementation
│   └── InstagramProvider.ts   # Instagram example
├── services/
│   └── SocialAccountService.ts # Database operations
├── components/
│   └── SocialConnectButton.tsx # Generic connect button
└── app/api/oauth/callback/
    └── [platform]/
        └── route.ts           # OAuth callbacks
```

## Environment Configuration

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twitter
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/oauth/callback/twitter

# Future platforms...
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/oauth/callback/instagram
```

## Next Steps

1. **Implement proper PKCE**: Replace hardcoded code challenge with crypto-secure generation
2. **Add more providers**: Instagram, LinkedIn, TikTok, Facebook
3. **Enhanced UI**: Connected accounts dashboard, disconnect functionality
4. **Posting interface**: Unified posting UI for all platforms
5. **Scheduling**: Add post scheduling functionality
6. **Analytics**: Track posting performance across platforms 