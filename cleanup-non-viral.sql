-- Cleanup Non-Viral Posts Script
-- Removes posts that don't meet genuine viral criteria

-- Remove posts with low engagement (< 50 engagement score or < 25 likes)
DELETE FROM trending_posts 
WHERE engagement_score < 50 OR likes < 25;

-- Remove related trend analyses for low-engagement content
DELETE FROM trend_analyses 
WHERE id NOT IN (
  SELECT DISTINCT trend_category 
  FROM trending_posts 
  WHERE engagement_score >= 50 AND likes >= 25
);

-- Remove content suggestions based on non-viral trends  
DELETE FROM content_suggestions
WHERE trend_analysis_id NOT IN (
  SELECT id FROM trend_analyses
);

-- Show cleanup results
SELECT 'After cleanup:' as status;
SELECT COUNT(*) as remaining_viral_posts FROM trending_posts;
SELECT COUNT(*) as remaining_analyses FROM trend_analyses; 
SELECT COUNT(*) as remaining_suggestions FROM content_suggestions; 