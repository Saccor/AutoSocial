#!/usr/bin/env node

/**
 * Manual Trend Discovery Script
 * 
 * Due to Twitter Free tier limits (1 search request per 15 minutes), 
 * automated daily discovery is not practical. Use this script manually.
 * 
 * Usage:
 * - Run manually: node scripts/daily-trend-discovery.js
 * - Consider upgrading to Twitter Basic ($200/month) for higher limits
 */

const fetch = require('node-fetch');

async function runDailyDiscovery() {
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api/trending/discover'  // Replace with your production URL
    : 'http://localhost:3000/api/trending/discover';

  console.log(`[${new Date().toISOString()}] Starting daily trend discovery...`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'cron' })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Discovery successful!`);
      console.log(`📊 Posts discovered: ${result.discovered.posts}`);
      console.log(`📈 Trend analyses: ${result.discovered.analyses}`);
      console.log(`💡 Content suggestions: ${result.discovered.suggestions}`);
    } else {
      console.log(`⏳ ${result.message}`);
      if (result.nextDiscoveryTime) {
        console.log(`🕒 Next discovery: ${result.nextDiscoveryTime}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Discovery failed:`, error.message);
    
    // Log detailed error for debugging
    if (error.message.includes('429')) {
      console.log('🚫 Twitter API rate limit reached. Will retry in next cron cycle.');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('🔌 Server not running. Make sure your app is deployed and accessible.');
    } else {
      console.log('🐛 Unexpected error. Check your Twitter Bearer Token and server logs.');
    }
  }
  
  console.log(`[${new Date().toISOString()}] Daily discovery process complete.\n`);
}

// Run the discovery
runDailyDiscovery().catch(console.error); 