/**
 * API Route: Seed Theme Categories in Neo4j
 * POST /api/admin/seed-themes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

const THEME_CATEGORIES = [
  {
    name: "Romance & Intimacy",
    description: "Where every moment is designed for connection",
    icon: "💕",
    luxuryScore: 9.5,
    short_description: "Private dinners, sunset experiences, couples spa treatments",
    personality_types: ["Lovers", "Connectors", "Quality Time seekers"],
    evoked_feelings: ["Deep connection", "intimacy", "tenderness", "presence", "devotion"],
    image_url: "https://images.unsplash.com/photo-1505881502353-a1986add3762?q=80&w=2400"
  },
  {
    name: "Adventure & Exploration",
    description: "For those who feel most alive on the edge",
    icon: "🏔️",
    luxuryScore: 8.5,
    short_description: "Helicopter excursions, diving expeditions, mountain adventures",
    personality_types: ["Thrill-seekers", "Achievers", "Blueprint"],
    evoked_feelings: ["Aliveness", "excitement", "achievement", "freedom", "vitality"],
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2400"
  },
  {
    name: "Wellness & Transformation",
    description: "Deep restoration for body, mind, and soul",
    icon: "🧘",
    luxuryScore: 9.0,
    short_description: "World-class spas, wellness retreats, mindfulness experiences",
    personality_types: ["Nurturing", "Self-care focused", "Healers"],
    evoked_feelings: ["Peace", "restoration", "clarity", "renewal", "balance"],
    image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2400"
  },
  {
    name: "Culinary Excellence",
    description: "Where taste becomes memory",
    icon: "🍷",
    luxuryScore: 9.2,
    short_description: "Michelin experiences, wine country, chef's tables, market tours",
    personality_types: ["Knowledge", "Connoisseurs", "Epicureans"],
    evoked_feelings: ["Sensory delight", "sophistication", "discovery", "indulgence"],
    image_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2400"
  },
  {
    name: "Cultural Immersion",
    description: "Experience the soul of a place",
    icon: "🎭",
    luxuryScore: 8.0,
    short_description: "Private museum tours, local artisans, authentic experiences",
    personality_types: ["Knowledge", "Learners", "Culture seekers"],
    evoked_feelings: ["Enrichment", "understanding", "connection", "wonder", "depth"],
    image_url: "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?q=80&w=2400"
  },
  {
    name: "Pure Luxury & Indulgence",
    description: "Where 'too much' is just right",
    icon: "💎",
    luxuryScore: 10.0,
    short_description: "Ultra-luxury accommodations, VIP access, white-glove service",
    personality_types: ["Action", "Status-conscious", "Pleasure-seekers"],
    evoked_feelings: ["Pampered", "special", "exclusive", "elevated", "indulged"],
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2400"
  },
  {
    name: "Nature & Wildlife",
    description: "Raw beauty that humbles and inspires",
    icon: "🦁",
    luxuryScore: 8.8,
    short_description: "Wildlife safaris, whale watching, pristine ecosystems",
    personality_types: ["Wonder-seekers", "Environmentalists", "Adventurers"],
    evoked_feelings: ["Awe", "humility", "wonder", "respect", "connection"],
    image_url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=2400"
  },
  {
    name: "Water Sports & Marine",
    description: "Where the ocean becomes your playground",
    icon: "🌊",
    luxuryScore: 7.5,
    short_description: "Diving, sailing, yachting, marine adventures",
    personality_types: ["Active", "Sporty", "Ocean lovers"],
    evoked_feelings: ["Freedom", "exhilaration", "vitality", "play", "energy"],
    image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2400"
  },
  {
    name: "Art & Architecture",
    description: "Beauty that moves the mind and soul",
    icon: "🎨",
    luxuryScore: 8.3,
    short_description: "Design hotels, private galleries, architectural masterpieces",
    personality_types: ["Aesthetes", "Creatives", "Knowledge seekers"],
    evoked_feelings: ["Inspiration", "sophistication", "beauty", "elevation", "wonder"],
    image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=2400"
  },
  {
    name: "Family Luxury",
    description: "Memories that span generations",
    icon: "👨‍👩‍👧‍👦",
    luxuryScore: 8.0,
    short_description: "Multi-generational villas, kids clubs, family adventures",
    personality_types: ["Family-focused", "Nurturing", "Legacy creators"],
    evoked_feelings: ["Joy", "connection", "legacy", "warmth", "belonging"],
    image_url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2400"
  },
  {
    name: "Celebration & Milestones",
    description: "Marking moments that matter",
    icon: "🎉",
    luxuryScore: 9.3,
    short_description: "Anniversaries, birthdays, proposals, once-in-a-lifetime events",
    personality_types: ["Celebrators", "Memory makers", "Significance seekers"],
    evoked_feelings: ["Joy", "significance", "pride", "love", "memory"],
    image_url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?q=80&w=2400"
  },
  {
    name: "Solitude & Reflection",
    description: "Space to breathe, think, and simply be",
    icon: "🏝️",
    luxuryScore: 8.7,
    short_description: "Private islands, remote villas, digital detox, solo journeys",
    personality_types: ["Introverts", "Contemplatives", "Seekers"],
    evoked_feelings: ["Peace", "clarity", "freedom", "restoration", "presence"],
    image_url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?q=80&w=2400"
  }
];

export async function POST(request: NextRequest) {
  const session = getSession();

  try {
    const results = [];

    // Seed each theme category
    for (const theme of THEME_CATEGORIES) {
      const result = await session.run(
        `
        MERGE (t:theme_category {name: $name})
        SET t.description = $description,
            t.icon = $icon,
            t.luxuryScore = $luxuryScore,
            t.short_description = $short_description,
            t.personality_types = $personality_types,
            t.evoked_feelings = $evoked_feelings,
            t.image_url = $image_url
        RETURN t.name as name, t.icon as icon
        `,
        theme
      );

      results.push({
        name: result.records[0].get('name'),
        icon: result.records[0].get('icon'),
        status: 'created'
      });
    }

    // Verify count
    const countResult = await session.run(`
      MATCH (t:theme_category)
      RETURN count(t) as total
    `);

    const total = countResult.records[0].get('total').toNumber();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${results.length} theme categories`,
      total_in_db: total,
      themes: results
    });

  } catch (error: any) {
    console.error('Error seeding theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed theme categories',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function GET(request: NextRequest) {
  const session = getSession();

  try {
    // Get all existing theme categories
    const result = await session.run(`
      MATCH (t:theme_category)
      RETURN t.name as name,
             t.icon as icon,
             t.description as description,
             t.luxuryScore as luxuryScore,
             t.image_url as image_url,
             t.short_description as short_description
      ORDER BY t.luxuryScore DESC
    `);

    const themes = result.records.map(record => ({
      name: record.get('name'),
      icon: record.get('icon'),
      description: record.get('description'),
      luxuryScore: record.get('luxuryScore'),
      image_url: record.get('image_url'),
      short_description: record.get('short_description')
    }));

    return NextResponse.json({
      success: true,
      count: themes.length,
      themes
    });

  } catch (error: any) {
    console.error('Error fetching theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch theme categories',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

