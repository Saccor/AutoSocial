'use client';

import { useState } from 'react';
import { StoredSocialAccount } from '@/services/SocialAccountService';

interface PostComposerProps {
  accounts: StoredSocialAccount[];
  onPost: (content: string, selectedAccounts: string[]) => Promise<void>;
  className?: string;
}

export default function PostComposer({ accounts, onPost, className = "" }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handlePost = async () => {
    if (!content.trim() || selectedAccounts.length === 0) return;

    setIsPosting(true);
    try {
      await onPost(content, selectedAccounts);
      setContent('');
      setSelectedAccounts([]);
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return (
          <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
        );
      case 'instagram':
        return (
          <div className="w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">I</span>
          </div>
        );
      case 'linkedin':
        return (
          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">L</span>
          </div>
        );
      default:
        return (
          <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{platform.charAt(0).toUpperCase()}</span>
          </div>
        );
    }
  };

  if (accounts.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Post</h3>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-gray-500">No connected accounts</p>
            <p className="text-sm text-gray-400 mt-1">Connect social accounts to start posting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Post</h3>
      
      {/* Content Input */}
      <div className="mb-4">
        <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-2">
          Post Content
        </label>
        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={4}
          maxLength={280}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">
            {content.length}/280 characters
          </span>
        </div>
      </div>

      {/* Account Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post to accounts
        </label>
        <div className="space-y-2">
          {accounts.map((account) => (
            <label
              key={account.id}
              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedAccounts.includes(account.id.toString())}
                onChange={() => handleAccountToggle(account.id.toString())}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex items-center gap-3">
                {getPlatformIcon(account.platform)}
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {account.platform}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{account.account_identifier}
                  </p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Post Button */}
      <button
        onClick={handlePost}
        disabled={!content.trim() || selectedAccounts.length === 0 || isPosting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPosting ? (
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Posting...
          </div>
        ) : (
          `Post to ${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''}`
        )}
      </button>
    </div>
  );
} 