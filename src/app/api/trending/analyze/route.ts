import { NextRequest, NextResponse } from 'next/server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting comprehensive database analysis...');
    const startTime = Date.now();

    // Get all trending posts from database
    const { data: allPosts, error: fetchError } = await supabase
      .from('trending_posts')
      .select('*')
      .order('discovered_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching posts from database:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch posts from database',
        details: fetchError.message 
      }, { status: 500 });
    }

    if (!allPosts || allPosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No posts found in database to analyze',
        analyzed: {
          totalPosts: 0,
          trendsGenerated: 0,
          suggestionsGenerated: 0,
          timeElapsed: `${Date.now() - startTime}ms`
        }
      });
    }

    console.log(`📊 Found ${allPosts.length} posts in database to analyze`);

    // Transform database posts to TrendingPost format
    const transformedPosts = allPosts.map(post => ({
      ...post,
      published_at: new Date(post.published_at),
      discovered_at: new Date(post.discovered_at),
      created_at: new Date(post.created_at),
      updated_at: new Date(post.updated_at)
    }));

    // Clear existing analyses before regenerating
    console.log('🧹 Clearing existing trend analyses...');
    await supabase.from('trend_analyses').delete().gte('id', '');
    await supabase.from('content_suggestions').delete().gte('id', '');

    // Run comprehensive trend analysis on all posts
    console.log('🤖 Running AI trend analysis on all posts...');
    const trendAnalyses = await TrendingAnalysisService.analyzeTrends();
    
    console.log(`✅ Generated ${trendAnalyses.length} trend analyses`);

    // Generate content suggestions for each trend
    console.log('💡 Generating AI content suggestions...');
    let totalSuggestions = 0;
    
    for (const trend of trendAnalyses) {
      const suggestions = await TrendingAnalysisService.generateContentSuggestions(trend);
      totalSuggestions += suggestions.length;
    }

    console.log(`✅ Generated ${totalSuggestions} content suggestions`);

    // Get updated dashboard data
    const dashboardData = await TrendingAnalysisService.getTrendDashboardData();

    const analysisTime = Date.now() - startTime;
    console.log(`🎉 Database analysis complete in ${analysisTime}ms`);

    // Return comprehensive analysis results
    return NextResponse.json({
      success: true,
      message: 'Database analysis completed successfully',
      analyzed: {
        totalPosts: allPosts.length,
        trendsGenerated: trendAnalyses.length,
        suggestionsGenerated: totalSuggestions,
        platforms: [...new Set(allPosts.map(p => p.platform))],
        categories: [...new Set(allPosts.map(p => p.trend_category).filter(Boolean))],
        timeElapsed: `${analysisTime}ms`,
        averageEngagement: Math.round(allPosts.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / allPosts.length)
      },
      dashboardData,
      analytics: {
        message: `🤖 Analyzed ${allPosts.length} posts and generated ${trendAnalyses.length} trending patterns`,
        efficiency: `${Math.round((trendAnalyses.length / allPosts.length) * 100)}% pattern discovery rate`,
        topTrends: trendAnalyses.slice(0, 3).map(t => t.trend_title),
        platforms: [...new Set(allPosts.map(p => p.platform))],
        categories: [...new Set(allPosts.map(p => p.trend_category).filter(Boolean))]
      }
    });

  } catch (error) {
    console.error('❌ Database analysis failed:', error);
    return NextResponse.json({ 
      error: 'Database analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET method to check current database stats
export async function GET() {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('trending_posts')
      .select('platform, trend_category, discovered_at, engagement_score')
      .order('discovered_at', { ascending: false });

    const { data: trends, error: trendsError } = await supabase
      .from('trend_analyses')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    const { data: suggestions, error: suggestionsError } = await supabase
      .from('content_suggestions')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (postsError || trendsError || suggestionsError) {
      throw new Error('Failed to fetch database stats');
    }

    const stats = {
      totalPosts: posts?.length || 0,
      totalTrends: trends?.length || 0,
      totalSuggestions: suggestions?.length || 0,
      platforms: [...new Set(posts?.map(p => p.platform) || [])],
      categories: [...new Set(posts?.map(p => p.trend_category).filter(Boolean) || [])],
      lastPost: posts?.[0]?.discovered_at,
      lastTrend: trends?.[0]?.created_at,
      avgEngagement: posts?.length ? Math.round(posts.reduce((sum, p) => sum + (p.engagement_score || 0), 0) / posts.length) : 0
    };

    return NextResponse.json({
      success: true,
      stats,
      readyForAnalysis: (stats.totalPosts > 0),
      message: stats.totalPosts > 0 
        ? `Database contains ${stats.totalPosts} posts ready for analysis`
        : 'No posts in database. Discover content first.'
    });

  } catch (error) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch database stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 