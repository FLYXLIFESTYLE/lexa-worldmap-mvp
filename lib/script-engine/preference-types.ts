/**
 * Guest Preference Types + Hardcoded Dropdown Values
 *
 * Values are based on the current Neo4j database content.
 * Later these will be loaded dynamically from Neo4j.
 */

// ============================================================================
// PREFERENCE INTERFACE
// ============================================================================

export interface GuestPreferences {
  // Dietary
  dietary_restrictions: string[];
  allergies: string[];
  food_preferences: string[];
  food_dislikes: string[];
  alcohol_preference: string;

  // Wellness
  wellness_focus: string[];
  wellness_avoid: string[];
  fitness_level: string;
  mobility_notes: string;

  // Cabin & Comfort
  temperature_preference: string;
  pillow_type: string;
  sleep_aids: string[];
  scent_preferences: string[];
  music_taste: string[];

  // Activities
  activity_interests: string[];
  activity_avoid: string[];
  pace_preference: string;

  // Communication
  greeting_style: string;
  privacy_level: string;
  special_occasions: string;

  // Custom
  notes: string;
}

export const EMPTY_PREFERENCES: GuestPreferences = {
  dietary_restrictions: [],
  allergies: [],
  food_preferences: [],
  food_dislikes: [],
  alcohol_preference: "",
  wellness_focus: [],
  wellness_avoid: [],
  fitness_level: "",
  mobility_notes: "",
  temperature_preference: "",
  pillow_type: "",
  sleep_aids: [],
  scent_preferences: [],
  music_taste: [],
  activity_interests: [],
  activity_avoid: [],
  pace_preference: "",
  greeting_style: "",
  privacy_level: "",
  special_occasions: "",
  notes: "",
};

// ============================================================================
// DROPDOWN OPTIONS (hardcoded from current Neo4j data)
// ============================================================================

export const PREFERENCE_OPTIONS = {
  dietary_restrictions: [
    "No restrictions",
    "Vegetarian",
    "Vegan",
    "Pescatarian",
    "Gluten-free",
    "Dairy-free",
    "Halal",
    "Kosher",
    "Low-carb",
    "Keto",
  ],

  allergies: [
    "None",
    "Tree nuts",
    "Peanuts",
    "Shellfish",
    "Lactose",
    "Gluten",
    "Eggs",
    "Soy",
    "Fish",
    "Sesame",
  ],

  food_preferences: [
    "Mediterranean",
    "Japanese",
    "French",
    "Italian",
    "Thai",
    "Farm-to-table",
    "Seafood",
    "Grilled meats",
    "Plant-based",
    "Raw / sushi",
    "Fine dining",
    "Casual local",
  ],

  food_dislikes: [
    "Spicy food",
    "Raw fish",
    "Heavy cream sauces",
    "Organ meats",
    "Overly sweet",
    "Deep fried",
    "Strong cheese",
    "Garlic",
  ],

  alcohol_preference: [
    "Wine lover",
    "Champagne",
    "Cocktails",
    "Beer",
    "Spirits",
    "Social drinker",
    "Non-drinker",
  ],

  wellness_focus: [
    "Deep tissue massage",
    "Hot stone therapy",
    "Aromatherapy",
    "Thalassotherapy",
    "Cryotherapy",
    "IV therapy / NAD+",
    "Yoga",
    "Meditation",
    "Breathwork",
    "Sound healing",
    "Facial treatments",
    "Body wraps",
    "Hydrotherapy",
    "Acupuncture",
  ],

  wellness_avoid: [
    "Hot stones",
    "Cold plunge / cryotherapy",
    "Needles / acupuncture",
    "Deep pressure",
    "Scented oils",
    "Group sessions",
  ],

  fitness_level: ["Low", "Moderate", "High", "Athlete"],

  temperature_preference: ["Cool", "Moderate", "Warm"],

  pillow_type: ["Firm", "Soft", "Memory foam", "No preference"],

  sleep_aids: [
    "Blackout curtains",
    "White noise",
    "Eye mask",
    "Earplugs",
    "Magnesium supplement",
    "Herbal tea",
    "Melatonin",
    "No aids needed",
  ],

  scent_preferences: [
    "Lavender",
    "Citrus",
    "Ocean / sea salt",
    "Eucalyptus",
    "Sandalwood",
    "Rose",
    "Fresh linen",
    "Cedar",
    "Unscented",
  ],

  music_taste: [
    "Jazz",
    "Classical",
    "Ambient / chill",
    "Lounge",
    "Acoustic",
    "No music",
    "Bossa nova",
    "World music",
    "R&B / soul",
  ],

  // Maps to LEXA_THEMES_14
  activity_interests: [
    "Romance & Intimacy",
    "Adventure & Exploration",
    "Wellness & Transformation",
    "Culinary Excellence",
    "Cultural Immersion",
    "Pure Luxury & Indulgence",
    "Nature & Wildlife",
    "Water Sports & Marine",
    "Art & Architecture",
    "Family Luxury",
    "Celebration & Milestones",
    "Solitude & Reflection",
    "Nightlife & Entertainment",
    "Sports & Active",
  ],

  activity_avoid: [
    "Heights",
    "Deep water",
    "Extreme sports",
    "Crowded venues",
    "Long hikes",
    "Small boats",
    "Helicopters",
    "Confined spaces",
  ],

  pace_preference: ["Relaxed", "Balanced", "Active"],

  greeting_style: ["Formal", "Warm", "Casual"],

  privacy_level: ["Very private", "Private", "Friendly", "Social"],
} as const;

