// =============================================================================
// CREATE EMOTION, DESIRE, AND FEAR NODES
// Run this FIRST before creating relationships
// =============================================================================

// CREATE EMOTION NODES
MERGE (e:Emotion {name: 'joy'})
ON CREATE SET e.description = 'Feelings of happiness, delight, and pleasure';

MERGE (e:Emotion {name: 'excitement'})
ON CREATE SET e.description = 'Feelings of enthusiasm, anticipation, and thrill';

MERGE (e:Emotion {name: 'peace'})
ON CREATE SET e.description = 'Feelings of calm, tranquility, and serenity';

MERGE (e:Emotion {name: 'awe'})
ON CREATE SET e.description = 'Feelings of wonder, amazement, and reverence';

MERGE (e:Emotion {name: 'romance'})
ON CREATE SET e.description = 'Feelings of love, intimacy, and passion';

MERGE (e:Emotion {name: 'curiosity'})
ON CREATE SET e.description = 'Feelings of interest, exploration, and discovery';

MERGE (e:Emotion {name: 'gratitude'})
ON CREATE SET e.description = 'Feelings of appreciation and thankfulness';

MERGE (e:Emotion {name: 'inspiration'})
ON CREATE SET e.description = 'Feelings of creativity and motivation';

// CREATE DESIRE NODES
MERGE (d:Desire {name: 'adventure'})
ON CREATE SET d.description = 'Desire for exciting, novel experiences';

MERGE (d:Desire {name: 'luxury'})
ON CREATE SET d.description = 'Desire for premium, exclusive experiences';

MERGE (d:Desire {name: 'authenticity'})
ON CREATE SET d.description = 'Desire for genuine, local experiences';

MERGE (d:Desire {name: 'connection'})
ON CREATE SET d.description = 'Desire for social bonds and relationships';

MERGE (d:Desire {name: 'knowledge'})
ON CREATE SET d.description = 'Desire to learn and understand';

MERGE (d:Desire {name: 'transformation'})
ON CREATE SET d.description = 'Desire for personal growth and change';

MERGE (d:Desire {name: 'status'})
ON CREATE SET d.description = 'Desire for recognition and prestige';

MERGE (d:Desire {name: 'escape'})
ON CREATE SET d.description = 'Desire to disconnect and rejuvenate';

// CREATE FEAR NODES
MERGE (f:Fear {name: 'missing_out'})
ON CREATE SET f.description = 'Fear of not experiencing something unique';

MERGE (f:Fear {name: 'disappointment'})
ON CREATE SET f.description = 'Fear of unmet expectations';

MERGE (f:Fear {name: 'discomfort'})
ON CREATE SET f.description = 'Fear of physical or emotional discomfort';

MERGE (f:Fear {name: 'regret'})
ON CREATE SET f.description = 'Fear of making wrong choices';

MERGE (f:Fear {name: 'inadequacy'})
ON CREATE SET f.description = 'Fear of not being good enough';

MERGE (f:Fear {name: 'judgment'})
ON CREATE SET f.description = 'Fear of negative opinions from others';

// RETURN SUMMARY
MATCH (e:Emotion)
WITH 'Emotion' as node_type, count(e) as count
RETURN node_type, count
UNION
MATCH (d:Desire)
WITH 'Desire' as node_type, count(d) as count
RETURN node_type, count
UNION
MATCH (f:Fear)
WITH 'Fear' as node_type, count(f) as count
RETURN node_type, count
ORDER BY node_type;

