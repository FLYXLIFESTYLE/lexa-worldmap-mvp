// ============================================================================
// LEXA Script Engine Schema + Seed Data
// ============================================================================
// Creates: experience_arc, arc_phase, guest_archetype, journey_type,
//          ritual_template nodes and all relationships
// ============================================================================

// ----------------------------------------------------------------------------
// 1. CONSTRAINTS
// ----------------------------------------------------------------------------

CREATE CONSTRAINT experience_arc_code IF NOT EXISTS
FOR (ea:experience_arc) REQUIRE ea.code IS UNIQUE;

CREATE CONSTRAINT arc_phase_uid IF NOT EXISTS
FOR (ap:arc_phase) REQUIRE ap.uid IS UNIQUE;

CREATE CONSTRAINT guest_archetype_code IF NOT EXISTS
FOR (ga:guest_archetype) REQUIRE ga.code IS UNIQUE;

CREATE CONSTRAINT journey_type_code IF NOT EXISTS
FOR (jt:journey_type) REQUIRE jt.code IS UNIQUE;

CREATE CONSTRAINT ritual_template_code IF NOT EXISTS
FOR (rt:ritual_template) REQUIRE rt.code IS UNIQUE;

// ----------------------------------------------------------------------------
// 2. INDEXES
// ----------------------------------------------------------------------------

CREATE INDEX experience_arc_name IF NOT EXISTS
FOR (ea:experience_arc) ON (ea.name);

CREATE INDEX guest_archetype_name IF NOT EXISTS
FOR (ga:guest_archetype) ON (ga.name);

// ----------------------------------------------------------------------------
// 3. JOURNEY TYPES
// ----------------------------------------------------------------------------

MERGE (jt1:journey_type {code: "INDIVIDUAL"})
SET jt1.name = "Individual",
    jt1.description = "Solo journeys of personal transformation, wellness, or discovery";

MERGE (jt2:journey_type {code: "COUPLES"})
SET jt2.name = "Couples",
    jt2.description = "Journeys designed for two — reconnection, romance, or shared growth";

MERGE (jt3:journey_type {code: "FAMILY"})
SET jt3.name = "Family",
    jt3.description = "Multi-generational experiences building legacy and lasting bonds";

MERGE (jt4:journey_type {code: "GROUP"})
SET jt4.name = "Group",
    jt4.description = "Curated gatherings — friends, teams, or celebrations";

// ----------------------------------------------------------------------------
// 4. GUEST ARCHETYPES
// ----------------------------------------------------------------------------

MERGE (ga1:guest_archetype {code: "DEPLETED_ACHIEVER"})
SET ga1.name = "The Depleted Achiever",
    ga1.description = "High performers who have given everything to success and are running on empty. They have conquered markets and built empires, but the fire that drove them has started burning them instead.",
    ga1.core_need = "Permission to stop, restoration without judgment",
    ga1.fears = ["Being seen as weak", "Losing edge", "Missing opportunities while resting", "Being unproductive"],
    ga1.desires = ["Feel alive again", "Remember who they are", "Restoration without sacrificing quality", "Peace without boredom"],
    ga1.trigger_phrases = ["running on empty", "burned out", "exhausted", "need a break", "can't stop", "always on", "nothing left", "tired of being strong", "need to recharge", "lost myself", "feel numb", "just surviving"];

MERGE (ga2:guest_archetype {code: "LOGISTICS_PARTNERS"})
SET ga2.name = "The Logistics Partners",
    ga2.description = "A successful couple who built everything together but have lost their romantic connection. They manage their relationship like a project — efficiently, but without joy.",
    ga2.core_need = "Remember why they chose each other, reconnect beyond roles",
    ga2.fears = ["Growing further apart", "Admitting the distance", "Vulnerability with each other", "Finding there is nothing left"],
    ga2.desires = ["Feel like lovers again", "Shared experiences beyond logistics", "Intimacy without performance", "Permission to be imperfect together"],
    ga2.trigger_phrases = ["logistics partners", "roommates", "lost connection", "no time for us", "running on fumes", "stopped being lovers", "co-parents", "business partners", "when was the last time", "we used to", "drifted apart", "need us time"];

MERGE (ga3:guest_archetype {code: "DORMANT_SEEKER"})
SET ga3.name = "The Dormant Seeker",
    ga3.description = "Someone whose senses have dulled under routine. They go through motions but have forgotten what it feels like to be truly moved, surprised, or delighted.",
    ga3.core_need = "Reawaken senses and curiosity, feel something real again",
    ga3.fears = ["That nothing will move them anymore", "Being too jaded", "Having lost the capacity for wonder"],
    ga3.desires = ["Surprise", "Sensory richness", "Childlike wonder", "Feeling fully present", "Being moved to tears"],
    ga3.trigger_phrases = ["going through motions", "numb", "nothing excites me", "bored", "lost my spark", "used to love", "can't remember when", "everything feels same", "need something new", "want to feel alive", "jaded", "routine"];

