# AutoSocial - Social Media Automation Hub with Trending Content Analysis

A modern Next.js application for connecting, managing multiple social media accounts, and discovering viral trending content across platforms. Built with TypeScript, Supabase, and Tailwind CSS.

## 🚀 Features

### Core Platform
- ✅ **Secure Authentication** - Google OAuth via Supabase Auth
- ✅ **Multi-Platform Support** - Connect Twitter, Instagram, LinkedIn, and more
- ✅ **Provider Architecture** - Easy to add new social platforms
- ✅ **Token Management** - Automatic refresh and validation
- ✅ **Modern UI** - Beautiful, responsive interface with Tailwind CSS
- ✅ **Type Safety** - Full TypeScript implementation

### 🔥 Trending Content Analysis System
- ✅ **Multi-Platform Discovery** - Twitter and Reddit trending content discovery
- ✅ **AI-Powered Analysis** - Hugging Face Transformers for sentiment analysis and content classification
- ✅ **Advanced Sentiment Analysis** - Twitter-trained RoBERTa model for accurate emotion detection
- ✅ **Zero-Shot Classification** - BART model for intelligent content categorization
- ✅ **Viral Score Calculation** - Advanced engagement scoring algorithms
- ✅ **Content Suggestions** - AI-generated content ideas based on trending patterns
- ✅ **Real-Time Dashboard** - Live analytics and trending categories
- ✅ **Rate Limit Management** - Smart handling of API limitations
- ✅ **Hashtag & Keyword Tracking** - Extract and track trending topics
- ✅ **Python Microservice** - Scalable FastAPI service for AI processing

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **UI**: React 19
- **APIs**: Twitter API v2, Reddit API
- **AI/ML**: Hugging Face Transformers (Python FastAPI microservice)
- **Analytics**: Custom engagement scoring and sentiment analysis

## 📋 Prerequisites

- Node.js 18+
- A Supabase project
- Google OAuth credentials (for user authentication)
- Twitter API Bearer Token (for trending discovery)
- Social media developer accounts (Twitter, Instagram, etc.)

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twitter OAuth 2.0 & API
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/oauth/callback/twitter

# AI Analysis Service
NEXT_PUBLIC_AI_SERVICE_URL=http://127.0.0.1:8000

# Instagram (Coming Soon)
# NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your_instagram_client_id
# INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# LinkedIn (Coming Soon)
# NEXT_PUBLIC_LINKEDIN_CLIENT_ID=your_linkedin_client_id
# LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## 🗄️ Database Setup

### Core Authentication Tables

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

### 🔥 Trending Content Analysis Tables

Run the trending database schema:

```bash
# Apply the trending content database schema
psql -f database-trending-schema.sql
```

**Key Tables:**
- `trending_posts` - Store discovered viral content from Twitter/Reddit
- `trend_analyses` - AI-analyzed patterns and insights
- `content_suggestions` - AI-generated content ideas
- `trending_hashtags` - Track hashtag performance
- `trending_keywords` - Monitor keyword trends

### Row Level Security (RLS)

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

-- Trending data is public (no authentication required)
ALTER TABLE trending_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public trending posts" ON trending_posts FOR SELECT USING (true);
CREATE POLICY "System can insert trending posts" ON trending_posts FOR INSERT WITH CHECK (true);
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

4. **Set up database schema**
   ```bash
   # Apply core schema in Supabase
   # Then apply trending schema
   psql -f database-trending-schema.sql
   ```

5. **Set up the AI Analysis Service**
   ```bash
   cd ai-microservice
   pip install -r requirements.txt
   python main.py
   ```
   This will start the Hugging Face AI service on port 8000.

