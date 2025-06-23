import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { AnalyticsService } from '@/services/AnalyticsService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }

    // Get analytics data
    const analyticsData = await AnalyticsService.getAnalyticsData(user.id);
    const dashboardStats = await AnalyticsService.getDashboardStats(user.id);

    return NextResponse.json({
      ...analyticsData,
      stats: dashboardStats
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 