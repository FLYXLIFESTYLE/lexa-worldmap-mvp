'use client';

/**
 * Interactive World Map - Luxury Destinations
 * Shows clickable markers for all travel destinations
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Destination {
  id: string;
  name: string;
  coordinates: [number, number]; // [latitude, longitude]
  region: string;
  description?: string;
  bestMonths?: string[];
}

const DESTINATIONS: Destination[] = [
  {
    id: 'french-riviera',
    name: 'French Riviera',
    coordinates: [43.7102, 7.2620],
    region: 'Mediterranean',
    description: 'Glamorous coastline of southern France',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'amalfi-coast',
    name: 'Amalfi Coast',
    coordinates: [40.6333, 14.6027],
    region: 'Mediterranean',
    description: 'Stunning Italian coastal paradise',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'cyclades',
    name: 'Cyclades',
    coordinates: [37.0833, 25.2167],
    region: 'Mediterranean',
    description: 'Iconic Greek islands',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'adriatic',
    name: 'Adriatic',
    coordinates: [43.5081, 16.4402],
    region: 'Mediterranean',
    description: 'Croatian coast and islands',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'ionian',
    name: 'Ionian Sea',
    coordinates: [38.5, 20.5],
    region: 'Mediterranean',
    description: 'Western Greece islands',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'balearics',
    name: 'Balearics',
    coordinates: [39.5696, 2.6502],
    region: 'Mediterranean',
    description: 'Spanish island paradise',
    bestMonths: ['May', 'June', 'September', 'October']
  },
  {
    id: 'bahamas',
    name: 'Bahamas',
    coordinates: [25.0343, -77.3963],
    region: 'Caribbean',
    description: 'Turquoise waters and pristine beaches',
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April']
  },
  {
    id: 'bvi',
    name: 'British Virgin Islands',
    coordinates: [18.4207, -64.6399],
    region: 'Caribbean',
    description: 'Exclusive Caribbean sailing paradise',
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April']
  },
  {
    id: 'usvi',
    name: 'US Virgin Islands',
    coordinates: [18.3358, -64.8963],
    region: 'Caribbean',
    description: 'American Caribbean luxury',
    bestMonths: ['November', 'December', 'January', 'February', 'March', 'April']
  },
  {
    id: 'french-antilles',
    name: 'French Antilles',
    coordinates: [15.9, -61.33],
    region: 'Caribbean',
    description: 'French Caribbean elegance',
    bestMonths: ['December', 'January', 'February', 'March', 'April']
  },
  {
    id: 'dutch-antilles',
    name: 'Dutch Antilles',
    coordinates: [12.1224, -68.8824],
    region: 'Caribbean',
    description: 'Dutch Caribbean charm',
    bestMonths: ['December', 'January', 'February', 'March', 'April']
  },
  {
    id: 'dubai',
    name: 'Arabian Gulf (UAE)',
    coordinates: [25.2048, 55.2708],
    region: 'Middle East',
    description: 'Ultimate luxury destination',
    bestMonths: ['November', 'December', 'January', 'February', 'March']
  }
];

// Custom gold marker icon - Simplified for better compatibility
const createGoldIcon = () => {
  return L.divIcon({
    className: 'custom-gold-marker',
    html: `
      <div style="
        width: 30px;
        height: 30px;
        background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
        border: 3px solid #101818;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

interface WorldMapProps {
  onDestinationSelect?: (destination: Destination) => void;
  selectedDestination?: string;
  zoom?: number;
  height?: string;
}

export default function WorldMap({ 
  onDestinationSelect, 
  selectedDestination,
  zoom = 2,
  height = '600px'
}: WorldMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div 
        className="flex items-center justify-center bg-zinc-100 rounded-2xl"
        style={{ height }}
      >
        <p className="text-zinc-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="world-map-container" style={{ height, borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={[20, 0]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="lexa-map"
      >
        {/* CartoDB Voyager - Clean design with English labels */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        
        {DESTINATIONS.map((destination) => (
          <Marker
            key={destination.id}
            position={destination.coordinates}
            icon={createGoldIcon()}
            eventHandlers={{
              click: () => {
                if (onDestinationSelect) {
                  onDestinationSelect(destination);
                }
              },
            }}
          >
            <Popup className="lexa-popup">
              <div className="p-2">
                <h3 className="font-bold text-lg text-lexa-navy mb-1">
                  {destination.name}
                </h3>
                <p className="text-sm text-zinc-600 mb-2">
                  {destination.region}
                </p>
                {destination.description && (
                  <p className="text-sm text-zinc-700 mb-2">
                    {destination.description}
                  </p>
                )}
                {destination.bestMonths && destination.bestMonths.length > 0 && (
                  <div className="text-xs text-zinc-500">
                    <span className="font-semibold">Best:</span> {destination.bestMonths.slice(0, 3).join(', ')}
                  </div>
                )}
                <button
                  onClick={() => onDestinationSelect && onDestinationSelect(destination)}
                  className="mt-3 w-full bg-lexa-gold text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-lexa-navy transition-colors"
                >
                  Select {destination.name}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// Export destinations for use elsewhere
export { DESTINATIONS };
export type { Destination };

