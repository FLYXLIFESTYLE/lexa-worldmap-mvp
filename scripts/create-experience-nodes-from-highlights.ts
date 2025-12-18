/**
 * Convert Website Highlights to Experience Nodes
 * 
 * Problem: Website highlights are stored as JSON properties, not as separate nodes
 * Solution: Create Experience nodes and link them to POIs with proper relationships
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface POIWithHighlights {
  poi_uid: string;
  name: string;
  destination_name: string;
  type: string;
  highlights: string[];
  ambiance: string[];
}

async function createExperienceNodes() {
  console.log('🎯 Creating Experience Nodes from Website Highlights\n');
  
  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Find POIs with website highlights
    const session = driver.session();
    const result = await session.run(`
      MATCH (p:poi)
      WHERE p.website_highlights IS NOT NULL 
        AND size(p.website_highlights) > 0
      RETURN p.poi_uid as poi_uid,
             p.name as name,
             p.destination_name as destination_name,
             p.type as type,
             p.website_highlights as highlights,
             p.website_ambiance as ambiance
      LIMIT 100
    `);
    await session.close();

    const pois: POIWithHighlights[] = result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      destination_name: r.get('destination_name'),
      type: r.get('type'),
      highlights: r.get('highlights') || [],
      ambiance: r.get('ambiance') || []
    }));

    console.log(`📊 Found ${pois.length} POIs with website highlights\n`);

    let created = 0;
    let relationships = 0;

    for (const poi of pois) {
      console.log(`\n[${created + 1}/${pois.length}] ${poi.name} (${poi.destination_name})`);
      console.log(`  Highlights: ${poi.highlights.length}, Ambiance: ${poi.ambiance.length}`);

      // Create Experience node for each highlight
      for (const highlight of poi.highlights) {
        const experienceId = `exp_${poi.poi_uid}_${Buffer.from(highlight).toString('base64').substring(0, 16)}`;
        
        // Use AI to classify the experience
        const classification = await classifyExperience(highlight, poi.type, poi.ambiance);
        
        const expSession = driver.session();
        
        // Create Experience node
        await expSession.run(`
          MERGE (e:Experience {
            experience_id: $exp_id
          })
          SET e.title = $title,
              e.description = $highlight,
              e.source = 'website_scraping',
              e.created_at = datetime(),
              e.activity_category = $activity_category
        `, {
          exp_id: experienceId,
          title: highlight.substring(0, 100),
          highlight: highlight,
          activity_category: classification.activity
        });

        // Link Experience to POI
        await expSession.run(`
          MATCH (e:Experience {experience_id: $exp_id})
          MATCH (p:poi {poi_uid: $poi_uid})
          MERGE (p)-[:OFFERS_EXPERIENCE {
            confidence: 0.9,
            source: 'website'
          }]->(e)
        `, { exp_id: experienceId, poi_uid: poi.poi_uid });

        // Link Experience to Destination
        await expSession.run(`
          MATCH (e:Experience {experience_id: $exp_id})
          MATCH (d:destination)
          WHERE toLower(d.name) CONTAINS toLower($destination)
          MERGE (e)-[:LOCATED_IN]->(d)
        `, { exp_id: experienceId, destination: poi.destination_name });

        // Link Experience to Activity (if classified)
        if (classification.activity) {
          await expSession.run(`
            MATCH (e:Experience {experience_id: $exp_id})
            MATCH (a:activity_type)
            WHERE toLower(a.name) CONTAINS toLower($activity)
            MERGE (e)-[:SUPPORTS_ACTIVITY]->(a)
          `, { exp_id: experienceId, activity: classification.activity });
        }

        // Link Experience to Emotions
        for (const emotion of classification.emotions) {
          await expSession.run(`
            MATCH (e:Experience {experience_id: $exp_id})
            MERGE (em:Emotion {name: $emotion})
            MERGE (e)-[:EVOKES {
              confidence: 0.8,
              reason: 'Inferred from experience description',
              source: 'ai_analysis'
            }]->(em)
          `, { exp_id: experienceId, emotion: emotion.toLowerCase() });
        }

        await expSession.close();
        
        created++;
        relationships += 3 + classification.emotions.length; // OFFERS_EXPERIENCE + LOCATED_IN + SUPPORTS_ACTIVITY + emotions
      }

      console.log(`  ✅ Created ${poi.highlights.length} Experience nodes`);
    }

    console.log('\n🎉 Experience Node Creation Complete!');
    console.log(`✅ Created: ${created} Experience nodes`);
    console.log(`🔗 Created: ${relationships} relationships`);
    console.log(`\n📊 Check your Neo4j dashboard - nodes and relationships should have increased!`);

  } finally {
    await driver.close();
  }
}

async function classifyExperience(
  highlight: string,
  poiType: string,
  ambiance: string[]
): Promise<{ activity: string | null; emotions: string[] }> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Classify this experience/highlight:

Highlight: "${highlight}"
POI Type: ${poiType}
Ambiance: ${ambiance.join(', ')}

Return ONLY a JSON object:
{
  "activity": "dining" | "water_sports" | "spa" | "nightlife" | "cultural" | "adventure" | null,
  "emotions": ["joy", "excitement", "tranquility", "romance", "luxury"]
}

Pick 1-3 most relevant emotions. Return ONLY valid JSON.`
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    return { activity: null, emotions: ['satisfaction'] };
  } catch (error) {
    console.log(`  ⚠️  Classification failed, using defaults`);
    return { activity: null, emotions: ['satisfaction'] };
  }
}

createExperienceNodes().catch(console.error);

