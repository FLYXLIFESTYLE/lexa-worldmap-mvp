/**
 * LEXA Script Engine - Stage 4: Concierge Playbook (Crew Document)
 *
 * The emotional delivery guide for crew and captain.
 * How to create the LEXA experience — not just logistics, but the feeling.
 *
 * Generated 14 days before departure (automated) or manually.
 * NOT shared with the guest.
 */

import { fetchArcData, fetchRitualTemplates } from "../queries";
import type { Stage4Output, Stage2Output } from "../types";

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generateStage4(input: {
  script_id: string;
  stage2: Stage2Output;
  arc_code: string;
  guest_names: string[];
  start_date: string;
  end_date: string;
  guest_preferences?: Record<string, unknown>;
  emotional_profile?: Record<string, unknown>;
}): Promise<Stage4Output> {
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const { arc, phases, archetypes, rituals } = arcData;
  const primaryArchetype = archetypes[0];

  // Build guest psychology profile
  const guestProfile = buildGuestProfile(primaryArchetype, arc, input.stage2);

  // Build daily briefings from Stage 2 days
  const dailyBriefings = buildDailyBriefings(input.stage2, phases, input.guest_preferences);

  // Format rituals
  const formattedRituals = rituals.map((r) => ({
    name: r.name,
    when: r.when_text,
    duration: r.duration,
    led_by: r.led_by,
    setup: r.setup,
    script: r.script_text,
    notes: r.notes,
  }));

  // Build emotional beats
  const emotionalBeats = buildEmotionalBeats(arc.code);

  // Build post-cruise sequence
  const postCruiseSequence = buildPostCruiseSequence(arc);

  return {
    cover: {
      experience_name: input.stage2.cover.experience_name,
      guests: input.guest_names,
      dates: { start: input.start_date, end: input.end_date },
      arc: arc.name,
      core_transformation: arc.core_transformation,
    },

    guest_profile: guestProfile,

    pre_cruise_checklist: [
      {
        days_before: 14,
        items: [
          { task: "Guest profiling questionnaire received and reviewed", completed: false },
          { task: "All external bookings confirmed (see Stage 3)", completed: false },
          { task: "Dietary requirements communicated to chef", completed: false },
          { task: "Wellness protocols confirmed with onboard therapist", completed: false },
          { task: "Experience Kit components prepared", completed: false },
          { task: "Signature scent acquired", completed: false },
          { task: "Memory anchor cards printed", completed: false },
        ],
      },
      {
        days_before: 7,
        items: [
          { task: "Pre-voyage communication #1 sent", completed: false },
          { task: "Final confirmation of all external bookings", completed: false },
          { task: "Weather forecast reviewed — alternatives ready", completed: false },
          { task: "Crew briefing scheduled", completed: false },
        ],
      },
      {
        days_before: 3,
        items: [
          { task: "Pre-voyage communication #2 sent", completed: false },
          { task: "Welcome amenities placed in cabin", completed: false },
          { task: "Signature scent diffused", completed: false },
          { task: "Lighting pre-set for arrival", completed: false },
          { task: "Welcome note placed", completed: false },
        ],
      },
      {
        days_before: 0,
        items: [
          { task: "Final cabin check 2 hours before arrival", completed: false },
          { task: "Welcome drinks prepared", completed: false },
          { task: "Captain briefed on guest names and approach", completed: false },
          { task: "Weather confirmed for Day 1 activities", completed: false },
        ],
      },
    ],

    pre_cruise_communications: [
      {
        days_before: 7,
        channel: "Email",
        subject: "Your journey begins in 7 days",
        template: `Dear [Name],\n\nIn one week, your ${arc.name} journey begins. Here is what to expect — and more importantly, what NOT to worry about.\n\nEverything is taken care of. Your only preparation is to arrive.\n\nWith warmth,\nThe LEXA Team`,
      },
      {
        days_before: 3,
        channel: "Email",
        subject: "Final preparations",
        template: `Dear [Name],\n\nThree days. A few gentle suggestions for packing — and an intention to carry with you:\n\n"${arc.closing_anchor}"\n\nSee you soon.\n\nThe LEXA Team`,
      },
    ],

    daily_briefings: dailyBriefings,
    rituals: formattedRituals,
    emotional_beats: emotionalBeats,
    post_cruise_sequence: postCruiseSequence,
  };
}

