-- Guest Preferences: structured preference data for crew briefing and personalisation
-- Separate from emotional_profile (which is inferred/crew-only)

ALTER TABLE lexa_user_profiles
  ADD COLUMN IF NOT EXISTS guest_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN lexa_user_profiles.guest_preferences IS
'Structured guest preferences (user-editable):
{
  "dietary_restrictions": ["vegetarian"],
  "allergies": ["tree nuts"],
  "food_preferences": ["Mediterranean"],
  "food_dislikes": ["spicy"],
  "alcohol_preference": "wine lover",
  "wellness_focus": ["deep tissue massage", "yoga"],
  "wellness_avoid": ["cold plunge"],
  "fitness_level": "moderate",
  "mobility_notes": "",
  "temperature_preference": "cool",
  "pillow_type": "firm",
  "sleep_aids": ["blackout curtains"],
  "scent_preferences": ["lavender", "ocean"],
  "music_taste": ["jazz", "ambient"],
  "activity_interests": ["Culinary Excellence", "Wellness & Transformation"],
  "activity_avoid": ["heights"],
  "pace_preference": "relaxed",
  "greeting_style": "warm",
  "privacy_level": "private",
  "special_occasions": "Anniversary June 15",
  "notes": ""
}';
