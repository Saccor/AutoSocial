'use client';

import React, { useEffect, useState } from 'react';
import { SupportedPlatform } from '@/types/social';
import { createClient } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

interface SocialConnectButtonProps {
  platform: SupportedPlatform;
  className?: string;
  children?: React.ReactNode;
  onError?: (error: string) => void;
}

const platformConfig = {
  twitter: {
    name: 'Twitter',
    color: 'bg-blue-500 hover:bg-blue-600',
    icon: '🐦',
    clientIdEnv: 'NEXT_PUBLIC_TWITTER_CLIENT_ID',
    redirectUriEnv: 'NEXT_PUBLIC_TWITTER_REDIRECT_URI',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
  },
  instagram: {
    name: 'Instagram', 
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    icon: '📷',
    clientIdEnv: 'NEXT_PUBLIC_INSTAGRAM_CLIENT_ID',
    redirectUriEnv: 'NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI',
    scopes: ['user_profile', 'user_media'],
    authUrl: 'https://api.instagram.com/oauth/authorize',
  },
  linkedin: {
    name: 'LinkedIn',
    color: 'bg-blue-700 hover:bg-blue-800', 
    icon: '💼',
    clientIdEnv: 'NEXT_PUBLIC_LINKEDIN_CLIENT_ID',
    redirectUriEnv: 'NEXT_PUBLIC_LINKEDIN_REDIRECT_URI',
    scopes: ['r_liteprofile', 'w_member_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },
  tiktok: {
    name: 'TikTok',
    color: 'bg-black hover:bg-gray-800',
    icon: '🎵',
    clientIdEnv: 'NEXT_PUBLIC_TIKTOK_CLIENT_ID',
    redirectUriEnv: 'NEXT_PUBLIC_TIKTOK_REDIRECT_URI',
    scopes: ['user.info.basic', 'video.publish'],
    authUrl: 'https://www.tiktok.com/auth/authorize/',
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: '📘',
    clientIdEnv: 'NEXT_PUBLIC_FACEBOOK_CLIENT_ID',
    redirectUriEnv: 'NEXT_PUBLIC_FACEBOOK_REDIRECT_URI',
    scopes: ['email', 'publish_to_groups'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  },
} as const;

function generateAuthUrl(platform: SupportedPlatform): string {
  const config = platformConfig[platform];
  
  // Get environment variables directly (Next.js requires direct access, not dynamic)
  let clientId: string | undefined;
  let redirectUri: string | undefined;

  if (platform === 'twitter') {
    clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI;
  } else if (platform === 'instagram') {
    clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
  } else if (platform === 'linkedin') {
    clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    redirectUri = process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI;
  } else if (platform === 'tiktok') {
    clientId = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID;
    redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;
  } else if (platform === 'facebook') {
    clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
    redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
  }
  
  if (!clientId) {
    throw new Error(`Missing NEXT_PUBLIC_${platform.toUpperCase()}_CLIENT_ID environment variable`);
  }
  
  if (!redirectUri) {
    throw new Error(`Missing NEXT_PUBLIC_${platform.toUpperCase()}_REDIRECT_URI environment variable`);
  }

  // Generate state for security
  const state = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);

  // Platform-specific URL generation
  if (platform === 'twitter') {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(" "),
      state,
      code_challenge: "challenge", // TODO: Implement proper PKCE
      code_challenge_method: "plain",
    });
    return `${config.authUrl}?${params.toString()}`;
  }
  
  if (platform === 'instagram') {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes.join(","),
      response_type: "code",
      state,
    });
    return `${config.authUrl}?${params.toString()}`;
  }

  // Default OAuth 2.0 flow for other platforms
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(" "),
    state,
  });
  
  return `${config.authUrl}?${params.toString()}`;
}

export default function SocialConnectButton({ 
  platform,
  className,
  children,
  onError,
}: SocialConnectButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleConnect = async () => {
    if (!user) {
      alert('Please sign in first to connect social accounts');
      return;
    }

    setLoading(true);
    
    try {
      // Generate OAuth URL based on platform
      let authUrl = '';
      
      switch (platform) {
        case 'twitter':
          authUrl = generateTwitterAuthUrl();
          break;
        case 'instagram':
          authUrl = generateInstagramAuthUrl();
          break;
        case 'linkedin':
          authUrl = generateLinkedInAuthUrl();
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
      
      // Redirect to OAuth provider
      window.location.href = authUrl;
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
      alert(`Failed to connect to ${platform}. Please try again.`);
      setLoading(false);
    }
  };

  const generateTwitterAuthUrl = () => {
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      throw new Error('Twitter OAuth configuration missing');
    }

    const rootUrl = "https://twitter.com/i/oauth2/authorize";
    const codeChallenge = "challenge"; // TODO: Implement proper PKCE
    const state = Math.random().toString(36).substring(2, 15);
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "tweet.read tweet.write users.read offline.access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "plain",
    });

    return `${rootUrl}?${params.toString()}`;
  };

  const generateInstagramAuthUrl = () => {
    // TODO: Implement Instagram OAuth URL generation
    throw new Error('Instagram integration coming soon!');
  };

  const generateLinkedInAuthUrl = () => {
    // TODO: Implement LinkedIn OAuth URL generation  
    throw new Error('LinkedIn integration coming soon!');
  };

  const getPlatformDisplayName = (platform: SupportedPlatform) => {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  };

  const getPlatformColor = (platform: SupportedPlatform) => {
    switch (platform) {
      case 'twitter':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
      case 'linkedin':
        return 'bg-blue-700 hover:bg-blue-800';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg p-4 h-24"></div>
    );
  }

  if (!user) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="text-center">
          <h3 className="font-medium text-gray-900 mb-2">
            {getPlatformDisplayName(platform)}
          </h3>
          <p className="text-sm text-gray-500">
            Sign in required
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="text-center">
        <h3 className="font-medium text-gray-900 mb-3">
          {getPlatformDisplayName(platform)}
        </h3>
        <button
          onClick={handleConnect}
          disabled={loading}
          className={`
            w-full text-white font-bold py-2 px-4 rounded transition-colors
            ${getPlatformColor(platform)}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {loading ? 'Connecting...' : `Connect ${getPlatformDisplayName(platform)}`}
        </button>
      </div>
    </div>
  );
} 