/**
 * Neo4j Database Client
 * Handles connections to Neo4j Aura for RAG system
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

/**
 * Initialize Neo4j driver (singleton pattern)
 */
export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error(
        'Neo4j credentials missing. Please set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD in .env'
      );
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 30000,
      logging: {
        level: 'info',
        logger: (level, message) => console.log(`[Neo4j ${level}] ${message}`),
      },
    });
  }

  return driver;
}

/**
 * Get a new session for queries
 */
export function getSession(database: string = 'neo4j'): Session {
  const driver = getNeo4jDriver();
  return driver.session({ database });
}

/**
 * Close the driver connection
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// Alias for backward compatibility
export const closeDriver = closeNeo4jDriver;

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const driver = getNeo4jDriver();
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connection successful');
    return true;
  } catch (error) {
    console.error('❌ Neo4j connection failed:', error);
    return false;
  }
}

