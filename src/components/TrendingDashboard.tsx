'use client';

import { useState, useEffect } from 'react';
import StatsCard from './StatsCard';
import PlatformChart from './PlatformChart';
import UpdateTimer from './UpdateTimer';
import { TrendDashboardData, TrendAnalysis, ContentSuggestion } from '@/types/trending';

interface TrendingDashboardProps {
  className?: string;
}

export default function TrendingDashboard({ className = "" }: TrendingDashboardProps) {
  const [dashboardData, setDashboardData] = useState<TrendDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [lastDiscoveryTime, setLastDiscoveryTime] = useState<string | null>(null);
  const [lastRedditDiscovery, setLastRedditDiscovery] = useState<string | null>(null);
  const [redditPostCount, setRedditPostCount] = useState<number>(0);
  const [redditRefreshCountdown, setRedditRefreshCountdown] = useState<number>(0);
  const [viralStats, setViralStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);

  // Helper function to ensure data safety
  const ensureDataSafety = (data: any): TrendDashboardData => {
    return {
      topTrends: (data?.topTrends || []).map((trend: any) => ({
        ...trend,
        hashtags: trend.hashtags || [],
        platforms: trend.platforms || [],
        sample_posts: trend.sample_posts || [],
        keywords: trend.keywords || [],
        content_themes: trend.content_themes || [],
        media_types: trend.media_types || [],
        viral_score: trend.viral_score || 0
      })),
      trendingHashtags: data?.trendingHashtags || [],
      trendingKeywords: data?.trendingKeywords || [],
      contentSuggestions: (data?.contentSuggestions || []).map((suggestion: any) => ({
        ...suggestion,
        suggested_hashtags: suggestion.suggested_hashtags || [],
        target_platforms: suggestion.target_platforms || [],
        confidence_score: suggestion.confidence_score || 0
      })),
      platformBreakdown: data?.platformBreakdown || {},
      categoryBreakdown: data?.categoryBreakdown || {},
      engagementTrends: data?.engagementTrends || [],
      viralityScore: data?.viralityScore || 0,
      trendingCategories: data?.trendingCategories || []
    };
  };

  // Fetch viral dashboard data with enhanced analytics
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trending/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch viral dashboard data');
      }
      const result = await response.json();
      const safeData = ensureDataSafety(result.data);
      setDashboardData(safeData);
      setLastDiscoveryTime(result.lastDiscoveryTime);
      setViralStats(result.viralStats);
      setAnalytics(result.analytics);
      
      // Log viral analytics
      if (result.analytics?.message) {
        console.log('🔥 Dashboard loaded:', result.analytics.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger trend discovery (Twitter)
  const discoverTrends = async () => {
    try {
      setIsDiscovering(true);
      const response = await fetch('/api/trending/discover', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to discover trends');
      }
      
      const result = await response.json();
      console.log('Trend discovery completed:', result);
      
      // Refresh dashboard data after discovery
      await fetchDashboardData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover trends');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Trigger Reddit viral discovery
  const discoverRedditTrends = async () => {
    try {
      setIsDiscovering(true);
      const response = await fetch('/api/trending/discover/reddit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subreddits: ['popular', 'all', 'technology', 'entertainment', 'sports', 'news', 'business', 'gaming', 'worldnews', 'funny'],
          postsPerSubreddit: 1000, // MAXIMUM - up to 1,000 per subreddit
          timeframe: 'day',
          maxSubreddits: 8 // Limit to respect rate limits
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to discover Reddit viral trends');
      }
      
      const result = await response.json();
      console.log('Reddit viral discovery completed:', result);
      
      // Update Reddit-specific state
      if (result.success) {
        setError(null);
        setRedditPostCount(result.discovered.newPosts || 0);
        setLastRedditDiscovery(new Date().toISOString());
        console.log(`🔥 Discovered ${result.discovered.newPosts} viral Reddit posts across ${result.discovered.categories} categories`);
      }
      
      // Refresh dashboard data after discovery
      await fetchDashboardData();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover Reddit viral trends');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Analyze entire database with AI (if available)
  const analyzeDatabase = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      console.log('🤖 Starting AI-powered database analysis...');
      
      // Try AI analysis first, fallback to regular analysis
      let response = await fetch('/api/trending/ai-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // If AI analysis fails, fallback to regular analysis
      if (!response.ok) {
        console.warn('AI analysis not available, using standard analysis...');
        response = await fetch('/api/trending/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      if (!response.ok) {
        throw new Error('Failed to analyze database');
      }
      
      const result = await response.json();
      console.log('Database analysis completed:', result);
      
      if (result.success) {
        const analysisType = result.aiAnalysisAvailable ? '🤖 AI-powered' : '📊 Standard';
        console.log(`🎉 ${analysisType} analysis complete: ${result.stats?.trendsGenerated || result.analyzed?.trendsGenerated} trends from ${result.stats?.totalPosts || result.analyzed?.totalPosts} posts`);
        
        // Show AI insights if available
        if (result.aiInsights) {
          console.log('🤖 AI Insights:', result.aiInsights);
        }
        
        // Update dashboard data with new analysis
        if (result.dashboardData) {
          const safeData = ensureDataSafety(result.dashboardData);
          setDashboardData(safeData);
        }
        
        // Update analytics
        if (result.analytics) {
          setAnalytics(result.analytics);
        }
        
        // Refresh the dashboard to show updated data
        await fetchDashboardData();
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze database');
      console.error('Database analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get database stats
  const getDbStats = async () => {
    try {
      const response = await fetch('/api/trending/analyze');
      if (response.ok) {
        const result = await response.json();
        setDbStats(result.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch database stats:', err);
    }
  };

  // Reddit countdown timer (refresh every 10 minutes for optimal viral discovery)
  useEffect(() => {
    if (!lastRedditDiscovery) return;

    const updateRedditCountdown = () => {
      const now = new Date();
      const lastUpdate = new Date(lastRedditDiscovery);
      const nextUpdate = new Date(lastUpdate.getTime() + 10 * 60 * 1000); // 10 minutes
      
      const timeDiff = nextUpdate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setRedditRefreshCountdown(0);
        return;
      }

      setRedditRefreshCountdown(Math.ceil(timeDiff / 1000)); // seconds remaining
    };

    updateRedditCountdown(); // Initial update
    const interval = setInterval(updateRedditCountdown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastRedditDiscovery]);

  useEffect(() => {
    fetchDashboardData();
    getDbStats();
  }, []);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Trending Content Analysis</h2>
          <div className="animate-pulse h-10 w-32 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Trending Data</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={discoverTrends}
            disabled={isDiscovering}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isDiscovering ? 'Discovering...' : 'Try Twitter'}
          </button>
          <button
            onClick={discoverRedditTrends}
            disabled={isDiscovering}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isDiscovering ? 'Discovering...' : 'Try Reddit'}
          </button>
          <button
            onClick={analyzeDatabase}
            disabled={isAnalyzing || (dbStats && dbStats.totalPosts === 0)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Professional AI Analysis...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                🧠 AI Analyze Database {dbStats ? `(${dbStats.totalPosts} posts)` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Viral Content Data</h3>
        <p className="text-gray-600 mb-6">Start discovering viral trends to see analytics</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={discoverTrends}
            disabled={isDiscovering}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {isDiscovering ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Discovering...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Discover from Twitter
              </>
            )}
          </button>
          <button
            onClick={discoverRedditTrends}
            disabled={isDiscovering || (redditRefreshCountdown > 0)}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {isDiscovering ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Discovering Viral Content...
              </>
            ) : redditRefreshCountdown > 0 ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Next in {Math.floor(redditRefreshCountdown / 60)}:{(redditRefreshCountdown % 60).toString().padStart(2, '0')}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Discover Viral Reddit Content
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header with Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">🔥 Maximum Viral Discovery</h2>
            <p className="text-gray-600 mt-1">
              {analytics?.message || 'Discover viral content across multiple platforms'}
            </p>
            {analytics?.efficiency && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {analytics.efficiency}
              </div>
            )}
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium text-blue-900">Twitter</span>
                </div>
                <p className="text-sm text-blue-800">Free tier: 1 request per 15 minutes</p>
              </div>
              
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="font-medium text-orange-900">Reddit Viral Discovery</span>
                </div>
                <p className="text-sm text-orange-800">
                  {redditPostCount > 0 ? `Last: ${redditPostCount} viral posts` : 'MAX: Up to 8,000 posts/discovery'}
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  <span className="font-medium text-purple-900">Database Analysis</span>
                </div>
                <p className="text-sm text-purple-800">
                  {dbStats ? `${dbStats.totalPosts} posts, ${dbStats.totalTrends} trends` : 'Loading stats...'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <UpdateTimer lastUpdateTime={lastDiscoveryTime || undefined} />
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={discoverTrends}
                disabled={isDiscovering}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
              >
                {isDiscovering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Discovering...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Discover from Twitter
                  </>
                )}
              </button>
              
              <button
                onClick={discoverRedditTrends}
                disabled={isDiscovering || (redditRefreshCountdown > 0)}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
              >
                {isDiscovering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Discovering Viral Content...
                  </>
                ) : redditRefreshCountdown > 0 ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {Math.floor(redditRefreshCountdown / 60)}:{(redditRefreshCountdown % 60).toString().padStart(2, '0')} until refresh
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {redditPostCount > 0 ? `Discover More (${redditPostCount} last time)` : 'Discover Viral Content'}
                  </>
                )}
              </button>
              
              <button
                onClick={analyzeDatabase}
                disabled={isAnalyzing || (dbStats && dbStats.totalPosts === 0)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing Database...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {dbStats ? `Analyze Database (${dbStats.totalPosts} posts)` : 'Analyze Database'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Viral Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Viral Posts (24h)"
          value={viralStats?.totalPosts || dashboardData.topTrends?.length || 0}
          subtitle={viralStats?.totalPosts ? `Avg: ${viralStats.avgEngagement} engagement` : "Analyzed patterns"}
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Active Platforms"
          value={viralStats?.platforms || Object.keys(dashboardData.platformBreakdown || {}).length}
          subtitle={analytics?.trending?.[0] ? `Top: ${analytics.trending[0].platform}` : "Multi-platform"}
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
        />
        <StatsCard
          title="Viral Categories"
          value={viralStats?.categories || dashboardData.trendingCategories?.length || 0}
          subtitle={`${dashboardData.contentSuggestions.length} AI suggestions`}
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <StatsCard
          title="Virality Score"
          value={`${Math.round(dashboardData.viralityScore)}%`}
          subtitle={viralStats?.topEngagement ? `Peak: ${viralStats.topEngagement}` : "Trend strength"}
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          }
        />
      </div>

      {/* Display Professional AI Analytics if available */}
      {analytics && analytics.stats && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-purple-900">🧠 Professional AI Analysis Results</h3>
              <p className="text-purple-700 text-sm">Advanced sentiment analysis and viral pattern recognition</p>
            </div>
          </div>
          
          {/* Professional Workflow Status */}
          {analytics.workflowStatus && (
            <div className="bg-white rounded-lg p-4 mb-6 border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-3">📋 Analysis Workflow</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-green-700">{analytics.workflowStatus.dataCollection}</div>
                <div className="text-green-700">{analytics.workflowStatus.aiAnalysis}</div>
                <div className="text-green-700">{analytics.workflowStatus.contentGeneration}</div>
                <div className="text-green-700">{analytics.workflowStatus.qualityCheck}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Enhanced Stats */}
            <div className="space-y-3">
              <h4 className="font-medium text-purple-800">📊 Analysis Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-medium text-green-600">{analytics.stats.analysisSuccessRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trends Generated:</span>
                  <span className="font-medium">{analytics.stats.trendsGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Content Ideas:</span>
                  <span className="font-medium">{analytics.stats.suggestionsGenerated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">High Confidence:</span>
                  <span className="font-medium text-blue-600">{analytics.stats.highConfidenceSuggestions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Engagement:</span>
                  <span className="font-medium">{analytics.stats.avgEngagement?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Content Suggestions Summary */}
            {analytics.contentSuggestions && (
              <div className="space-y-3">
                <h4 className="font-medium text-purple-800">💡 Content Strategy</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Confidence:</span>
                    <span className="font-medium text-green-600">{analytics.contentSuggestions.avgConfidence}%</span>
                  </div>
                  {Object.entries(analytics.contentSuggestions.byType || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{type}s:</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            <div className="space-y-3">
              <h4 className="font-medium text-purple-800">🔍 AI Insights</h4>
              <div className="space-y-2">
                {analytics.aiInsights?.viralityInsights?.slice(0, 3).map((insight: string, idx: number) => (
                  <div key={idx} className="text-xs text-gray-700 bg-white p-2 rounded border-l-2 border-purple-300">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Top Trends */}
          {analytics.topTrends && analytics.topTrends.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-purple-800 mb-4">🏆 Top AI-Analyzed Trends</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {analytics.topTrends.slice(0, 4).map((trend: any, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{trend.title}</h5>
                      <span className="text-lg text-orange-500">🔥{trend.viralScore}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">{trend.category}</span>
                      <span>{trend.posts} posts</span>
                      <span>{trend.avgEngagement?.toLocaleString()} avg engagement</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        trend.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                        trend.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {trend.sentiment}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {trend.aiInsights && trend.aiInsights.length > 0 && (
                        <div className="text-xs text-gray-700">
                          <strong>AI Insight:</strong> {trend.aiInsights[0]}
                        </div>
                      )}
                      {trend.viralFactors && trend.viralFactors.length > 0 && (
                        <div className="text-xs text-blue-700">
                          <strong>Viral Factor:</strong> {trend.viralFactors[0]}
                        </div>
                      )}
                    </div>
                    {trend.platforms && trend.platforms.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {trend.platforms.map((platform: string) => (
                          <span key={platform} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {platform}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {analytics.workflowStatus?.nextSteps && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3">📋 Recommended Next Steps</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                {analytics.workflowStatus.nextSteps.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-xs font-medium text-blue-800">
                      {idx + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PlatformChart
          data={dashboardData.platformBreakdown}
          title="Trending Content by Platform"
          type="doughnut"
        />
        <PlatformChart
          data={dashboardData.categoryBreakdown}
          title="Trending Categories"
          type="bar"
        />
      </div>

      {/* Top Trends and Content Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Trends */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Trending Patterns</h3>
          {dashboardData.topTrends.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.topTrends.slice(0, 5).map((trend) => (
                <TrendCard key={trend.id} trend={trend} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No trends discovered yet</p>
              <p className="text-sm text-gray-400 mt-1">Use the discovery buttons above to start analyzing</p>
            </div>
          )}
        </div>

        {/* Content Suggestions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Content Suggestions</h3>
          {dashboardData.contentSuggestions.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.contentSuggestions.slice(0, 5).map((suggestion) => (
                <ContentSuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No content suggestions yet</p>
              <p className="text-sm text-gray-400 mt-1">Discover trends to generate AI content ideas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend }: { trend: TrendAnalysis }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 text-sm">{trend.trend_title}</h4>
        <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">
          {Math.round(trend.viral_score || 0)}% viral
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{trend.trend_description}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {(trend.hashtags || []).slice(0, 3).map((hashtag, index) => (
          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {hashtag}
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-500">
        {(trend.platforms || []).join(', ')} • {trend.total_posts || (trend.sample_posts || []).length} posts
      </div>
    </div>
  );
}

function ContentSuggestionCard({ suggestion }: { suggestion: ContentSuggestion }) {
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'reel':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
      case 'story':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
      case 'carousel':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
      default:
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-purple-600">
          {getContentTypeIcon(suggestion.content_type)}
        </div>
        <span className="text-sm font-medium text-gray-900 capitalize">
          {suggestion.content_type}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round((suggestion.confidence_score || 0) * 100)}% confidence
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3 line-clamp-3">
        {suggestion.suggested_content}
      </p>
      <div className="flex flex-wrap gap-1 mb-2">
        {(suggestion.suggested_hashtags || []).slice(0, 3).map((hashtag, index) => (
          <span key={index} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            {hashtag}
          </span>
        ))}
      </div>
      <div className="text-xs text-gray-500">
        {(suggestion.target_platforms || []).join(', ')}
      </div>
    </div>
  );
} 