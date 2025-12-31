-- ============================================================================
-- Enhanced User Profiles
-- Extends lexa_user_profiles with comprehensive emotional and travel preferences
-- ============================================================================

-- ============================================================================
-- EXTEND: lexa_user_profiles
-- Add rich emotional profile and travel preference fields
-- ============================================================================

ALTER TABLE lexa_user_profiles 
  ADD COLUMN IF NOT EXISTS primary_themes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personality_archetype TEXT,
  ADD COLUMN IF NOT EXISTS budget_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS travel_frequency TEXT,
  ADD COLUMN IF NOT EXISTS sensory_preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS past_destinations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bucket_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dislikes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_travel_style TEXT,
  ADD COLUMN IF NOT EXISTS companion_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seasonal_preferences JSONB DEFAULT '{}'::jsonb;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_lexa_user_profiles_primary_themes ON lexa_user_profiles USING GIN(primary_themes);
CREATE INDEX IF NOT EXISTS idx_lexa_user_profiles_personality_archetype ON lexa_user_profiles(personality_archetype);
CREATE INDEX IF NOT EXISTS idx_lexa_user_profiles_travel_frequency ON lexa_user_profiles(travel_frequency);

-- ============================================================================
-- COMMENTS (Documentation for emotional profile structure)
-- ============================================================================

COMMENT ON COLUMN lexa_user_profiles.emotional_profile IS 
'JSONB structure: {
  "core_emotions": ["freedom", "connection"],
  "secondary_emotions": ["awe", "peace"],
  "emotional_drivers": {
    "reconnection": 0.9,
    "adventure": 0.7,
    "luxury": 0.8
  },
  "personality_traits": {
    "spontaneity": 0.6,
    "planning": 0.8,
    "social": 0.5
  },
  "last_updated": "2025-12-31T10:00:00Z"
}';

COMMENT ON COLUMN lexa_user_profiles.preferences IS 
'JSONB structure for general preferences: {
  "notification_preferences": {},
  "ui_preferences": {},
  "privacy_settings": {}
}';

COMMENT ON COLUMN lexa_user_profiles.primary_themes IS 
'Array of theme slugs user frequently explores (Romance & Intimacy, Adventure & Exploration, etc.)';

COMMENT ON COLUMN lexa_user_profiles.personality_archetype IS 
'Personality type: Explorer, Romantic, Adventurer, Wellness Seeker, Foodie, Culture Enthusiast, etc.';

COMMENT ON COLUMN lexa_user_profiles.budget_preferences IS 
'JSONB structure: {
  "typical_range": "luxury",
  "min_per_day": 500,
  "max_per_day": 2000,
  "currency": "USD",
  "flexibility": "moderate"
}';

COMMENT ON COLUMN lexa_user_profiles.travel_frequency IS 
'How often they travel: rarely, 1-2x/year, 3-5x/year, 6+/year, frequent_traveler';

COMMENT ON COLUMN lexa_user_profiles.sensory_preferences IS 
'JSONB structure: {
  "preferred_scents": ["lavender", "sea_salt", "coffee"],
  "preferred_tastes": ["truffle", "champagne", "local_cuisine"],
  "preferred_sounds": ["ocean_waves", "jazz", "silence"],
  "preferred_aesthetics": ["modern", "classic", "bohemian"],
  "texture_preferences": ["soft_linen", "cool_marble", "warm_wood"]
}';

COMMENT ON COLUMN lexa_user_profiles.past_destinations IS 
'JSONB array of visited destinations: [
  {"name": "French Riviera", "visited_at": "2024-06", "rating": 9, "highlights": ["Monaco", "St. Tropez"]},
  {"name": "Tuscany", "visited_at": "2023-09", "rating": 10, "highlights": ["Florence", "Siena"]}
]';

COMMENT ON COLUMN lexa_user_profiles.bucket_list IS 
'JSONB array of dream destinations: [
  {"destination": "Maldives", "reason": "Private overwater villa", "priority": "high"},
  {"destination": "Japanese Alps", "reason": "Zen and onsen experience", "priority": "medium"}
]';

COMMENT ON COLUMN lexa_user_profiles.dislikes IS 
'JSONB array of things to avoid: [
  {"category": "accommodation", "item": "cruise_ships", "reason": "Too crowded"},
  {"category": "activity", "item": "extreme_sports", "reason": "Not comfortable with heights"},
  {"category": "food", "item": "spicy_food", "reason": "Sensitive stomach"}
]';

COMMENT ON COLUMN lexa_user_profiles.preferred_travel_style IS 
'Travel style preference: luxury, boutique, adventure, cultural, wellness, foodie, romantic, family, solo, group';

COMMENT ON COLUMN lexa_user_profiles.companion_types IS 
'Array of travel companion types: ["partner", "family", "friends", "solo", "group_tours"]';

COMMENT ON COLUMN lexa_user_profiles.seasonal_preferences IS 
'JSONB structure: {
  "best_months": ["may", "june", "september"],
  "avoid_months": ["july", "august"],
  "weather_preferences": ["mild", "warm", "dry"],
  "crowd_tolerance": "low"
}';

-- ============================================================================
-- FUNCTION: Initialize user profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lexa_user_profiles (user_id, emotional_profile, preferences)
  VALUES (
    NEW.id,
    '{
      "core_emotions": [],
      "secondary_emotions": [],
      "emotional_drivers": {},
      "personality_traits": {},
      "last_updated": null
    }'::jsonb,
    '{}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_profile();