MERGE (ga4:guest_archetype {code: "MILESTONE_MARKER"})
SET ga4.name = "The Milestone Marker",
    ga4.description = "Someone approaching or celebrating a significant life milestone who wants it marked with meaning, not just a party. Birthdays, anniversaries, retirements, or achievements that deserve more than a dinner.",
    ga4.core_need = "Mark the moment with significance and meaning",
    ga4.fears = ["The milestone passing unremarkably", "Empty celebration", "Not feeling the significance"],
    ga4.desires = ["Meaningful celebration", "Legacy creation", "Shared joy", "A memory that lasts forever"],
    ga4.trigger_phrases = ["anniversary", "birthday", "turning 50", "retirement", "celebrating", "milestone", "special occasion", "once in a lifetime", "deserve something special", "mark the moment", "big year", "achievement"];

MERGE (ga5:guest_archetype {code: "LEGACY_BUILDER"})
SET ga5.name = "The Legacy Builder",
    ga5.description = "Parents or grandparents who want to create lasting family bonds and pass down values through shared experience rather than lectures. They understand that presence is the greatest gift.",
    ga5.core_need = "Create family memories that outlast material gifts",
    ga5.fears = ["Growing distant from children or grandchildren", "Being remembered only for work", "Missing the window while kids are young"],
    ga5.desires = ["Deep family connection", "Shared adventures", "Generational bonding", "Stories they will tell forever"],
    ga5.trigger_phrases = ["family time", "kids are growing up", "grandchildren", "before they leave home", "quality time", "family bonding", "bring everyone together", "create memories", "three generations", "legacy", "pass down", "family tradition"];

MERGE (ga6:guest_archetype {code: "EXPLORER"})
SET ga6.name = "The Explorer",
    ga6.description = "Curious souls who travel not for relaxation but for discovery. They want to understand places deeply — the culture, the food, the hidden stories. Standard tourism bores them.",
    ga6.core_need = "Authentic discovery beyond the surface",
    ga6.fears = ["Tourist traps", "Surface-level experiences", "Missing the real story", "Being just another tourist"],
    ga6.desires = ["Behind the scenes access", "Local knowledge", "Cultural immersion", "Stories to tell", "Hidden gems"],
    ga6.trigger_phrases = ["off the beaten path", "authentic", "local", "discover", "explore", "hidden gems", "real culture", "not touristy", "go deeper", "understand the place", "adventure", "curious"];

MERGE (ga7:guest_archetype {code: "THRESHOLD_CROSSER"})
SET ga7.name = "The Threshold Crosser",
    ga7.description = "Someone at a major life transition — divorce, career change, empty nest, loss, or rebirth. They need space to process, grieve, or celebrate the crossing. The old life is behind; the new one has not yet begun.",
    ga7.core_need = "Space to process transition with dignity and support",
    ga7.fears = ["Being stuck between lives", "Making the wrong next move", "Facing the unknown alone"],
    ga7.desires = ["Clarity", "Closure", "New beginning", "Strength for what is next", "Permission to grieve and grow"],
    ga7.trigger_phrases = ["starting over", "divorce", "new chapter", "life change", "empty nest", "career change", "after the loss", "what now", "crossroads", "transition", "reinvention", "next phase"];

// ----------------------------------------------------------------------------
// 5. EXPERIENCE ARCS
// ----------------------------------------------------------------------------

MERGE (ea1:experience_arc {code: "PHOENIX_RISING"})
SET ea1.name = "Phoenix Rising",
    ea1.tagline = "Rise From Within",
    ea1.hook = "You have conquered markets. Built empires. Won battles others could not even see. But somewhere along the way, the fire that drove you started burning you instead. The fire never went out. It is waiting for you to return.",
    ea1.description = "Phoenix Rising is an eight-day wellness voyage along the French Riviera, designed for high achievers who have given everything to the world — and are ready to reclaim what is theirs. This is not a spa retreat. It is not a digital detox with yoga and smoothies. It is a carefully choreographed restoration journey that meets you where you actually are: successful, driven, and running on empty. The journey begins by celebrating your arrival — you made it, you are here, breathe. Then it gently guides you through stillness, into honest confrontation with what you have been sacrificing, and finally into the steady rise back to full power.",
    ea1.core_transformation = "From depleted achiever to restored powerhouse — not through doing more, but through finally stopping",
    ea1.narrative_structure = "Relief → Surrender → Confrontation → Recognition → Vitality → Power → Integration → Freedom",
    ea1.closing_anchor = "The fire never went out. It was waiting for you to return.",
    ea1.min_days = 7,
    ea1.max_days = 10,
    ea1.color_primary = "#8B2D1C",
    ea1.color_accent = "#D4763A",
    ea1.color_bg = "#F5F1ED";

MERGE (ea2:experience_arc {code: "BECAUSE_OF_US"})
SET ea2.name = "Because of Us",
    ea2.tagline = "Back to Me. Back to You. Back to Us.",
    ea2.hook = "You started this together. You built everything together — the empire, the family, the life others envy. But somewhere along the way, you stopped being lovers and became logistics partners. This voyage exists because the connection that built empires deserves more than whatever time is left over.",
    ea2.description = "Because of Us is an eight-day wellness voyage along the French Riviera, designed for couples who have built extraordinary lives together — and are ready to remember why. This is not couples therapy on water. It is not a romantic package with rose petals and champagne. It is something far more rare: space and permission to return — first to yourself, then to each other. The journey begins with individual restoration. World-class spas. Personalised wellness protocols. Time to release what you have been carrying and remember who you are beneath all the roles you play. Then, restored, you turn toward each other.",
    ea2.core_transformation = "From logistics partners to lovers — through individual restoration first, then reconnection",
    ea2.narrative_structure = "Arrival → Individual Restoration → Parallel Healing → First Turn → Reconnection → Amplification → Commitment → New Beginning",
    ea2.closing_anchor = "You will forget the name of the yacht. You will forget the spa. But you will never forget the moment you looked at each other and realised: we are still us.",
    ea2.min_days = 7,
    ea2.max_days = 10,
    ea2.color_primary = "#2C3E50",
    ea2.color_accent = "#C4784A",
    ea2.color_bg = "#FAF7F2";