// ============================================================================
// SECTION BUILDERS
// ============================================================================

function buildGuestProfile(
  archetype: { code: string; name: string; description: string; core_need: string; fears: string[]; desires: string[] } | undefined,
  arc: { code: string; name: string },
  stage2: Stage2Output
): Stage4Output["guest_profile"] {
  if (!archetype) {
    return {
      archetype: "Guest",
      description: "Profile not yet available.",
      core_need: "To be determined via profiling.",
      fears: [],
      what_to_avoid: ["Over-explaining or over-selling experiences"],
      what_works: ["Calm, confident presence", "Anticipating needs"],
      key_phrase: stage2.days[0]?.memory_anchor || "Welcome aboard.",
    };
  }

  const isCouple = arc.code === "BECAUSE_OF_US";

  return {
    archetype: archetype.name,
    description: archetype.description,
    core_need: archetype.core_need,
    fears: archetype.fears,
    what_to_avoid: [
      "Asking too many questions at once",
      "Over-explaining or over-selling experiences",
      "Treating them like they need to be impressed",
      "Filling silence — let it breathe",
      "Excessive formality that creates distance",
    ],
    what_works: [
      "Calm, confident presence",
      "Anticipating needs without asking",
      'Simple acknowledgments: "Everything is taken care of"',
      "Giving them permission to do nothing",
      "Treating their rest as productive, not lazy",
    ],
    key_phrase: stage2.days[0]?.memory_anchor || "You made it. You are here.",
    couple_dynamics: isCouple
      ? {
          dynamic:
            "They may be awkward with each other initially. Old patterns: one organises, one follows. They might fill silence with logistics talk.",
          crew_role:
            "Create space for them to BE together, not DO together. Do not always address them as a unit — they are also individuals.",
          phase_awareness:
            "Days 1-3: INDIVIDUAL mode — support separate experiences. Day 4+: RECONNECTING — create couple moments without forcing.",
        }
      : undefined,
  };
}

function buildDailyBriefings(
  stage2: Stage2Output,
  phases: { name: string; emotional_core: string; description: string }[],
  guestPrefs?: Record<string, unknown>
): Stage4Output["daily_briefings"] {
  return stage2.days.map((day) => {
    const phase = phases.find((p) => p.name === day.phase);

    return {
      day: day.day_number,
      title: day.title,
      phase: day.phase,
      emotional_focus: day.emotional_core,
      what_happening: phase?.description || day.narrative.slice(0, 200),
      crew_do: [
        "Hold space without filling it",
        "Be present but not intrusive",
        "Keep environment calm (music, lighting, energy)",
        "Protect alone time if requested",
      ],
      crew_dont: [
        'Ask "Are you okay?" repeatedly',
        "Try to cheer them up with activities",
        "Fill silence with chatter",
        "Share your own stories to relate",
      ],
      memory_anchor: day.memory_anchor,
      schedule: day.experiences.map((exp) => ({
        time: exp.timing || "TBC",
        activity: exp.description,
        notes: exp.poi_name ? `At ${exp.poi_name}` : undefined,
      })),
      environment: {
        music: ((guestPrefs?.music_taste as string[]) || []).join(", ") || "Ambient, minimal, no lyrics",
        lighting: "Warm, dim where possible",
        scent: ((guestPrefs?.scent_preferences as string[]) || []).join(", ") || "Signature scent maintained",
        temperature: (guestPrefs?.temperature_preference as string) || "Comfortable, slightly cool",
      },
    };
  });
}

