import { TrendingPost, TrendAnalysis, ContentSuggestion } from '@/types/trending';

// Configuration for the AI microservice
// Use 127.0.0.1 instead of localhost to force IPv4 resolution and avoid ::1 (IPv6) connection issues
const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://127.0.0.1:8000';

export class AIAnalysisService {
  
  /**
   * Analyze a group of trending posts with AI to generate intelligent insights
   */
  static async analyzePostGroup(posts: TrendingPost[], groupKey: string): Promise<{
    trendTitle: string;
    trendDescription: string;
    category: string;
    insights: string[];
    viralFactors: string[];
    contentThemes: string[];
    aiSentiment: string;
    engagementPrediction: string;
  }> {
    try {
      // Prepare content sample for AI analysis
      const contentSample = posts.slice(0, 20).map(post => ({
        content: post.content.substring(0, 500), // Limit content length for API
        engagement_score: post.engagement_score,
        platform: post.platform,
        trend_category: post.trend_category,
        likes: post.likes,
        comments: post.comments,
        published_at: post.published_at
      }));

      console.log(`🤖 Sending ${contentSample.length} posts to AI service for analysis...`);

      const response = await fetch(`${AI_SERVICE_URL}/analyze-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          posts: contentSample,
          group_key: groupKey
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service error: ${response.status} - ${errorText}`);
      }

      const analysis = await response.json();
      
      console.log(`🤖 AI Analysis completed for "${groupKey}": ${analysis.trend_title}`);
      
      return {
        trendTitle: analysis.trend_title || `${groupKey} Trending`,
        trendDescription: analysis.trend_description || `Analysis of ${posts.length} viral posts`,
        category: analysis.category || 'General',
        insights: analysis.insights || [],
        viralFactors: analysis.viral_factors || [],
        contentThemes: analysis.content_themes || [],
        aiSentiment: analysis.ai_sentiment || 'neutral',
        engagementPrediction: analysis.engagement_prediction || 'moderate engagement expected'
      };

    } catch (error) {
      console.error('❌ AI Analysis failed:', error);
      
      // Fallback to basic analysis if AI service fails
      return {
        trendTitle: `${groupKey} Trending`,
        trendDescription: `Analysis of ${posts.length} viral posts from ${[...new Set(posts.map(p => p.platform))].join(', ')}`,
        category: posts[0]?.trend_category || 'General',
        insights: [`${posts.length} posts analyzed`, 'High engagement detected', 'Cross-platform trending'],
        viralFactors: ['Community engagement', 'Timely content', 'Relatable themes'],
        contentThemes: ['trending', 'viral', 'popular'],
        aiSentiment: 'neutral - AI analysis unavailable',
        engagementPrediction: 'engagement patterns suggest continued interest'
      };
    }
  }

  /**
   * Generate AI-powered content suggestions based on trending analysis
   */
  static async generateAIContentSuggestions(trendAnalysis: any, aiInsights: any): Promise<ContentSuggestion[]> {
    try {
      console.log('🤖 Generating AI-powered content suggestions...');

      const response = await fetch(`${AI_SERVICE_URL}/generate-content-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trend_analysis: trendAnalysis,
          ai_insights: aiInsights
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service error: ${response.status} - ${errorText}`);
      }

      const aiSuggestions = await response.json();
      
      // Convert AI suggestions to ContentSuggestion format
      const contentSuggestions: ContentSuggestion[] = aiSuggestions.suggestions.map((suggestion: any, index: number) => ({
        id: `ai_suggestion_${Date.now()}_${index}`,
        trend_analysis_id: trendAnalysis.id,
        content_type: suggestion.content_type as 'reel' | 'post' | 'story' | 'carousel',
        suggested_content: suggestion.suggested_content,
        suggested_hashtags: suggestion.suggested_hashtags || [],
        suggested_media_style: suggestion.viral_potential || 'AI-optimized for viral potential',
        target_platforms: ['instagram', 'tiktok', 'twitter'],
        optimal_posting_time: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000), // Random time in next 24h
        confidence_score: suggestion.confidence_score || 0.75,
        created_at: new Date(),
        ai_insights: {
          viralPotential: suggestion.viral_potential,
          targetAudience: suggestion.target_audience
        }
      }));

      console.log(`🤖 Generated ${contentSuggestions.length} AI-powered content suggestions`);
      return contentSuggestions;

    } catch (error) {
      console.error('❌ AI Content Generation failed:', error);
      return []; // Return empty array if AI fails
    }
  }

  /**
   * Analyze overall viral patterns across all content
   */
  static async analyzeOverallViralPatterns(allPosts: TrendingPost[]): Promise<{
    viralityInsights: string[];
    platformRecommendations: { [platform: string]: string };
    timingInsights: string[];
    contentStrategyAdvice: string[];
    trendPredictions: string[];
  }> {
    try {
      console.log(`🤖 Analyzing overall viral patterns for ${allPosts.length} posts...`);

      // Prepare posts data for analysis
      const postsData = allPosts.map(post => ({
        platform: post.platform,
        trend_category: post.trend_category,
        engagement_score: post.engagement_score,
        content: post.content.substring(0, 300),
        published_at: post.published_at
      }));

      const response = await fetch(`${AI_SERVICE_URL}/analyze-overall-patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          all_posts: postsData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Service error: ${response.status} - ${errorText}`);
      }

      const analysis = await response.json();
      
      console.log('🤖 Overall viral pattern analysis completed');
      
      return {
        viralityInsights: analysis.virality_insights || [],
        platformRecommendations: analysis.platform_recommendations || {},
        timingInsights: analysis.timing_insights || [],
        contentStrategyAdvice: analysis.content_strategy_advice || [],
        trendPredictions: analysis.trend_predictions || []
      };

    } catch (error) {
      console.error('❌ Overall AI Analysis failed:', error);
      
      return {
        viralityInsights: ['AI analysis temporarily unavailable'],
        platformRecommendations: {},
        timingInsights: ['Timing analysis pending'],
        contentStrategyAdvice: ['Strategy insights coming soon'],
        trendPredictions: ['Trend predictions in progress']
      };
    }
  }

  /**
   * Check if AI service is available and working
   */
  static async checkAIAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${AI_SERVICE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const health = await response.json();
        console.log('✅ AI Service is healthy:', health.status);
        return health.status === 'healthy';
      } else {
        console.warn('⚠️ AI Service health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ AI Service health check failed:', error);
      return false;
    }
  }
} 