MERGE (ea3:experience_arc {code: "AWAKENING"})
SET ea3.name = "Awakening",
    ea3.tagline = "Feel Everything Again",
    ea3.hook = "When was the last time something truly surprised you? When did you last taste something that stopped you mid-sentence? When did beauty make you catch your breath? Your senses have not gone. They are waiting to be reawakened.",
    ea3.description = "Awakening is a sensory revival voyage for those whose world has gone grey. Through curated encounters with extraordinary beauty, flavour, sound, and touch, this journey systematically reawakens each sense until you remember what it feels like to be fully alive. Not through extreme experiences, but through exquisite ones — the kind that make you pause and whisper: I forgot this existed.",
    ea3.core_transformation = "From numbness to full sensory presence — remembering what it feels like to be moved",
    ea3.narrative_structure = "Numbness → First Spark → Taste → Touch → Sound → Sight → Full Presence → Integration",
    ea3.closing_anchor = "Your senses never left. They were waiting for permission to return.",
    ea3.min_days = 6,
    ea3.max_days = 10,
    ea3.color_primary = "#4A6741",
    ea3.color_accent = "#C4956A",
    ea3.color_bg = "#F5F1ED";

MERGE (ea4:experience_arc {code: "CELEBRATION"})
SET ea4.name = "Celebration",
    ea4.tagline = "Because This Moment Deserves More",
    ea4.hook = "Some moments are too significant for a dinner reservation. Too meaningful for a gift card. Too important to let pass with just a toast. This is the celebration that matches the magnitude of what you have achieved, survived, or become.",
    ea4.description = "Celebration is a milestone-marking voyage designed to honour life's most significant moments with the weight they deserve. Whether it is a landmark birthday, anniversary, retirement, or personal triumph, this journey transforms a date on a calendar into an unforgettable story. Every day builds toward the crescendo — the moment where the milestone is not just acknowledged but truly felt.",
    ea4.core_transformation = "From milestone as date to milestone as story — creating meaning that outlasts the moment",
    ea4.narrative_structure = "Anticipation → Arrival → Building → Crescendo → Celebration → Gratitude → Legacy → Departure",
    ea4.closing_anchor = "This was not just a celebration. This was the moment you felt the full weight of what you have built.",
    ea4.min_days = 5,
    ea4.max_days = 10,
    ea4.color_primary = "#6B3654",
    ea4.color_accent = "#D4A84B",
    ea4.color_bg = "#FBF9F7";

MERGE (ea5:experience_arc {code: "LEGACY_JOURNEY"})
SET ea5.name = "Legacy Journey",
    ea5.tagline = "The Story They Will Tell Forever",
    ea5.hook = "Your children will not remember the things you bought them. They will remember the time you gave them. The adventures you shared. The moments you were fully present — not checking emails, not taking calls, just there. This is that time.",
    ea5.description = "Legacy Journey is a multi-generational voyage designed to create the family stories that get retold for decades. Through carefully designed shared adventures, individual discoveries, and generational bonding moments, this journey gives families what money cannot buy: uninterrupted time together, creating memories that become family legend.",
    ea5.core_transformation = "From family as logistics unit to family as adventure tribe — creating stories that outlast generations",
    ea5.narrative_structure = "Gathering → Exploration → Individual Discovery → Shared Adventure → Generational Bonding → Family Tradition → Legacy Moment → New Chapter",
    ea5.closing_anchor = "Years from now, they will not remember the yacht. They will remember the night you all stayed up telling stories under the stars.",
    ea5.min_days = 7,
    ea5.max_days = 14,
    ea5.color_primary = "#2D5A3D",
    ea5.color_accent = "#B8860B",
    ea5.color_bg = "#F5F5F0";

MERGE (ea6:experience_arc {code: "DISCOVERY"})
SET ea6.name = "Discovery",
    ea6.tagline = "Beyond the Surface",
    ea6.hook = "You have been to beautiful places. You have seen the views, ticked the boxes, posted the photos. But have you ever truly known a place? Have you tasted its secrets, walked its hidden paths, heard the stories that never make the guidebooks?",
    ea6.description = "Discovery is an immersive exploration voyage for the deeply curious. This is not sightseeing — it is sense-making. Through exclusive access, local expertise, and carefully curated encounters, you will understand a region the way residents do: through its food, its history, its art, its contradictions, and its hidden treasures.",
    ea6.core_transformation = "From tourist to traveller — understanding a place through its soul, not its postcards",
    ea6.narrative_structure = "Arrival → First Impressions → Deeper Layer → Local Immersion → Hidden World → Understanding → Connection → Integration",
    ea6.closing_anchor = "You did not just visit. You understood. And that understanding changed you.",
    ea6.min_days = 6,
    ea6.max_days = 12,
    ea6.color_primary = "#1A5276",
    ea6.color_accent = "#D4A574",
    ea6.color_bg = "#F0F4F8";

