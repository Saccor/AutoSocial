export interface TrendingPost {
  id: string;
  platform: string;
  platform_post_id: string;
  author_username: string;
  author_display_name: string;
  author_followers: number;
  content: string;
  media_urls: string[];
  hashtags: string[];
  mentions: string[];
  post_url: string;
  engagement_score: number;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  published_at: Date;
  discovered_at: Date;
  trend_category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface TrendAnalysis {
  id: string;
  trend_title: string;
  trend_description: string;
  category: string;
  platforms: string[];
  hashtags: string[];
  keywords: string[];
  engagement_pattern: {
    avg_likes: number;
    avg_shares: number;
    avg_comments: number;
    total_likes: number;
    total_shares: number;
    total_comments: number;
    total_engagement: number;
    peak_hours: number[];
    ai_viral_factors?: string[];
    ai_content_themes?: string[];
    ai_sentiment?: string;
    ai_engagement_prediction?: string;
    ai_insights?: string[];
  };
  content_themes: string[];
  media_types: ('image' | 'video' | 'text')[];
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  viral_score: number;
  total_posts: number;
  sample_posts: TrendingPost[];
  created_at: Date;
  updated_at: Date;
  ai_analysis?: {
    insights: string[];
    viral_factors: string[];
    content_themes: string[];
    sentiment: string;
    engagement_prediction: string;
  };
}

export interface ContentSuggestion {
  id: string;
  trend_analysis_id: string;
  content_type: 'reel' | 'post' | 'story' | 'carousel';
  suggested_content: string;
  suggested_hashtags: string[];
  suggested_media_style: string;
  target_platforms: string[];
  optimal_posting_time: Date;
  confidence_score: number;
  created_at: Date;
  ai_insights?: {
    viralPotential?: string;
    targetAudience?: string;
  };
}

export interface TrendingHashtag {
  hashtag: string;
  usage_count: number;
  growth_rate: number;
  platforms: string[];
  avg_engagement: number;
  trend_strength: number;
  category: string;
  last_updated: Date;
}

export interface TrendingKeyword {
  keyword: string;
  frequency: number;
  context: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  platforms: string[];
  growth_rate: number;
  related_hashtags: string[];
}

export interface TrendDashboardData {
  topTrends: TrendAnalysis[];
  trendingHashtags: TrendingHashtag[];
  trendingKeywords: TrendingKeyword[];
  contentSuggestions: ContentSuggestion[];
  platformBreakdown: { [platform: string]: number };
  categoryBreakdown: { [category: string]: number };
  engagementTrends: {
    date: string;
    avgEngagement: number;
    postCount: number;
  }[];
  viralityScore: number;
  trendingCategories?: {
    category: string;
    count: number;
    totalEngagement: number;
    avgEngagement: number;
  }[];
} 