6. **Run the development server** (in a new terminal)
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000` (or available port)

## 📱 Usage

### Social Media Management
1. **Sign In**: Click "Sign In" and authenticate with Google
2. **Connect Accounts**: Click on social media platforms to connect your accounts
3. **Manage Connections**: View and manage your connected social media accounts

### 🔥 Trending Content Discovery
1. **Access Dashboard**: Navigate to the trending content analysis dashboard
2. **Discover from Twitter**: Click "Discover from Twitter" (limited to 1 request per 15 minutes on Free tier)
3. **Discover from Reddit**: Click "Discover from Reddit" (unlimited requests)
4. **View Analytics**: 
   - Live trending categories breakdown
   - Viral score calculations
   - AI-generated content suggestions
   - Hashtag and keyword trends
5. **Content Ideas**: Browse AI-generated content suggestions based on trending patterns

## 🏗️ Architecture

### Core Social Media Architecture
The application uses a **provider-based architecture** for social media platforms:

- **`SocialProvider` Interface**: Defines the contract for all social platforms
- **`ProviderRegistry`**: Manages and configures all available providers
- **`SocialAccountService`**: Handles database operations and token management

### 🔥 Trending Content Analysis Architecture

#### Key Components
- **`TrendingAnalysisService`**: Core service for content discovery and analysis
- **`TwitterProvider`**: Twitter API integration with rate limit handling
- **`RedditProvider`**: Reddit API integration for unlimited content discovery
- **`TrendingDashboard`**: Real-time analytics dashboard component

#### Content Analysis Pipeline
1. **Discovery**: Fetch trending content from Twitter/Reddit APIs
2. **Filtering**: Apply quality filters and engagement thresholds
3. **Scoring**: Calculate viral scores using comprehensive engagement metrics
4. **Categorization**: AI-powered content categorization (7 categories)
5. **Analysis**: Sentiment analysis, hashtag extraction, keyword identification
6. **Storage**: Store in trending_posts, trend_analyses, content_suggestions tables
7. **Insights**: Generate dashboard analytics and content suggestions

#### Engagement Scoring Algorithm
```javascript
// Comprehensive engagement score calculation
(likes * 1) + (retweets * 3) + (replies * 4) + (quotes * 3) + (bookmarks * 2) + (impressions * 0.001)
```

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── oauth/callback/          # OAuth callback handlers
│   │   ├── trending/
│   │   │   ├── dashboard/           # Dashboard API endpoint
│   │   │   ├── discover/            # Twitter discovery endpoint
│   │   │   └── discover/reddit/     # Reddit discovery endpoint
│   │   └── analytics/               # Analytics API
│   ├── auth/callback/               # Supabase auth callback
│   ├── page.tsx                     # Main dashboard with trending
│   └── layout.tsx                   # App layout
├── components/
│   ├── AuthButton.tsx               # Authentication component
│   ├── SocialConnectButton.tsx      # Social platform connect button
│   ├── TrendingDashboard.tsx        # 🔥 Main trending analytics dashboard
│   ├── StatsCard.tsx                # Analytics stat cards
│   ├── PlatformChart.tsx            # Chart components
│   └── UpdateTimer.tsx              # Discovery countdown timer
├── lib/
│   ├── auth.ts                      # Client-side auth
│   └── auth-server.ts               # Server-side auth
├── providers/
│   ├── ProviderRegistry.ts          # Provider management
│   ├── TwitterProvider.ts           # Twitter OAuth implementation
│   ├── InstagramProvider.ts         # Instagram implementation
│   └── RedditProvider.ts            # 🔥 Reddit API integration
├── services/
│   ├── SocialAccountService.ts      # Account management
│   ├── TrendingAnalysisService.ts   # 🔥 Core trending analysis engine
│   └── AnalyticsService.ts          # Analytics processing
├── types/
│   ├── social.ts                    # Social media types
│   ├── trending.ts                  # 🔥 Trending content types
│   └── analytics.ts                 # Analytics types
└── scripts/
    └── daily-trend-discovery.js     # Automated discovery script
```

## 🔥 Trending Content Analysis Features

### Multi-Platform Discovery
- **Twitter Integration**: Advanced search with viral content optimization
- **Reddit Integration**: Unlimited discovery across multiple subreddits
- **Quality Filtering**: Advanced algorithms to identify truly viral content
- **Rate Limit Management**: Smart handling of API limitations

### AI-Powered Analysis
- **Content Categorization**: 7 categories (Technology, Entertainment, Sports, Business, Lifestyle, News & Politics, Social Media)
- **Sentiment Analysis**: Positive/negative/neutral classification using keyword analysis
- **Hashtag Extraction**: Automatic hashtag identification and trending tracking
- **Keyword Analysis**: Content theme identification and trending keywords