function buildEmotionalBeats(arcCode: string): Stage4Output["emotional_beats"] {
  const beats: Stage4Output["emotional_beats"] = [
    {
      name: "First Exhale",
      usually_when: "Day 1-2",
      signs: [
        "Shoulders drop visibly",
        "Deeper, slower breathing",
        "First genuine (not polite) smile",
        "Puts phone away without being asked",
      ],
      crew_response: [
        "Notice without commenting",
        'Simple acknowledgment if appropriate: "There you are."',
        "Protect this moment — do not interrupt with logistics",
      ],
    },
    {
      name: "The Stillpoint",
      usually_when: "Day 3-4",
      signs: [
        "Unexpected tears (not sadness — release)",
        "Desire to be alone",
        "Deep, reflective questions",
        "Unusual quietness",
      ],
      crew_response: [
        "Hold space. Do not fix.",
        '"Would you like some time alone?" (then honour it)',
        "Be available but not hovering",
      ],
      critical_note:
        "Do NOT try to cheer them up. This is the work.",
    },
    {
      name: "Playfulness Returns",
      usually_when: "Day 5-6",
      signs: [
        "Spontaneous laughter",
        "Wanting to try new things",
        "Higher energy",
        '"Let\'s..." suggestions',
      ],
      crew_response: [
        "Match their energy",
        "Be playful back",
        "Say yes to spontaneous requests when possible",
      ],
    },
    {
      name: "Departure Resistance",
      usually_when: "Final days",
      signs: [
        'Sadness about leaving — "I wish we could stay"',
        "Clinging to the experience",
        'Anxiety about return to "real life"',
      ],
      crew_response: [
        'Reframe: "This is not ending — you are taking it with you"',
        "Reference the kit",
        'Affirm transformation: "You are not the same person who arrived"',
      ],
    },
  ];

  // Add couples-specific beat
  if (arcCode === "BECAUSE_OF_US") {
    beats.splice(2, 0, {
      name: "Recognition (Couples)",
      usually_when: "Day 4-5",
      signs: [
        "Softened eye contact between them",
        "Reaching for each other physically",
        "Laughter that is not forced",
        "Less logistics talk, more presence",
      ],
      crew_response: [
        "Witness without interrupting",
        "Create privacy — this is their moment",
        '"It is beautiful to see you two like this"',
      ],
    });
  }

  return beats;
}

function buildPostCruiseSequence(
  arc: { name: string; closing_anchor: string }
): Stage4Output["post_cruise_sequence"] {
  return [
    {
      timing: "24 hours after departure",
      channel: "Email (personal, from Captain)",
      subject: `The ${arc.name.toLowerCase()} is yours now`,
      template: `Dear [Name],\n\nYou are home now. The world is probably already piling back on.\n\nBut remember: ${arc.closing_anchor}\n\nUse your kit. Return to your anchors. You earned this.\n\nWith warmth,\n[Captain Name]`,
    },
    {
      timing: "7 days after",
      channel: "Email with photos",
      subject: "A moment from your journey",
      template:
        "Some moments to return to...\n\n[3-5 selected photos]\n\nHow are you feeling?",
      include: ["3-5 carefully selected photos from the cruise"],
    },
    {
      timing: "30 days after",
      channel: "Email",
      subject: `30 days of ${arc.name.toLowerCase().split(" ")[0]}`,
      template:
        "Dear [Name],\n\nIt has been a month since your journey.\n\nSome questions to sit with:\n- What has stayed with you?\n- What practices have you maintained?\n- What anchor has served you most?\n\nIf you would like to share, we would love to hear.\n\nWith warmth,\nThe LEXA Team",
    },
    {
      timing: "90 days after",
      channel: "Email",
      subject: "Ready to return?",
      template:
        "Dear [Name],\n\nThree months. A good time to ask: is the fire still burning?\n\nIf the world has gotten loud again — we are here.\n\nGentle invitation for your next journey.\n\nThe LEXA Team",
    },
  ];
}
