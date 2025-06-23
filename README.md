# Social Media Automation Hub

A Next.js application for managing and automating social media posts across multiple platforms with proper user authentication.

## 🏗️ **Architecture Overview**

This application uses a **provider-based architecture** that allows for easy scaling across multiple social media platforms:

- **Authentication**: Supabase Auth with Google OAuth
- **Provider System**: Unified interface for all social platforms
- **Database**: Supabase with proper user relationships
- **Security**: Row Level Security (RLS) and admin client for operations

## 🚀 **Features**

- ✅ **Secure Authentication** - Google OAuth via Supabase Auth
- ✅ **User Management** - Proper user sessions and profile creation
- ✅ **Twitter Integration** - Full OAuth 2.0 with PKCE
- 🔄 **Instagram Integration** - Coming soon
- 🔄 **LinkedIn Integration** - Coming soon
- ✅ **Token Management** - Automatic refresh and validation
- ✅ **Scalable Architecture** - Easy to add new platforms

## 📋 **Prerequisites**

- Node.js 18+ 
- A Supabase project
- Google OAuth credentials (for user authentication)
- Twitter Developer Account with OAuth 2.0 app

## ⚙️ **Environment Setup**

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twitter OAuth 2.0
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/oauth/callback/twitter
```

## 🗄️ **Database Schema**

The application requires these Supabase tables:

### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `social_accounts` table
```sql
CREATE TABLE social_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_identifier TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform, account_identifier)
);
```

### Row Level Security (RLS)
Enable RLS on both tables and create policies:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can manage own profile" ON users
  USING (auth.uid() = id);

-- Users can manage their own social accounts
CREATE POLICY "Users can manage own social accounts" ON social_accounts
  USING (auth.uid() = user_id);
```

## 🔐 **Authentication Setup**

### 1. Configure Supabase Auth

In your Supabase dashboard:

1. Go to **Authentication > Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials
4. Set redirect URL: `http://localhost:3000/auth/callback`

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:3000/auth/callback`
4. Copy Client ID and Secret to your `.env.local`

### 3. Configure Twitter OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create an OAuth 2.0 app
3. Set redirect URI: `http://localhost:3000/api/oauth/callback/twitter`
4. Copy credentials to your `.env.local`

## 🚀 **Installation & Running**

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Navigate to `http://localhost:3000`

## 📱 **Usage Flow**

1. **Sign In** - Users sign in with Google via Supabase Auth
2. **Connect Accounts** - Users can connect their social media accounts
3. **Manage Connections** - View and manage connected accounts
4. **Automated Posts** - (Future feature) Schedule and automate posts

## 🔧 **Adding New Platforms**

To add a new social media platform:

1. Create a new provider in `src/providers/` implementing `SocialProvider`
2. Register it in `ProviderRegistry.ts`
3. Add platform-specific environment variables
4. Update the `SupportedPlatform` type in `src/types/social.ts`

Example structure:
```typescript
export class InstagramProvider implements SocialProvider {
  public readonly name = 'instagram';
  
  async generateAuthUrl(): Promise<string> { /* ... */ }
  async authenticate(params: AuthParams): Promise<AuthTokenDetails> { /* ... */ }
  async refreshToken(token: string): Promise<AuthTokenDetails> { /* ... */ }
  async post(token: string, info: MessageInformation): Promise<PostDetails> { /* ... */ }
  async validateToken(token: string): Promise<boolean> { /* ... */ }
}
```

## 🛡️ **Security Features**

- **OAuth 2.0 with PKCE** for secure authentication
- **Row Level Security** in Supabase
- **Encrypted token storage** in database
- **Automatic token refresh** before expiration
- **Admin client** for server-side operations bypassing RLS

## 📚 **Project Structure**

```
src/
├── app/                    # Next.js app router
├── components/            # React components
├── lib/                   # Authentication and utilities
├── providers/             # Social media provider implementations
├── services/              # Database services
└── types/                 # TypeScript type definitions
```

## 🎯 **Next Steps**

- [ ] Implement Instagram OAuth integration
- [ ] Implement LinkedIn OAuth integration
- [ ] Add post scheduling functionality
- [ ] Add bulk posting features
- [ ] Add analytics and reporting
- [ ] Add post templates

## 🐛 **Troubleshooting**

### Common Issues

1. **"User not authenticated" error**: Make sure you're signed in with Google first
2. **Database constraint errors**: Ensure your database schema matches the requirements
3. **OAuth redirect errors**: Check your redirect URIs match exactly in all platforms
4. **Token refresh failures**: Verify your client secrets are correct

### Logs

Check the browser console and server logs for detailed error messages. All OAuth flows include comprehensive logging.

## 📄 **License**

MIT License - feel free to use this for your own projects!
