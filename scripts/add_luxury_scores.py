"""
Luxury Scoring System for Neo4j POIs
Automatically scores POIs based on tags, type, and other attributes
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

class LuxuryScorer:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")
        
        if not all([uri, user, password]):
            raise ValueError("Missing Neo4j credentials in .env file")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        print(f"[OK] Connected to Neo4j at {uri}")
    
    def calculate_score(self, poi_data):
        """Calculate luxury score based on POI attributes"""
        score = 5.0  # Base score
        
        poi_type = (poi_data.get('type') or '').lower()
        tags = [tag.lower() for tag in (poi_data.get('tags') or [])]
        name = (poi_data.get('name') or '').lower()
        description = (poi_data.get('description') or '').lower()
        
        # High luxury indicators (+3 to +5)
        high_luxury_keywords = [
            'michelin', '3 star', 'three star', 'private island', 
            'yacht club', 'exclusive', 'members only', 'palace hotel'
        ]
        for keyword in high_luxury_keywords:
            if keyword in name or keyword in description or keyword in ' '.join(tags):
                score += 4
                break
        
        # Premium indicators (+2 to +3)
        premium_keywords = [
            'five star', '5 star', 'luxury', 'boutique hotel',
            'private beach', 'spa resort', 'fine dining'
        ]
        for keyword in premium_keywords:
            if keyword in name or keyword in description:
                score += 2.5
                break
        
        # Quality indicators (+1 to +2)
        quality_keywords = [
            'private', 'secluded', 'intimate', 'bespoke',
            'curated', 'award winning', 'renowned'
        ]
        for keyword in quality_keywords:
            if keyword in name or keyword in description or keyword in ' '.join(tags):
                score += 1.5
                break
        
        # Type-based scoring
        luxury_types = {
            'fine_dining': 2,
            'restaurant': 1,
            'hotel': 1,
            'resort': 1.5,
            'spa': 1.5,
            'beach': 1,
            'marina': 1,
            'golf_course': 1,
            'winery': 1,
            'art_gallery': 0.5,
            'museum': 0.5,
        }
        
        for lux_type, bonus in luxury_types.items():
            if lux_type in poi_type:
                score += bonus
                break
        
        # Cap at 10
        return min(score, 10.0)
    
    def update_all_scores(self):
        """Update luxury scores for all POIs in the database"""
        with self.driver.session() as session:
            # Count total POIs
            result = session.run("MATCH (p:poi) RETURN count(p) as total")
            total = result.single()['total']
            print(f"\n[INFO] Found {total} POIs to score...")
            
            # Get all POIs
            result = session.run("""
                MATCH (p:poi)
                RETURN p.id as id, p.name as name, p.type as type, 
                       p.tags as tags, p.description as description
            """)
            
            scored_count = 0
            score_distribution = {10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
            
            for record in result:
                poi_data = dict(record)
                score = self.calculate_score(poi_data)
                
                # Update the POI
                session.run("""
                    MATCH (p:poi {id: $id})
                    SET p.luxuryScore = $score
                """, id=poi_data['id'], score=score)
                
                scored_count += 1
                score_distribution[int(score)] = score_distribution.get(int(score), 0) + 1
                
                if scored_count % 100 == 0:
                    print(f"  Scored {scored_count}/{total} POIs...")
            
            print(f"\n[SUCCESS] Successfully scored {scored_count} POIs!")
            print(f"\n[STATS] Score Distribution:")
            for score in range(10, 0, -1):
                count = score_distribution.get(score, 0)
                percentage = (count / scored_count * 100) if scored_count > 0 else 0
                bar = "█" * int(percentage / 2)
                print(f"  {score:2d}: {bar} {count:4d} ({percentage:5.1f}%)")
    
    def score_destinations(self):
        """Add luxury scores to destinations based on POI scores"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (d:destination)-[:CONTAINS]->(p:poi)
                WHERE p.luxuryScore IS NOT NULL
                WITH d, avg(p.luxuryScore) as avgScore, count(p) as poiCount
                SET d.luxuryScore = avgScore,
                    d.luxuryPOICount = poiCount
                RETURN d.name as name, d.luxuryScore as score, d.luxuryPOICount as count
                ORDER BY d.luxuryScore DESC
            """)
            
            print(f"\n[DESTINATIONS] Luxury Scores:")
            for record in result:
                print(f"  {record['name']:30s} Score: {record['score']:.2f} ({record['count']} POIs)")
    
    def close(self):
        self.driver.close()

if __name__ == "__main__":
    print("=" * 60)
    print("  LEXA Luxury Scoring System")
    print("=" * 60)
    
    try:
        scorer = LuxuryScorer()
        
        print("\n[STEP 1] Scoring all POIs...")
        scorer.update_all_scores()
        
        print("\n[STEP 2] Calculating destination scores...")
        scorer.score_destinations()
        
        print("\n" + "=" * 60)
        print("  [COMPLETE] Luxury scoring finished!")
        print("=" * 60)
        
        scorer.close()
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

