import { NextRequest, NextResponse } from 'next/server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';

export async function POST(request: NextRequest) {
  try {
    // This endpoint triggers the trend discovery process
    // It should be called via cron job or webhook periodically
    
    console.log('Starting trend discovery process...');
    
    // Fetch trending posts from Twitter
    const twitterTrends = await TrendingAnalysisService.fetchTwitterTrends(100);
    console.log(`Discovered ${twitterTrends.length} trending Twitter posts`);
    
    // Store trending posts in database
    if (twitterTrends.length > 0) {
      await TrendingAnalysisService.storeTrendingPosts(twitterTrends);
      console.log('Stored trending posts in database');
    }
    
    // Analyze trends and generate insights
    const trendAnalyses = await TrendingAnalysisService.analyzeTrends();
    console.log(`Generated ${trendAnalyses.length} trend analyses`);
    
    // Generate content suggestions based on trends
    const allSuggestions = [];
    for (const analysis of trendAnalyses) {
      const suggestions = await TrendingAnalysisService.generateContentSuggestions(analysis);
      allSuggestions.push(...suggestions);
    }
    console.log(`Generated ${allSuggestions.length} content suggestions`);
    
    return NextResponse.json({
      success: true,
      discovered: {
        posts: twitterTrends.length,
        analyses: trendAnalyses.length,
        suggestions: allSuggestions.length,
      },
      message: 'Trend discovery completed successfully',
    });
    
  } catch (error) {
    console.error('Trend discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to discover trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current trending status and last discovery time
    // This can be used to show when trends were last updated
    
    return NextResponse.json({
      status: 'ready',
      lastDiscovery: new Date().toISOString(),
      message: 'Trend discovery service is operational',
    });
    
  } catch (error) {
    console.error('Trend status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get trend status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 