/**
 * Create Manual Knowledge Entry API
 */

import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j';
import { getCurrentUserAttribution, buildAttributionProperties } from '@/lib/knowledge/track-contribution';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      title, 
      content, 
      topic, 
      tags, 
      appliesTo, 
      confidence,
      // New fields
      url,
      coordinates,
      photoUrls,
      uniqueRequests,
      neverThoughtPossible,
      bestPractices
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Get contribution attribution for current user
    const attribution = await getCurrentUserAttribution('manual');
    
    if (!attribution) {
      return NextResponse.json(
        { error: 'User not authenticated or no captain profile found' },
        { status: 401 }
      );
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Build attribution properties
      const attributionProps = buildAttributionProperties(attribution);
      
      // Create Knowledge node with all fields
      const result = await session.run(`
        CREATE (k:Knowledge {
          knowledge_id: randomUUID(),
          title: $title,
          content: $content,
          topic: $topic,
          confidence: $confidence / 100.0,
          tags: $tags,
          
          // Attribution
          contributed_by: $contributed_by,
          contributor_name: $contributor_name,
          contribution_type: $contribution_type,
          contributed_at: datetime($contributed_at),
          
          // New fields
          source_url: $source_url,
          photo_urls: $photo_urls,
          unique_requests: $unique_requests,
          never_thought_possible: $never_thought_possible,
          bp_toys: $bp_toys,
          bp_activities: $bp_activities,
          bp_concierge: $bp_concierge,
          bp_agents: $bp_agents,
          
          // Legacy fields
          source: 'manual',
          created_at: datetime(),
          verified: true,
          upvotes: 0,
          downvotes: 0
        })
        RETURN k
      `, {
        title,
        content,
        topic,
        confidence: parseInt(confidence) || 80,
        tags: tags || [],
        contributed_by: attributionProps.contributed_by,
        contributor_name: attributionProps.contributor_name,
        contribution_type: attributionProps.contribution_type,
        contributed_at: attributionProps.contributed_at,
        source_url: url || null,
        photo_urls: photoUrls || [],
        unique_requests: uniqueRequests || null,
        never_thought_possible: neverThoughtPossible || null,
        bp_toys: bestPractices?.toys || null,
        bp_activities: bestPractices?.activities || null,
        bp_concierge: bestPractices?.concierge || null,
        bp_agents: bestPractices?.agents || null,
      });

      const knowledgeNode = result.records[0].get('k').properties;
      const knowledgeId = knowledgeNode.knowledge_id;

      // If coordinates are provided, create a spatial link
      if (coordinates && coordinates.lat && coordinates.lon) {
        await session.run(`
          MATCH (k:Knowledge {knowledge_id: $knowledgeId})
          SET k.coordinates = point({latitude: $lat, longitude: $lon})
        `, {
          knowledgeId,
          lat: parseFloat(coordinates.lat),
          lon: parseFloat(coordinates.lon),
        });
      }

      // Link to destinations/POIs
      if (appliesTo && appliesTo.length > 0) {
        for (const target of appliesTo) {
          await session.run(`
            MATCH (k:Knowledge {knowledge_id: $knowledgeId})
            OPTIONAL MATCH (d:destination {name: $target})
            OPTIONAL MATCH (p:poi {name: $target})
            FOREACH (_ IN CASE WHEN d IS NOT NULL THEN [1] ELSE [] END |
              MERGE (k)-[:APPLIES_TO]->(d)
            )
            FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
              MERGE (k)-[:RELATES_TO]->(p)
            )
          `, {
            knowledgeId,
            target,
          });
        }
      }

      return NextResponse.json({
        success: true,
        knowledgeId,
        message: 'Knowledge created successfully',
      });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error creating knowledge:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create knowledge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