MERGE (ea7:experience_arc {code: "THRESHOLD"})
SET ea7.name = "Threshold",
    ea7.tagline = "Between What Was and What Will Be",
    ea7.hook = "The old life is behind you. The new one has not yet begun. You are standing in the doorway — and that is the most powerful place in the world. Not because you know what comes next. But because you are finally free to choose.",
    ea7.description = "Threshold is a transition voyage for those standing between chapters. Whether through choice or circumstance — divorce, career change, loss, empty nest, or rebirth — you are in the sacred space between what was and what will be. This journey honours both: what you are leaving behind and what you are stepping into. Without rushing. Without fixing. Just holding space for the crossing.",
    ea7.core_transformation = "From paralysis between chapters to empowered crossing — finding strength in the space between",
    ea7.narrative_structure = "Acknowledging → Releasing → Grieving → Stillness → First Light → Clarity → Strength → Crossing",
    ea7.closing_anchor = "You did not just survive the transition. You crossed the threshold with grace. And on the other side, you found yourself.",
    ea7.min_days = 7,
    ea7.max_days = 10,
    ea7.color_primary = "#4A4A6A",
    ea7.color_accent = "#C4A882",
    ea7.color_bg = "#F5F3F0";

// ----------------------------------------------------------------------------
// 6. ARC PHASES
// ----------------------------------------------------------------------------

// --- PHOENIX RISING phases ---
MERGE (pr_p1:arc_phase {uid: "PHOENIX_RISING_WELCOME"})
SET pr_p1.sequence = 1,
    pr_p1.name = "Welcome",
    pr_p1.typical_days = "Day 1",
    pr_p1.emotional_core = "Relief",
    pr_p1.description = "You made it. You are here. First exhale.",
    pr_p1.color_code = "#D4763A";

MERGE (pr_p2:arc_phase {uid: "PHOENIX_RISING_DESCENT"})
SET pr_p2.sequence = 2,
    pr_p2.name = "Descent",
    pr_p2.typical_days = "Days 2-3",
    pr_p2.emotional_core = "Stillness to Confrontation",
    pr_p2.description = "The noise fades. What remains is what matters. Honest confrontation with what you have been sacrificing.",
    pr_p2.color_code = "#8B2D1C";

MERGE (pr_p3:arc_phase {uid: "PHOENIX_RISING_RISING"})
SET pr_p3.sequence = 3,
    pr_p3.name = "Rising",
    pr_p3.typical_days = "Days 4-6",
    pr_p3.emotional_core = "Recognition to Power",
    pr_p3.description = "The ember catches. Something stirs. Recognition, vitality, and the steady return of power — not from doing, but from being.",
    pr_p3.color_code = "#D4763A";

MERGE (pr_p4:arc_phase {uid: "PHOENIX_RISING_FLIGHT"})
SET pr_p4.sequence = 4,
    pr_p4.name = "Flight",
    pr_p4.typical_days = "Days 7-8",
    pr_p4.emotional_core = "Integration to Freedom",
    pr_p4.description = "The phoenix rises. Integration of everything you have reclaimed. Freedom — not from responsibility, but from the weight that was never yours to carry.",
    pr_p4.color_code = "#F5D6A7";

// --- BECAUSE OF US phases ---
MERGE (bou_p1:arc_phase {uid: "BECAUSE_OF_US_ARRIVAL"})
SET bou_p1.sequence = 1,
    bou_p1.name = "Arrival",
    bou_p1.typical_days = "Day 1",
    bou_p1.emotional_core = "Permission",
    bou_p1.description = "Arriving together but beginning apart. Permission to breathe as individuals first.",
    bou_p1.color_code = "#2C3E50";

MERGE (bou_p2:arc_phase {uid: "BECAUSE_OF_US_INDIVIDUAL"})
SET bou_p2.sequence = 2,
    bou_p2.name = "Individual Restoration",
    bou_p2.typical_days = "Days 2-3",
    bou_p2.emotional_core = "Self-remembering",
    bou_p2.description = "Parallel healing. Each person rediscovering who they are beneath all the roles they play. Not apart — parallel.",
    bou_p2.color_code = "#34495E";

MERGE (bou_p3:arc_phase {uid: "BECAUSE_OF_US_TURN"})
SET bou_p3.sequence = 3,
    bou_p3.name = "The Turn",
    bou_p3.typical_days = "Days 4-5",
    bou_p3.emotional_core = "Reconnection",
    bou_p3.description = "Restored, you turn toward each other. What you see is not the exhausted logistics partner — but the person you fell in love with.",
    bou_p3.color_code = "#C4784A";

MERGE (bou_p4:arc_phase {uid: "BECAUSE_OF_US_AMPLIFICATION"})
SET bou_p4.sequence = 4,
    bou_p4.name = "Amplification",
    bou_p4.typical_days = "Days 6-8",
    bou_p4.emotional_core = "Joy to Commitment",
    bou_p4.description = "Two whole people choosing each other, with nothing left to prove. Not reconnecting — amplifying.",
    bou_p4.color_code = "#E8C49A";