### Analytics Dashboard
- **Real-Time Stats**: Active trends, hashtags, content ideas, virality score
- **Visual Charts**: Platform breakdown, category distribution
- **Trending Categories**: Live category rankings with engagement metrics
- **Content Suggestions**: AI-generated content ideas with confidence scores

### Content Suggestions
- **Content Types**: Reels, posts, stories, carousels
- **Platform Targeting**: Platform-specific content optimization
- **Hashtag Recommendations**: Trending hashtag suggestions
- **Optimal Timing**: Best posting time recommendations

## 🔧 API Rate Limits & Strategy

### Twitter API (Free Tier)
- **Rate Limit**: 1 request per 15 minutes
- **Monthly Cap**: 100 posts maximum
- **Strategy**: Maximize data value per call with comprehensive queries
- **Error Handling**: Smart detection of rate limits vs monthly caps

### Reddit API
- **Rate Limit**: 100 requests/minute, 1000/hour
- **No Monthly Cap**: Unlimited content discovery
- **Strategy**: Primary source for continuous content discovery
- **Subreddits**: popular, technology, entertainment, sports, news, business

## 📊 Content Quality & Filtering

### Twitter Content Filtering
```javascript
// Enhanced viral content discovery query
"(#viral OR #trending OR #fyp OR trending OR viral OR popular) -is:reply lang:en"
```

### Quality Metrics
- **Engagement Threshold**: Must have measurable engagement activity
- **Content Length**: Minimum 5 characters
- **Author Verification**: Filter out unknown/invalid accounts
- **Language**: English content prioritized

### Viral Score Calculation
- **Top 100 Selection**: Only the most engaging content per discovery
- **Comprehensive Metrics**: Likes, retweets, replies, quotes, bookmarks, impressions
- **Weighted Algorithm**: Different engagement types have different weights

## 🛡️ Security & Error Handling

### API Security
- **Bearer Token Management**: Secure Twitter API authentication
- **Rate Limit Protection**: Prevent API abuse with smart timing
- **Error Recovery**: Graceful handling of API failures
- **Data Validation**: Input sanitization and type checking

### Database Security
- **RLS Policies**: Row-level security for data protection
- **Public Trending Data**: Trending content accessible without authentication
- **System Operations**: Secure content insertion and analysis

## 📦 Available Scripts

### Next.js Scripts
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### AI Microservice Scripts
```bash
cd ai-microservice
python main.py     # Start AI service manually
uvicorn main:app --reload  # Start with auto-reload
```

### Combined Startup
```bash
# Windows PowerShell
.\start-services.ps1  # Start both services automatically

# Manual (separate terminals)
# Terminal 1: AI Service
cd ai-microservice && python main.py

# Terminal 2: Next.js
npm run dev
```

### Content Discovery Scripts
```bash
node scripts/daily-trend-discovery.js  # Manual discovery run
```

## 🎯 Trending Content Roadmap

### Completed Features ✅
- Multi-platform content discovery (Twitter + Reddit)
- AI-powered content analysis and categorization
- Real-time analytics dashboard
- Engagement scoring algorithms
- Rate limit management
- Content suggestion generation

### Upcoming Features 🔄
- TikTok trending content integration
- Instagram trending hashtag discovery
- Advanced AI content generation
- Automated posting of trending content
- A/B testing for content performance
- Advanced analytics and reporting

## 🐛 Troubleshooting

### Common Issues

#### Twitter API Issues
- **Rate Limit Errors**: Normal for Free tier - wait 15 minutes between requests
- **Monthly Cap Exceeded**: Upgrade to Basic plan ($200/month) or wait for monthly reset
- **Authentication Failures**: Verify TWITTER_BEARER_TOKEN is correct

#### Database Issues
- **Trending Data Not Showing**: Check if trending schema is applied
- **Permission Errors**: Verify RLS policies are correctly configured
- **Connection Issues**: Ensure SUPABASE_SERVICE_ROLE_KEY is set

#### Reddit API Issues
- **No Content Discovered**: Check internet connection and Reddit API status
- **Categorization Issues**: Verify subreddit mapping logic

### Performance Optimization
- **Database Indexes**: Ensure trending tables have proper indexes
- **Query Optimization**: Use LIMIT and proper filtering in queries
- **Caching**: Consider implementing Redis for frequently accessed data

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For any questions or contributions, please contact the maintainer.
