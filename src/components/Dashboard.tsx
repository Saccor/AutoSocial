'use client';

import { useState, useEffect } from 'react';
import StatsCard from './StatsCard';
import PlatformChart from './PlatformChart';
import RecentPosts from './RecentPosts';
import PostComposer from './PostComposer';
import { StoredSocialAccount } from '@/services/SocialAccountService';
import { AnalyticsData, DashboardStats } from '@/types/analytics';

interface DashboardProps {
  userAccounts: StoredSocialAccount[];
}

interface AnalyticsResponse extends AnalyticsData {
  stats: DashboardStats;
}

export default function Dashboard({ userAccounts }: DashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Handle posting
  const handlePost = async (content: string, accountIds: string[]) => {
    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          accountIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to post');
      }

      // Show success message or handle results
      if (result.success) {
        // Refresh analytics after successful post
        await fetchAnalytics();
        
        // You could add a toast notification here
        console.log(`Successfully posted to ${result.summary.successful} accounts`);
      } else {
        throw new Error('All posts failed');
      }
    } catch (error) {
      console.error('Post failed:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = analytics?.stats || {
    connectedAccounts: userAccounts.length,
    totalPosts: 0,
    successfulPosts: 0,
    failedPosts: 0,
    avgEngagement: 0,
    topPerformingPlatform: 'none'
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Stats */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Connected Accounts"
            value={stats.connectedAccounts}
            subtitle="Social media accounts"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Total Posts"
            value={stats.totalPosts}
            subtitle="All time"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            }
          />
          <StatsCard
            title="Success Rate"
            value={`${stats.totalPosts > 0 ? Math.round((stats.successfulPosts / stats.totalPosts) * 100) : 0}%`}
            subtitle={`${stats.successfulPosts} successful`}
            icon={
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatsCard
            title="Top Platform"
            value={stats.topPerformingPlatform === 'none' ? 'None' : stats.topPerformingPlatform}
            subtitle="Most posts"
            icon={
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Post Composer */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Post</h2>
        <PostComposer 
          accounts={userAccounts}
          onPost={handlePost}
        />
      </div>

      {/* Analytics Charts and Recent Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PlatformChart
          data={analytics?.platformDistribution || {}}
          title="Connected Accounts by Platform"
        />
        <RecentPosts 
          posts={analytics?.recentPosts || []}
        />
      </div>

      {/* Additional Stats */}
      {analytics && analytics.totalPosts > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{analytics.postsThisWeek}</p>
              <p className="text-sm text-gray-500">Posts this week</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{analytics.postsThisMonth}</p>
              <p className="text-sm text-gray-500">Posts this month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{Math.round(analytics.successRate)}%</p>
              <p className="text-sm text-gray-500">Success rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 