// --- AWAKENING phases ---
MERGE (aw_p1:arc_phase {uid: "AWAKENING_NUMBNESS"})
SET aw_p1.sequence = 1,
    aw_p1.name = "Numbness",
    aw_p1.typical_days = "Day 1",
    aw_p1.emotional_core = "Acknowledgement",
    aw_p1.description = "Arriving in the grey. Acknowledging that something has been lost — the capacity to be moved.",
    aw_p1.color_code = "#7D8B7E";

MERGE (aw_p2:arc_phase {uid: "AWAKENING_FIRST_SPARK"})
SET aw_p2.sequence = 2,
    aw_p2.name = "First Spark",
    aw_p2.typical_days = "Days 2-3",
    aw_p2.emotional_core = "Surprise",
    aw_p2.description = "The first unexpected moment of feeling. A taste, a scent, a view that bypasses the jaded mind and reaches something deeper.",
    aw_p2.color_code = "#4A6741";

MERGE (aw_p3:arc_phase {uid: "AWAKENING_IMMERSION"})
SET aw_p3.sequence = 3,
    aw_p3.name = "Full Immersion",
    aw_p3.typical_days = "Days 4-6",
    aw_p3.emotional_core = "Wonder",
    aw_p3.description = "Each sense reawakened deliberately. Taste, touch, sound, sight — each day designed around a specific sensory revival.",
    aw_p3.color_code = "#C4956A";

MERGE (aw_p4:arc_phase {uid: "AWAKENING_PRESENCE"})
SET aw_p4.sequence = 4,
    aw_p4.name = "Full Presence",
    aw_p4.typical_days = "Days 7-8",
    aw_p4.emotional_core = "Aliveness",
    aw_p4.description = "All senses online. Full presence. The world has colour again and you remember what it feels like to be alive.",
    aw_p4.color_code = "#5A8A4F";

// --- CELEBRATION phases ---
MERGE (cel_p1:arc_phase {uid: "CELEBRATION_ANTICIPATION"})
SET cel_p1.sequence = 1,
    cel_p1.name = "Anticipation",
    cel_p1.typical_days = "Day 1",
    cel_p1.emotional_core = "Excitement",
    cel_p1.description = "The countdown is over. The celebration begins. Every detail signals: this is not ordinary.",
    cel_p1.color_code = "#6B3654";

MERGE (cel_p2:arc_phase {uid: "CELEBRATION_BUILDING"})
SET cel_p2.sequence = 2,
    cel_p2.name = "Building",
    cel_p2.typical_days = "Days 2-3",
    cel_p2.emotional_core = "Joy building",
    cel_p2.description = "Each experience builds on the last. The story gains momentum. The milestone grows in meaning.",
    cel_p2.color_code = "#8B4D6E";

MERGE (cel_p3:arc_phase {uid: "CELEBRATION_CRESCENDO"})
SET cel_p3.sequence = 3,
    cel_p3.name = "Crescendo",
    cel_p3.typical_days = "Days 4-5",
    cel_p3.emotional_core = "Peak emotion",
    cel_p3.description = "The peak moment. The celebration that matches the magnitude of the milestone. Tears, laughter, and the full weight of what this means.",
    cel_p3.color_code = "#D4A84B";

MERGE (cel_p4:arc_phase {uid: "CELEBRATION_LEGACY"})
SET cel_p4.sequence = 4,
    cel_p4.name = "Legacy",
    cel_p4.typical_days = "Days 6-7",
    cel_p4.emotional_core = "Gratitude",
    cel_p4.description = "After the crescendo, gratitude. The celebration becomes a memory, a story, a legacy that outlasts the moment.",
    cel_p4.color_code = "#F5E6CC";

// --- LEGACY JOURNEY phases ---
MERGE (lj_p1:arc_phase {uid: "LEGACY_JOURNEY_GATHERING"})
SET lj_p1.sequence = 1,
    lj_p1.name = "Gathering",
    lj_p1.typical_days = "Day 1",
    lj_p1.emotional_core = "Togetherness",
    lj_p1.description = "The family comes together. Devices down. Roles soften. The adventure begins.",
    lj_p1.color_code = "#2D5A3D";

MERGE (lj_p2:arc_phase {uid: "LEGACY_JOURNEY_EXPLORATION"})
SET lj_p2.sequence = 2,
    lj_p2.name = "Exploration",
    lj_p2.typical_days = "Days 2-4",
    lj_p2.emotional_core = "Discovery",
    lj_p2.description = "Shared adventures that reveal new sides of each other. Parents see their children anew. Children see their parents as people.",
    lj_p2.color_code = "#3D7A4F";

MERGE (lj_p3:arc_phase {uid: "LEGACY_JOURNEY_BONDING"})
SET lj_p3.sequence = 3,
    lj_p3.name = "Generational Bonding",
    lj_p3.typical_days = "Days 5-6",
    lj_p3.emotional_core = "Connection",
    lj_p3.description = "Moments designed for generational exchange. Stories shared. Wisdom passed. The family narrative deepens.",
    lj_p3.color_code = "#B8860B";

MERGE (lj_p4:arc_phase {uid: "LEGACY_JOURNEY_LEGACY"})
SET lj_p4.sequence = 4,
    lj_p4.name = "Legacy Moment",
    lj_p4.typical_days = "Days 7-8",
    lj_p4.emotional_core = "Pride",
    lj_p4.description = "The defining moment. The story that will be retold at every family gathering for decades. The night under the stars. The shared triumph.",
    lj_p4.color_code = "#E8D5A0";

