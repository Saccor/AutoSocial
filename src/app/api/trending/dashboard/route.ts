import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { TrendingAnalysisService } from '@/services/TrendingAnalysisService';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }

    // Get comprehensive trending dashboard data
    const dashboardData = await TrendingAnalysisService.getTrendDashboardData();

    return NextResponse.json({
      success: true,
      data: dashboardData,
      lastUpdated: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Trending dashboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch trending dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 