import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAdminClient } from '@/lib/auth-server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Dashboard API: Fetching MAXIMUM VIRAL analytics...');
    
    // Trending data is public - no authentication required
    // Users can view trends without being logged in
    
    // Get comprehensive viral dashboard data
    const dashboardData = await TrendingAnalysisService.getTrendDashboardData();

    // Get enhanced discovery statistics
    const supabase = createAdminClient();
    
    // Get last discovery time and statistics
    const { data: lastPost } = await supabase
      .from('trending_posts')
      .select('discovered_at, platform')
      .order('discovered_at', { ascending: false })
      .limit(1);

    // Get viral statistics for last 24 hours
    const { data: recentPosts } = await supabase
      .from('trending_posts')
      .select('platform, engagement_score, trend_category')
      .gte('discovered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Calculate enhanced stats
    const viralStats = {
      totalPosts: recentPosts?.length || 0,
      platforms: new Set(recentPosts?.map(p => p.platform) || []).size,
      categories: new Set(recentPosts?.map(p => p.trend_category) || []).size,
      avgEngagement: recentPosts?.length 
        ? Math.round(recentPosts.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / recentPosts.length)
        : 0,
      topEngagement: Math.max(...(recentPosts?.map(p => p.engagement_score || 0) || [0]))
    };

    // Get platform breakdown for recent posts
    const platformCounts = (recentPosts || []).reduce((acc, post) => {
      const platform = post.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const lastDiscoveryTime = lastPost?.[0]?.discovered_at || null;

    console.log(`📊 VIRAL DASHBOARD STATS:`);
    console.log(`   Total Posts (24h): ${viralStats.totalPosts}`);
    console.log(`   Active Platforms: ${viralStats.platforms}`);
    console.log(`   Trending Categories: ${viralStats.categories}`);
    console.log(`   Avg Engagement: ${viralStats.avgEngagement}`);
    console.log(`   Peak Engagement: ${viralStats.topEngagement}`);

    return NextResponse.json({
      success: true,
      data: dashboardData,
      viralStats,
      platformCounts,
      lastUpdated: new Date().toISOString(),
      lastDiscoveryTime: lastDiscoveryTime,
      nextUpdateTime: lastDiscoveryTime ? 
        new Date(new Date(lastDiscoveryTime).getTime() + 10 * 60 * 1000).toISOString() : // 10 minutes for Reddit
        null,
      maxDiscoveryMode: true,
      analytics: {
        message: `🔥 VIRAL ANALYTICS: ${viralStats.totalPosts} posts analyzed across ${viralStats.platforms} platforms`,
        efficiency: viralStats.totalPosts > 0 ? `${Math.round((viralStats.avgEngagement / viralStats.topEngagement) * 100)}% viral efficiency` : 'No data yet',
        trending: Object.entries(platformCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([platform, count]) => ({ platform, count }))
      }
    });

  } catch (error) {
    console.error('🚨 Viral dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch viral dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
        tip: 'Try running a Reddit discovery to populate analytics'
      }, 
      { status: 500 }
    );
  }
} 