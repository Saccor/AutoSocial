import { createAdminClient } from '@/lib/auth-server';
import { TrendingPost, TrendAnalysis, ContentSuggestion, TrendingHashtag, TrendDashboardData } from '@/types/trending';
import { RedditProvider } from '@/providers/RedditProvider';
import { AIAnalysisService } from './AIAnalysisService';

export class TrendingAnalysisService {
  /**
   * Fetch trending posts from Twitter with optimization for Free tier
   * Strategy: Maximize data value per API call
   */
  static async fetchTwitterTrends(limit: number = 100): Promise<TrendingPost[]> {
    console.log(`🚀 Starting Twitter trending discovery (limit: ${limit})...`);
    
    const now = new Date();
    
    try {
      // Build query to get the most engaging content across all categories
      // Focus on content with high activity potential - remove restrictive filters to get more variety
      const searchQuery = '(#viral OR #trending OR #fyp OR trending OR viral OR popular) -is:reply lang:en';
      
      // Maximize results per API call since we're limited to 1 call per 15 minutes
      const maxResults = Math.min(limit, 100); // Twitter API max is 100
      
      // Construct the API URL with proper parameters
      const apiUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
      apiUrl.searchParams.set('query', searchQuery);
      apiUrl.searchParams.set('max_results', maxResults.toString());
      // Request comprehensive data to maximize value per call
      apiUrl.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id,context_annotations,entities,lang,attachments');
      apiUrl.searchParams.set('user.fields', 'username,name,public_metrics,verified,profile_image_url');
      apiUrl.searchParams.set('expansions', 'author_id,attachments.media_keys,referenced_tweets.id');
      apiUrl.searchParams.set('media.fields', 'type,url,preview_image_url,width,height');

      console.log('🎯 Fetching high-value trending content with URL:', apiUrl.toString());
      
      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'AutoSocial-TrendAnalyzer/1.0'
        },
      });
      
      console.log('📡 Twitter API Response Status:', response.status);
      console.log('📊 Twitter API Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Twitter API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 429) {
          // Check if it's monthly usage cap or rate limit
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }

          // Check for monthly usage cap
          if (errorData.title === 'UsageCapExceeded' && errorData.period === 'Monthly') {
            throw new Error(`🚫 Twitter API monthly limit exceeded (${errorData.product_name}). Monthly cap of 100 posts reached. Access will reset next month.`);
          }

          // Regular rate limiting
          const resetTime = response.headers.get('x-rate-limit-reset');
          const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : null;
          const waitMinutes = resetDate ? Math.ceil((resetDate.getTime() - Date.now()) / 1000 / 60) : 15;
          
          throw new Error(`Twitter API rate limited. Next request available in ${waitMinutes} minutes at ${resetDate?.toLocaleTimeString()}.`);
        } else if (response.status === 401) {
          throw new Error('Twitter API authentication failed. Check your Bearer Token.');
        } else if (response.status === 400) {
          throw new Error(`Twitter API bad request: ${errorText}`);
        } else if (response.status === 403) {
          throw new Error('Twitter API access denied. Your account may not have access to this endpoint.');
        }
        
        throw new Error(`Twitter API failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📈 Twitter API Response Summary:', {
        dataCount: data.data?.length || 0,
        usersCount: data.includes?.users?.length || 0,
        mediaCount: data.includes?.media?.length || 0,
        meta: data.meta,
        sampleTweet: data.data?.[0] ? {
          id: data.data[0].id,
          text: data.data[0].text?.substring(0, 100) + '...',
          metrics: data.data[0].public_metrics
        } : null
      });
      
      // Transform and validate the data with enhanced filtering for trending content
      const transformedPosts = this.transformTwitterData(data);
            console.log(`🔄 Transformed ${transformedPosts.length} posts from ${data.data?.length || 0} Twitter API results`);
      
      if (transformedPosts.length === 0) {
        console.warn('⚠️ No posts passed basic quality filter');
        return [];
      }
      
      // Show engagement distribution of top posts
      const topPosts = transformedPosts.slice(0, 10);
      console.log('📊 Top 10 posts by engagement:');
      topPosts.forEach((post, index) => {
        console.log(`   ${index + 1}. Score: ${post.engagement_score} (${post.likes}👍 ${post.shares}🔄 ${post.comments}💬) - @${post.author_username}`);
      });
      
      console.log(`🏆 Selected top ${transformedPosts.length} most engaging posts for database`);
      
      return transformedPosts; // Already sorted and limited to top 100
      
    } catch (error) {
      console.error('❌ Error fetching Twitter trends:', error);
      
      // Enhanced error handling with actionable feedback
      if (error instanceof Error && error.message.includes('rate limited')) {
        console.log('⏰ Twitter API rate limited. This is normal for Free tier (1 request per 15 minutes).');
        throw error;
      }
      
      if (error instanceof Error && error.message.includes('authentication failed')) {
        throw new Error('Twitter API authentication failed. Please check your Bearer Token in environment variables.');
      }
      
      // For other errors, don't fallback - we want real data only for trending database
      console.error('🚫 No fallback data will be generated - building real trending database only');
      throw error;
    }
  }

  /**
   * Fetch trending posts from Reddit
   * Strategy: Use Reddit's generous API limits to get diverse content
   */
  static async fetchRedditTrends(
    subreddit: string = 'popular',
    limit: number = 100,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<TrendingPost[]> {
    console.log(`🔍 Starting Reddit trending discovery from r/${subreddit}...`);
    
    try {
      const redditPosts = await RedditProvider.fetchTrendingPosts(subreddit, limit, timeframe);
      
      if (redditPosts.length === 0) {
        console.warn('⚠️ No Reddit posts found');
        return [];
      }
      
      console.log(`🏆 Retrieved ${redditPosts.length} trending Reddit posts`);
      
      // Show top posts for verification
      console.log('📊 Top 5 Reddit posts by engagement:');
      redditPosts.slice(0, 5).forEach((post, index) => {
        console.log(`   ${index + 1}. Score: ${post.engagement_score} (${post.likes}⬆️ ${post.comments}💬) - r/${post.platform_post_id.split('_')[0]}`);
      });
      
      return redditPosts;
      
    } catch (error) {
      console.error('❌ Error fetching Reddit trends:', error);
      throw error;
    }
  }

  /**
   * Fetch viral content from multiple Reddit subreddits with maximum efficiency
   */
  static async fetchMultiRedditTrends(
    subreddits: string[] = ['popular', 'all', 'technology', 'entertainment', 'sports', 'news'],
    postsPerSubreddit: number = 50
  ): Promise<TrendingPost[]> {
    console.log(`🔥 Fetching viral content from ${subreddits.length} subreddits (optimized for maximum viral discovery)...`);
    
    // Use the new viral-focused method from RedditProvider
    return await RedditProvider.fetchMultiViralContent(subreddits, postsPerSubreddit);
  }

  /**
   * Remove duplicate posts based on content similarity
   */
  private static removeDuplicatePosts(posts: TrendingPost[]): TrendingPost[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      const key = `${post.platform_post_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Store discovered trending posts in database
   */
  static async storeTrendingPosts(posts: TrendingPost[]): Promise<void> {
    console.log(`📝 Attempting to store ${posts.length} trending posts in database...`);
    
    if (!posts || posts.length === 0) {
      console.log('⚠️ No posts provided to store');
      return;
    }

    const supabase = createAdminClient();
    let storedCount = 0;
    let errorCount = 0;
    
    for (const post of posts) {
      try {
        console.log(`🔄 Storing post: ${post.platform_post_id} by @${post.author_username}`);
        console.log(`📊 Post metrics: ${post.likes} likes, ${post.shares} shares, score: ${post.engagement_score}`);
        
        const { data, error } = await supabase
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
          })
          .select();

        if (error) {
          console.error('❌ Database error storing trending post:', error);
          console.error('❌ Post data that failed:', JSON.stringify(post, null, 2));
          errorCount++;
        } else {
          console.log('✅ Successfully stored post in database');
          storedCount++;
        }
      } catch (error) {
        console.error('❌ Exception processing trending post:', error);
        console.error('❌ Post data that caused exception:', JSON.stringify(post, null, 2));
        errorCount++;
      }
    }
    
    console.log(`📊 Storage summary: ${storedCount} stored, ${errorCount} errors out of ${posts.length} total posts`);
  }

  /**
   * Analyze trending posts to identify patterns
   */
  static async analyzeTrends(): Promise<TrendAnalysis[]> {
    console.log('🔍 Starting trend analysis...');
    const supabase = createAdminClient();
    
    // Get recent trending posts from last 24 hours
    const { data: posts, error } = await supabase
      .from('trending_posts')
      .select('*')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch trending posts for analysis:', error);
      throw new Error(`Failed to fetch trending posts: ${error.message}`);
    }

    console.log(`📊 Found ${posts?.length || 0} trending posts for analysis`);

    if (!posts || posts.length === 0) {
      console.log('⚠️ No trending posts found for analysis - returning empty analyses');
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
   * Create detailed trend analysis with AI-powered insights
   */
  private static async createTrendAnalysis(trendKey: string, posts: any[]): Promise<TrendAnalysis> {
    const now = new Date();
    
    // Calculate basic metrics
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalShares = posts.reduce((sum, p) => sum + (p.shares || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalEngagement = posts.reduce((sum, p) => sum + (p.engagement_score || 0), 0);
    
    const platforms = [...new Set(posts.map(p => p.platform))];
    const hashtags = posts.flatMap(p => p.hashtags || []);
    const hashtagCounts = this.countOccurrences(hashtags);
    const topHashtags = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ hashtag: tag, count, trending_score: count / totalPosts }));

    // 🤖 Enhanced AI Analysis
    console.log(`🤖 Starting AI analysis for trend: ${trendKey}...`);
    let aiInsights: any = null;
    
    try {
      // Check if AI is available and use it for enhanced analysis
      const isAIAvailable = await AIAnalysisService.checkAIAvailability();
      
      if (isAIAvailable) {
        aiInsights = await AIAnalysisService.analyzePostGroup(posts, trendKey);
        console.log(`🤖 AI Analysis completed: "${aiInsights.trendTitle}"`);
      } else {
        console.log('⚠️ AI analysis not available, using fallback analysis');
      }
    } catch (error) {
      console.warn('⚠️ AI analysis failed, using fallback:', error);
    }

    // Use AI insights if available, otherwise fallback to basic analysis
    const trendTitle = aiInsights?.trendTitle || this.generateFallbackTrendTitle(trendKey, posts);
    const trendDescription = aiInsights?.trendDescription || this.generateFallbackDescription(posts);
    const category = aiInsights?.category || this.determineTrendCategory(
      posts.map(p => p.content).join(' '),
      hashtags,
      posts.flatMap(p => p.context_annotations || [])
    );

    // Enhanced engagement patterns with AI insights
    const engagementPattern = {
      avg_likes: Math.round(totalLikes / totalPosts),
      avg_shares: Math.round(totalShares / totalPosts), 
      avg_comments: Math.round(totalComments / totalPosts),
      total_likes: totalLikes,
      total_shares: totalShares,
      total_comments: totalComments,
      total_engagement: totalEngagement,
      peak_hours: this.calculatePeakHours(posts),
      // Add AI insights to engagement patterns
      ...(aiInsights && {
        ai_viral_factors: aiInsights.viralFactors,
        ai_content_themes: aiInsights.contentThemes,
        ai_sentiment: aiInsights.aiSentiment,
        ai_engagement_prediction: aiInsights.engagementPrediction,
        ai_insights: aiInsights.insights
      })
    };

    const analysis: TrendAnalysis = {
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trend_title: trendTitle,
      trend_description: trendDescription,
      category: category,
      total_posts: totalPosts,
      platforms: platforms,
      hashtags: hashtags.slice(0, 10), // Use hashtags instead of top_hashtags
      keywords: this.extractKeywords(posts.map(p => p.content).join(' ')),
      content_themes: this.extractContentThemes(posts.map(p => p.content).join(' ')),
      media_types: this.analyzeMediaTypes(posts),
      sentiment_distribution: this.calculateSentimentDistribution(posts),
      viral_score: this.calculateTrendingScore(posts),
      engagement_pattern: engagementPattern, // Use engagement_pattern instead of engagement_patterns
      sample_posts: posts.slice(0, 5).map((post: any): TrendingPost => ({
        id: post.id,
        platform: post.platform,
        platform_post_id: post.platform_post_id,
        author_username: post.author_username,
        author_display_name: post.author_display_name || post.author_username,
        author_followers: post.author_followers || 0,
        content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
        media_urls: post.media_urls || [],
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        post_url: post.post_url || '',
        engagement_score: post.engagement_score,
        likes: post.likes || 0,
        shares: post.shares || 0,
        comments: post.comments || 0,
        views: post.views || 0,
        published_at: new Date(post.published_at),
        discovered_at: new Date(post.discovered_at),
        trend_category: post.trend_category,
        sentiment: post.sentiment
      })),
      created_at: now,
      updated_at: now,
      // Add AI insights as additional data
      ai_analysis: aiInsights ? {
        insights: aiInsights.insights,
        viral_factors: aiInsights.viralFactors,
        content_themes: aiInsights.contentThemes,
        sentiment: aiInsights.aiSentiment,
        engagement_prediction: aiInsights.engagementPrediction
      } : undefined
    };

    return analysis;
  }

  /**
   * Calculate trending score for a group of posts
   */
  private static calculateTrendingScore(posts: any[]): number {
    if (!posts || posts.length === 0) return 0;
    
    const totalEngagement = posts.reduce((sum, post) => sum + (post.engagement_score || 0), 0);
    const avgEngagement = totalEngagement / posts.length;
    
    // Normalize score to 0-100 range
    return Math.min(Math.round(avgEngagement / 100), 100);
  }

  /**
   * Generate fallback trend title when AI is not available
   */
  private static generateFallbackTrendTitle(trendKey: string, posts: any[]): string {
    const platforms = [...new Set(posts.map(p => p.platform))];
    const platformText = platforms.length === 1 ? platforms[0] : 'Multi-platform';
    
    if (trendKey.includes('r/')) {
      return `${trendKey} Community Trends`;
    } else if (trendKey.includes('#')) {
      return `${trendKey} Trending`;
    } else {
      return `${trendKey} ${platformText} Trends`;
    }
  }

  /**
   * Generate fallback description when AI is not available
   */
  private static generateFallbackDescription(posts: any[]): string {
    const platforms = [...new Set(posts.map(p => p.platform))];
    const totalEngagement = posts.reduce((sum, p) => sum + (p.engagement_score || 0), 0);
    
    return `Analysis of ${posts.length} viral posts from ${platforms.join(', ')}. ${totalEngagement.toLocaleString()} total engagement across trending content.`;
  }

  /**
   * Generate AI-powered content suggestions with fallback
   */
  static async generateContentSuggestions(trendAnalysis: TrendAnalysis): Promise<ContentSuggestion[]> {
    const suggestions: ContentSuggestion[] = [];
    
    // Try AI-powered suggestions first
    try {
      const isAIAvailable = await AIAnalysisService.checkAIAvailability();
      
      if (isAIAvailable && trendAnalysis.ai_analysis) {
        console.log('🤖 Generating AI-powered content suggestions...');
        const aiSuggestions = await AIAnalysisService.generateAIContentSuggestions(
          trendAnalysis, 
          trendAnalysis.ai_analysis
        );
        
        if (aiSuggestions.length > 0) {
          console.log(`🤖 Generated ${aiSuggestions.length} AI content suggestions`);
          return aiSuggestions;
        }
      }
    } catch (error) {
      console.warn('⚠️ AI content suggestions failed, using fallback:', error);
    }

    // Fallback to basic suggestions
    console.log('📝 Generating fallback content suggestions...');
    const contentTypes: ('reel' | 'post' | 'story' | 'carousel')[] = ['reel', 'post', 'story', 'carousel'];
    
    contentTypes.forEach(contentType => {
      suggestions.push(this.createContentSuggestion(trendAnalysis, contentType));
    });

    return suggestions;
  }

  /**
   * Get dashboard data for trending analysis
   */
  static async getTrendDashboardData(): Promise<TrendDashboardData> {
    console.log('🚀 Fetching MAXIMUM VIRAL dashboard analytics...');
    const supabase = createAdminClient();
    
    // Get comprehensive viral statistics
    const { data: viralPosts } = await supabase
      .from('trending_posts')
      .select('*')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false });

    console.log(`📊 Total viral posts in last 24h: ${viralPosts?.length || 0}`);
    
    // Get recent trend analyses
    const { data: trends } = await supabase
      .from('trend_analyses')
      .select('*')
      .order('viral_score', { ascending: false })
      .limit(15); // Increased for better analysis

    // Get trending hashtags with enhanced data
    const trendingHashtags = await this.getTrendingHashtags();
    
    // Get content suggestions with higher limits
    const { data: suggestions } = await supabase
      .from('content_suggestions')
      .select('*')
      .order('confidence_score', { ascending: false })
      .limit(12); // Increased for more suggestions

    // Calculate enhanced platform breakdown with viral metrics
    const { data: platformData } = await supabase
      .from('trending_posts')
      .select('platform, engagement_score')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const platformBreakdown: { [platform: string]: number } = {};
    const platformEngagement: { [platform: string]: number } = {};
    
    platformData?.forEach(post => {
      const platform = post.platform || 'unknown';
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      platformEngagement[platform] = (platformEngagement[platform] || 0) + (post.engagement_score || 0);
    });

    // Enhanced category analysis with viral metrics
    const { data: categoryData } = await supabase
      .from('trending_posts')
      .select('trend_category, engagement_score, platform, published_at')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false });

    const categoryBreakdown: { [category: string]: number } = {};
    const categoryEngagement: { [category: string]: number } = {};
    const categoryPlatforms: { [category: string]: Set<string> } = {};
    
    categoryData?.forEach(post => {
      const category = post.trend_category || 'General';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      categoryEngagement[category] = (categoryEngagement[category] || 0) + (post.engagement_score || 0);
      
      if (!categoryPlatforms[category]) {
        categoryPlatforms[category] = new Set();
      }
      categoryPlatforms[category].add(post.platform || 'unknown');
    });

    // Enhanced category sorting with viral metrics
    const sortedCategories = Object.entries(categoryBreakdown)
      .map(([category, count]) => ({
        category,
        count,
        totalEngagement: categoryEngagement[category] || 0,
        avgEngagement: Math.round((categoryEngagement[category] || 0) / count),
        platforms: Array.from(categoryPlatforms[category] || []),
        viralityRating: this.calculateCategoryViralityRating(category, categoryEngagement[category] || 0, count)
      }))
      .sort((a, b) => b.totalEngagement - a.totalEngagement);
    
    console.log(`📊 VIRAL ANALYTICS SUMMARY:`);
    console.log(`   Total Posts: ${viralPosts?.length || 0}`);
    console.log(`   Categories: ${sortedCategories.length}`);
    console.log(`   Platforms: ${Object.keys(platformBreakdown).length}`);
    console.log(`🔥 Top viral categories:`);
    sortedCategories.slice(0, 5).forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.category}: ${cat.count} posts, ${cat.totalEngagement} engagement (${cat.viralityRating})`);
    });

    // Extract viral keywords from top performing content
    const { data: contentData } = await supabase
      .from('trending_posts')
      .select('content, hashtags, engagement_score')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('engagement_score', { ascending: false })
      .limit(200); // Increased for better keyword analysis

    const allContent = contentData?.map(post => post.content).join(' ') || '';
    const keywordStrings = this.extractKeywords(allContent).slice(0, 15); // More keywords
    
    // Enhanced keyword analysis
    const trendingKeywords = keywordStrings.map(keyword => {
      const frequency = (allContent.match(new RegExp(keyword, 'gi')) || []).length;
      const relevantPosts = contentData?.filter(post => 
        post.content.toLowerCase().includes(keyword.toLowerCase())
      ) || [];
      const avgEngagement = relevantPosts.length > 0 
        ? relevantPosts.reduce((sum, post) => sum + (post.engagement_score || 0), 0) / relevantPosts.length
        : 0;
      
      return {
        keyword,
        frequency,
        context: ['viral', 'trending'],
        sentiment: this.analyzeSentiment(keyword),
        platforms: ['reddit', 'twitter'],
        growth_rate: Math.min(frequency / 10, 2.0), // Calculate relative growth
        related_hashtags: [],
        avgEngagement: Math.round(avgEngagement)
      };
    }).sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Calculate enhanced engagement trends
    const engagementTrends = this.calculateEngagementTrends(viralPosts || []);
    
    // Calculate enhanced virality score
    const enhancedViralityScore = this.calculateEnhancedViralityScore(
      viralPosts || [], 
      trends || [], 
      sortedCategories
    );

    const result = {
      topTrends: trends || [],
      trendingHashtags,
      trendingKeywords,
      contentSuggestions: suggestions || [],
      platformBreakdown: Object.fromEntries(
        Object.entries(platformBreakdown).map(([platform, count]) => [
          platform,
          count
        ])
      ),
      categoryBreakdown: sortedCategories.reduce((acc, item) => {
        acc[item.category] = item.count;
        return acc;
      }, {} as { [category: string]: number }),
      engagementTrends,
      viralityScore: enhancedViralityScore,
      trendingCategories: sortedCategories.slice(0, 10), // Top 10 viral categories
    };

    console.log(`✅ VIRAL DASHBOARD DATA READY:`);
    console.log(`   Trends: ${result.topTrends.length}`);
    console.log(`   Keywords: ${result.trendingKeywords.length}`);
    console.log(`   Suggestions: ${result.contentSuggestions.length}`);
    console.log(`   Virality Score: ${result.viralityScore}%`);

    return result;
  }

  /**
   * Helper methods
   */
  private static transformTwitterData(twitterData: any): TrendingPost[] {
    // Transform Twitter API response to our TrendingPost format
    
    if (!twitterData.data || !Array.isArray(twitterData.data)) {
      console.warn('No data found in Twitter response');
      return [];
    }
    
    // Create a map of users by ID for quick lookup
    const usersMap: { [key: string]: any } = {};
    if (twitterData.includes?.users) {
      twitterData.includes.users.forEach((user: any) => {
        usersMap[user.id] = user;
      });
    }
    
    return twitterData.data.map((tweet: any) => {
      const author = usersMap[tweet.author_id] || {};
      const hashtags = this.extractHashtags(tweet.text || '');
      const mentions = this.extractMentions(tweet.text || '');
      
      // Enhanced trend categorization based on hashtags, content, and context
      let trendCategory = this.determineTrendCategory(tweet.text || '', hashtags, tweet.context_annotations || []);
      
      return {
        id: tweet.id,
        platform: 'twitter' as const,
        platform_post_id: tweet.id,
        author_username: author.username || 'unknown',
        author_display_name: author.name || 'Unknown',
        author_followers: author.public_metrics?.followers_count || 0,
        content: tweet.text || '',
        media_urls: tweet.attachments?.media_keys || [],
        hashtags,
        mentions,
        post_url: `https://twitter.com/${author.username || 'user'}/status/${tweet.id}`,
        engagement_score: this.calculateEngagementScore(tweet.public_metrics || {}),
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        comments: tweet.public_metrics?.reply_count || 0,
        views: tweet.public_metrics?.impression_count || 0,
        published_at: new Date(tweet.created_at || Date.now()),
        discovered_at: new Date(),
        trend_category: trendCategory,
        sentiment: this.analyzeSentiment(tweet.text || ''),
      };
         }).filter((post: any) => {
      // Basic quality filter only - we want ALL tweets with any engagement
      const hasBasicQuality = (
        post.content && 
        post.content.length > 5 && 
        post.author_username !== 'unknown' &&
        post.engagement_score > 0  // Must have some engagement activity
      );
      
      return hasBasicQuality;
    })
    .sort((a: any, b: any) => b.engagement_score - a.engagement_score) // Sort by highest engagement first
    .slice(0, 100); // Take top 100 most engaging tweets
  }

  private static groupPostsByTrends(posts: any[]): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    posts.forEach(post => {
      // Create diverse grouping strategies for different platforms
      let groupKeys: string[] = [];
      
      if (post.platform === 'reddit') {
        // For Reddit: Group by category first, then subreddit, then keywords
        const category = post.trend_category || 'General';
        const subreddit = post.platform_post_id?.split('_')[0] || 'unknown';
        
        // Extract keywords from content for more diverse grouping
        const keywords = this.extractKeywords(post.content || '').slice(0, 3);
        
        // Create multiple potential groups
        groupKeys = [
          `${category}`, // Group by category
          `r/${subreddit}`, // Group by subreddit
          ...keywords.map(keyword => `${keyword}`) // Group by keywords
        ];
      } else {
        // For Twitter and other platforms: use hashtags and categories
        const hashtags = post.hashtags || [];
        const category = post.trend_category || 'General';
        
        groupKeys = [
          ...hashtags.slice(0, 2), // Top 2 hashtags
          category // Category as fallback
        ];
      }
      
      // Use the first available grouping key, fallback to category or 'general'
      const key = groupKeys.find(k => k && k !== '' && k !== 'undefined') || post.trend_category || 'general';
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(post);
    });
    
    // Filter out groups with too few posts (less than 2) to ensure meaningful trends
    const filteredGroups: { [key: string]: any[] } = {};
    Object.entries(groups).forEach(([key, posts]) => {
      if (posts.length >= 2) {
        filteredGroups[key] = posts;
      }
    });
    
    // If we have no groups with 2+ posts, take the largest groups anyway
    if (Object.keys(filteredGroups).length === 0) {
      const sortedGroups = Object.entries(groups).sort(([,a], [,b]) => b.length - a.length);
      sortedGroups.slice(0, 5).forEach(([key, posts]) => {
        filteredGroups[key] = posts;
      });
    }
    
    return filteredGroups;
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
    const { 
      like_count = 0, 
      retweet_count = 0, 
      reply_count = 0, 
      quote_count = 0,
      bookmark_count = 0,
      impression_count = 0
    } = metrics;
    
    // Comprehensive engagement scoring that weighs all activity types
    const engagementScore = 
      (like_count * 1) +           // Likes = base engagement
      (retweet_count * 3) +        // Retweets = high value (sharing)
      (reply_count * 4) +          // Replies = very high value (conversation)
      (quote_count * 3) +          // Quote tweets = high value (commentary)
      (bookmark_count * 2) +       // Bookmarks = good engagement signal
      (impression_count * 0.001);  // Views = reach indicator (weighted down)
    
    return Math.round(engagementScore);
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

  private static determineTrendCategory(text: string, hashtags: string[], contextAnnotations: any[]): string {
    const lowerText = text.toLowerCase();
    
    // Enhanced categorization with multiple signals
    const categories = {
      'Technology': {
        hashtags: ['#tech', '#ai', '#coding', '#software', '#app', '#crypto', '#blockchain', '#web3', '#ml'],
        keywords: ['artificial intelligence', 'machine learning', 'blockchain', 'cryptocurrency', 'software', 'app', 'tech', 'digital'],
        contexts: ['Technology', 'Software', 'Cryptocurrency']
      },
      'Entertainment': {
        hashtags: ['#movie', '#music', '#celebrity', '#show', '#entertainment', '#netflix', '#spotify', '#viral', '#trending'],
        keywords: ['movie', 'music', 'celebrity', 'actor', 'singer', 'show', 'series', 'film', 'album'],
        contexts: ['Entertainment', 'Music', 'Movies', 'Television']
      },
      'Sports': {
        hashtags: ['#football', '#basketball', '#soccer', '#nfl', '#nba', '#sports', '#game', '#fifa'],
        keywords: ['football', 'basketball', 'soccer', 'game', 'player', 'team', 'match', 'championship'],
        contexts: ['Sports', 'Football', 'Basketball', 'Soccer']
      },
      'Business': {
        hashtags: ['#business', '#startup', '#entrepreneur', '#investing', '#stocks', '#finance', '#money'],
        keywords: ['business', 'startup', 'money', 'investment', 'finance', 'stocks', 'market', 'economy'],
        contexts: ['Business', 'Finance', 'Entrepreneurship']
      },
      'Lifestyle': {
        hashtags: ['#fashion', '#food', '#travel', '#fitness', '#health', '#style', '#beauty', '#wellness'],
        keywords: ['fashion', 'food', 'travel', 'fitness', 'health', 'style', 'beauty', 'workout'],
        contexts: ['Fashion', 'Food', 'Travel', 'Health']
      },
      'News & Politics': {
        hashtags: ['#news', '#politics', '#breaking', '#election', '#government', '#policy'],
        keywords: ['news', 'politics', 'election', 'government', 'president', 'vote', 'policy'],
        contexts: ['Politics', 'Government', 'News']
      },
      'Social Media': {
        hashtags: ['#viral', '#trending', '#meme', '#tiktok', '#instagram', '#twitter', '#socialmedia'],
        keywords: ['viral', 'trending', 'meme', 'influencer', 'content creator', 'social media'],
        contexts: ['Social Media', 'Internet Culture']
      }
    };
    
    // Check hashtags first (most reliable)
    for (const [category, data] of Object.entries(categories)) {
      if (hashtags.some(tag => data.hashtags.includes(tag.toLowerCase()))) {
        return category;
      }
    }
    
    // Check context annotations from Twitter
    for (const [category, data] of Object.entries(categories)) {
      if (contextAnnotations.some(ctx => 
        data.contexts.some(context => 
          ctx.domain?.name?.includes(context) || ctx.entity?.name?.includes(context)
        )
      )) {
        return category;
      }
    }
    
    // Check keywords in content
    for (const [category, data] of Object.entries(categories)) {
      if (data.keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
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
    
    posts.forEach((post: any) => {
      if (post.sentiment && (post.sentiment === 'positive' || post.sentiment === 'negative' || post.sentiment === 'neutral')) {
        distribution[post.sentiment as keyof typeof distribution]++;
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
        updated_at: analysis.created_at.toISOString(),
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

  private static calculateCategoryViralityRating(category: string, totalEngagement: number, count: number): string {
    const avgEngagement = totalEngagement / count;
    
    if (avgEngagement > 1000) return '🔥🔥🔥 SUPER VIRAL';
    if (avgEngagement > 500) return '🔥🔥 HIGHLY VIRAL';
    if (avgEngagement > 200) return '🔥 VIRAL';
    if (avgEngagement > 50) return '📈 TRENDING';
    return '📊 ACTIVE';
  }

  private static calculateEngagementTrends(posts: TrendingPost[]): Array<{
    date: string;
    avgEngagement: number;
    postCount: number;
  }> {
    if (!posts.length) return [];
    
    // Group posts by hour for the last 24 hours
    const hourlyData: { [hour: string]: { engagement: number; count: number } } = {};
    
    posts.forEach(post => {
      const postDate = new Date(post.discovered_at || post.published_at);
      const hourKey = postDate.toISOString().slice(0, 13) + ':00:00.000Z'; // Round to hour
      
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = { engagement: 0, count: 0 };
      }
      
      hourlyData[hourKey].engagement += post.engagement_score || 0;
      hourlyData[hourKey].count += 1;
    });
    
    // Convert to required format and sort by time
    return Object.entries(hourlyData)
      .map(([date, data]) => ({
        date,
        avgEngagement: Math.round(data.engagement / data.count),
        postCount: data.count
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-24); // Last 24 hours
  }

  private static calculateEnhancedViralityScore(viralPosts: TrendingPost[], trends: TrendAnalysis[], sortedCategories: any[]): number {
    if (!viralPosts.length) return 0;
    
    // Calculate base engagement score
    const totalEngagement = viralPosts.reduce((sum, post) => sum + (post.engagement_score || 0), 0);
    const avgEngagement = totalEngagement / viralPosts.length;
    
    // Factor in trend diversity
    const trendDiversity = Math.min(trends.length * 5, 30);
    
    // Factor in category diversity
    const categoryDiversity = Math.min(sortedCategories.length * 8, 40);
    
    // Factor in recent activity (posts in last hour get bonus)
    const recentPosts = viralPosts.filter(post => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return new Date(post.discovered_at) > hourAgo;
    });
    const recencyBonus = Math.min(recentPosts.length * 2, 20);
    
    // Calculate final virality score (0-100)
    const baseScore = Math.min(avgEngagement / 100, 40);
    const finalScore = baseScore + trendDiversity + categoryDiversity + recencyBonus;
    
    return Math.min(Math.round(finalScore), 100);
  }
} 