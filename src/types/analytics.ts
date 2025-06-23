export interface SocialPost {
  id: string;
  user_id: string;
  platform: string;
  platform_post_id: string;
  account_identifier: string;
  content: string;
  media_urls?: string[];
  post_url?: string;
  status: 'published' | 'failed' | 'pending' | 'draft';
  error_message?: string;
  scheduled_at?: Date;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PostMetrics {
  post_id: string;
  platform: string;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  clicks: number;
  engagements: number;
  reach: number;
  impressions: number;
  updated_at: Date;
}

export interface AnalyticsData {
  totalPosts: number;
  totalAccounts: number;
  platformDistribution: { [platform: string]: number };
  postsThisWeek: number;
  postsThisMonth: number;
  successRate: number;
  recentPosts: SocialPost[];
  engagementOverTime: {
    date: string;
    engagements: number;
    posts: number;
  }[];
}

export interface DashboardStats {
  connectedAccounts: number;
  totalPosts: number;
  successfulPosts: number;
  failedPosts: number;
  avgEngagement: number;
  topPerformingPlatform: string;
} 