import { NextRequest, NextResponse } from 'next/server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';
import { createAdminClient } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 Starting Reddit trending discovery...');
    
    // Parse request parameters (MAXIMUM viral content discovery)
    const body = await request.json().catch(() => ({}));
    const { 
      subreddits = ['popular', 'all', 'technology', 'entertainment', 'sports', 'news', 'business'],
      postsPerSubreddit = 1000, // MAXIMUM - get up to 1,000 per subreddit
      timeframe = 'day',
      maxSubreddits = 10 // Limit subreddits to stay within rate limits
    } = body;
    
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    
    if (testMode) {
      console.log('🧪 Testing Reddit API connection...');
      try {
        const testPosts = await TrendingAnalysisService.fetchRedditTrends('popular', 5, 'day');
        return NextResponse.json({
          success: true,
          message: 'Reddit API connection successful',
          details: {
            postsFound: testPosts.length,
            samplePost: testPosts[0] ? {
              title: testPosts[0].content.substring(0, 100),
              subreddit: testPosts[0].platform_post_id.split('_')[0],
              engagement: testPosts[0].engagement_score
            } : null
          }
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Reddit API test failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // REDDIT TRENDING DISCOVERY STRATEGY
    // Advantage: No rate limits like Twitter, can fetch diverse content immediately
    
    // Limit subreddits to respect rate limits
    const limitedSubreddits = subreddits.slice(0, maxSubreddits);
    
    console.log(`🚀 MAXIMUM VIRAL DISCOVERY MODE ACTIVATED!`);
    console.log(`🎯 Target: ${postsPerSubreddit} posts per subreddit × ${limitedSubreddits.length} subreddits`);
    console.log(`📊 Potential maximum: ${limitedSubreddits.length * postsPerSubreddit} viral posts`);
    console.log(`⏱️ API limits: 100 req/min, 996/10min - using pagination & rate limiting`);
    console.log(`🔥 Subreddits: ${limitedSubreddits.join(', ')}`);
    
    // Fetch MAXIMUM viral posts with full pagination and rate limiting
    const redditTrends = await TrendingAnalysisService.fetchMultiRedditTrends(
      limitedSubreddits,
      postsPerSubreddit
    );
    
    if (redditTrends.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No trending Reddit content found',
        tip: 'Try different subreddits or timeframes'
      });
    }
    
    console.log(`🎉 Discovered ${redditTrends.length} trending Reddit posts`);
    
    // Store trending posts in database
    await TrendingAnalysisService.storeTrendingPosts(redditTrends);
    console.log(`💾 Stored ${redditTrends.length} Reddit posts in trending database`);
    
    // Get updated total count
    const supabase = createAdminClient();
    const { count: totalPosts } = await supabase
      .from('trending_posts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📈 Total trending posts in database: ${totalPosts || 0}`);
    
    // Analyze trends from the updated database
    const trendAnalyses = await TrendingAnalysisService.analyzeTrends();
    console.log(`🔍 Generated ${trendAnalyses.length} trend analyses`);
    
    // Generate content suggestions
    const allSuggestions = [];
    for (const analysis of trendAnalyses) {
      const suggestions = await TrendingAnalysisService.generateContentSuggestions(analysis);
      allSuggestions.push(...suggestions);
    }
    console.log(`💡 Generated ${allSuggestions.length} content suggestions`);
    
    // Count categories for user feedback
    const categoryBreakdown: { [category: string]: number } = {};
    redditTrends.forEach(post => {
      const category = post.trend_category || 'General';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });
    
    return NextResponse.json({
      success: true,
      discovered: {
        platform: 'reddit',
        newPosts: redditTrends.length,
        totalPosts: totalPosts || 0,
        analyses: trendAnalyses.length,
        suggestions: allSuggestions.length,
        categories: Object.keys(categoryBreakdown).length,
        maxDiscovery: true,
        postsPerSubreddit: postsPerSubreddit,
        subredditsProcessed: limitedSubreddits.length
      },
      categoryBreakdown,
      topCategories: Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      message: `🚀 MAXIMUM VIRAL DISCOVERY: ${redditTrends.length} viral posts from ${limitedSubreddits.length} subreddits (up to ${postsPerSubreddit} each)`,
      subredditsScanned: limitedSubreddits,
      maxCapabilities: {
        postsPerSubreddit: postsPerSubreddit,
        totalSubreddits: limitedSubreddits.length,
        maxPossiblePosts: limitedSubreddits.length * postsPerSubreddit,
        actualViralPosts: redditTrends.length,
        efficiency: `${((redditTrends.length / (limitedSubreddits.length * postsPerSubreddit)) * 100).toFixed(1)}% viral filter rate`
      },
      advantages: [
        'Maximum viral discovery with pagination',
        'Rate-limited for sustained operation',
        'Up to 1,000 posts per subreddit',
        'Advanced viral filtering',
        'Exponential backoff on errors'
      ]
    });
    
  } catch (error) {
    console.error('Reddit discovery error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to discover Reddit trends',
      details: error instanceof Error ? error.message : 'Unknown error',
      tip: 'Reddit API is usually very reliable - this might be a temporary issue'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Reddit trending status and available subreddits
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'subreddits') {
      const { RedditProvider } = await import('@/providers/RedditProvider');
      return NextResponse.json({
        success: true,
        availableSubreddits: RedditProvider.getTrendingSubreddits(),
        recommended: ['popular', 'technology', 'entertainment', 'sports', 'news'],
        categories: {
          'Technology': ['technology', 'programming', 'webdev'],
          'Entertainment': ['movies', 'music', 'gaming'],
          'Sports': ['sports', 'nfl', 'nba'],
          'News': ['news', 'worldnews'],
          'Business': ['business', 'investing', 'cryptocurrency']
        }
      });
    }
    
    return NextResponse.json({
      status: 'ready',
      platform: 'reddit',
      message: 'Reddit trending discovery service is operational',
      advantages: [
        'No rate limits',
        '100 requests/minute',
        'Rich engagement data',
        'Multiple content categories'
      ],
      usage: 'POST to /api/trending/discover/reddit to fetch trending content'
    });
    
  } catch (error) {
    console.error('Reddit status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get Reddit status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 