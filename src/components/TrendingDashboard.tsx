'use client';

import { useState, useEffect } from 'react';
import StatsCard from './StatsCard';
import PlatformChart from './PlatformChart';
import { TrendDashboardData, TrendAnalysis, ContentSuggestion } from '@/types/trending';

interface TrendingDashboardProps {
  className?: string;
}

export default function TrendingDashboard({ className = "" }: TrendingDashboardProps) {
  const [dashboardData, setDashboardData] = useState<TrendDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Fetch trending dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trending/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch trending dashboard data');
      }
      const result = await response.json();
      setDashboardData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger trend discovery
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

  useEffect(() => {
    fetchDashboardData();
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
        <div className="flex gap-4">
          <button
            onClick={fetchDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
          <button
            onClick={discoverTrends}
            disabled={isDiscovering}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isDiscovering ? 'Discovering...' : 'Discover New Trends'}
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trending Data</h3>
        <p className="text-gray-600 mb-4">Start discovering trends to see analytics</p>
        <button
          onClick={discoverTrends}
          disabled={isDiscovering}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isDiscovering ? 'Discovering Trends...' : 'Discover Trends Now'}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header with Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Trending Content Analysis</h2>
          <p className="text-gray-600">Discover viral content and generate trending posts</p>
        </div>
        <button
          onClick={discoverTrends}
          disabled={isDiscovering}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isDiscovering ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Discovering...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Trends
            </>
          )}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Trends"
          value={dashboardData.topTrends.length}
          subtitle="Analyzed patterns"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Trending Hashtags"
          value={dashboardData.trendingHashtags.length}
          subtitle="Hot topics"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          }
        />
        <StatsCard
          title="Content Ideas"
          value={dashboardData.contentSuggestions.length}
          subtitle="AI generated"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          }
        />
        <StatsCard
          title="Virality Score"
          value={`${Math.round(dashboardData.viralityScore)}%`}
          subtitle="Trend strength"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          }
        />
      </div>

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
              <p className="text-sm text-gray-400 mt-1">Click "Refresh Trends" to start analyzing</p>
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
              <p className="text-gray-500">No content suggestions available</p>
              <p className="text-sm text-gray-400 mt-1">Discover trends first to generate content ideas</p>
            </div>
          )}
        </div>
      </div>

      {/* Trending Hashtags */}
      {dashboardData.trendingHashtags.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trending Hashtags</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashboardData.trendingHashtags.slice(0, 12).map((hashtag, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-blue-600">#{hashtag.hashtag}</p>
                <p className="text-sm text-gray-500">{hashtag.usage_count} uses</p>
                <p className="text-xs text-green-600">
                  {hashtag.growth_rate > 0 ? '+' : ''}{hashtag.growth_rate}% growth
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Trend Card Component
function TrendCard({ trend }: { trend: TrendAnalysis }) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{trend.trend_title}</h4>
        <span className="text-sm font-medium text-blue-600">
          Score: {Math.round(trend.viral_score)}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{trend.trend_description}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {trend.hashtags.slice(0, 3).map((hashtag, index) => (
          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            #{hashtag}
          </span>
        ))}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>Category: {trend.category}</span>
        <span>{trend.platforms.join(', ')}</span>
      </div>
    </div>
  );
}

// Content Suggestion Card Component
function ContentSuggestionCard({ suggestion }: { suggestion: ContentSuggestion }) {
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'reel':
        return '🎬';
      case 'post':
        return '📝';
      case 'story':
        return '📖';
      case 'carousel':
        return '🎠';
      default:
        return '📄';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getContentTypeIcon(suggestion.content_type)}</span>
          <span className="font-medium text-gray-900 capitalize">{suggestion.content_type}</span>
        </div>
        <span className="text-sm font-medium text-green-600">
          {Math.round(suggestion.confidence_score * 100)}% confidence
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{suggestion.suggested_content}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {suggestion.suggested_hashtags.slice(0, 3).map((hashtag, index) => (
          <span key={index} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            #{hashtag}
          </span>
        ))}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{suggestion.suggested_media_style}</span>
        <span>{suggestion.target_platforms.join(', ')}</span>
      </div>
    </div>
  );
} 