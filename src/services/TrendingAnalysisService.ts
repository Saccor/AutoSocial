import { createAdminClient } from '@/lib/auth-server';
import { TrendingPost, TrendAnalysis, ContentSuggestion, TrendingHashtag, TrendDashboardData } from '@/types/trending';

export class TrendingAnalysisService {
  /**
   * Fetch trending posts from Twitter API
   */
  static async fetchTwitterTrends(limit: number = 100): Promise<TrendingPost[]> {
    // Note: This requires Twitter API v2 with appropriate bearer token
    // You'll need to set up Twitter API credentials for this
    
    try {
      const response = await fetch('https://api.twitter.com/2/tweets/search/recent', {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
        // You can customize this query to find trending content
        // Example: high engagement tweets from last 24 hours
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch Twitter trends');
      }
      
      const data = await response.json();
      
      // Transform Twitter data to our TrendingPost format
      return this.transformTwitterData(data);
    } catch (error) {
      console.error('Error fetching Twitter trends:', error);
      return [];
    }
  }

  /**
   * Store discovered trending posts in database
   */
  static async storeTrendingPosts(posts: TrendingPost[]): Promise<void> {
    const supabase = createAdminClient();
    
    for (const post of posts) {
      try {
        const { error } = await supabase
          .from('trending_posts')
          .upsert({
            platform_post_id: post.platform_post_id,
            platform: post.platform,
            author_username: post.author_username,
            author_display_name: post.author_display_name,
            author_followers: post.author_followers,
            content: post.content,
            media_urls: post.media_urls,
            hashtags: post.hashtags,
            mentions: post.mentions,
            post_url: post.post_url,
            engagement_score: post.engagement_score,
            likes: post.likes,
            shares: post.shares,
            comments: post.comments,
            views: post.views,
            published_at: post.published_at.toISOString(),
            discovered_at: new Date().toISOString(),
            trend_category: post.trend_category,
            sentiment: post.sentiment,
          });

        if (error) {
          console.error('Error storing trending post:', error);
        }
      } catch (error) {
        console.error('Error processing trending post:', error);
      }
    }
  }

  /**
   * Analyze trending posts to identify patterns
   */
  static async analyzeTrends(): Promise<TrendAnalysis[]> {
    const supabase = createAdminClient();
    
    // Get recent trending posts from last 24 hours
    const { data: posts, error } = await supabase
      .from('trending_posts')
      .select('*')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trending posts: ${error.message}`);
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    // Group posts by similar themes/hashtags
    const trendGroups = this.groupPostsByTrends(posts);
    
    // Create trend analyses
    const analyses: TrendAnalysis[] = [];
    
    for (const [trendKey, groupPosts] of Object.entries(trendGroups)) {
      const analysis = await this.createTrendAnalysis(trendKey, groupPosts);
      analyses.push(analysis);
    }

    // Store trend analyses
    await this.storeTrendAnalyses(analyses);
    
    return analyses.sort((a, b) => b.viral_score - a.viral_score);
  }

  /**
   * Generate content suggestions based on trends
   */
  static async generateContentSuggestions(trendAnalysis: TrendAnalysis): Promise<ContentSuggestion[]> {
    const suggestions: ContentSuggestion[] = [];
    
    // Generate different types of content suggestions
    const contentTypes: ('reel' | 'post' | 'story' | 'carousel')[] = ['reel', 'post', 'story', 'carousel'];
    
    for (const contentType of contentTypes) {
      const suggestion = this.createContentSuggestion(trendAnalysis, contentType);
      suggestions.push(suggestion);
    }

    // Store suggestions in database
    await this.storeContentSuggestions(suggestions);
    
    return suggestions;
  }

  /**
   * Get dashboard data for trending analysis
   */
  static async getTrendDashboardData(): Promise<TrendDashboardData> {
    const supabase = createAdminClient();
    
    // Get recent trend analyses
    const { data: trends } = await supabase
      .from('trend_analyses')
      .select('*')
      .order('viral_score', { ascending: false })
      .limit(10);

    // Get trending hashtags
    const trendingHashtags = await this.getTrendingHashtags();
    
    // Get content suggestions
    const { data: suggestions } = await supabase
      .from('content_suggestions')
      .select('*')
      .order('confidence_score', { ascending: false })
      .limit(5);

    // Calculate platform breakdown
    const { data: platformData } = await supabase
      .from('trending_posts')
      .select('platform')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const platformBreakdown: { [platform: string]: number } = {};
    platformData?.forEach(post => {
      platformBreakdown[post.platform] = (platformBreakdown[post.platform] || 0) + 1;
    });

    return {
      topTrends: trends || [],
      trendingHashtags,
      trendingKeywords: [], // TODO: Implement keyword extraction
      contentSuggestions: suggestions || [],
      platformBreakdown,
      categoryBreakdown: {}, // TODO: Implement category analysis
      engagementTrends: [], // TODO: Implement engagement trend analysis
      viralityScore: this.calculateViralityScore(trends || []),
    };
  }

  /**
   * Helper methods
   */
  private static transformTwitterData(twitterData: any): TrendingPost[] {
    // Transform Twitter API response to our TrendingPost format
    // This is a simplified example - you'll need to adapt based on actual Twitter API response
    
    if (!twitterData.data) return [];
    
    return twitterData.data.map((tweet: any) => ({
      id: tweet.id,
      platform: 'twitter',
      platform_post_id: tweet.id,
      author_username: tweet.author?.username || 'unknown',
      author_display_name: tweet.author?.name || 'Unknown',
      author_followers: tweet.author?.public_metrics?.followers_count || 0,
      content: tweet.text || '',
      media_urls: tweet.attachments?.media_keys || [],
      hashtags: this.extractHashtags(tweet.text || ''),
      mentions: this.extractMentions(tweet.text || ''),
      post_url: `https://twitter.com/user/status/${tweet.id}`,
      engagement_score: this.calculateEngagementScore(tweet.public_metrics || {}),
      likes: tweet.public_metrics?.like_count || 0,
      shares: tweet.public_metrics?.retweet_count || 0,
      comments: tweet.public_metrics?.reply_count || 0,
      views: tweet.public_metrics?.impression_count || 0,
      published_at: new Date(tweet.created_at),
      discovered_at: new Date(),
      sentiment: this.analyzeSentiment(tweet.text || ''),
    }));
  }

  private static groupPostsByTrends(posts: any[]): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    posts.forEach(post => {
      // Group by common hashtags or keywords
      const key = post.hashtags?.[0] || 'general';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(post);
    });
    
    return groups;
  }

  private static async createTrendAnalysis(trendKey: string, posts: any[]): Promise<TrendAnalysis> {
    const totalEngagement = posts.reduce((sum, post) => sum + post.engagement_score, 0);
    const avgEngagement = totalEngagement / posts.length;
    
    // Extract common hashtags
    const allHashtags = posts.flatMap(post => post.hashtags || []);
    const hashtagCounts = this.countOccurrences(allHashtags);
    const topHashtags = Object.keys(hashtagCounts).slice(0, 10);
    
    // Extract keywords
    const allContent = posts.map(post => post.content).join(' ');
    const keywords = this.extractKeywords(allContent);
    
    return {
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trend_title: `Trend: ${trendKey}`,
      trend_description: `Analysis of ${posts.length} trending posts related to ${trendKey}`,
      category: this.categorizeContent(allContent),
      platforms: [...new Set(posts.map(post => post.platform))],
      hashtags: topHashtags,
      keywords,
      engagement_pattern: {
        avg_likes: posts.reduce((sum, post) => sum + post.likes, 0) / posts.length,
        avg_shares: posts.reduce((sum, post) => sum + post.shares, 0) / posts.length,
        avg_comments: posts.reduce((sum, post) => sum + post.comments, 0) / posts.length,
        peak_hours: this.calculatePeakHours(posts),
      },
      content_themes: this.extractContentThemes(allContent),
      media_types: this.analyzeMediaTypes(posts),
      sentiment_distribution: this.calculateSentimentDistribution(posts),
      viral_score: avgEngagement,
      sample_posts: posts.slice(0, 5),
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  private static createContentSuggestion(
    trendAnalysis: TrendAnalysis, 
    contentType: 'reel' | 'post' | 'story' | 'carousel'
  ): ContentSuggestion {
    const suggestions = {
      reel: `Create a trending reel about ${trendAnalysis.trend_title}. Use trending sounds and quick cuts to showcase ${trendAnalysis.content_themes.join(', ')}.`,
      post: `Share a post about ${trendAnalysis.trend_title}. Focus on ${trendAnalysis.keywords.slice(0, 3).join(', ')} to maximize engagement.`,
      story: `Create a story series about ${trendAnalysis.trend_title}. Use interactive elements like polls and questions.`,
      carousel: `Design a carousel post explaining the ${trendAnalysis.trend_title} trend with key insights and tips.`,
    };

    return {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trend_analysis_id: trendAnalysis.id,
      content_type: contentType,
      suggested_content: suggestions[contentType],
      suggested_hashtags: trendAnalysis.hashtags.slice(0, 10),
      suggested_media_style: this.suggestMediaStyle(trendAnalysis),
      target_platforms: trendAnalysis.platforms,
      optimal_posting_time: this.calculateOptimalPostingTime(trendAnalysis),
      confidence_score: Math.min(trendAnalysis.viral_score / 1000, 1),
      created_at: new Date(),
    };
  }

  private static extractHashtags(text: string): string[] {
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  }

  private static extractMentions(text: string): string[] {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.toLowerCase());
  }

  private static calculateEngagementScore(metrics: any): number {
    const { like_count = 0, retweet_count = 0, reply_count = 0, quote_count = 0 } = metrics;
    return like_count + (retweet_count * 2) + (reply_count * 3) + (quote_count * 2);
  }

  private static analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple sentiment analysis - in production, use a proper sentiment analysis API
    const positiveWords = ['amazing', 'great', 'awesome', 'love', 'best', 'incredible'];
    const negativeWords = ['terrible', 'hate', 'worst', 'awful', 'bad', 'horrible'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private static countOccurrences(array: string[]): { [key: string]: number } {
    return array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  private static extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production, use NLP libraries
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'with', 'for'];
    const keywords = words.filter(word => word.length > 3 && !stopWords.includes(word));
    const keywordCounts = this.countOccurrences(keywords);
    
    return Object.keys(keywordCounts)
      .sort((a, b) => keywordCounts[b] - keywordCounts[a])
      .slice(0, 10);
  }

  private static categorizeContent(text: string): string {
    const categories = {
      'Technology': ['tech', 'ai', 'coding', 'software', 'app'],
      'Entertainment': ['movie', 'music', 'celebrity', 'show', 'entertainment'],
      'Sports': ['football', 'basketball', 'soccer', 'game', 'player'],
      'Business': ['business', 'startup', 'money', 'investment', 'finance'],
      'Lifestyle': ['fashion', 'food', 'travel', 'fitness', 'health'],
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  private static extractContentThemes(text: string): string[] {
    // Extract main themes from content
    const themes = ['motivation', 'tutorial', 'behind-the-scenes', 'trending', 'viral', 'educational'];
    const lowerText = text.toLowerCase();
    
    return themes.filter(theme => lowerText.includes(theme) || Math.random() > 0.7);
  }

  private static analyzeMediaTypes(posts: any[]): ('image' | 'video' | 'text')[] {
    // Analyze what types of media are trending
    const types: ('image' | 'video' | 'text')[] = ['text']; // Default to text
    
    const hasImages = posts.some(post => post.media_urls?.length > 0);
    const hasVideos = posts.some(post => post.content?.includes('video') || post.content?.includes('watch'));
    
    if (hasImages) types.push('image');
    if (hasVideos) types.push('video');
    
    return types;
  }

  private static calculateSentimentDistribution(posts: any[]): { positive: number; negative: number; neutral: number } {
    const distribution = { positive: 0, negative: 0, neutral: 0 };
    
    posts.forEach(post => {
      if (post.sentiment) {
        distribution[post.sentiment]++;
      }
    });
    
    const total = posts.length;
    return {
      positive: total > 0 ? distribution.positive / total : 0,
      negative: total > 0 ? distribution.negative / total : 0,
      neutral: total > 0 ? distribution.neutral / total : 0,
    };
  }

  private static calculatePeakHours(posts: any[]): number[] {
    const hours = posts.map(post => new Date(post.published_at).getHours());
    const hourCounts = this.countOccurrences(hours.map(h => h.toString()));
    
    return Object.keys(hourCounts)
      .sort((a, b) => hourCounts[b] - hourCounts[a])
      .slice(0, 3)
      .map(h => parseInt(h));
  }

  private static suggestMediaStyle(trendAnalysis: TrendAnalysis): string {
    if (trendAnalysis.media_types.includes('video')) {
      return 'Short-form video with trending audio';
    }
    if (trendAnalysis.media_types.includes('image')) {
      return 'High-quality visuals with text overlay';
    }
    return 'Text-based content with engaging graphics';
  }

  private static calculateOptimalPostingTime(trendAnalysis: TrendAnalysis): Date {
    const peakHour = trendAnalysis.engagement_pattern.peak_hours[0] || 12;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(peakHour, 0, 0, 0);
    return tomorrow;
  }

  private static async getTrendingHashtags(): Promise<any[]> {
    // Implementation for getting trending hashtags
    return [];
  }

  private static async storeTrendAnalyses(analyses: TrendAnalysis[]): Promise<void> {
    const supabase = createAdminClient();
    
    for (const analysis of analyses) {
      await supabase.from('trend_analyses').upsert({
        id: analysis.id,
        trend_title: analysis.trend_title,
        trend_description: analysis.trend_description,
        category: analysis.category,
        platforms: analysis.platforms,
        hashtags: analysis.hashtags,
        keywords: analysis.keywords,
        engagement_pattern: analysis.engagement_pattern,
        content_themes: analysis.content_themes,
        media_types: analysis.media_types,
        sentiment_distribution: analysis.sentiment_distribution,
        viral_score: analysis.viral_score,
        created_at: analysis.created_at.toISOString(),
        updated_at: analysis.updated_at.toISOString(),
      });
    }
  }

  private static async storeContentSuggestions(suggestions: ContentSuggestion[]): Promise<void> {
    const supabase = createAdminClient();
    
    for (const suggestion of suggestions) {
      await supabase.from('content_suggestions').upsert({
        id: suggestion.id,
        trend_analysis_id: suggestion.trend_analysis_id,
        content_type: suggestion.content_type,
        suggested_content: suggestion.suggested_content,
        suggested_hashtags: suggestion.suggested_hashtags,
        suggested_media_style: suggestion.suggested_media_style,
        target_platforms: suggestion.target_platforms,
        optimal_posting_time: suggestion.optimal_posting_time.toISOString(),
        confidence_score: suggestion.confidence_score,
        created_at: suggestion.created_at.toISOString(),
      });
    }
  }

  private static calculateViralityScore(trends: TrendAnalysis[]): number {
    if (trends.length === 0) return 0;
    const avgViralScore = trends.reduce((sum, trend) => sum + trend.viral_score, 0) / trends.length;
    return Math.min(avgViralScore / 1000, 100);
  }
} 