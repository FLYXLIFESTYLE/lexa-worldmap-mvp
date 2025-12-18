-- Import all BACKLOG.md items into backlog_items table
-- Run this in Supabase SQL Editor

-- Clear existing items (optional - comment out if you want to keep existing items)
-- DELETE FROM backlog_items;

-- 🔴 HIGH PRIORITY (Critical)

-- Strategic Pivot
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Activity-First Discovery Strategy', 'Pivot from enriching existing low-quality POIs to discovering experience-enabling POIs. Collect ALL activity-related POIs (beaches, viewpoints, trails, etc.) not just luxury. Target: 500K experience-enabling POIs worldwide. Philosophy: LEXA makes experiences luxury through design, not just venue selection.', 'critical', 'data', 'pending', 40, '{strategy,discovery,high-value}', 1),
('Multi-Source Premium Discovery', 'Google Places: 30K luxury POIs ($750), Forbes Travel Guide: 5K ultra-luxury (FREE), Michelin Guide: 3K dining elite (FREE), Condé Nast Traveler: 3K curated (FREE), World''s 50 Best: 500 top (FREE), Relais & Châteaux: 600 properties (FREE). Result: 44K unique luxury POIs after deduplication.', 'critical', 'data', 'pending', 60, '{discovery,api-integration,revenue}', 2),
('Master Data Intake Pipeline', 'Automated process: Get properties → Scrape websites → Score → Emotions → Relationships. Duplicate detection & merging (within 100m radius). Creates ALL relationships: LOCATED_IN, SUPPORTS_ACTIVITY, EVOKES, AMPLIFIES_DESIRE, MITIGATES_FEAR, OFFERS_EXPERIENCE. Script: scripts/master-data-intake-pipeline.ts', 'critical', 'infrastructure', 'pending', 80, '{automation,pipeline,critical}', 3),
('Manual POI Import System', 'Import Forbes PDFs converted to CSV, government tourism lists, any POI list (CSV/JSON format). Automatic enrichment through Master Pipeline. Script: scripts/import-manual-poi-list.ts', 'critical', 'feature', 'pending', 8, '{import,automation}', 4),
('Government Tourism Partnerships', 'Target: 5 partnerships by Month 3. Priority: Monaco, Côte d''Azur, Amalfi Coast, Maldives, Dubai. Expected: 50,000+ government-verified POIs.', 'critical', 'data', 'pending', 20, '{partnerships,data-quality}', 5),
('GetYourGuide API Integration', 'World''s largest activities marketplace (50K+ experiences). Revenue: 20-30% commission per booking. Perfect for "things to do" recommendations.', 'critical', 'feature', 'pending', 16, '{api-integration,revenue}', 6),
('Komoot API Integration', 'Outdoor activities (hiking, cycling, running routes). Strong in Europe, 30M+ users. Unique differentiator for outdoor luxury experiences.', 'critical', 'feature', 'pending', 8, '{api-integration,niche}', 7),
('Immediate Data Quality Fixes', 'Run fix-duplicate-relationships.ts, create-experience-nodes-from-highlights.ts. Re-enrich Arabian Gulf (10K POIs), Amalfi Coast (5K POIs). Mark low-quality POIs with skip_enrichment = true.', 'critical', 'bug', 'pending', 4, '{urgent,data-quality}', 8);

