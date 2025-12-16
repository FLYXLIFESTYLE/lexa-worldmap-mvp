// =============================================================================
// CREATE EMOTIONAL & PSYCHOLOGICAL RELATIONSHIPS
// Infer emotions, desires, and fears from POI data and themes
// =============================================================================

// PART 1: CREATE EVOKES RELATIONSHIPS (POI → Emotion)
// Based on POI names, types, and themes

// 1. Joy & Excitement (beaches, festivals, adventures)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(beach|spiaggia|plage|playa|festa|festival|adventure|diving|sailing).*'
   OR p.luxury_score > 70
MATCH (e:Emotion {name: 'joy'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.8, r.evidence = 'beach/luxury/adventure context';

// 2. Peace & Tranquility (gardens, spa, quiet locations)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(garden|giardino|spa|wellness|retreat|monastery|temple|zen|quiet|tranquil|serene).*'
MATCH (e:Emotion {name: 'peace'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.85, r.evidence = 'spa/garden/quiet context';

// 3. Awe & Wonder (mountains, viewpoints, historical sites)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(monte|mountain|vrh|peak|vista|belvedere|viewpoint|cathedral|basilica|palazzo|castle).*'
MATCH (e:Emotion {name: 'awe'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.8, r.evidence = 'mountain/viewpoint/monument context';

// 4. Romance (luxury hotels, fine dining, scenic locations)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(grand hotel|luxury|romantic|villa|castello|sunset|moonlight|vineyard).*'
   OR p.luxury_score > 80
MATCH (e:Emotion {name: 'romance'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.75, r.evidence = 'luxury/romantic context';

// 5. Curiosity (museums, galleries, archaeological sites)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(museum|museo|gallery|archaeological|ruins|excavation|biblioteca|library).*'
MATCH (e:Emotion {name: 'curiosity'})
MERGE (p)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.85, r.evidence = 'museum/cultural context';

// PART 2: CREATE AMPLIFIES_DESIRE RELATIONSHIPS (POI → Desire)

// 1. Desire for Adventure
MATCH (p:poi)
WHERE p.name =~ '(?i).*(diving|surf|sail|climb|trek|hike|adventure|canyon|cave|grotto).*'
MATCH (d:Desire {name: 'adventure'})
MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
ON CREATE SET r.confidence = 0.8, r.evidence = 'adventure activity context';

// 2. Desire for Luxury
MATCH (p:poi)
WHERE p.name =~ '(?i).*(grand|luxury|exclusive|villa|yacht|michelin|gourmet|caviar|champagne).*'
   OR p.luxury_score > 85
MATCH (d:Desire {name: 'luxury'})
MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
ON CREATE SET r.confidence = 0.9, r.evidence = 'luxury indicators';

// 3. Desire for Authentic Experiences
MATCH (p:poi)
WHERE p.name =~ '(?i).*(local|traditional|authentic|artisan|mercato|market|village|paese).*'
MATCH (d:Desire {name: 'authenticity'})
MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
ON CREATE SET r.confidence = 0.75, r.evidence = 'authentic/local context';

// 4. Desire for Connection
MATCH (p:poi)
WHERE p.name =~ '(?i).*(community|festa|festival|piazza|square|social|family|gathering).*'
MATCH (d:Desire {name: 'connection'})
MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
ON CREATE SET r.confidence = 0.7, r.evidence = 'social/community context';

// 5. Desire for Knowledge
MATCH (p:poi)
WHERE p.name =~ '(?i).*(university|school|biblioteca|academy|institute|center|centro|workshop).*'
MATCH (d:Desire {name: 'knowledge'})
MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
ON CREATE SET r.confidence = 0.8, r.evidence = 'educational context';

// PART 3: CREATE MITIGATES_FEAR RELATIONSHIPS (POI → Fear)

// 1. Fear of Missing Out (exclusive venues, time-limited experiences)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(exclusive|limited|private|VIP|members only|secret).*'
   OR p.luxury_score > 90
MATCH (f:Fear {name: 'missing_out'})
MERGE (p)-[r:MITIGATES_FEAR]->(f)
ON CREATE SET r.confidence = 0.7, r.evidence = 'exclusive/rare context';

// 2. Fear of Disappointment (highly rated, established venues)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(awarded|starred|certified|heritage|unesco|famous|renowned).*'
   OR p.luxury_score > 80
MATCH (f:Fear {name: 'disappointment'})
MERGE (p)-[r:MITIGATES_FEAR]->(f)
ON CREATE SET r.confidence = 0.75, r.evidence = 'quality indicators';

// 3. Fear of Discomfort (luxury, comfort amenities)
MATCH (p:poi)
WHERE p.name =~ '(?i).*(comfort|luxury|spa|wellness|5 star|premium|deluxe|suite).*'
   OR p.luxury_score > 75
MATCH (f:Fear {name: 'discomfort'})
MERGE (p)-[r:MITIGATES_FEAR]->(f)
ON CREATE SET r.confidence = 0.8, r.evidence = 'comfort/luxury amenities';

// PART 4: THEME-BASED EMOTIONAL RELATIONSHIPS
// Connect themes to emotions they evoke

// Adventure themes → Excitement
MATCH (t:theme)
WHERE t.name =~ '(?i).*(adventure|diving|sailing|extreme|outdoor).*'
MATCH (e:Emotion {name: 'excitement'})
MERGE (t)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.9, r.evidence = 'adventure theme';

// Wellness themes → Peace
MATCH (t:theme)
WHERE t.name =~ '(?i).*(wellness|spa|yoga|meditation|retreat).*'
MATCH (e:Emotion {name: 'peace'})
MERGE (t)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.9, r.evidence = 'wellness theme';

// Cultural themes → Curiosity
MATCH (t:theme)
WHERE t.name =~ '(?i).*(cultural|history|art|heritage|archaeological).*'
MATCH (e:Emotion {name: 'curiosity'})
MERGE (t)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.85, r.evidence = 'cultural theme';

// Romantic themes → Romance
MATCH (t:theme)
WHERE t.name =~ '(?i).*(romantic|honeymoon|couple|intimate).*'
MATCH (e:Emotion {name: 'romance'})
MERGE (t)-[r:EVOKES]->(e)
ON CREATE SET r.confidence = 0.95, r.evidence = 'romantic theme';

// =============================================================================
// RETURN SUMMARY
// =============================================================================

MATCH ()-[r:EVOKES]->()
WITH 'EVOKES' as rel_type, count(r) as count
RETURN rel_type, count
UNION
MATCH ()-[r:AMPLIFIES_DESIRE]->()
WITH 'AMPLIFIES_DESIRE' as rel_type, count(r) as count
RETURN rel_type, count
UNION
MATCH ()-[r:MITIGATES_FEAR]->()
WITH 'MITIGATES_FEAR' as rel_type, count(r) as count
RETURN rel_type, count
ORDER BY count DESC;

