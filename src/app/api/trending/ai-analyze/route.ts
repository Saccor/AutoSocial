import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/auth-server';
import { AIAnalysisService } from '@/services/AIAnalysisService';
import { TrendingPost } from '@/types/trending';

export async function POST() {
  console.log('🚀 Starting Professional AI-Powered Database Analysis...');
  
  try {
    const supabase = createAdminClient();
    
    // Check if AI service is available
    const isAIAvailable = await AIAnalysisService.checkAIAvailability();
    if (!isAIAvailable) {
      return NextResponse.json({
        success: false,
        message: 'AI analysis service not available. Please ensure the Python AI microservice is running on port 8000. Start it with: cd ai-microservice && python main.py',
        aiAnalysisAvailable: false,
        troubleshooting: {
          checkAIService: 'curl http://localhost:8000/health',
          startAIService: 'cd ai-microservice && python main.py',
          installDependencies: 'cd ai-microservice && .\\install-deps.ps1'
        }
      });
    }

    console.log('✅ AI microservice available, starting professional analysis workflow...');

    // Fetch ALL posts from database
    const { data: allPosts, error: postsError } = await supabase
      .from('trending_posts')
      .select('*')
      .order('discovered_at', { ascending: false });

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    if (!allPosts || allPosts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No posts found in database to analyze',
        stats: { totalPosts: 0 }
      });
    }

    console.log(`📊 Found ${allPosts.length} posts for AI analysis`);

    // Clear existing analyses
    await supabase.from('trend_analyses').delete().neq('id', '');
    await supabase.from('content_suggestions').delete().neq('id', '');
    console.log('🧹 Cleared existing trend analyses');

    // Group posts for AI analysis
    const groupedPosts = groupPostsForAIAnalysis(allPosts);
    console.log(`🔍 Created ${Object.keys(groupedPosts).length} groups for AI analysis`);

    // Professional AI Analysis Pipeline
    const analyses = [];
    const allSuggestions = [];
    let analysisCount = 0;
    const totalGroups = Object.keys(groupedPosts).length;

    console.log(`📊 Starting analysis of ${totalGroups} trend groups with ${allPosts.length} total posts...`);

    for (const [groupKey, posts] of Object.entries(groupedPosts)) {
      const progressPercent = Math.round((analysisCount / totalGroups) * 100);
      console.log(`🧠 [${progressPercent}%] AI analyzing "${groupKey}" (${posts.length} posts)...`);
      
      try {
        // Phase 1: AI-powered content analysis
        console.log(`   📝 Analyzing content sentiment and categorization...`);
        const aiInsights = await AIAnalysisService.analyzePostGroup(posts as TrendingPost[], groupKey);
        
        // Phase 2: Create comprehensive trend analysis
        console.log(`   📈 Generating trend insights and viral factors...`);
        const analysis = await createAITrendAnalysis(groupKey, posts, aiInsights);
        analyses.push(analysis);
        
        // Phase 3: Generate content suggestions
        console.log(`   💡 Creating AI-powered content suggestions...`);
        const suggestions = await AIAnalysisService.generateAIContentSuggestions(analysis, aiInsights);
        allSuggestions.push(...suggestions);
        
        analysisCount++;
        console.log(`✅ [${Math.round((analysisCount / totalGroups) * 100)}%] Completed "${groupKey}" analysis`);
        console.log(`   📊 Generated ${suggestions.length} content ideas | Confidence: ${Math.round(suggestions.reduce((sum, s) => sum + s.confidence_score, 0) / suggestions.length * 100)}%`);
        
        // Brief pause for system stability
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ AI analysis failed for group "${groupKey}":`, error);
        // Continue with next group even if one fails
      }
    }

    // Store AI analyses and suggestions
    if (analyses.length > 0) {
      const { error: analysisError } = await supabase
        .from('trend_analyses')
        .insert(analyses);
      
      if (analysisError) {
        console.error('❌ Failed to store AI analyses:', analysisError);
      } else {
        console.log(`✅ Stored ${analyses.length} AI trend analyses`);
      }
    }

    if (allSuggestions.length > 0) {
      const { error: suggestionsError } = await supabase
        .from('content_suggestions')
        .insert(allSuggestions);
      
      if (suggestionsError) {
        console.error('❌ Failed to store AI suggestions:', suggestionsError);
      } else {
        console.log(`✅ Stored ${allSuggestions.length} AI content suggestions`);
      }
    }

    // Get overall AI insights
    const overallInsights = await AIAnalysisService.analyzeOverallViralPatterns(allPosts as TrendingPost[]);

    // Calculate comprehensive analytics
    const platforms = [...new Set(allPosts.map((p: any) => p.platform))];
    const categories = [...new Set(allPosts.map((p: any) => p.trend_category))];
    const totalEngagement = allPosts.reduce((sum: number, p: any) => sum + (p.engagement_score || 0), 0);
    const avgEngagement = Math.round(totalEngagement / allPosts.length);
    
    // Calculate success metrics
    const successfulAnalyses = analyses.filter(a => a.ai_analysis?.insights?.length > 0);
    const highConfidenceSuggestions = allSuggestions.filter(s => s.confidence_score > 0.8);
    const analysisSuccessRate = Math.round((successfulAnalyses.length / Math.max(analyses.length, 1)) * 100);
    
    console.log('🎉 Professional AI Database Analysis completed successfully!');
    console.log(`📈 Analysis Results: ${analyses.length} trends, ${allSuggestions.length} suggestions, ${analysisSuccessRate}% success rate`);

    return NextResponse.json({
      success: true,
      message: 'Professional AI-powered database analysis completed successfully',
      aiAnalysisAvailable: true,
      
      // Enhanced Statistics
      stats: {
        totalPosts: allPosts.length,
        analysisGroups: Object.keys(groupedPosts).length,
        trendsGenerated: analyses.length,
        suggestionsGenerated: allSuggestions.length,
        highConfidenceSuggestions: highConfidenceSuggestions.length,
        platforms: platforms.length,
        categories: categories.length,
        totalEngagement,
        avgEngagement,
        analysisSuccessRate,
        analysisTime: new Date().toISOString(),
        processingTime: `${Math.round(Date.now() / 1000)}s`
      },

      // Professional AI Insights
      aiInsights: {
        viralityInsights: overallInsights.viralityInsights,
        platformRecommendations: overallInsights.platformRecommendations,
        timingInsights: overallInsights.timingInsights,
        contentStrategyAdvice: overallInsights.contentStrategyAdvice,
        trendPredictions: overallInsights.trendPredictions,
        analysisQuality: {
          successRate: analysisSuccessRate,
          highConfidenceIdeas: highConfidenceSuggestions.length,
          averageConfidence: Math.round(allSuggestions.reduce((sum, s) => sum + s.confidence_score, 0) / Math.max(allSuggestions.length, 1) * 100),
          totalDataPoints: allPosts.length
        }
      },

      // Top Trends with Enhanced Details
      topTrends: analyses.slice(0, 5).map((a: any) => ({
        title: a.trend_title,
        category: a.category,
        posts: a.total_posts,
        viralScore: Math.round(a.viral_score),
        avgEngagement: Math.round(a.engagement_pattern?.total_engagement / a.total_posts || 0),
        platforms: a.platforms,
        aiInsights: a.ai_analysis?.insights || [],
        viralFactors: a.ai_analysis?.viral_factors || [],
        sentiment: a.ai_analysis?.sentiment || 'neutral'
      })),

      // Content Suggestions Summary
      contentSuggestions: {
        total: allSuggestions.length,
        byType: allSuggestions.reduce((acc: any, s: any) => {
          acc[s.content_type] = (acc[s.content_type] || 0) + 1;
          return acc;
        }, {}),
        highConfidence: highConfidenceSuggestions.length,
        avgConfidence: Math.round(allSuggestions.reduce((sum, s) => sum + s.confidence_score, 0) / Math.max(allSuggestions.length, 1) * 100)
      },

      // Professional Workflow Status
      workflowStatus: {
        dataCollection: '✅ Complete',
        aiAnalysis: `✅ ${analyses.length} trends analyzed`,
        contentGeneration: `✅ ${allSuggestions.length} ideas generated`,
        qualityCheck: `✅ ${analysisSuccessRate}% success rate`,
        nextSteps: [
          'Review generated content suggestions',
          'Implement trending strategies',
          'Monitor content performance',
          'Run analysis regularly for fresh insights'
        ]
      }
    });

  } catch (error) {
    console.error('❌ AI database analysis failed:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'AI analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get database stats
    const { data: posts, error } = await supabase
      .from('trending_posts')
      .select('platform, trend_category, engagement_score, discovered_at');

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    const isAIAvailable = await AIAnalysisService.checkAIAvailability();
    
    const platforms = [...new Set(posts?.map((p: any) => p.platform) || [])];
    const categories = [...new Set(posts?.map((p: any) => p.trend_category) || [])];
    
    return NextResponse.json({
      available: true,
      aiAnalysisAvailable: isAIAvailable,
      stats: {
        totalPosts: posts?.length || 0,
        platforms: platforms.length,
        categories: categories.length,
        platformBreakdown: platforms.reduce((acc: { [key: string]: number }, platform: string) => {
          acc[platform] = posts?.filter((p: any) => p.platform === platform).length || 0;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('❌ Failed to get AI analysis info:', error);
    return NextResponse.json({
      available: false,
      aiAnalysisAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper methods
function groupPostsForAIAnalysis(posts: any[]): { [key: string]: any[] } {
  const groups: { [key: string]: any[] } = {};
  
  posts.forEach((post: any) => {
    // Create intelligent grouping for AI analysis
    let groupKey = '';
    
    if (post.platform === 'reddit') {
      // Group Reddit posts by subreddit and category
      const subreddit = post.platform_post_id?.split('_')[0] || 'general';
      const category = post.trend_category || 'General';
      groupKey = `r/${subreddit} ${category}`;
    } else if (post.platform === 'twitter') {
      // Group Twitter posts by category and top hashtag
      const category = post.trend_category || 'General';
      const topHashtag = post.hashtags?.[0] || '';
      groupKey = topHashtag ? `${topHashtag} ${category}` : category;
    } else {
      // Default grouping by category
      groupKey = post.trend_category || 'General';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(post);
  });
  
  // Filter groups to have at least 3 posts for meaningful AI analysis
  const filteredGroups: { [key: string]: any[] } = {};
  Object.entries(groups).forEach(([key, posts]) => {
    if (posts.length >= 3) {
      filteredGroups[key] = posts.slice(0, 20); // Limit to 20 posts per group for AI efficiency
    }
  });
  
  // If no groups have 3+ posts, take the largest groups anyway
  if (Object.keys(filteredGroups).length === 0) {
    const sortedGroups = Object.entries(groups).sort(([,a], [,b]) => b.length - a.length);
    sortedGroups.slice(0, 5).forEach(([key, posts]) => {
      filteredGroups[key] = posts.slice(0, 20);
    });
  }
  
  return filteredGroups;
}

async function createAITrendAnalysis(trendKey: string, posts: any[], aiInsights: any): Promise<any> {
  const now = new Date();
  
  // Calculate metrics
  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);
  const totalShares = posts.reduce((sum: number, p: any) => sum + (p.shares || 0), 0);
  const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments || 0), 0);
  const totalEngagement = posts.reduce((sum: number, p: any) => sum + (p.engagement_score || 0), 0);
  
  const platforms = [...new Set(posts.map((p: any) => p.platform))];
  const hashtags = posts.flatMap((p: any) => p.hashtags || []);
  const hashtagCounts = hashtags.reduce((acc: { [key: string]: number }, tag: string) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});
  
  const topHashtags = Object.entries(hashtagCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([tag, count]) => ({ 
      hashtag: tag, 
      count: count as number, 
      trending_score: (count as number) / totalPosts 
    }));

  return {
    id: `ai_trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    trend_title: aiInsights.trendTitle,
    trend_description: aiInsights.trendDescription,
    category: aiInsights.category,
    total_posts: totalPosts,
    platforms: platforms,
    viral_score: Math.min(totalEngagement / totalPosts, 100),
    engagement_pattern: {
      avg_likes: Math.round(totalLikes / totalPosts),
      avg_shares: Math.round(totalShares / totalPosts), 
      avg_comments: Math.round(totalComments / totalPosts),
      total_likes: totalLikes,
      total_shares: totalShares,
      total_comments: totalComments,
      total_engagement: totalEngagement,
      peak_hours: [],
      ai_viral_factors: aiInsights.viralFactors,
      ai_content_themes: aiInsights.contentThemes,
      ai_sentiment: aiInsights.aiSentiment,
      ai_engagement_prediction: aiInsights.engagementPrediction,
      ai_insights: aiInsights.insights
    },
    content_themes: aiInsights.contentThemes || [],
    media_types: ['text'],
    sentiment_distribution: { positive: 0, negative: 0, neutral: 1 },
    hashtags: topHashtags.map(h => h.hashtag),
    keywords: [],
    sample_posts: posts.slice(0, 5).map((post: any) => ({
      id: post.id,
      platform: post.platform,
      platform_post_id: post.platform_post_id || '',
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
      published_at: new Date(post.published_at || Date.now()),
      discovered_at: new Date(post.discovered_at || Date.now()),
      trend_category: post.trend_category,
      sentiment: post.sentiment
    })),
    created_at: now,
    updated_at: now,
    ai_analysis: {
      insights: aiInsights.insights,
      viral_factors: aiInsights.viralFactors,
      content_themes: aiInsights.contentThemes,
      sentiment: aiInsights.aiSentiment,
      engagement_prediction: aiInsights.engagementPrediction
    }
  };
} 