// ============================================================================
// SECTION DEFINITIONS (for form rendering)
// ============================================================================

export type PreferenceSection = {
  id: string;
  title: string;
  icon: string;
  fields: PreferenceField[];
};

export type PreferenceField = {
  key: keyof GuestPreferences;
  label: string;
  type: "multi-select" | "single-select" | "text";
  options?: readonly string[];
  placeholder?: string;
};

export const PREFERENCE_SECTIONS: PreferenceSection[] = [
  {
    id: "dietary",
    title: "Dining & Dietary",
    icon: "Utensils",
    fields: [
      { key: "dietary_restrictions", label: "Dietary Restrictions", type: "multi-select", options: PREFERENCE_OPTIONS.dietary_restrictions },
      { key: "allergies", label: "Allergies", type: "multi-select", options: PREFERENCE_OPTIONS.allergies },
      { key: "food_preferences", label: "Cuisine Preferences", type: "multi-select", options: PREFERENCE_OPTIONS.food_preferences },
      { key: "food_dislikes", label: "Food Dislikes", type: "multi-select", options: PREFERENCE_OPTIONS.food_dislikes },
      { key: "alcohol_preference", label: "Drinks", type: "single-select", options: PREFERENCE_OPTIONS.alcohol_preference },
    ],
  },
  {
    id: "wellness",
    title: "Wellness & Body",
    icon: "Heart",
    fields: [
      { key: "wellness_focus", label: "Preferred Treatments", type: "multi-select", options: PREFERENCE_OPTIONS.wellness_focus },
      { key: "wellness_avoid", label: "Treatments to Avoid", type: "multi-select", options: PREFERENCE_OPTIONS.wellness_avoid },
      { key: "fitness_level", label: "Fitness Level", type: "single-select", options: PREFERENCE_OPTIONS.fitness_level },
      { key: "mobility_notes", label: "Mobility Notes", type: "text", placeholder: "Any mobility considerations..." },
    ],
  },
  {
    id: "cabin",
    title: "Cabin & Sleep",
    icon: "Moon",
    fields: [
      { key: "temperature_preference", label: "Cabin Temperature", type: "single-select", options: PREFERENCE_OPTIONS.temperature_preference },
      { key: "pillow_type", label: "Pillow Preference", type: "single-select", options: PREFERENCE_OPTIONS.pillow_type },
      { key: "sleep_aids", label: "Sleep Aids", type: "multi-select", options: PREFERENCE_OPTIONS.sleep_aids },
      { key: "scent_preferences", label: "Preferred Scents", type: "multi-select", options: PREFERENCE_OPTIONS.scent_preferences },
      { key: "music_taste", label: "Music Taste", type: "multi-select", options: PREFERENCE_OPTIONS.music_taste },
    ],
  },
  {
    id: "activities",
    title: "Activities & Pace",
    icon: "Compass",
    fields: [
      { key: "activity_interests", label: "Interests", type: "multi-select", options: PREFERENCE_OPTIONS.activity_interests },
      { key: "activity_avoid", label: "Avoid", type: "multi-select", options: PREFERENCE_OPTIONS.activity_avoid },
      { key: "pace_preference", label: "Trip Pace", type: "single-select", options: PREFERENCE_OPTIONS.pace_preference },
    ],
  },
  {
    id: "communication",
    title: "Communication & Privacy",
    icon: "MessageCircle",
    fields: [
      { key: "greeting_style", label: "Greeting Style", type: "single-select", options: PREFERENCE_OPTIONS.greeting_style },
      { key: "privacy_level", label: "Privacy Level", type: "single-select", options: PREFERENCE_OPTIONS.privacy_level },
      { key: "special_occasions", label: "Special Occasions", type: "text", placeholder: "Anniversary, birthday, or other occasions..." },
      { key: "notes", label: "Anything Else", type: "text", placeholder: "Anything the crew should know..." },
    ],
  },
];
