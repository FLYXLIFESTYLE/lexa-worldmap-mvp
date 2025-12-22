/**
 * API Route: Upload Yacht Destinations
 * POST /api/admin/upload-yacht-destinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

interface Destination {
  name: string;
  type: 'city' | 'country' | 'route';
  country?: string;
  region?: string;
  ports?: string[];
  exists: boolean;
}

export async function POST(request: NextRequest) {
  const session = getSession();

  try {
    const body = await request.json();
    const { destinations } = body as { destinations: Destination[] };

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json(
        { error: 'No destinations provided' },
        { status: 400 }
      );
    }

    const results = {
      total: destinations.length,
      created: 0,
      existing: 0,
      routes: 0,
      details: [] as any[]
    };

    // Process cities/ports
    const cities = destinations.filter(d => d.type === 'city');
    for (const city of cities) {
      const result = await session.run(`
        MERGE (d:destination {name: $name, type: 'city'})
        ON CREATE SET 
          d.created_at = datetime(),
          d.source = 'yacht_destinations',
          d.yacht_port = true,
          d.luxury_destination = true
        ON MATCH SET
          d.yacht_port = true,
          d.luxury_destination = true
        RETURN d, 
               CASE WHEN d.created_at = datetime() THEN 'created' ELSE 'existing' END as status
      `, { name: city.name });

      const status = result.records[0]?.get('status');
      if (status === 'created') {
        results.created++;
      } else {
        results.existing++;
      }

      results.details.push({
        name: city.name,
        type: 'city',
        status
      });
    }

    // Process countries
    const countries = destinations.filter(d => d.type === 'country');
    for (const country of countries) {
      const result = await session.run(`
        MERGE (c:destination {name: $name, type: 'country'})
        ON CREATE SET 
          c.created_at = datetime(),
          c.source = 'yacht_destinations',
          c.yacht_destination = true,
          c.luxury_destination = true
        ON MATCH SET
          c.yacht_destination = true,
          c.luxury_destination = true
        RETURN c,
               CASE WHEN c.created_at = datetime() THEN 'created' ELSE 'existing' END as status
      `, { name: country.name });

      const status = result.records[0]?.get('status');
      if (status === 'created') {
        results.created++;
      } else {
        results.existing++;
      }

      results.details.push({
        name: country.name,
        type: 'country',
        status
      });
    }

    // Process routes
    const routes = destinations.filter(d => d.type === 'route');
    for (const route of routes) {
      if (!route.ports || route.ports.length === 0) continue;

      // Create route node
      const routeResult = await session.run(`
        MERGE (r:yacht_route {name: $name})
        ON CREATE SET 
          r.created_at = datetime(),
          r.source = 'yacht_destinations',
          r.port_count = $portCount
        RETURN r,
               CASE WHEN r.created_at = datetime() THEN 'created' ELSE 'existing' END as status
      `, { 
        name: route.name,
        portCount: route.ports.length
      });

      const routeStatus = routeResult.records[0]?.get('status');
      if (routeStatus === 'created') {
        results.routes++;
      }

      // Link ports to route
      for (let i = 0; i < route.ports.length; i++) {
        const portName = route.ports[i];
        
        await session.run(`
          MERGE (p:destination {name: $portName, type: 'city'})
          ON CREATE SET 
            p.created_at = datetime(),
            p.source = 'yacht_destinations',
            p.yacht_port = true,
            p.luxury_destination = true
          ON MATCH SET
            p.yacht_port = true
          
          WITH p
          MATCH (r:yacht_route {name: $routeName})
          MERGE (r)-[rel:INCLUDES_PORT {order: $order}]->(p)
          ON CREATE SET rel.created_at = datetime()
        `, {
          portName,
          routeName: route.name,
          order: i + 1
        });
      }

      results.details.push({
        name: route.name,
        type: 'route',
        status: routeStatus,
        ports: route.ports
      });
    }

    // Update statistics
    const statsResult = await session.run(`
      MATCH (d:destination)
      WHERE d.yacht_port = true OR d.yacht_destination = true
      RETURN count(d) as total_yacht_destinations
    `);

    const totalYachtDestinations = statsResult.records[0]?.get('total_yacht_destinations')?.toNumber() || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.total} destinations`,
      summary: {
        total: results.total,
        created: results.created,
        existing: results.existing,
        routes: results.routes
      },
      total_yacht_destinations: totalYachtDestinations,
      details: results.details
    });

  } catch (error: any) {
    console.error('Error uploading yacht destinations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload yacht destinations',
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
    // Get all yacht destinations
    const result = await session.run(`
      MATCH (d:destination)
      WHERE d.yacht_port = true OR d.yacht_destination = true
      RETURN d.name as name,
             d.type as type,
             d.yacht_port as is_port,
             d.yacht_destination as is_destination,
             d.created_at as created_at
      ORDER BY d.name
    `);

    const destinations = result.records.map(record => ({
      name: record.get('name'),
      type: record.get('type'),
      is_port: record.get('is_port'),
      is_destination: record.get('is_destination'),
      created_at: record.get('created_at')
    }));

    // Get all routes
    const routesResult = await session.run(`
      MATCH (r:yacht_route)-[rel:INCLUDES_PORT]->(p:destination)
      RETURN r.name as route_name,
             collect(p.name) as ports,
             r.created_at as created_at
      ORDER BY r.name
    `);

    const routes = routesResult.records.map(record => ({
      name: record.get('route_name'),
      ports: record.get('ports'),
      created_at: record.get('created_at')
    }));

    return NextResponse.json({
      success: true,
      destinations,
      routes,
      total_destinations: destinations.length,
      total_routes: routes.length
    });

  } catch (error: any) {
    console.error('Error fetching yacht destinations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch yacht destinations',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

