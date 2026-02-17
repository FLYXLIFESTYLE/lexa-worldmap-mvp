/**
 * LEXA Script Engine - Stage 3: Booking Assets (Operational Document)
 *
 * Operational document for charter team, concierge, and booking agents.
 * Contains all logistics needed to execute the experience.
 * Generated immediately upon booking confirmation.
 * NOT shared with the guest.
 */

import { v4 as uuid } from "uuid";
import { fetchArcData, fetchSignaturePOIs } from "../queries";
import type { Stage3Output, Stage2Output } from "../types";

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generateStage3(input: {
  script_id: string;
  stage2: Stage2Output;
  arc_code: string;
  region: string;
  duration: number;
  booking_reference?: string;
  guest_names?: string[];
  start_date?: string;
  vessel?: string;
}): Promise<Stage3Output> {
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const pois = await fetchSignaturePOIs(input.region, undefined, 20);

  // Build start/end dates
  const startDate = input.start_date || new Date().toISOString().split("T")[0];
  const endDate = addDays(startDate, input.duration - 1);

  // Build POI database
  const poiDatabase: Stage3Output["pois"] = pois.map((poi, i) => ({
    poi_id: uuid(),
    day: (i % input.duration) + 1,
    name: poi.name,
    type: poi.category || "experience",
    location: {
      address: "Address TBC",
      gps: { lat: poi.lat || 0, lon: poi.lon || 0 },
      nearest_port: "Marina TBC",
      distance: "TBC",
      transfer_method: "Car",
    },
    contact: {
      main: "Contact TBC",
      phone: "TBC",
      email: "TBC",
    },
    booking: {
      lead_time: "2 weeks minimum",
      method: "Direct",
      deposit: "Credit card hold",
      cancellation: "48 hours notice",
    },
    pricing: {
      range: "TBC",
      includes: "Standard package",
      extras: "TBC",
      payment: "On-site",
    },
    requirements: {
      dress_code: "Resort elegant",
      bring: "As advised",
      physical_level: "Low",
      duration: "2-4 hours",
      best_time: i % 2 === 0 ? "Morning" : "Afternoon",
    },
    operational_notes: "Mention LEXA for VIP treatment",
    alternatives: [],
  }));

  // Build daily logistics from Stage 2 days
  const dailyLogistics: Stage3Output["daily_logistics"] = input.stage2.days.map(
    (day) => ({
      day: day.day_number,
      date: addDays(startDate, day.day_number - 1),
      title: day.title,
      phase: day.phase,
      emotional_focus: `${day.emotional_core} — ${day.memory_anchor}`,
      schedule: day.experiences.map((exp) => ({
        time: exp.timing || "TBC",
        activity: exp.description,
        location: exp.poi_name || "Onboard",
        booking_status: "pending" as const,
      })),
      marina: "TBC",
      weather_backup: "Move activities onboard if weather turns",
      special_notes: "",
    })
  );

  // Booking status for all external experiences
  const bookingStatus: Stage3Output["booking_status"] = poiDatabase.map(
    (poi) => ({
      experience: poi.name,
      day: poi.day,
      status: "pending" as const,
      notes: "Awaiting confirmation",
    })
  );

  return {
    booking_reference: input.booking_reference || `LEXA-${Date.now()}`,
    guests: (input.guest_names || ["Guest"]).map((name) => ({
      name,
      preferences: "TBC via profiling questionnaire",
      dietary: "TBC",
      wellness_focus: "TBC",
      mobility: "No restrictions noted",
      communication: "TBC",
    })),
    dates: { start: startDate, end: endDate },
    duration_days: input.duration,
    vessel: input.vessel,
    generated_at: new Date().toISOString(),
    version: 1,
    pois: poiDatabase,
    daily_logistics: dailyLogistics,
    booking_status: bookingStatus,
    transfers: generateTransferSchedule(input.duration, startDate),
    dietary: (input.guest_names || ["Guest"]).map((name) => ({
      guest_name: name,
      allergies: [],
      restrictions: [],
      preferences: [],
      avoid: [],
    })),
    wellness: (input.guest_names || ["Guest"]).map((name) => ({
      guest_name: name,
      iv_protocol: [],
      treatment_preferences: "TBC via profiling",
      sleep_support: "TBC via profiling",
    })),
    emergency_contacts: [
      { type: "Vessel Emergency", phone: "Captain TBC" },
      { type: "LEXA Operations", phone: "+44 XXX XXX XXXX" },
      { type: "Medical Emergency", phone: "Local emergency services" },
    ],
    weather_alternatives: [
      {
        day: 2,
        activity: "Outdoor hike",
        alternative: "Extended spa time + onboard meditation",
      },
      {
        day: 4,
        activity: "Island visit",
        alternative: "Coastal drive + indoor cultural experience",
      },
    ],
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function generateTransferSchedule(
  duration: number,
  startDate: string
): Stage3Output["transfers"] {
  const transfers: Stage3Output["transfers"] = [];

  // Airport arrival
  transfers.push({
    day: 1,
    time: "14:00",
    from: "Airport",
    to: "Embarkation port",
    method: "Private car",
    duration: "20 min",
  });

  // Daily transfers (placeholder — would be calculated from POI locations)
  for (let d = 2; d <= duration - 1; d++) {
    transfers.push({
      day: d,
      time: "10:00",
      from: "Marina",
      to: "Day experience",
      method: "Car",
      duration: "15 min",
    });
  }

  // Airport departure
  transfers.push({
    day: duration,
    time: "10:00",
    from: "Disembarkation port",
    to: "Airport",
    method: "Private car",
    duration: "20 min",
  });

  return transfers;
}
