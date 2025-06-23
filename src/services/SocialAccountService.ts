import { createAdminClient } from '@/lib/auth-server';
import { AuthTokenDetails, SupportedPlatform } from '@/types/social';
import { ProviderRegistry } from '@/providers/ProviderRegistry';

export interface StoredSocialAccount {
  id: number;
  user_id: string;
  platform: SupportedPlatform;
  account_identifier: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

export class SocialAccountService {
  /**
   * Store or update a social account in the database
   */
  static async saveAccount(
    userId: string, 
    platform: SupportedPlatform, 
    tokenDetails: AuthTokenDetails
  ): Promise<StoredSocialAccount> {
    const supabase = createAdminClient();
    
    const accountData = {
      user_id: userId,
      platform,
      account_identifier: tokenDetails.platform_user_id,
      access_token: tokenDetails.access_token,
      refresh_token: tokenDetails.refresh_token,
      expires_at: tokenDetails.expires_at?.toISOString(),
      scope: tokenDetails.scope,
      updated_at: new Date().toISOString(),
    };

    // Check if account already exists for this user and platform
    const existingAccount = await this.getAccount(userId, platform, tokenDetails.platform_user_id);
    
    if (existingAccount) {
      // Update existing account
      const { data, error } = await supabase
        .from('social_accounts')
        .update(accountData)
        .eq('id', existingAccount.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error details:', error);
        throw new Error(`Failed to update ${platform} account: ${error.message}`);
      }

      return data;
    } else {
      // Insert new account
      const { data, error } = await supabase
        .from('social_accounts')
        .insert({
          ...accountData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error details:', error);
        throw new Error(`Failed to save ${platform} account: ${error.message}`);
      }

      return data;
    }
  }

  /**
   * Get a social account by user, platform and account identifier
   */
  static async getAccount(
    userId: string,
    platform: SupportedPlatform, 
    accountIdentifier: string
  ): Promise<StoredSocialAccount | null> {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('account_identifier', accountIdentifier)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to get ${platform} account: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all accounts for a specific user and platform
   */
  static async getAccountsByUserAndPlatform(
    userId: string,
    platform: SupportedPlatform
  ): Promise<StoredSocialAccount[]> {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get ${platform} accounts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all accounts for a specific user
   */
  static async getUserAccounts(userId: string): Promise<StoredSocialAccount[]> {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('platform', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user accounts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  static async getValidToken(
    userId: string,
    platform: SupportedPlatform, 
    accountIdentifier: string
  ): Promise<string> {
    const account = await this.getAccount(userId, platform, accountIdentifier);
    
    if (!account) {
      throw new Error(`No ${platform} account found for user ${userId}`);
    }

    // Check if token is expired
    if (account.expires_at) {
      const expiresAt = new Date(account.expires_at);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

      if (now.getTime() + bufferTime >= expiresAt.getTime()) {
        // Token is expired or will expire soon, refresh it
        return await this.refreshAccountToken(userId, platform, account);
      }
    }

    // Validate token is still working
    const provider = ProviderRegistry.getProvider(platform);
    const isValid = await provider.validateToken(account.access_token);
    
    if (!isValid) {
      // Token is invalid, try to refresh
      return await this.refreshAccountToken(userId, platform, account);
    }

    return account.access_token;
  }

  /**
   * Refresh an account's access token
   */
  private static async refreshAccountToken(
    userId: string,
    platform: SupportedPlatform,
    account: StoredSocialAccount
  ): Promise<string> {
    if (!account.refresh_token) {
      throw new Error(`No refresh token available for ${platform} account. Re-authentication required.`);
    }

    const provider = ProviderRegistry.getProvider(platform);
    
    try {
      const refreshedTokens = await provider.refreshToken(account.refresh_token);
      
      // Update the account with new tokens
      await this.saveAccount(userId, platform, refreshedTokens);
      
      return refreshedTokens.access_token;
    } catch (error) {
      throw new Error(`Failed to refresh ${platform} token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a social account
   */
  static async deleteAccount(
    userId: string,
    platform: SupportedPlatform, 
    accountIdentifier: string
  ): Promise<void> {
    const supabase = createAdminClient();
    
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('account_identifier', accountIdentifier);

    if (error) {
      throw new Error(`Failed to delete ${platform} account: ${error.message}`);
    }
  }
} 