// --- DISCOVERY phases ---
MERGE (disc_p1:arc_phase {uid: "DISCOVERY_ARRIVAL"})
SET disc_p1.sequence = 1,
    disc_p1.name = "First Impressions",
    disc_p1.typical_days = "Day 1",
    disc_p1.emotional_core = "Curiosity",
    disc_p1.description = "Arriving with fresh eyes. First tastes, first sights, first conversations. The surface layer.",
    disc_p1.color_code = "#1A5276";

MERGE (disc_p2:arc_phase {uid: "DISCOVERY_DEEPER"})
SET disc_p2.sequence = 2,
    disc_p2.name = "Deeper Layer",
    disc_p2.typical_days = "Days 2-3",
    disc_p2.emotional_core = "Intrigue",
    disc_p2.description = "Beneath the postcard. Local markets, artisan workshops, conversations that reveal what the guidebooks miss.",
    disc_p2.color_code = "#2E86C1";

MERGE (disc_p3:arc_phase {uid: "DISCOVERY_IMMERSION"})
SET disc_p3.sequence = 3,
    disc_p3.name = "Local Immersion",
    disc_p3.typical_days = "Days 4-6",
    disc_p3.emotional_core = "Understanding",
    disc_p3.description = "Living it, not just visiting. Behind-the-scenes access. The hidden world that opens only to those who stay long enough.",
    disc_p3.color_code = "#D4A574";

MERGE (disc_p4:arc_phase {uid: "DISCOVERY_INTEGRATION"})
SET disc_p4.sequence = 4,
    disc_p4.name = "Integration",
    disc_p4.typical_days = "Days 7-8",
    disc_p4.emotional_core = "Belonging",
    disc_p4.description = "The place is now part of you. You did not just visit — you understood. And that understanding changed how you see the world.",
    disc_p4.color_code = "#5DADE2";

// --- THRESHOLD phases ---
MERGE (th_p1:arc_phase {uid: "THRESHOLD_ACKNOWLEDGING"})
SET th_p1.sequence = 1,
    th_p1.name = "Acknowledging",
    th_p1.typical_days = "Day 1",
    th_p1.emotional_core = "Honesty",
    th_p1.description = "Naming what is ending. Honouring what was. Arriving at the threshold with eyes open.",
    th_p1.color_code = "#4A4A6A";

MERGE (th_p2:arc_phase {uid: "THRESHOLD_RELEASING"})
SET th_p2.sequence = 2,
    th_p2.name = "Releasing",
    th_p2.typical_days = "Days 2-3",
    th_p2.emotional_core = "Letting go",
    th_p2.description = "Releasing what no longer serves. Grieving what must be left behind. Making space for what comes next.",
    th_p2.color_code = "#6A5A8A";

MERGE (th_p3:arc_phase {uid: "THRESHOLD_STILLNESS"})
SET th_p3.sequence = 3,
    th_p3.name = "Stillness",
    th_p3.typical_days = "Days 4-5",
    th_p3.emotional_core = "Clarity",
    th_p3.description = "In the space between. Not rushing forward, not looking back. Stillness where clarity lives.",
    th_p3.color_code = "#C4A882";

MERGE (th_p4:arc_phase {uid: "THRESHOLD_CROSSING"})
SET th_p4.sequence = 4,
    th_p4.name = "Crossing",
    th_p4.typical_days = "Days 6-8",
    th_p4.emotional_core = "Strength",
    th_p4.description = "Stepping through. Not with certainty about what comes next, but with the strength to face it. You crossed the threshold with grace.",
    th_p4.color_code = "#7A8A9A";

// ----------------------------------------------------------------------------
// 7. PHASE → ARC RELATIONSHIPS
// ----------------------------------------------------------------------------

