import Image from "next/image";
import SocialConnectButton from "@/components/SocialConnectButton";
import AuthButton from '@/components/AuthButton'
import { getCurrentUser } from '@/lib/auth-server'
import { SocialAccountService, StoredSocialAccount } from '@/services/SocialAccountService'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const user = await getCurrentUser()
  let userAccounts: StoredSocialAccount[] = []
  const params = await searchParams
  
  if (user) {
    try {
      userAccounts = await SocialAccountService.getUserAccounts(user.id)
    } catch (error) {
      console.error('Error fetching user accounts:', error)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Social Media Automation Hub
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect your social media accounts and automate your posting workflow
          </p>
        </div>

        {/* Authentication Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Account Access
              </h2>
              <p className="text-gray-600">
                Sign in to connect and manage your social media accounts
              </p>
            </div>
            <AuthButton />
          </div>
        </div>

        {user ? (
          <>
            {/* Connected Accounts Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Connected Accounts
              </h2>
              
              {userAccounts.length > 0 ? (
                <div className="grid gap-4 mb-6">
                  {userAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {account.platform.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Account: {account.account_identifier}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Connected
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">
                  No social media accounts connected yet.
                </p>
              )}
            </div>

            {/* Connect New Accounts Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Connect Social Media Accounts
              </h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SocialConnectButton platform="twitter" />
                <SocialConnectButton platform="instagram" />
                <SocialConnectButton platform="linkedin" />
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sign In Required
            </h3>
            <p className="text-gray-600">
              Please sign in with your Google account to connect and manage your social media accounts.
            </p>
          </div>
        )}

        {/* Status Messages */}
        {params.success && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {params.success === 'twitter_connected' && 'Twitter account connected successfully!'}
            {params.success === 'instagram_connected' && 'Instagram account connected successfully!'}
            {params.success === 'linkedin_connected' && 'LinkedIn account connected successfully!'}
          </div>
        )}

        {params.error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
            {params.error === 'not_authenticated' && 'Please sign in first to connect social accounts'}
            {params.error === 'oauth_denied' && 'Social media authorization was denied'}
            {params.error === 'missing_params' && 'Missing required parameters'}
            {params.error === 'db_save_failed' && 'Failed to save account information'}
            {params.error === 'auth_failed' && 'Authentication failed'}
            {params.error || 'An error occurred'}
          </div>
        )}
      </div>
    </main>
  );
}