-- Data Enrichment & Quality (High Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Selective Enrichment', 'Only enrich POIs with: names, types, in luxury destinations. Skip: unnamed, no type, suspicious scores. Target: ~15K good existing POIs (not 186K all). Cost: $375 (vs. $4,670 for all).', 'high', 'data', 'pending', 12, '{enrichment,cost-optimization}', 9),
('French Riviera Completion', 'Continue with 100 POI batches. Target: Complete remaining ~10K POIs. Cost: ~$250. Timeline: 1-2 weeks with automation.', 'high', 'data', 'pending', 16, '{enrichment,french-riviera}', 10),
('Emotional Intelligence Implementation', 'THE MOAT - LEXA''s billion-dollar differentiator. Build signal detection system (keyword → emotion mapping). Create emotional profile generator. Enhance Neo4j queries with emotional filters. Implement conversational probing.', 'high', 'feature', 'pending', 80, '{moat,ai,emotional-intelligence}', 11);

-- Security & Compliance (High Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('LEXA Compliance & Safety Rules', 'Non-racist, non-discriminatory responses. No hallucination. Travel-only responses. No system insights. Content moderation filters. Automated safety checks. Logging & monitoring. Human review queue.', 'high', 'security', 'pending', 40, '{compliance,safety,critical}', 12),
('Role-Based Access Control (RBAC)', 'Separate user/captain/admin roles with granular permissions.', 'high', 'security', 'pending', 16, '{rbac,security}', 13),
('Input Validation & Sanitization', 'Prevent injection attacks and malicious input.', 'high', 'security', 'pending', 12, '{security,validation}', 14),
('Rate Limiting', 'Prevent abuse and API overuse.', 'high', 'security', 'pending', 8, '{security,rate-limiting}', 15),
('Audit Logging', 'Track all admin actions for compliance and debugging.', 'high', 'infrastructure', 'pending', 6, '{logging,audit}', 16);

-- Features (High Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('User Profile Management', 'Store user preferences, past searches, favorites, travel personality.', 'high', 'feature', 'pending', 24, '{user-experience,profiles}', 17),
('Captain Analytics Dashboard', 'Show which Captains contribute most, knowledge usage stats, impact metrics.', 'high', 'feature', 'pending', 16, '{analytics,captains}', 18),
('Email Notifications', 'Notify Captains when their knowledge is used in recommendations.', 'high', 'feature', 'pending', 8, '{notifications,engagement}', 19),
('Knowledge Approval Workflow', 'Review/approve Captain submissions before publishing.', 'high', 'feature', 'pending', 20, '{moderation,workflow}', 20),
('Bulk Import Status Page', 'Track progress of large ChatGPT imports with real-time updates.', 'high', 'feature', 'pending', 6, '{ui,import}', 21);

-- LEXA Chat Improvements (High Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Optimize Chat Process with LEXA', 'Implement 3-question intake: When, Where, What theme. Quick-reply buttons. Interactive world map for destination selection. Professional luxury-focused tone.', 'high', 'feature', 'pending', 40, '{chat,ux,critical}', 22),
('Enhance Voice Integration', 'Current TTS/STT is terrible. Need better voice quality. Consider ElevenLabs, Play.ht, or similar. HIGH PRIORITY per user feedback.', 'high', 'feature', 'pending', 24, '{voice,ux,user-feedback}', 23),
('Implement Emotional Intelligence in Chat', 'Read between the lines (detect hidden emotions/desires). Conversational probing. Map user language to emotions.', 'high', 'feature', 'pending', 40, '{ai,emotional-intelligence,moat}', 24);

-- UI/UX Improvements (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Add Search to Knowledge Browser', 'Full-text search across all knowledge with filters.', 'normal', 'ui', 'pending', 12, '{search,ux}', 25),
('POI Deduplication in UI', 'Show when POIs are duplicates before merge with visual diff.', 'normal', 'ui', 'pending', 16, '{deduplication,ux}', 26),
('Mobile Responsive Maps', 'Map doesn''t work well on mobile - needs responsive design.', 'normal', 'ui', 'pending', 20, '{mobile,maps,ux}', 27),
('Error Recovery in Upload', 'Resume failed uploads, retry logic, better error messages.', 'normal', 'ui', 'pending', 12, '{upload,error-handling}', 28),
('Optimize Landing Page', 'Better showcase of LEXA''s value proposition, testimonials, clear CTA.', 'normal', 'ui', 'pending', 16, '{landing-page,marketing}', 29);

-- Bugs/Issues (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Fix Port Conflict Handling', 'Better detection/resolution when port 3000 is in use.', 'normal', 'bug', 'pending', 2, '{dev-experience}', 30),
('Handle Empty Neo4j Responses', 'Graceful handling when no data returned from database.', 'normal', 'bug', 'pending', 3, '{error-handling}', 31),
('Improve Unicode Support', 'Better handling of special characters in knowledge content.', 'normal', 'bug', 'pending', 4, '{internationalization}', 32);

-- Quick Wins (Normal Priority, < 2 hours each)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Toast Notifications', 'Add react-hot-toast for success/error toasts on all async actions. Huge UX improvement.', 'normal', 'ui', 'pending', 1, '{quick-win,ux}', 33),
('Autosave to Knowledge Editor', 'Debounced autosave every 3 seconds to prevent data loss.', 'normal', 'ui', 'pending', 2, '{quick-win,ux}', 34),
('Dashboard Stats Cards', 'Total POIs, Luxury POIs, Emotional Coverage, Today''s Enrichment for quick visibility.', 'normal', 'ui', 'pending', 2, '{quick-win,analytics}', 35),
('Add Timestamps', 'Last updated: X minutes ago everywhere to show activity and build trust.', 'normal', 'ui', 'pending', 0.5, '{quick-win,ux}', 36),
('Captain Leaderboard', 'Gamify knowledge contributions with badges, contribution graph, monthly challenges.', 'normal', 'feature', 'pending', 8, '{gamification,engagement}', 37),
('Personality Quiz', '10-15 questions to determine travel personality. Maps to emotional preferences. Saves to user profile. Gamifies onboarding.', 'normal', 'feature', 'pending', 24, '{onboarding,personalization,high-value}', 38);

-- Build & Deployment (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Fix Vercel TypeScript Build', 'Scripts folder causing TypeScript errors in Vercel build. Solution: Exclude scripts from tsconfig.json', 'normal', 'bug', 'pending', 1, '{deployment,build}', 39),
('Fix Destination Browser', 'Failed to load destinations. Check API endpoint, verify Neo4j query, add error handling.', 'normal', 'bug', 'pending', 2, '{bug,ui}', 40);

-- Admin Page Descriptions (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Add Why-What-How Descriptions', 'Add short descriptions to all admin subpages explaining WHY, WHAT, and HOW.', 'normal', 'ui', 'completed', 4, '{documentation,ux}', 41);

-- Authentication & Routing (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Fix Sign-in Redirect', 'After signing in, redirect to original URL instead of /app.', 'normal', 'bug', 'completed', 1, '{auth,routing}', 42);

-- User Features (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('User Management System', 'Admin page to manage Captains and Contributors with role-based permissions.', 'normal', 'feature', 'pending', 12, '{admin,user-management}', 43),
('User Profile Page', 'Allow users to view and edit their profile settings, preferences, and history.', 'normal', 'feature', 'pending', 8, '{user-experience,profile}', 44);

-- Documentation (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Cypher Queries Documentation', 'Create documentation page for most common and recurring Cypher queries and npx commands.', 'normal', 'documentation', 'pending', 4, '{documentation,neo4j}', 45);

-- Data & Real-time Features (Normal Priority)
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) VALUES
('Real-time Events Integration', 'Web scraping for events using Tavily API with AFFECTS_DESTINATION relationships.', 'normal', 'feature', 'pending', 8, '{events,real-time}', 46),
('Weather Integration', 'Real-time weather data using Tavily API for destination recommendations.', 'normal', 'feature', 'pending', 4, '{weather,real-time}', 47),
('Best Time to Travel Feature', 'Add seasonal data and calendar component for optimal travel timing.', 'normal', 'feature', 'pending', 6, '{seasonal,planning}', 48),
('Travel Restrictions & Visa Requirements', 'Implement travel restrictions and visa requirements data integration.', 'normal', 'feature', 'pending', 12, '{compliance,travel-info}', 49);

COMMENT ON TABLE backlog_items IS 'Development backlog imported from BACKLOG.md on Dec 18, 2024';

