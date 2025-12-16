#!/usr/bin/env python3
"""
POI Mapper - Maps OSM POIs to LEXA format

Usage:
    python scripts/poi_mapper.py

Reads all data_raw/*.jsonl files and outputs mapped data_mapped/*.jsonl files.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple


# ============================================================================
# ALLOWED VALUES - Paste activity and theme lists here
# ============================================================================

ALLOWED_ACTIVITIES = [
    "Diving", "Snorkeling", "Freediving", "Jetskiing", "Paddleboarding",
    "Kayaking", "Sailing", "Waterskiing", "Wakeboarding", "Surfing",
    "Kitesurfing", "Wildlife watching", "Whale watching", "Shark diving",
    "Island hopping", "Hiking", "Trekking", "Mountain biking",
    "Desert driving", "Sandboarding", "Paragliding", "Rock climbing",
    "Volcano trekking", "Beach time", "Spa treatment", "Yoga", "Meditation",
    "Breathwork", "Sound healing", "Cooking class", "Fine dining",
    "Wine tasting", "Cocktail masterclass", "Market tour", "Heritage walk",
    "Museum visit", "Art workshop", "Photography", "Filming",
    "Content creation", "Helicopter tour", "Private performance", "Nightlife",
    "Shopping", "Yacht party", "Sailing instruction", "Marine conservation",
    "Educational lecture", "Spiritual ceremony", "Stargazing",
    "Freediving with Professionals", "Private Conservation Encounters",
    "Cultural Elder Encounters", "Onboard Rituals", "Deep Sea Fishing",
    "Fine Art Collecting Tours", "Luxury Shopping Tours",
    "Supercar or Hypercar Experiences", "Marine Science",
    "Personal Documentary Filming", "Gala Evenings / Private Concerts",
    "Ultralux Wellness Modalities"
]

ALLOWED_THEMES = [
    "Culture & Culinary", "Water & Wildlife Adventure", "Raw Nature & Vibes",
    "Sports & Adrenaline", "Mental Health & Legacy", "Art & Fashion",
    "Beauty & Longevity", "Business & Performance", "Ultra Exclusivity & Access",
    "Philanthropy & Impact", "Family & Generations", "Stories & Mythology",
    "Celebration & Milestones"
]


# ============================================================================
# MAPPING RULES
# ============================================================================

class POIMapper:
    """Maps OSM POIs to LEXA format with activity and theme mappings."""
    
    def __init__(self):
        self.activity_rules = self._build_activity_rules()
        self.theme_rules = self._build_theme_rules()
        self.name_patterns = self._build_name_patterns()
    
    def _build_activity_rules(self) -> Dict[str, List[Tuple[str, float]]]:
        """Build deterministic activity mapping rules from OSM tags."""
        rules = {}
        
        # Tourism tags
        rules["tourism=hotel"] = [("Beach time", 0.85), ("Spa treatment", 0.75)]
        rules["tourism=museum"] = [("Museum visit", 0.95), ("Heritage walk", 0.80)]
        rules["tourism=attraction"] = [("Heritage walk", 0.75)]
        rules["tourism=viewpoint"] = [("Photography", 0.85), ("Stargazing", 0.70)]
        
        # Amenity tags
        rules["amenity=restaurant"] = [("Fine dining", 0.85), ("Cooking class", 0.70)]
        rules["amenity=bar"] = [("Nightlife", 0.90), ("Cocktail masterclass", 0.75)]
        rules["amenity=cafe"] = [("Fine dining", 0.75)]
        rules["amenity=spa"] = [("Spa treatment", 0.95), ("Yoga", 0.80), ("Meditation", 0.75)]
        rules["amenity=nightclub"] = [("Nightlife", 0.95)]
        
        # Leisure tags
        rules["leisure=marina"] = [("Sailing", 0.95), ("Yacht party", 0.85), ("Sailing instruction", 0.80)]
        rules["leisure=beach_resort"] = [("Beach time", 0.95), ("Snorkeling", 0.80), ("Paddleboarding", 0.75)]
        rules["leisure=park"] = [("Hiking", 0.80), ("Wildlife watching", 0.75)]
        
        # Natural tags
        rules["natural=beach"] = [("Beach time", 0.95), ("Snorkeling", 0.85), ("Surfing", 0.80)]
        rules["natural=reef"] = [("Diving", 0.95), ("Snorkeling", 0.95), ("Freediving", 0.90)]
        rules["natural=bay"] = [("Sailing", 0.90), ("Kayaking", 0.85), ("Paddleboarding", 0.80)]
        rules["natural=peak"] = [("Hiking", 0.90), ("Trekking", 0.90), ("Rock climbing", 0.85)]
        
        # Sport tags
        rules["sport=diving"] = [("Diving", 0.95), ("Freediving", 0.85)]
        rules["sport=snorkeling"] = [("Snorkeling", 0.95)]
        rules["sport=sailing"] = [("Sailing", 0.95), ("Sailing instruction", 0.85)]
        rules["sport=surfing"] = [("Surfing", 0.95)]
        rules["sport=kitesurfing"] = [("Kitesurfing", 0.95)]
        rules["sport=kayaking"] = [("Kayaking", 0.95)]
        rules["sport=paddleboarding"] = [("Paddleboarding", 0.95)]
        rules["sport=wakeboarding"] = [("Wakeboarding", 0.95)]
        rules["sport=waterskiing"] = [("Waterskiing", 0.95)]
        rules["sport=jetskiing"] = [("Jetskiing", 0.95)]
        rules["sport=hiking"] = [("Hiking", 0.95), ("Trekking", 0.90)]
        rules["sport=climbing"] = [("Rock climbing", 0.95)]
        rules["sport=paragliding"] = [("Paragliding", 0.95)]
        rules["sport=mountain_biking"] = [("Mountain biking", 0.95)]
        rules["sport=yoga"] = [("Yoga", 0.95), ("Meditation", 0.80)]
        
        # Aeroway tags
        rules["aeroway=heliport"] = [("Helicopter tour", 0.95)]
        rules["aeroway=aerodrome"] = [("Helicopter tour", 0.80)]
        
        # Man made tags
        rules["man_made=pier"] = [("Sailing", 0.85), ("Fishing", 0.75)]
        
        # Harbour tags
        rules["harbour=yes"] = [("Sailing", 0.90), ("Yacht party", 0.85)]
        
        # Shop tags
        rules["shop=luxury"] = [("Luxury Shopping Tours", 0.90), ("Shopping", 0.85)]
        rules["shop=jewelry"] = [("Luxury Shopping Tours", 0.90), ("Shopping", 0.85)]
        rules["shop=fashion"] = [("Luxury Shopping Tours", 0.85), ("Shopping", 0.85)]
        rules["shop=watches"] = [("Luxury Shopping Tours", 0.90), ("Shopping", 0.85)]
        
        return rules
    
    def _build_theme_rules(self) -> Dict[str, List[Tuple[str, float]]]:
        """Build deterministic theme mapping rules from OSM tags."""
        rules = {}
        
        # Tourism tags
        rules["tourism=hotel"] = [("Beauty & Longevity", 0.85), ("Ultra Exclusivity & Access", 0.80)]
        rules["tourism=museum"] = [("Culture & Culinary", 0.90), ("Stories & Mythology", 0.80)]
        rules["tourism=attraction"] = [("Culture & Culinary", 0.80), ("Stories & Mythology", 0.75)]
        rules["tourism=viewpoint"] = [("Raw Nature & Vibes", 0.85)]
        
        # Amenity tags
        rules["amenity=restaurant"] = [("Culture & Culinary", 0.90)]
        rules["amenity=bar"] = [("Culture & Culinary", 0.85), ("Celebration & Milestones", 0.75)]
        rules["amenity=cafe"] = [("Culture & Culinary", 0.80)]
        rules["amenity=spa"] = [("Beauty & Longevity", 0.95), ("Mental Health & Legacy", 0.85)]
        rules["amenity=nightclub"] = [("Celebration & Milestones", 0.85)]
        
        # Leisure tags
        rules["leisure=marina"] = [("Water & Wildlife Adventure", 0.90), ("Ultra Exclusivity & Access", 0.85)]
        rules["leisure=beach_resort"] = [("Raw Nature & Vibes", 0.90), ("Beauty & Longevity", 0.80)]
        rules["leisure=park"] = [("Raw Nature & Vibes", 0.85), ("Water & Wildlife Adventure", 0.75)]
        
        # Natural tags
        rules["natural=beach"] = [("Raw Nature & Vibes", 0.95), ("Water & Wildlife Adventure", 0.85)]
        rules["natural=reef"] = [("Water & Wildlife Adventure", 0.95), ("Raw Nature & Vibes", 0.85)]
        rules["natural=bay"] = [("Water & Wildlife Adventure", 0.90), ("Raw Nature & Vibes", 0.85)]
        rules["natural=peak"] = [("Raw Nature & Vibes", 0.95), ("Sports & Adrenaline", 0.85)]
        
        # Sport tags
        rules["sport=diving"] = [("Water & Wildlife Adventure", 0.95), ("Sports & Adrenaline", 0.85)]
        rules["sport=snorkeling"] = [("Water & Wildlife Adventure", 0.95)]
        rules["sport=sailing"] = [("Water & Wildlife Adventure", 0.95), ("Ultra Exclusivity & Access", 0.80)]
        rules["sport=surfing"] = [("Sports & Adrenaline", 0.95), ("Raw Nature & Vibes", 0.85)]
        rules["sport=kitesurfing"] = [("Sports & Adrenaline", 0.95)]
        rules["sport=kayaking"] = [("Water & Wildlife Adventure", 0.90), ("Sports & Adrenaline", 0.80)]
        rules["sport=paddleboarding"] = [("Water & Wildlife Adventure", 0.90)]
        rules["sport=hiking"] = [("Raw Nature & Vibes", 0.90), ("Sports & Adrenaline", 0.80)]
        rules["sport=climbing"] = [("Sports & Adrenaline", 0.95), ("Raw Nature & Vibes", 0.85)]
        rules["sport=paragliding"] = [("Sports & Adrenaline", 0.95)]
        rules["sport=yoga"] = [("Mental Health & Legacy", 0.95), ("Beauty & Longevity", 0.85)]
        
        # Aeroway tags
        rules["aeroway=heliport"] = [("Ultra Exclusivity & Access", 0.90)]
        rules["aeroway=aerodrome"] = [("Ultra Exclusivity & Access", 0.75)]
        
        # Man made tags
        rules["man_made=pier"] = [("Water & Wildlife Adventure", 0.85)]
        
        # Harbour tags
        rules["harbour=yes"] = [("Water & Wildlife Adventure", 0.90), ("Ultra Exclusivity & Access", 0.80)]
        
        # Shop tags
        rules["shop=luxury"] = [("Art & Fashion", 0.90), ("Ultra Exclusivity & Access", 0.95)]
        rules["shop=jewelry"] = [("Art & Fashion", 0.90), ("Ultra Exclusivity & Access", 0.90)]
        rules["shop=fashion"] = [("Art & Fashion", 0.95), ("Ultra Exclusivity & Access", 0.85)]
        rules["shop=watches"] = [("Art & Fashion", 0.90), ("Ultra Exclusivity & Access", 0.90)]
        
        return rules
    
    def _build_name_patterns(self) -> Dict[str, List[Tuple[str, str, float]]]:
        """Build name-based inference patterns (activity, theme, confidence)."""
        patterns = []
        
        # Activity patterns
        activity_keywords = {
            "diving": ("Diving", 0.85),
            "snorkel": ("Snorkeling", 0.85),
            "freediving": ("Freediving", 0.85),
            "jetski": ("Jetskiing", 0.85),
            "paddleboard": ("Paddleboarding", 0.85),
            "kayak": ("Kayaking", 0.85),
            "sailing": ("Sailing", 0.85),
            "waterski": ("Waterskiing", 0.85),
            "wakeboard": ("Wakeboarding", 0.85),
            "surf": ("Surfing", 0.85),
            "kitesurf": ("Kitesurfing", 0.85),
            "wildlife": ("Wildlife watching", 0.80),
            "whale": ("Whale watching", 0.85),
            "shark": ("Shark diving", 0.85),
            "hiking": ("Hiking", 0.85),
            "trek": ("Trekking", 0.85),
            "mountain bike": ("Mountain biking", 0.85),
            "desert": ("Desert driving", 0.80),
            "sandboard": ("Sandboarding", 0.85),
            "paraglid": ("Paragliding", 0.85),
            "climb": ("Rock climbing", 0.85),
            "volcano": ("Volcano trekking", 0.85),
            "beach": ("Beach time", 0.80),
            "spa": ("Spa treatment", 0.85),
            "yoga": ("Yoga", 0.85),
            "meditation": ("Meditation", 0.85),
            "breathwork": ("Breathwork", 0.85),
            "sound healing": ("Sound healing", 0.85),
            "cooking": ("Cooking class", 0.85),
            "restaurant": ("Fine dining", 0.75),
            "wine": ("Wine tasting", 0.85),
            "cocktail": ("Cocktail masterclass", 0.85),
            "market": ("Market tour", 0.85),
            "heritage": ("Heritage walk", 0.85),
            "museum": ("Museum visit", 0.90),
            "art": ("Art workshop", 0.80),
            "photography": ("Photography", 0.85),
            "filming": ("Filming", 0.85),
            "helicopter": ("Helicopter tour", 0.90),
            "nightclub": ("Nightlife", 0.90),
            "club": ("Nightlife", 0.80),
            "shopping": ("Shopping", 0.75),
            "luxury": ("Luxury Shopping Tours", 0.80),
            "marina": ("Sailing", 0.80),
            "conservation": ("Marine conservation", 0.85),
            "lecture": ("Educational lecture", 0.85),
            "spiritual": ("Spiritual ceremony", 0.85),
            "stargazing": ("Stargazing", 0.90),
            "fishing": ("Deep Sea Fishing", 0.80),
        }
        
        # Theme patterns
        theme_keywords = {
            "museum": ("Culture & Culinary", 0.80),
            "art": ("Art & Fashion", 0.80),
            "gallery": ("Art & Fashion", 0.85),
            "spa": ("Beauty & Longevity", 0.85),
            "wellness": ("Beauty & Longevity", 0.80),
            "yoga": ("Mental Health & Legacy", 0.80),
            "meditation": ("Mental Health & Legacy", 0.85),
            "restaurant": ("Culture & Culinary", 0.75),
            "culinary": ("Culture & Culinary", 0.85),
            "beach": ("Raw Nature & Vibes", 0.80),
            "nature": ("Raw Nature & Vibes", 0.80),
            "wildlife": ("Water & Wildlife Adventure", 0.85),
            "marine": ("Water & Wildlife Adventure", 0.85),
            "sport": ("Sports & Adrenaline", 0.75),
            "adventure": ("Sports & Adrenaline", 0.80),
            "luxury": ("Ultra Exclusivity & Access", 0.80),
            "exclusive": ("Ultra Exclusivity & Access", 0.85),
            "fashion": ("Art & Fashion", 0.85),
            "jewelry": ("Art & Fashion", 0.85),
            "boutique": ("Art & Fashion", 0.80),
        }
        
        return {"activities": activity_keywords, "themes": theme_keywords}
    
    def _get_tag_key(self, tags: Dict[str, str], tag_name: str) -> Optional[str]:
        """Get tag value and return formatted key."""
        value = tags.get(tag_name)
        if value:
            return f"{tag_name}={value}"
        return None
    
    def _match_activity_rules(self, tags: Dict[str, str]) -> List[Dict[str, Any]]:
        """Match activities using OSM tag rules."""
        activities = []
        seen = set()
        
        # Check all relevant tags
        tag_keys = [
            self._get_tag_key(tags, "tourism"),
            self._get_tag_key(tags, "amenity"),
            self._get_tag_key(tags, "leisure"),
            self._get_tag_key(tags, "natural"),
            self._get_tag_key(tags, "sport"),
            self._get_tag_key(tags, "aeroway"),
            self._get_tag_key(tags, "man_made"),
            self._get_tag_key(tags, "harbour"),
            self._get_tag_key(tags, "shop"),
        ]
        
        for tag_key in tag_keys:
            if tag_key and tag_key in self.activity_rules:
                for activity_name, confidence in self.activity_rules[tag_key]:
                    if activity_name not in seen:
                        activities.append({
                            "activity_name": activity_name,
                            "confidence": confidence,
                            "evidence": "osm_tag_rule"
                        })
                        seen.add(activity_name)
        
        return activities
    
    def _match_theme_rules(self, tags: Dict[str, str]) -> List[Dict[str, Any]]:
        """Match themes using OSM tag rules."""
        themes = []
        seen = set()
        
        # Check all relevant tags
        tag_keys = [
            self._get_tag_key(tags, "tourism"),
            self._get_tag_key(tags, "amenity"),
            self._get_tag_key(tags, "leisure"),
            self._get_tag_key(tags, "natural"),
            self._get_tag_key(tags, "sport"),
            self._get_tag_key(tags, "aeroway"),
            self._get_tag_key(tags, "man_made"),
            self._get_tag_key(tags, "harbour"),
            self._get_tag_key(tags, "shop"),
        ]
        
        for tag_key in tag_keys:
            if tag_key and tag_key in self.theme_rules:
                for theme_name, confidence in self.theme_rules[tag_key]:
                    if theme_name not in seen:
                        themes.append({
                            "theme_name": theme_name,
                            "confidence": confidence,
                            "evidence": "osm_tag_rule"
                        })
                        seen.add(theme_name)
        
        return themes
    
    def _infer_from_name(self, name: str, tags: Dict[str, str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Infer activities and themes from name when tags are insufficient."""
        if not name:
            return [], []
        
        name_lower = name.lower()
        activities = []
        themes = []
        seen_activities = set()
        seen_themes = set()
        
        # Check activity patterns
        for keyword, (activity_name, confidence) in self.name_patterns["activities"].items():
            if keyword in name_lower and activity_name not in seen_activities:
                # Lower confidence for name inference
                activities.append({
                    "activity_name": activity_name,
                    "confidence": max(0.55, confidence - 0.15),
                    "evidence": "name_inference"
                })
                seen_activities.add(activity_name)
        
        # Check theme patterns
        for keyword, (theme_name, confidence) in self.name_patterns["themes"].items():
            if keyword in name_lower and theme_name not in seen_themes:
                # Lower confidence for name inference
                themes.append({
                    "theme_name": theme_name,
                    "confidence": max(0.55, confidence - 0.15),
                    "evidence": "name_inference"
                })
                seen_themes.add(theme_name)
        
        return activities, themes
    
    def map_poi(self, poi: Dict[str, Any]) -> Dict[str, Any]:
        """Map a single POI to LEXA format."""
        tags = poi.get("tags", {})
        name = poi.get("name", "")
        
        # First try OSM tag rules
        activities = self._match_activity_rules(tags)
        themes = self._match_theme_rules(tags)
        
        # If no matches from tags, try name inference
        if not activities and not themes:
            name_activities, name_themes = self._infer_from_name(name, tags)
            activities.extend(name_activities)
            themes.extend(name_themes)
        elif not activities:
            # If themes found but no activities, still try name for activities
            name_activities, _ = self._infer_from_name(name, tags)
            activities.extend(name_activities)
        elif not themes:
            # If activities found but no themes, still try name for themes
            _, name_themes = self._infer_from_name(name, tags)
            themes.extend(name_themes)
        
        # Build mapped POI
        mapped = {
            "source": poi.get("source"),
            "source_id": poi.get("source_id"),
            "name": name,
            "lat": poi.get("lat"),
            "lon": poi.get("lon"),
            "destination_name": poi.get("destination_name"),
            "tags": tags,
            "supports_activity": activities,
            "has_theme": themes,
        }
        
        # Constraints are optional, add if needed
        constraints = []
        # Example: add constraints based on tags if needed
        if tags.get("opening_hours"):
            constraints.append({
                "type": "opening_hours",
                "value": tags.get("opening_hours"),
                "confidence": 0.95,
                "evidence": "osm_tag_rule"
            })
        
        if constraints:
            mapped["constraints"] = constraints
        
        return mapped
    
    def process_file(self, input_path: Path, output_path: Path) -> None:
        """Process a single JSONL file."""
        mapped_pois = []
        
        with open(input_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    poi = json.loads(line)
                    mapped_poi = self.map_poi(poi)
                    mapped_pois.append(mapped_poi)
        
        # Write output JSONL
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            for mapped_poi in mapped_pois:
                f.write(json.dumps(mapped_poi, ensure_ascii=False) + "\n")
        
        print(f"Mapped {len(mapped_pois)} POIs: {input_path.name} -> {output_path.name}")


def main():
    """Main entry point."""
    data_raw_dir = Path("data_raw")
    data_mapped_dir = Path("data_mapped")
    
    if not data_raw_dir.exists():
        print(f"Error: {data_raw_dir} directory not found")
        return
    
    mapper = POIMapper()
    
    # Process all JSONL files in data_raw
    jsonl_files = list(data_raw_dir.glob("*.jsonl"))
    
    if not jsonl_files:
        print(f"No JSONL files found in {data_raw_dir}")
        return
    
    for input_file in jsonl_files:
        output_file = data_mapped_dir / input_file.name
        mapper.process_file(input_file, output_file)
    
    print(f"\nCompleted mapping {len(jsonl_files)} destination(s)")


if __name__ == "__main__":
    main()

