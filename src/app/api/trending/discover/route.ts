import { NextRequest, NextResponse } from 'next/server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';
import { createAdminClient } from '@/lib/auth-server';

// Helper function to get last discovery time
async function getLastDiscoveryTime(): Promise<Date | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('trending_posts')
    .select('discovered_at')
    .order('discovered_at', { ascending: false })
    .limit(1);
  
  if (error || !data || data.length === 0) return null;
  return new Date(data[0].discovered_at);
}

// Helper function to record discovery time
async function recordDiscoveryTime(): Promise<void> {
  const supabase = createAdminClient();
  // We'll use the trending_posts table timestamps to track discovery times
  // No additional table needed since every discovery creates posts
}

// Helper function to test Twitter API connectivity
async function testTwitterConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    if (!process.env.TWITTER_BEARER_TOKEN) {
      return { success: false, message: 'TWITTER_BEARER_TOKEN environment variable is not set' };
    }

    // Simple test query
    const testUrl = new URL('https://api.twitter.com/2/tweets/search/recent');
    testUrl.searchParams.set('query', 'hello lang:en');
    testUrl.searchParams.set('max_results', '10');

    console.log('Testing Twitter API with URL:', testUrl.toString());

    const response = await fetch(testUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Test Response Status:', response.status);
    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      return { 
        success: true, 
        message: 'Twitter API connection successful',
        details: {
          status: response.status,
          dataCount: data.data?.length || 0,
          meta: data.meta
        }
      };
    } else {
      return { 
        success: false, 
        message: `Twitter API test failed: ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        }
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: 'Twitter API test error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for test mode
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get('test') === 'true';
    
    if (testMode) {
      console.log('Running Twitter API connection test...');
      const testResult = await testTwitterConnection();
      return NextResponse.json(testResult);
    }
    
    // OPTIMIZED TRENDING DISCOVERY FOR CUMULATIVE DATABASE
    // Strategy: Build a comprehensive trending database over time within Free tier limits
    
    console.log('🚀 Starting optimized trending discovery for cumulative database...');
    
    // Check last discovery time to ensure we don't exceed Twitter Free tier limits (1 request per 15 minutes)
    const lastDiscovery = await getLastDiscoveryTime();
    const minutesSinceLastDiscovery = lastDiscovery ? 
      (Date.now() - lastDiscovery.getTime()) / (1000 * 60) : 15;
    
    if (minutesSinceLastDiscovery < 15 && lastDiscovery) {
      const minutesUntilNext = Math.ceil(15 - minutesSinceLastDiscovery);
      console.log(`⏰ Rate limit protection: ${minutesSinceLastDiscovery.toFixed(1)} minutes since last discovery.`);
      return NextResponse.json({
        success: false,
        message: `Twitter API rate limit: Last discovery was ${minutesSinceLastDiscovery.toFixed(1)} minutes ago. Next discovery available in ${minutesUntilNext} minutes.`,
        nextDiscoveryTime: new Date(lastDiscovery.getTime() + 15 * 60 * 1000).toISOString(),
        strategy: 'Free tier optimization: Building trending database gradually',
        tip: 'Each discovery adds high-value trending content to your cumulative database'
      });
    }
    
    // Fetch maximum trending content per API call (Free tier: make it count!)
    console.log('📊 Fetching trending posts (maximizing value per API call)...');
    const twitterTrends = await TrendingAnalysisService.fetchTwitterTrends(100);
          console.log(`🎯 Discovered top ${twitterTrends.length} most engaging tweets (sorted by likes + retweets + replies + all activity)`);
    
    // Store trending posts in cumulative database
    if (twitterTrends.length > 0) {
      await TrendingAnalysisService.storeTrendingPosts(twitterTrends);
      console.log(`💾 Added ${twitterTrends.length} trending posts to cumulative database`);
      
      // Get total posts count for user feedback
      const supabase = createAdminClient();
      const { count: totalPosts } = await supabase
        .from('trending_posts')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📈 Total trending posts in database: ${totalPosts || 0}`);
      
      // Analyze trends from the growing database
      const trendAnalyses = await TrendingAnalysisService.analyzeTrends();
      console.log(`🔍 Generated ${trendAnalyses.length} trend analyses from database`);
      
      // Generate content suggestions based on cumulative trend data
      const allSuggestions = [];
      for (const analysis of trendAnalyses) {
        const suggestions = await TrendingAnalysisService.generateContentSuggestions(analysis);
        allSuggestions.push(...suggestions);
      }
      console.log(`💡 Generated ${allSuggestions.length} content suggestions from trend patterns`);
      
      return NextResponse.json({
        success: true,
        discovered: {
          newPosts: twitterTrends.length,
          totalPosts: totalPosts || 0,
          analyses: trendAnalyses.length,
          suggestions: allSuggestions.length,
        },
        message: `Successfully added top ${twitterTrends.length} most engaging tweets to database`,
        database: {
          totalTrendingPosts: totalPosts || 0,
          strategy: 'Top 100 engaging tweets by total activity (likes + retweets + replies + all metrics)'
        },
        nextDiscovery: {
          availableAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          strategy: 'Free tier: 1 discovery per 15 minutes, focus on high-value content'
        }
      });
      
          } else {
        console.log('⚠️ No genuinely viral content found. This is normal - truly viral content is rare!');
        return NextResponse.json({
          success: true,
          message: 'No viral content discovered this time. Viral content is rare - this is completely normal!',
          discovered: { newPosts: 0, analyses: 0, suggestions: 0 },
          insight: 'Quality over quantity: We only store genuinely viral content (50+ engagement, 25+ likes)',
          nextDiscovery: {
            availableAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            tip: 'Try again in 15+ minutes when fresh viral content may emerge'
          }
        });
      }
    
  } catch (error) {
    console.error('Trending discovery error:', error);
    
    // Enhanced error handling for cumulative database building
    if (error instanceof Error && error.message.includes('monthly limit exceeded')) {
      return NextResponse.json({
        success: false,
        message: 'Twitter API monthly usage limit reached',
        monthlyLimitInfo: {
          message: 'Free tier monthly cap of 100 posts has been reached',
          resetTime: 'Next month',
          strategy: 'Your trending database contains valuable data collected so far'
        },
        options: [
          'Upgrade to Twitter Basic ($200/month) for 1M monthly posts',
          'Wait for monthly reset to continue building database',
          'Analyze existing trending data in your database'
        ]
      }, { status: 429 });
    }
    
    if (error instanceof Error && error.message.includes('rate limited')) {
      const resetMatch = error.message.match(/(\d+) minutes/);
      const waitMinutes = resetMatch ? resetMatch[1] : '15';
      
      return NextResponse.json({
        success: false,
        message: `Twitter API rate limited. Building trending database gradually.`,
        rateLimitInfo: {
          waitMinutes: parseInt(waitMinutes),
          message: 'Free tier allows 1 discovery per 15 minutes',
          strategy: 'Each discovery adds valuable trending content to your database'
        },
        tip: 'Consider upgrading to Twitter Basic ($200/month) for daily automation'
      }, { status: 429 });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to discover trends',
        details: error instanceof Error ? error.message : 'Unknown error',
        strategy: 'Building cumulative trending database - temporary setbacks are normal'
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