MATCH (ea:experience_arc {code: "PHOENIX_RISING"})
MATCH (p1:arc_phase {uid: "PHOENIX_RISING_WELCOME"})
MATCH (p2:arc_phase {uid: "PHOENIX_RISING_DESCENT"})
MATCH (p3:arc_phase {uid: "PHOENIX_RISING_RISING"})
MATCH (p4:arc_phase {uid: "PHOENIX_RISING_FLIGHT"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "BECAUSE_OF_US"})
MATCH (p1:arc_phase {uid: "BECAUSE_OF_US_ARRIVAL"})
MATCH (p2:arc_phase {uid: "BECAUSE_OF_US_INDIVIDUAL"})
MATCH (p3:arc_phase {uid: "BECAUSE_OF_US_TURN"})
MATCH (p4:arc_phase {uid: "BECAUSE_OF_US_AMPLIFICATION"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "AWAKENING"})
MATCH (p1:arc_phase {uid: "AWAKENING_NUMBNESS"})
MATCH (p2:arc_phase {uid: "AWAKENING_FIRST_SPARK"})
MATCH (p3:arc_phase {uid: "AWAKENING_IMMERSION"})
MATCH (p4:arc_phase {uid: "AWAKENING_PRESENCE"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "CELEBRATION"})
MATCH (p1:arc_phase {uid: "CELEBRATION_ANTICIPATION"})
MATCH (p2:arc_phase {uid: "CELEBRATION_BUILDING"})
MATCH (p3:arc_phase {uid: "CELEBRATION_CRESCENDO"})
MATCH (p4:arc_phase {uid: "CELEBRATION_LEGACY"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "LEGACY_JOURNEY"})
MATCH (p1:arc_phase {uid: "LEGACY_JOURNEY_GATHERING"})
MATCH (p2:arc_phase {uid: "LEGACY_JOURNEY_EXPLORATION"})
MATCH (p3:arc_phase {uid: "LEGACY_JOURNEY_BONDING"})
MATCH (p4:arc_phase {uid: "LEGACY_JOURNEY_LEGACY"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "DISCOVERY"})
MATCH (p1:arc_phase {uid: "DISCOVERY_ARRIVAL"})
MATCH (p2:arc_phase {uid: "DISCOVERY_DEEPER"})
MATCH (p3:arc_phase {uid: "DISCOVERY_IMMERSION"})
MATCH (p4:arc_phase {uid: "DISCOVERY_INTEGRATION"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

MATCH (ea:experience_arc {code: "THRESHOLD"})
MATCH (p1:arc_phase {uid: "THRESHOLD_ACKNOWLEDGING"})
MATCH (p2:arc_phase {uid: "THRESHOLD_RELEASING"})
MATCH (p3:arc_phase {uid: "THRESHOLD_STILLNESS"})
MATCH (p4:arc_phase {uid: "THRESHOLD_CROSSING"})
MERGE (p1)-[:BELONGS_TO]->(ea)
MERGE (p2)-[:BELONGS_TO]->(ea)
MERGE (p3)-[:BELONGS_TO]->(ea)
MERGE (p4)-[:BELONGS_TO]->(ea);

// ----------------------------------------------------------------------------
// 8. ARC → JOURNEY TYPE RELATIONSHIPS (DESIGNED_FOR)
// ----------------------------------------------------------------------------

MATCH (ea:experience_arc {code: "PHOENIX_RISING"}), (jt:journey_type {code: "INDIVIDUAL"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "BECAUSE_OF_US"}), (jt:journey_type {code: "COUPLES"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "AWAKENING"}), (jt:journey_type {code: "INDIVIDUAL"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "AWAKENING"}), (jt:journey_type {code: "COUPLES"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "CELEBRATION"}), (jt:journey_type {code: "COUPLES"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "CELEBRATION"}), (jt:journey_type {code: "FAMILY"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "CELEBRATION"}), (jt:journey_type {code: "GROUP"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "LEGACY_JOURNEY"}), (jt:journey_type {code: "FAMILY"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "DISCOVERY"}), (jt:journey_type {code: "INDIVIDUAL"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "DISCOVERY"}), (jt:journey_type {code: "COUPLES"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "DISCOVERY"}), (jt:journey_type {code: "GROUP"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

MATCH (ea:experience_arc {code: "THRESHOLD"}), (jt:journey_type {code: "INDIVIDUAL"})
MERGE (ea)-[:DESIGNED_FOR]->(jt);

// ----------------------------------------------------------------------------
// 9. ARC → ARCHETYPE RELATIONSHIPS (RESONATES_WITH)
// ----------------------------------------------------------------------------

MATCH (ea:experience_arc {code: "PHOENIX_RISING"}), (ga:guest_archetype {code: "DEPLETED_ACHIEVER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "BECAUSE_OF_US"}), (ga:guest_archetype {code: "LOGISTICS_PARTNERS"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "AWAKENING"}), (ga:guest_archetype {code: "DORMANT_SEEKER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "CELEBRATION"}), (ga:guest_archetype {code: "MILESTONE_MARKER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "LEGACY_JOURNEY"}), (ga:guest_archetype {code: "LEGACY_BUILDER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "DISCOVERY"}), (ga:guest_archetype {code: "EXPLORER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

MATCH (ea:experience_arc {code: "THRESHOLD"}), (ga:guest_archetype {code: "THRESHOLD_CROSSER"})
MERGE (ea)-[:RESONATES_WITH {strength: 1.0, primary: true}]->(ga);

// Cross-arc resonance (secondary matches)
MATCH (ea:experience_arc {code: "PHOENIX_RISING"}), (ga:guest_archetype {code: "THRESHOLD_CROSSER"})
MERGE (ea)-[:RESONATES_WITH {strength: 0.6, primary: false}]->(ga);

MATCH (ea:experience_arc {code: "BECAUSE_OF_US"}), (ga:guest_archetype {code: "DEPLETED_ACHIEVER"})
MERGE (ea)-[:RESONATES_WITH {strength: 0.5, primary: false}]->(ga);

MATCH (ea:experience_arc {code: "AWAKENING"}), (ga:guest_archetype {code: "DEPLETED_ACHIEVER"})
MERGE (ea)-[:RESONATES_WITH {strength: 0.5, primary: false}]->(ga);

MATCH (ea:experience_arc {code: "THRESHOLD"}), (ga:guest_archetype {code: "DEPLETED_ACHIEVER"})
MERGE (ea)-[:RESONATES_WITH {strength: 0.5, primary: false}]->(ga);

// ----------------------------------------------------------------------------
// 10. RITUAL TEMPLATES
// ----------------------------------------------------------------------------

MERGE (rt1:ritual_template {code: "WELCOME_CEREMONY"})
SET rt1.name = "Welcome Ceremony",
    rt1.when_text = "Day 1, upon settling aboard",
    rt1.duration = "10-15 minutes",
    rt1.led_by = "Captain or Chief Stew",
    rt1.setup = ["Guest seated comfortably on deck or in salon", "Welcome drink prepared (non-alcoholic option available)", "Music playing softly", "Phones and devices already stowed"],
    rt1.script_text = "[Pause. Make eye contact. Speak slowly.]\n\n\"Welcome aboard. You made it.\"\n\n[Let that land. Do not rush.]\n\n\"Before we begin, I want you to know: for the next eight days, there is nothing you need to do, nowhere you need to be, and no one who needs anything from you.\"\n\n\"Everything is taken care of. Your only job is to be here.\"\n\n[Offer welcome drink]\n\n\"This marks the beginning. Not just of a voyage — but of a return. To stillness. To yourself. To what matters.\"\n\n\"So... breathe. You are here now.\"\n\n[Pause. Let them settle.]\n\n\"Your cabin is ready. Take your time. We will be underway when you are.\"\n\n[Give them space. Do not linger.]",
    rt1.notes = ["Keep it simple. The power is in the pause, not the production.", "If they seem emotional, acknowledge with presence, not words.", "If they want to chat, be warm but do not extend — they need to land."];

MERGE (rt2:ritual_template {code: "SUNSET_REFLECTION"})
SET rt2.name = "Sunset Reflection",
    rt2.when_text = "Days 3, 5, 7 — at sunset",
    rt2.duration = "15-20 minutes",
    rt2.led_by = "Concierge or self-guided",
    rt2.setup = ["Deck prepared with comfortable seating facing west", "Signature drink service", "Journal and pen available", "Ambient music or silence — read the guest"],
    rt2.script_text = "[As sun begins to descend]\n\n\"This is your moment. Not to think about tomorrow or review today. Just to be here, watching something beautiful happen that requires nothing from you.\"\n\n[Offer journal]\n\n\"If anything wants to be written, let it. If not, just watch.\"\n\n[Step back. Let them have this.]",
    rt2.notes = ["Do not fill the silence.", "Some guests will want to talk — let them lead.", "Others will want solitude — honour it."];

MERGE (rt3:ritual_template {code: "CLOSING_CEREMONY"})
SET rt3.name = "Closing Ceremony",
    rt3.when_text = "Final evening",
    rt3.duration = "20-30 minutes",
    rt3.led_by = "Captain",
    rt3.setup = ["Deck set for intimate gathering", "Candles or soft lighting", "The Experience Kit prepared and wrapped", "Signature drink service", "Memory anchor cards visible"],
    rt3.script_text = "[Evening. Candles lit. Intimate setting.]\n\n\"Tomorrow you return to the world. And the world will keep demanding.\"\n\n\"But you are not the same person who arrived. You know that. We know that.\"\n\n[Present the Experience Kit]\n\n\"This is yours. Not a souvenir — a toolkit. Everything you need to return to how you feel right now.\"\n\n\"The anchors. The rituals. The scent. The words that found you.\"\n\n[Pause]\n\n\"Use them. When life gets loud — and it will — these will bring you back.\"\n\n\"Thank you for trusting us with your journey.\"\n\n[Raise glass]\n\n\"To what you found. To who you are. To what comes next.\"",
    rt3.notes = ["This is emotional. Be prepared for tears.", "Keep it genuine — not performative.", "The kit presentation is the centrepiece."];

MERGE (rt4:ritual_template {code: "KIT_PRESENTATION"})
SET rt4.name = "Kit Presentation",
    rt4.when_text = "Final morning, before disembarkation",
    rt4.duration = "10 minutes",
    rt4.led_by = "Concierge",
    rt4.setup = ["Kit beautifully wrapped", "Private moment with guest", "No rush — this is not a checkout"],
    rt4.script_text = "[Private moment]\n\n\"Before you go, this is yours.\"\n\n[Walk through kit contents]\n\n\"Your sleep ritual elements — the exact protocol that restored you here.\"\n\"Your memory anchor cards — one for each day.\"\n\"Your signature scent — one inhale returns you to this place.\"\n\"And your Experience Script — personalised with your journey.\"\n\n\"This is how you take it home. This is how you keep it alive.\"",
    rt4.notes = ["Walk through each item with care.", "Personalise based on what resonated most.", "This is the last impression — make it count."];

// ----------------------------------------------------------------------------
// 11. RITUAL → ARC RELATIONSHIPS
// ----------------------------------------------------------------------------

// Welcome ceremony applies to all arcs
MATCH (rt:ritual_template {code: "WELCOME_CEREMONY"})
MATCH (ea:experience_arc)
MERGE (rt)-[:USED_IN]->(ea);

// Sunset reflection applies to all arcs
MATCH (rt:ritual_template {code: "SUNSET_REFLECTION"})
MATCH (ea:experience_arc)
MERGE (rt)-[:USED_IN]->(ea);

// Closing ceremony applies to all arcs
MATCH (rt:ritual_template {code: "CLOSING_CEREMONY"})
MATCH (ea:experience_arc)
MERGE (rt)-[:USED_IN]->(ea);

// Kit presentation applies to all arcs
MATCH (rt:ritual_template {code: "KIT_PRESENTATION"})
MATCH (ea:experience_arc)
MERGE (rt)-[:USED_IN]->(ea);
