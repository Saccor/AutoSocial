# AutoSocial - Social Media Automation Hub

A modern Next.js application for connecting and managing multiple social media accounts with a scalable provider-based architecture. Built with TypeScript, Supabase, and Tailwind CSS.

## 🚀 Features

- ✅ **Secure Authentication** - Google OAuth via Supabase Auth
- ✅ **Multi-Platform Support** - Connect Twitter, Instagram, LinkedIn, and more
- ✅ **Provider Architecture** - Easy to add new social platforms
- ✅ **Token Management** - Automatic refresh and validation
- ✅ **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- ✅ **Type Safety** - Full TypeScript implementation
- 🔄 **Post Automation** - Coming soon

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **UI**: React 19

## 📋 Prerequisites

- Node.js 18+
- A Supabase project
- Google OAuth credentials (for user authentication)
- Social media developer accounts (Twitter, Instagram, etc.)

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twitter OAuth 2.0
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/oauth/callback/twitter

# Instagram (Coming Soon)
# NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your_instagram_client_id
# INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# LinkedIn (Coming Soon)
# NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your_linkedin_client_id
# LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## 🗄️ Database Setup

### Required Tables

#### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `social_accounts` table
```sql
CREATE TABLE social_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
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

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own profile
CREATE POLICY "Users can manage own profile" ON users
  USING (auth.uid() = id);

-- Users can manage their own social accounts
CREATE POLICY "Users can manage own social accounts" ON social_accounts
  USING (auth.uid() = user_id);
```

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:Saccor/AutoSocial.git
   cd AutoSocial
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Usage

1. **Sign In**: Click "Sign In" and authenticate with Google
2. **Connect Accounts**: Click on social media platforms to connect your accounts
3. **Manage Connections**: View and manage your connected social media accounts
4. **Post Content**: (Coming soon) Create and schedule posts across platforms

## 🏗️ Architecture

The application uses a **provider-based architecture** that makes adding new social media platforms simple:

### Core Components

- **`SocialProvider` Interface**: Defines the contract for all social platforms
- **`ProviderRegistry`**: Manages and configures all available providers
- **`SocialAccountService`**: Handles database operations and token management
- **Individual Providers**: Platform-specific implementations (Twitter, Instagram, etc.)

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/oauth/callback/       # OAuth callback handlers
│   ├── auth/callback/            # Supabase auth callback
│   ├── page.tsx                  # Main dashboard
│   └── layout.tsx                # App layout
├── components/                   # React components
│   ├── AuthButton.tsx            # Authentication component
│   └── SocialConnectButton.tsx   # Social platform connect button
├── lib/                          # Utilities and configurations
│   ├── auth.ts                   # Client-side auth
│   └── auth-server.ts            # Server-side auth
├── providers/                    # Social media providers
│   ├── ProviderRegistry.ts       # Provider management
│   ├── TwitterProvider.ts        # Twitter implementation
│   └── InstagramProvider.ts      # Instagram implementation
├── services/                     # Business logic
│   └── SocialAccountService.ts   # Account management
└── types/                        # TypeScript definitions
    └── social.ts                 # Social media types
```

## 🔧 Adding New Platforms

To add a new social media platform:

1. **Create a provider** implementing the `SocialProvider` interface
2. **Register it** in `ProviderRegistry.ts`
3. **Add environment variables** for OAuth credentials
4. **Update types** in `src/types/social.ts`
5. **Create callback route** in `src/app/api/oauth/callback/[platform]/`

See `ARCHITECTURE.md` for detailed instructions.

## 🛡️ Security Features

- **OAuth 2.0 with PKCE** for secure authentication
- **Row Level Security** in Supabase database
- **Automatic token refresh** before expiration
- **Server-side secret management**
- **CSRF protection** with state parameters

## 📦 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## 🎯 Roadmap

- [ ] Complete Instagram OAuth integration
- [ ] Complete LinkedIn OAuth integration
- [ ] Add TikTok and Facebook support
- [ ] Implement post scheduling
- [ ] Add bulk posting features
- [ ] Analytics and reporting dashboard
- [ ] Post templates and AI assistance

## 🐛 Troubleshooting

### Common Issues

- **OAuth redirect errors**: Ensure redirect URIs match exactly in all platforms
- **Database errors**: Verify your Supabase schema matches the requirements
- **Authentication issues**: Check your Google OAuth setup in Supabase
- **Environment variables**: Make sure all required variables are set

### Getting Help

1. Check the browser console for errors
2. Verify your environment variables
3. Ensure your database schema is correct
4. Check OAuth app configurations

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For any questions or contributions, please contact the maintainer.
