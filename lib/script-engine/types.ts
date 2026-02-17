/**
 * LEXA Script Engine - Type Definitions
 *
 * All interfaces for the 5-stage document generation system,
 * Neo4j node types, matching, and generation inputs.
 */

// ============================================================================
// NEO4J NODE TYPES
// ============================================================================

export interface ExperienceArc {
  code: string;
  name: string;
  tagline: string;
  hook: string;
  description: string;
  core_transformation: string;
  narrative_structure: string;
  closing_anchor: string;
  min_days: number;
  max_days: number;
  color_primary: string;
  color_accent: string;
  color_bg: string;
}

export interface ArcPhase {
  uid: string;
  sequence: number;
  name: string;
  typical_days: string;
  emotional_core: string;
  description: string;
  color_code: string;
}

export interface GuestArchetype {
  code: string;
  name: string;
  description: string;
  core_need: string;
  fears: string[];
  desires: string[];
  trigger_phrases: string[];
}

export interface JourneyType {
  code: string;
  name: string;
  description: string;
}

export interface RitualTemplate {
  code: string;
  name: string;
  when_text: string;
  duration: string;
  led_by: string;
  setup: string[];
  script_text: string;
  notes: string[];
}

// ============================================================================
// ARC MATCHING
// ============================================================================

export interface ArcMatch {
  arc_code: string;
  arc_name: string;
  tagline: string;
  hook: string;
  matching_archetypes: string[];
  match_score: number;
}

export interface MatchInput {
  journey_type?: string;
  guest_keywords: string[];
}

// ============================================================================
// GENERATION INPUTS
// ============================================================================

/** Input from the B2C chat conversation */
export interface ChatGenerationInput {
  source: "chat";
  conversation_id: string;
  user_id: string;
  messages: { role: string; content: string }[];
  journey_type?: string;
  region?: string;
  duration?: number;
  guest_keywords?: string[];
}

/** Input from the B2B admin form */
export interface AdminGenerationInput {
  source: "admin";
  name?: string;
  region: string;
  duration: number;
  journey_type: string;
  arc_code: string;
  experience_idea?: string;
  must_include_pois?: string[];
  exclude_pois?: string[];
  themes?: string[];
  generate_full?: boolean;
}

/** Input for batch generation */
export interface BatchGenerationInput {
  regions: string[];
  journey_types: string[];
  arc_codes: string[];
  durations: number[];
}

export type ScriptGenerationInput = ChatGenerationInput | AdminGenerationInput;

// ============================================================================
// STAGE 1: DISCOVERY OUTPUT (Chat Response)
// ============================================================================

export interface Stage1Output {
  experience_name: string;
  tagline: string;
  hook: string;
  description: string;
  highlights: {
    title: string;
    description: string;
  }[];
  target_profile: {
    intro: string;
    criteria: string[];
  };
  quick_facts: {
    duration: string;
    region: string;
    season: string;
    embarkation: string;
    type: string;
  };
  // Metadata
  arc_code: string;
  journey_type: string;
  generated_at: string;
}

// ============================================================================
// STAGE 2: EXPERIENCE SCRIPT (Full Document)
// ============================================================================

export interface Stage2Output {
  document_id: string;
  script_id: string;
  generated_at: string;
  version: number;

  cover: {
    experience_name: string;
    tagline: string;
    subtitle: string;
    journey_type: string;
    region: string;
    duration: string;
    hook: string;
  };

  philosophy: {
    title: string;
    content: string;
  };

  arc: {
    title: string;
    phases: {
      name: string;
      days: string;
      emotional_core: string;
      description: string;
      color: string;
    }[];
    day_summary: {
      day: number;
      title: string;
      phase: string;
      emotion: string;
    }[];
  };

  days: {
    day_number: number;
    title: string;
    subtitle: string;
    theme: string;
    phase: string;
    phase_color: string;
    emotional_core: string;
    narrative: string;
    memory_anchor: string;
    experiences: {
      sequence: number;
      description: string;
      poi_name?: string;
      timing?: string;
    }[];
  }[];

  signature_experiences: {
    number: string;
    title: string;
    description: string;
  }[];

  kit: {
    title: string;
    subtitle: string;
    items: {
      name: string;
      description: string;
    }[];
  };

  closing: {
    title: string;
    content: string;
    experience_name: string;
    tagline: string;
  };
}

// ============================================================================
// STAGE 3: BOOKING ASSETS (Operational Document)
// ============================================================================

export interface GuestProfile {
  name: string;
  preferences: string;
  dietary: string;
  wellness_focus: string;
  mobility: string;
  communication: string;
}

export interface Stage3Output {
  booking_reference: string;
  guests: GuestProfile[];
  dates: {
    start: string;
    end: string;
  };
  duration_days: number;
  vessel?: string;
  generated_at: string;
  version: number;

  pois: {
    poi_id: string;
    day: number;
    name: string;
    type: string;
    location: {
      address: string;
      gps: { lat: number; lon: number };
      nearest_port: string;
      distance: string;
      transfer_method: string;
    };
    contact: {
      main: string;
      phone: string;
      email: string;
      vip_contact?: string;
    };
    booking: {
      lead_time: string;
      method: string;
      deposit: string;
      cancellation: string;
    };
    pricing: {
      range: string;
      includes: string;
      extras: string;
      payment: string;
    };
    requirements: {
      dress_code: string;
      bring: string;
      physical_level: string;
      duration: string;
      best_time: string;
    };
    operational_notes: string;
    alternatives: string[];
  }[];

