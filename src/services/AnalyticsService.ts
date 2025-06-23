import { createAdminClient } from '@/lib/auth-server';
import { SocialPost, PostMetrics, AnalyticsData, DashboardStats } from '@/types/analytics';
import { SupportedPlatform } from '@/types/social';

export class AnalyticsService {
  /**
   * Save a post to the database for tracking
   */
  static async savePost(postData: {
    user_id: string;
    platform: SupportedPlatform;
    platform_post_id: string;
    account_identifier: string;
    content: string;
    media_urls?: string[];
    post_url?: string;
    status: 'published' | 'failed' | 'pending' | 'draft';
    error_message?: string;
    scheduled_at?: Date;
    published_at?: Date;
  }): Promise<SocialPost> {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...postData,
        scheduled_at: postData.scheduled_at?.toISOString(),
        published_at: postData.published_at?.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save post: ${error.message}`);
    }

    return {
      ...data,
      scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
      published_at: data.published_at ? new Date(data.published_at) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }

  /**
   * Get posts for a user
   */
  static async getUserPosts(
    userId: string,
    limit: number = 50,
    platform?: SupportedPlatform
  ): Promise<SocialPost[]> {
    const supabase = createAdminClient();
    
    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get posts: ${error.message}`);
    }

    return (data || []).map(post => ({
      ...post,
      scheduled_at: post.scheduled_at ? new Date(post.scheduled_at) : undefined,
      published_at: post.published_at ? new Date(post.published_at) : undefined,
      created_at: new Date(post.created_at),
      updated_at: new Date(post.updated_at),
    }));
  }

  /**
   * Get dashboard analytics for a user
   */
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    const supabase = createAdminClient();
    
    // Get connected accounts count
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId);

    if (accountsError) {
      throw new Error(`Failed to get accounts: ${accountsError.message}`);
    }

    // Get posts statistics
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('status, platform')
      .eq('user_id', userId);

    if (postsError) {
      throw new Error(`Failed to get posts: ${postsError.message}`);
    }

    const totalPosts = posts?.length || 0;
    const successfulPosts = posts?.filter(p => p.status === 'published').length || 0;
    const failedPosts = posts?.filter(p => p.status === 'failed').length || 0;

    // Calculate platform distribution for top performing platform
    const platformCounts: { [key: string]: number } = {};
    posts?.forEach(post => {
      if (post.status === 'published') {
        platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
      }
    });

    const topPerformingPlatform = Object.keys(platformCounts).reduce((a, b) => 
      platformCounts[a] > platformCounts[b] ? a : b, 'none'
    );

    return {
      connectedAccounts: accounts?.length || 0,
      totalPosts,
      successfulPosts,
      failedPosts,
      avgEngagement: 0, // TODO: Implement when we have metrics
      topPerformingPlatform,
    };
  }

  /**
   * Get comprehensive analytics data
   */
  static async getAnalyticsData(userId: string): Promise<AnalyticsData> {
    const supabase = createAdminClient();
    
    // Get all user data
    const [accounts, posts] = await Promise.all([
      supabase.from('social_accounts').select('platform').eq('user_id', userId),
      supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    ]);

    if (accounts.error) {
      throw new Error(`Failed to get accounts: ${accounts.error.message}`);
    }
    if (posts.error) {
      throw new Error(`Failed to get posts: ${posts.error.message}`);
    }

    const accountsData = accounts.data || [];
    const postsData = posts.data || [];

    // Calculate platform distribution
    const platformDistribution: { [platform: string]: number } = {};
    accountsData.forEach(account => {
      platformDistribution[account.platform] = (platformDistribution[account.platform] || 0) + 1;
    });

    // Calculate time-based metrics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const postsThisWeek = postsData.filter(post => 
      new Date(post.created_at) >= weekAgo
    ).length;

    const postsThisMonth = postsData.filter(post => 
      new Date(post.created_at) >= monthAgo
    ).length;

    const publishedPosts = postsData.filter(post => post.status === 'published');
    const successRate = postsData.length > 0 ? (publishedPosts.length / postsData.length) * 100 : 0;

    // Get recent posts
    const recentPosts: SocialPost[] = postsData.slice(0, 10).map(post => ({
      ...post,
      scheduled_at: post.scheduled_at ? new Date(post.scheduled_at) : undefined,
      published_at: post.published_at ? new Date(post.published_at) : undefined,
      created_at: new Date(post.created_at),
      updated_at: new Date(post.updated_at),
    }));

    // TODO: Calculate engagement over time when we have metrics
    const engagementOverTime: { date: string; engagements: number; posts: number; }[] = [];

    return {
      totalPosts: postsData.length,
      totalAccounts: accountsData.length,
      platformDistribution,
      postsThisWeek,
      postsThisMonth,
      successRate,
      recentPosts,
      engagementOverTime,
    };
  }

  /**
   * Update post metrics (for future use)
   */
  static async updatePostMetrics(postId: string, metrics: Partial<PostMetrics>): Promise<void> {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('post_metrics')
      .upsert({
        post_id: postId,
        ...metrics,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to update metrics: ${error.message}`);
    }
  }
} 