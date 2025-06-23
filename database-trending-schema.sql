-- AutoSocial Trending Analysis Database Schema
-- This file contains the database tables needed for trend discovery and content generation

-- Trending posts table - stores discovered viral/trending content
CREATE TABLE IF NOT EXISTS trending_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  platform_post_id TEXT NOT NULL UNIQUE,
  author_username TEXT NOT NULL,
  author_display_name TEXT,
  author_followers INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  mentions TEXT[],
  post_url TEXT,
  engagement_score INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trend_category TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend analyses table - stores analyzed patterns from trending posts
CREATE TABLE IF NOT EXISTS trend_analyses (
  id TEXT PRIMARY KEY,
  trend_title TEXT NOT NULL,
  trend_description TEXT,
  category TEXT NOT NULL,
  platforms TEXT[],
  hashtags TEXT[],
  keywords TEXT[],
  engagement_pattern JSONB,
  content_themes TEXT[],
  media_types TEXT[],
  sentiment_distribution JSONB,
  viral_score DECIMAL DEFAULT 0,
  sample_post_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content suggestions table - AI-generated content ideas based on trends
CREATE TABLE IF NOT EXISTS content_suggestions (
  id TEXT PRIMARY KEY,
  trend_analysis_id TEXT REFERENCES trend_analyses(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'post', 'story', 'carousel')),
  suggested_content TEXT NOT NULL,
  suggested_hashtags TEXT[],
  suggested_media_style TEXT,
  target_platforms TEXT[],
  optimal_posting_time TIMESTAMP WITH TIME ZONE,
  confidence_score DECIMAL DEFAULT 0,
  is_used BOOLEAN DEFAULT FALSE,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Trending hashtags table - tracks hashtag performance over time
CREATE TABLE IF NOT EXISTS trending_hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hashtag TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  growth_rate DECIMAL DEFAULT 0,
  platforms TEXT[],
  avg_engagement DECIMAL DEFAULT 0,
  trend_strength DECIMAL DEFAULT 0,
  category TEXT,
  peak_period TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hashtag, date_trunc('day', created_at))
);

-- Trending keywords table - tracks keyword performance and context
CREATE TABLE IF NOT EXISTS trending_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  frequency INTEGER DEFAULT 0,
  context TEXT[],
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  platforms TEXT[],
  growth_rate DECIMAL DEFAULT 0,
  related_hashtags TEXT[],
  trend_period TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated content table - tracks content created based on trends
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_suggestion_id TEXT REFERENCES content_suggestions(id),
  trend_analysis_id TEXT REFERENCES trend_analyses(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'post', 'story', 'carousel')),
  generated_content TEXT NOT NULL,
  generated_hashtags TEXT[],
  media_instructions TEXT,
  target_platforms TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  performance_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content performance tracking - links generated content to actual posts
CREATE TABLE IF NOT EXISTS content_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_content_id UUID REFERENCES generated_content(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  engagement_rate DECIMAL DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  click_through_rate DECIMAL DEFAULT 0,
  conversion_rate DECIMAL DEFAULT 0,
  trend_accuracy_score DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE trending_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow read access to trending data for all authenticated users
-- but restrict write access to system/admin operations

-- Trending posts - read-only for users, write for system
CREATE POLICY "Allow read access to trending posts" ON trending_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to manage trending posts" ON trending_posts
  FOR ALL TO service_role USING (true);

-- Trend analyses - read-only for users
CREATE POLICY "Allow read access to trend analyses" ON trend_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to manage trend analyses" ON trend_analyses
  FOR ALL TO service_role USING (true);

-- Content suggestions - read-only for users
CREATE POLICY "Allow read access to content suggestions" ON content_suggestions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow system to manage content suggestions" ON content_suggestions
  FOR ALL TO service_role USING (true);

-- Generated content - users can manage their own
CREATE POLICY "Users can manage own generated content" ON generated_content
  USING (auth.uid() = user_id);

-- Content performance - users can view their own
CREATE POLICY "Users can view own content performance" ON content_performance
  USING (auth.uid() = (SELECT user_id FROM generated_content WHERE generated_content.id = content_performance.generated_content_id));

-- Trending hashtags and keywords - read-only for users
CREATE POLICY "Allow read access to trending hashtags" ON trending_hashtags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to trending keywords" ON trending_keywords
  FOR SELECT TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trending_posts_platform ON trending_posts(platform);
CREATE INDEX IF NOT EXISTS idx_trending_posts_engagement ON trending_posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_posts_discovered_at ON trending_posts(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_trending_posts_hashtags ON trending_posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_trending_posts_category ON trending_posts(trend_category);

CREATE INDEX IF NOT EXISTS idx_trend_analyses_viral_score ON trend_analyses(viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_analyses_category ON trend_analyses(category);
CREATE INDEX IF NOT EXISTS idx_trend_analyses_created_at ON trend_analyses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_suggestions_confidence ON content_suggestions(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_content_type ON content_suggestions(content_type);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_is_used ON content_suggestions(is_used);

CREATE INDEX IF NOT EXISTS idx_trending_hashtags_usage ON trending_hashtags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_hashtags_growth ON trending_hashtags(growth_rate DESC);

CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_status ON generated_content(status);
CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at DESC);

-- Functions for trend scoring and analysis
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  likes INTEGER,
  shares INTEGER, 
  comments INTEGER,
  views INTEGER
) RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(likes, 0) + (COALESCE(shares, 0) * 2) + (COALESCE(comments, 0) * 3) + (COALESCE(views, 0) / 100);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_trending_hashtag_stats() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update hashtag statistics when new trending posts are added
  INSERT INTO trending_hashtags (hashtag, usage_count, platforms, category, last_updated)
  SELECT 
    unnest(NEW.hashtags) as hashtag,
    1 as usage_count,
    ARRAY[NEW.platform] as platforms,
    NEW.trend_category as category,
    NOW() as last_updated
  ON CONFLICT (hashtag, date_trunc('day', created_at))
  DO UPDATE SET
    usage_count = trending_hashtags.usage_count + 1,
    platforms = array_cat(trending_hashtags.platforms, ARRAY[NEW.platform]),
    last_updated = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update hashtag stats
DROP TRIGGER IF EXISTS update_hashtag_stats_trigger ON trending_posts;
CREATE TRIGGER update_hashtag_stats_trigger
  AFTER INSERT ON trending_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_trending_hashtag_stats();

-- Triggers for updating timestamps
DROP TRIGGER IF EXISTS update_trending_posts_updated_at ON trending_posts;
CREATE TRIGGER update_trending_posts_updated_at 
  BEFORE UPDATE ON trending_posts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trend_analyses_updated_at ON trend_analyses;
CREATE TRIGGER update_trend_analyses_updated_at 
  BEFORE UPDATE ON trend_analyses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_content_updated_at ON generated_content;
CREATE TRIGGER update_generated_content_updated_at 
  BEFORE UPDATE ON generated_content 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 