  daily_logistics: {
    day: number;
    date: string;
    title: string;
    phase: string;
    emotional_focus: string;
    schedule: {
      time: string;
      activity: string;
      location: string;
      booking_status: "confirmed" | "pending" | "unavailable" | "none";
      reference?: string;
    }[];
    marina: string;
    weather_backup: string;
    special_notes: string;
  }[];

  booking_status: {
    experience: string;
    day: number;
    status: "confirmed" | "pending" | "unavailable";
    reference?: string;
    notes?: string;
  }[];

  transfers: {
    day: number;
    time: string;
    from: string;
    to: string;
    method: string;
    duration: string;
    provider?: string;
  }[];

  dietary: {
    guest_name: string;
    allergies: string[];
    restrictions: string[];
    preferences: string[];
    avoid: string[];
  }[];

  wellness: {
    guest_name: string;
    iv_protocol: { treatment: string; days: number[] }[];
    treatment_preferences: string;
    sleep_support: string;
  }[];

  emergency_contacts: {
    type: string;
    name?: string;
    phone: string;
  }[];

  weather_alternatives: {
    day: number;
    activity: string;
    alternative: string;
  }[];
}

// ============================================================================
// STAGE 4: CONCIERGE PLAYBOOK (Crew Document)
// ============================================================================

export interface Stage4Output {
  cover: {
    experience_name: string;
    guests: string[];
    dates: { start: string; end: string };
    arc: string;
    core_transformation: string;
  };

  guest_profile: {
    archetype: string;
    description: string;
    core_need: string;
    fears: string[];
    what_to_avoid: string[];
    what_works: string[];
    key_phrase: string;
    couple_dynamics?: {
      dynamic: string;
      crew_role: string;
      phase_awareness: string;
    };
  };

  pre_cruise_checklist: {
    days_before: number;
    items: {
      task: string;
      completed: boolean;
    }[];
  }[];

  pre_cruise_communications: {
    days_before: number;
    channel: string;
    subject: string;
    template: string;
  }[];

  daily_briefings: {
    day: number;
    title: string;
    phase: string;
    emotional_focus: string;
    what_happening: string;
    crew_do: string[];
    crew_dont: string[];
    memory_anchor: string;
    schedule: {
      time: string;
      activity: string;
      notes?: string;
    }[];
    environment: {
      music: string;
      lighting: string;
      scent: string;
      temperature: string;
    };
  }[];

  rituals: {
    name: string;
    when: string;
    duration: string;
    led_by: string;
    setup: string[];
    script: string;
    notes: string[];
  }[];

  emotional_beats: {
    name: string;
    usually_when: string;
    signs: string[];
    crew_response: string[];
    critical_note?: string;
  }[];

  post_cruise_sequence: {
    timing: string;
    channel: string;
    subject: string;
    template: string;
    include?: string[];
  }[];
}

// ============================================================================
// STAGE 5: BROKER TEASER (Marketplace Listing)
// ============================================================================

export interface Stage5Output {
  header: {
    brand: string;
    region: string;
    season: string;
    duration: string;
  };

  title: {
    experience_name: string;
    tagline: string;
    positioning: string;
  };

  hook: {
    lines: string[];
    pivot: string;
  };

  description: {
    title: string;
    content: string;
  };

  highlights: {
    title: string;
    subtitle: string;
    items: {
      icon: string;
      title: string;
      description: string;
    }[];
  };

  target_profile: {
    title: string;
    subtitle: string;
    criteria: string[];
  };

  voyage_details: {
    duration: string;
    region: string;
    season: string;
    embarkation: string;
    key_destinations: string;
    experience_type: string;
  };

  closing: {
    quote: string;
    content: string;
    experience_name: string;
    tagline: string;
    cta: string;
  };

  // Metadata
  generated_at: string;
  script_id: string;
  arc_code: string;
}

// ============================================================================
// MARKETPLACE LISTING
// ============================================================================

export interface MarketplaceListing {
  title: string;
  tagline: string;
  hook_short: string;
  description_preview: string;
  thumbnail_emotion: string;
  region: string;
  journey_type: string;
  duration_days: number;
  season: string;
  themes: string[];
  price_tier: "ultra" | "premium" | "accessible";
  luxury_score: number;
  featured: boolean;
  created_at: string;
  full_teaser_url: string;
  inquiry_url: string;
}

// ============================================================================
// SCRIPT STATUS & ACCESS
// ============================================================================

export type ScriptStatus =
  | "DRAFT"
  | "MARKETPLACE_READY"
  | "FULL_READY"
  | "ARCHIVED";

export type AccessLevel =
  | "BROWSE"
  | "INTERESTED"
  | "SAVED"
  | "PREMIUM"
  | "BOOKED"
  | "POST_CRUISE";

export type GenerationJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface GenerationJob {
  job_id: string;
  combinations_count: number;
  completed_count: number;
  failed_count: number;
  status: GenerationJobStatus;
  created_at: string;
  results: {
    combination: { region: string; journey_type: string; arc_code: string; duration: number };
    status: "completed" | "failed";
    script_id?: string;
    error?: string;
  }[];
}
