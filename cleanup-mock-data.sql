-- Clean up all mock data from AutoSocial database
-- Run this in your Supabase SQL Editor to remove test data

-- Remove mock trending posts (identifiable by platform_post_id pattern)
DELETE FROM trending_posts 
WHERE platform_post_id IN ('1234567890', '1234567891', '1234567892', '1234567893', '1234567894')
OR platform_post_id LIKE 'mock_%'
OR platform_post_id LIKE 'test_%';

-- Remove any trend analyses based on mock data
DELETE FROM trend_analyses 
WHERE id LIKE 'trend_%mock%' 
OR created_at < NOW() - INTERVAL '1 hour';  -- Remove recent test analyses

-- Remove content suggestions based on mock data
DELETE FROM content_suggestions 
WHERE trend_analysis_id LIKE 'trend_%mock%'
OR created_at < NOW() - INTERVAL '1 hour';  -- Remove recent test suggestions

-- Reset any auto-increment counters if needed
-- (PostgreSQL uses sequences, but our UUIDs don't need resetting)

-- Verify cleanup
SELECT 
  'trending_posts' as table_name,
  COUNT(*) as remaining_records
FROM trending_posts
UNION ALL
SELECT 
  'trend_analyses' as table_name,
  COUNT(*) as remaining_records  
FROM trend_analyses
UNION ALL
SELECT 
  'content_suggestions' as table_name,
  COUNT(*) as remaining_records
FROM content_suggestions;

-- Show what's left (should be empty or contain only real data)
SELECT 
  platform_post_id,
  author_username,
  content,
  discovered_at
FROM trending_posts 
ORDER BY discovered_at DESC
LIMIT 10; 