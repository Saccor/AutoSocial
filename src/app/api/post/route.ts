import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { SocialAccountService } from '@/services/SocialAccountService';
import { AnalyticsService } from '@/services/AnalyticsService';
import { ProviderRegistry } from '@/providers/ProviderRegistry';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' }, 
        { status: 401 }
      );
    }

    const { content, accountIds } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' }, 
        { status: 400 }
      );
    }

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one account must be selected' }, 
        { status: 400 }
      );
    }

    const results = [];

    // Post to each selected account
    for (const accountId of accountIds) {
      try {
        // Get user accounts to find the selected one
        const userAccounts = await SocialAccountService.getUserAccounts(user.id);
        const account = userAccounts.find(acc => acc.id.toString() === accountId);

        if (!account) {
          results.push({
            accountId,
            platform: 'unknown',
            success: false,
            error: 'Account not found'
          });
          continue;
        }

        // Get valid token for the account
        const token = await SocialAccountService.getValidToken(
          user.id, 
          account.platform, 
          account.account_identifier
        );

        // Get provider and post content
        const provider = ProviderRegistry.getProvider(account.platform);
        const postResult = await provider.post(token, { text: content });

        // Save post to database for tracking
        const savedPost = await AnalyticsService.savePost({
          user_id: user.id,
          platform: account.platform,
          platform_post_id: postResult.platform_post_id || '',
          account_identifier: account.account_identifier,
          content: content,
          post_url: postResult.url,
          status: postResult.status,
          error_message: postResult.error_message,
          published_at: postResult.status === 'published' ? new Date() : undefined,
        });

        results.push({
          accountId,
          platform: account.platform,
          success: postResult.status === 'published',
          postId: savedPost.id,
          url: postResult.url,
          error: postResult.error_message
        });

      } catch (error) {
        console.error(`Failed to post to account ${accountId}:`, error);
        
        // Save failed post to database
        try {
          const userAccounts = await SocialAccountService.getUserAccounts(user.id);
          const account = userAccounts.find(acc => acc.id.toString() === accountId);
          
          if (account) {
            await AnalyticsService.savePost({
              user_id: user.id,
              platform: account.platform,
              platform_post_id: '',
              account_identifier: account.account_identifier,
              content: content,
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        } catch (saveError) {
          console.error('Failed to save failed post:', saveError);
        }

        results.push({
          accountId,
          platform: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check if any posts were successful
    const successfulPosts = results.filter(r => r.success);
    const failedPosts = results.filter(r => !r.success);

    return NextResponse.json({
      success: successfulPosts.length > 0,
      results,
      summary: {
        total: results.length,
        successful: successfulPosts.length,
        failed: failedPosts.length
      }
    });

  } catch (error) {
    console.error('Post API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 