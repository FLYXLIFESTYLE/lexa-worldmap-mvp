/**
 * Track Booking
 * Calculate and record commissions when bookings are completed
 */

import { createClient } from '@/lib/supabase/server';
import { getNeo4jDriver } from '@/lib/neo4j';
import * as neo4j from 'neo4j-driver';

export interface BookingData {
  userId: string;
  bookingId: string;
  poiIds: string[];
  knowledgeIds: string[];
  totalValue: number;
}

export interface ContributorInfo {
  userId: string;
  displayName: string;
  commissionRate: number;
  role: string;
}

/**
 * Get contributor information from a POI or Knowledge node
 */
async function getContributor(
  poiId?: string,
  knowledgeId?: string
): Promise<ContributorInfo | null> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    let query = '';
    let params: any = {};

    if (poiId) {
      query = `
        MATCH (p:poi)
        WHERE id(p) = $poiIdInt OR p.poi_uid = $poiId
        RETURN p.contributed_by as userId, p.contributor_name as displayName
      `;
      // Convert ID to Neo4j Integer to handle 64-bit node IDs safely
      // poiId is a string, so we parse it as a number and wrap it in neo4j.int()
      const poiIdInt = neo4j.int(Number(poiId));
      params = { poiId, poiIdInt };
    } else if (knowledgeId) {
      query = `
        MATCH (k:Knowledge {knowledge_id: $knowledgeId})
        RETURN k.contributed_by as userId, k.contributor_name as displayName
      `;
      params = { knowledgeId };
    } else {
      return null;
    }

    const result = await session.run(query, params);

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const userId = record.get('userId');
    const displayName = record.get('displayName');

    if (!userId) {
      return null;
    }

    // Get captain profile from Supabase
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('captain_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching captain profile:', error);
      return null;
    }

    return {
      userId: profile.user_id,
      displayName: profile.display_name,
      commissionRate: parseFloat(profile.commission_rate),
      role: profile.role,
    };
  } finally {
    await session.close();
  }
}

/**
 * Record a booking and calculate commissions
 */
export async function recordBooking(booking: BookingData): Promise<{
  success: boolean;
  commissionsRecorded: number;
  totalCommissionAmount: number;
}> {
  const supabase = await createClient();
  let commissionsRecorded = 0;
  let totalCommissionAmount = 0;

  try {
    // Process POI contributions
    for (const poiId of booking.poiIds) {
      const contributor = await getContributor(poiId);

      if (contributor && contributor.commissionRate > 0) {
        const commissionAmount = booking.totalValue * (contributor.commissionRate / 100);

        const { error } = await supabase.from('content_bookings').insert({
          poi_id: poiId,
          knowledge_id: null,
          booking_id: booking.bookingId,
          booking_value: booking.totalValue,
          commission_amount: commissionAmount,
          commission_paid: false,
        });

        if (!error) {
          commissionsRecorded++;
          totalCommissionAmount += commissionAmount;
          console.log(
            `Commission recorded: ${contributor.displayName} - $${commissionAmount.toFixed(2)} (${contributor.commissionRate}%)`
          );
        } else {
          console.error('Error recording commission:', error);
        }
      }
    }

    // Process Knowledge contributions
    for (const knowledgeId of booking.knowledgeIds) {
      const contributor = await getContributor(undefined, knowledgeId);

      if (contributor && contributor.commissionRate > 0) {
        const commissionAmount = booking.totalValue * (contributor.commissionRate / 100);

        const { error } = await supabase.from('content_bookings').insert({
          poi_id: null,
          knowledge_id: knowledgeId,
          booking_id: booking.bookingId,
          booking_value: booking.totalValue,
          commission_amount: commissionAmount,
          commission_paid: false,
        });

        if (!error) {
          commissionsRecorded++;
          totalCommissionAmount += commissionAmount;
          console.log(
            `Commission recorded: ${contributor.displayName} - $${commissionAmount.toFixed(2)} (${contributor.commissionRate}%)`
          );
        } else {
          console.error('Error recording commission:', error);
        }
      }
    }

    return {
      success: true,
      commissionsRecorded,
      totalCommissionAmount,
    };
  } catch (error) {
    console.error('Error recording booking commissions:', error);
    return {
      success: false,
      commissionsRecorded,
      totalCommissionAmount,
    };
  }
}

/**
 * Get unpaid commissions for a captain
 */
export async function getUnpaidCommissions(userId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_bookings')
    .select('*')
    .eq('commission_paid', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching unpaid commissions:', error);
    return [];
  }

  // Filter by contributor (need to check Neo4j attribution)
  // TODO: Join with Neo4j data to filter by userId
  return data || [];
}

/**
 * Mark commission as paid
 */
export async function markCommissionPaid(commissionId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('content_bookings')
    .update({
      commission_paid: true,
      paid_at: new Date().toISOString(),
    })
    .eq('id', commissionId);

  if (error) {
    console.error('Error marking commission as paid:', error);
    return false;
  }

  return true;
}

