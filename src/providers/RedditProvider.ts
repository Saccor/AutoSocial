import { TrendingPost } from '../types/trending';

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  url: string;
  permalink: string;
  thumbnail: string;
  created_utc: number;
  over_18: boolean;
  stickied: boolean;
  is_video: boolean;
  media?: any;
  preview?: any;
  post_hint?: string;
}

export interface RedditResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
    after?: string;
    before?: string;
  };
}

export class RedditProvider {
  private static readonly BASE_URL = 'https://www.reddit.com';
  private static readonly USER_AGENT = 'AutoSocial:v1.0.0 (by /u/AutoSocialBot)';
  
  // Rate limiting: 100 requests per minute, 996 per 10 minutes
  private static readonly MAX_REQUESTS_PER_MINUTE = 100;
  private static readonly MAX_REQUESTS_PER_10_MIN = 996;
  private static readonly MAX_ITEMS_PER_SUBREDDIT = 1000;
  private static readonly ITEMS_PER_REQUEST = 100;
  
  private static requestTimestamps: number[] = [];
  private static lastRequestTime = 0;

  /**
   * Rate limiting and backoff implementation
   */
  private static async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old timestamps (older than 10 minutes)
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 10 * 60 * 1000
    );
    
    // Check if we're hitting rate limits
    const recentRequests = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60 * 1000
    ).length;
    
    if (recentRequests >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = 60000 - (now - this.requestTimestamps[this.requestTimestamps.length - this.MAX_REQUESTS_PER_MINUTE]);
      console.log(`⏳ Rate limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    if (this.requestTimestamps.length >= this.MAX_REQUESTS_PER_10_MIN) {
      const waitTime = 10 * 60 * 1000 - (now - this.requestTimestamps[0]);
      console.log(`⏳ 10-minute limit reached, waiting ${Math.ceil(waitTime / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add delay between requests to be respectful
    if (now - this.lastRequestTime < 600) { // 600ms = 100 req/min max
      await new Promise(resolve => setTimeout(resolve, 600 - (now - this.lastRequestTime)));
    }
    
    this.requestTimestamps.push(Date.now());
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetch maximum viral posts with pagination (up to 1,000 per subreddit)
   * @param subreddit - Subreddit to fetch from
   * @param maxItems - Maximum items to fetch (up to 1,000)
   * @param timeframe - Time period for trending posts
   */
  static async fetchMaxViralPosts(
    subreddit: string = 'popular',
    maxItems: number = 1000,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<TrendingPost[]> {
    try {
      const targetItems = Math.min(maxItems, this.MAX_ITEMS_PER_SUBREDDIT);
      const pagesNeeded = Math.ceil(targetItems / this.ITEMS_PER_REQUEST);
      
      console.log(`🚀 MAXIMUM VIRAL DISCOVERY: r/${subreddit}`);
      console.log(`📊 Target: ${targetItems} items across ${pagesNeeded} pages (${this.ITEMS_PER_REQUEST} per page)`);
      
      const allPosts: TrendingPost[] = [];
      let after: string | null = null;
      
      for (let page = 0; page < pagesNeeded; page++) {
        await this.checkRateLimit();
        
        const url = new URL(`${this.BASE_URL}/r/${subreddit}/top.json`);
        url.searchParams.set('t', timeframe);
        url.searchParams.set('limit', this.ITEMS_PER_REQUEST.toString());
        if (after) url.searchParams.set('after', after);
        
        console.log(`📡 Page ${page + 1}/${pagesNeeded}: ${url.toString()}`);
        
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': this.USER_AGENT,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Reddit API Error (page ${page + 1}):`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          // Implement exponential backoff on error
          if (response.status === 429) {
            const backoffTime = Math.min(1000 * Math.pow(2, page), 30000);
            console.log(`⏳ Rate limited, backing off ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            page--; // Retry this page
            continue;
          }
          
          break; // Stop on other errors but return what we have
        }

        const data: RedditResponse = await response.json();
        
        if (!data.data.children.length) {
          console.log(`✅ No more posts available after page ${page + 1}`);
          break;
        }
        
        const transformedPosts = this.transformRedditData(data.data.children);
        allPosts.push(...transformedPosts);
        
        console.log(`📄 Page ${page + 1}: ${transformedPosts.length}/${data.data.children.length} viral posts (${allPosts.length} total)`);
        
        after = data.data.after || null;
        if (!after) {
          console.log(`✅ Reached end of subreddit after page ${page + 1}`);
          break;
        }
      }
      
      // Sort by viral engagement score
      const sortedPosts = allPosts.sort((a, b) => b.engagement_score - a.engagement_score);
      
      console.log(`🏆 VIRAL DISCOVERY COMPLETE: ${sortedPosts.length} posts from r/${subreddit}`);
      console.log('🔥 Top 3 most viral:');
      sortedPosts.slice(0, 3).forEach((post, index) => {
        console.log(`   ${index + 1}. Score: ${post.engagement_score} (${post.likes}⬆️ ${post.comments}💬)`);
      });

      return sortedPosts;

    } catch (error) {
      console.error('❌ Error in maximum viral discovery:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async fetchTrendingPosts(
    subreddit: string = 'popular',
    limit: number = 100,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<TrendingPost[]> {
    // Use the new maximum viral discovery method
    return this.fetchMaxViralPosts(subreddit, limit, timeframe);
  }

  /**
   * Transform Reddit API data to our TrendingPost format
   */
  private static transformRedditData(posts: Array<{ data: RedditPost }>): TrendingPost[] {
    return posts
      .filter(item => this.isValidPost(item.data))
      .map(item => this.transformPost(item.data))
      .filter(post => post !== null) as TrendingPost[];
  }

  /**
   * Check if Reddit post meets viral quality criteria
   */
  private static isValidPost(post: RedditPost): boolean {
    return (
      Boolean(post.title) &&
      post.title.length > 5 &&
      !post.stickied &&
      !post.over_18 && // Skip NSFW content
      post.score > 50 && // Higher minimum for viral content
      post.num_comments > 5 && // Must have engagement
      post.upvote_ratio > 0.6 && // Must be well-received
      post.author !== '[deleted]' &&
      Boolean(post.subreddit) &&
      !post.title.toLowerCase().includes('test')
    );
  }

  /**
   * Transform single Reddit post to TrendingPost format
   */
  private static transformPost(post: RedditPost): TrendingPost {
    // Extract hashtags from title (Reddit doesn't use hashtags, so we'll generate based on subreddit)
    const hashtags = [
      `#${post.subreddit.toLowerCase()}`,
      ...(post.title.match(/#\w+/g) || [])
    ];

    // Extract mentions (Reddit uses u/ format)
    const mentions = post.title.match(/u\/\w+/g) || [];

    // Calculate engagement score
    const engagementScore = this.calculateEngagementScore(post);

    // Determine category based on subreddit and content
    const category = this.categorizeRedditPost(post);

    // Get media URLs if available
    const mediaUrls = this.extractMediaUrls(post);

    // Create content combining title and selftext (keep full content)
    const content = post.selftext 
      ? `${post.title}\n\n${post.selftext}`
      : post.title;

    return {
      id: `reddit_${post.id}`,
      platform: 'reddit',
      platform_post_id: `${post.subreddit}_${post.id}`,
      author_username: post.author,
      author_display_name: post.author,
      author_followers: 0, // Reddit doesn't provide follower count in this API
      content,
      media_urls: mediaUrls,
      hashtags,
      mentions,
      post_url: `${RedditProvider.BASE_URL}${post.permalink}`,
      engagement_score: engagementScore,
      likes: post.score, // Reddit upvotes
      shares: post.num_comments, // Use comments as "shares" since they're Reddit's main engagement action
      comments: post.num_comments, // Keep original comments count for analysis
      views: 0, // Reddit doesn't provide view count in free API
      published_at: new Date(post.created_utc * 1000),
      discovered_at: new Date(),
      trend_category: category,
      sentiment: this.analyzeSentiment(post.title)
    };
  }

  /**
   * Calculate viral engagement score for Reddit post
   */
  private static calculateEngagementScore(post: RedditPost): number {
    // Enhanced viral scoring algorithm
    const adjustedUpvotes = post.score * (post.upvote_ratio || 0.5);
    const commentWeight = post.num_comments * 3; // Comments indicate viral discussion
    const ratioBonus = (post.upvote_ratio || 0) > 0.8 ? post.score * 0.5 : 0; // Bonus for highly positive posts
    const recencyBonus = this.calculateRecencyBonus(post.created_utc); // Recent posts get bonus
    
    return Math.round(adjustedUpvotes + commentWeight + ratioBonus + recencyBonus);
  }

  /**
   * Calculate recency bonus for viral scoring
   */
  private static calculateRecencyBonus(createdUtc: number): number {
    const hoursAgo = (Date.now() / 1000 - createdUtc) / 3600;
    
    // Give bonus to recent posts (within 12 hours)
    if (hoursAgo <= 2) return 100; // Very recent posts get big bonus
    if (hoursAgo <= 6) return 50;  // Recent posts get medium bonus
    if (hoursAgo <= 12) return 25; // Moderately recent posts get small bonus
    
    return 0; // No bonus for older posts
  }

  /**
   * Categorize Reddit post based on subreddit and content
   */
  private static categorizeRedditPost(post: RedditPost): string {
    const subreddit = post.subreddit.toLowerCase();
    const content = (post.title + ' ' + (post.selftext || '')).toLowerCase();

    // Technology subreddits and keywords
    if (['technology', 'programming', 'webdev', 'javascript', 'python', 'machinelearning', 'artificial', 'crypto', 'bitcoin', 'ethereum'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Technology';
    }

    // Entertainment subreddits
    if (['movies', 'television', 'music', 'entertainment', 'celebrity', 'netflix', 'gaming', 'games'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Entertainment';
    }

    // Sports subreddits
    if (['sports', 'nfl', 'nba', 'soccer', 'football', 'basketball', 'hockey', 'baseball'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Sports';
    }

    // News and Politics
    if (['news', 'worldnews', 'politics', 'political', 'election', 'government'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'News & Politics';
    }

    // Business and Finance
    if (['business', 'finance', 'investing', 'stocks', 'economy', 'entrepreneur', 'startup'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Business';
    }

    // Lifestyle
    if (['food', 'fitness', 'fashion', 'travel', 'health', 'cooking', 'style', 'beauty'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Lifestyle';
    }

    // Social Media and Internet Culture
    if (['meme', 'dankmemes', 'funny', 'viral', 'internetculture', 'socialmedia'].some(term => 
        subreddit.includes(term) || content.includes(term))) {
      return 'Social Media';
    }

    return 'General';
  }

  /**
   * Extract media URLs from Reddit post
   */
  private static extractMediaUrls(post: RedditPost): string[] {
    const urls: string[] = [];

    // Check for direct image/video URLs
    if (post.url && (post.url.includes('.jpg') || post.url.includes('.png') || post.url.includes('.gif') || post.url.includes('.mp4'))) {
      urls.push(post.url);
    }

    // Check for Reddit media
    if (post.media?.reddit_video?.fallback_url) {
      urls.push(post.media.reddit_video.fallback_url);
    }

    // Check for preview images
    if (post.preview?.images?.[0]?.source?.url) {
      urls.push(post.preview.images[0].source.url.replace(/&amp;/g, '&'));
    }

    // Check for thumbnail
    if (post.thumbnail && post.thumbnail.startsWith('http')) {
      urls.push(post.thumbnail);
    }

    return urls;
  }

  /**
   * Analyze sentiment of Reddit post title
   */
  private static analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['amazing', 'awesome', 'great', 'excellent', 'fantastic', 'wonderful', 'love', 'best', 'incredible', 'brilliant'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'hate', 'disgusting', 'disappointed', 'failed', 'disaster', 'tragic'];
    
    const lowerText = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Get trending subreddits optimized for viral content discovery
   */
  static getTrendingSubreddits(): string[] {
    return [
      'popular',
      'all',
      'technology',
      'programming',
      'entertainment',
      'movies',
      'music',
      'gaming',
      'sports',
      'news',
      'worldnews',
      'business',
      'investing',
      'cryptocurrency',
      'funny',
      'memes',
      'lifestyle',
      'food',
      'fitness',
      'travel'
    ];
  }

  /**
   * Fetch MAXIMUM viral content from multiple subreddits with full pagination
   */
  static async fetchMultiViralContent(
    subreddits: string[] = ['popular', 'all', 'technology', 'entertainment', 'sports'],
    maxPostsPerSubreddit: number = 1000
  ): Promise<TrendingPost[]> {
    console.log(`🚀 MAXIMUM VIRAL DISCOVERY FROM ${subreddits.length} SUBREDDITS`);
    console.log(`📊 Target: ${maxPostsPerSubreddit} posts per subreddit (up to ${subreddits.length * maxPostsPerSubreddit} total)`);
    console.log(`⏱️ Rate limit: ${this.MAX_REQUESTS_PER_MINUTE}/min, ${this.MAX_REQUESTS_PER_10_MIN}/10min`);
    
    const allPosts: TrendingPost[] = [];
    
    // Process subreddits sequentially to respect rate limits
    for (let i = 0; i < subreddits.length; i++) {
      const subreddit = subreddits[i];
      try {
        console.log(`\n🎯 Processing ${i + 1}/${subreddits.length}: r/${subreddit}`);
        const posts = await this.fetchMaxViralPosts(subreddit, maxPostsPerSubreddit, 'day');
        allPosts.push(...posts);
        
        console.log(`✅ r/${subreddit}: ${posts.length} viral posts collected (${allPosts.length} total so far)`);
        
        // Show progress
        const remaining = subreddits.length - i - 1;
        if (remaining > 0) {
          console.log(`📈 Progress: ${((i + 1) / subreddits.length * 100).toFixed(1)}% - ${remaining} subreddits remaining`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from r/${subreddit}:`, error);
        // Continue with other subreddits
      }
    }

    // Remove duplicates and sort by viral score
    const uniquePosts = this.removeDuplicatePosts(allPosts);
    const sortedPosts = uniquePosts.sort((a, b) => b.engagement_score - a.engagement_score);
    
    console.log(`\n🏆 MAXIMUM VIRAL DISCOVERY COMPLETE!`);
    console.log(`📊 Final stats: ${sortedPosts.length} unique viral posts from ${subreddits.length} subreddits`);
    console.log(`🔥 Top 5 most viral across all subreddits:`);
    sortedPosts.slice(0, 5).forEach((post, index) => {
      const subreddit = post.platform_post_id.split('_')[0];
      console.log(`   ${index + 1}. Score: ${post.engagement_score} (${post.likes}⬆️ ${post.comments}💬) - r/${subreddit}`);
    });

    return sortedPosts; // Return all viral posts (no limit for maximum discovery)
  }

  /**
   * Remove duplicate posts based on platform post ID (more reliable than content truncation)
   */
  private static removeDuplicatePosts(posts: TrendingPost[]): TrendingPost[] {
    const seen = new Set();
    return posts.filter(post => {
      // Use platform_post_id as unique identifier (already includes subreddit_postid)
      const key = post.platform_post_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
} 