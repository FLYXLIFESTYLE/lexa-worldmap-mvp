# LEXA Theme Categories - Complete Image Guide

## All 12 Theme Categories for Visual Selection UI

Each theme needs a **high-quality, license-free background image** that instantly evokes the feeling.

---

## 1. 💕 Romance & Intimacy
**Image Search Terms:** 
- Candlelit dinner overlooking ocean at sunset
- Couple on private yacht at golden hour
- Intimate villa terrace with ocean view
- Romantic beach dinner setup
- Private infinity pool overlooking sea

**Recommended Sources:**
- Unsplash: `romantic dinner ocean sunset`
- Pexels: `couple luxury yacht`
- Description: Soft, warm lighting. Focus on intimacy, connection, and breathtaking views.

---

## 2. 🏔️ Adventure & Exploration
**Image Search Terms:**
- Helicopter flying over dramatic mountain landscape
- Cliff diving or adventure sports
- Mountain climbing expedition
- Paragliding over scenic landscape
- Adventure yacht in dramatic seascape

**Recommended Sources:**
- Unsplash: `adventure mountain helicopter`
- Pexels: `extreme sports adventure`
- Description: Dynamic, energetic, breathtaking. Should make heart race.

---

## 3. 🧘 Wellness & Transformation
**Image Search Terms:**
- Serene spa setting with ocean view
- Meditation by tranquil water
- Luxury wellness retreat
- Yoga on private beach at sunrise
- Spa treatment room with nature view

**Recommended Sources:**
- Unsplash: `wellness spa ocean`
- Pexels: `meditation peaceful water`
- Description: Calm, restorative, peaceful. Soft colors, natural light.

---

## 4. 🍷 Culinary Excellence
**Image Search Terms:**
- Michelin star fine dining presentation
- Wine country vineyard landscape
- Chef's table exclusive dining
- Gourmet food artistry
- Luxury restaurant ocean view

**Recommended Sources:**
- Unsplash: `michelin star dining`
- Pexels: `fine dining luxury`
- Description: Sophisticated, sensory, elegant. Focus on artistry and excellence.

---

## 5. 🎭 Cultural Immersion
**Image Search Terms:**
- Historic European architecture
- Local artisan workshop
- Museum private tour
- Cultural festival or traditional event
- Ancient ruins at sunset

**Recommended Sources:**
- Unsplash: `historic architecture europe`
- Pexels: `cultural heritage site`
- Description: Rich, textured, authentic. Historic beauty with character.

---

## 6. 💎 Pure Luxury & Indulgence
**Image Search Terms:**
- Ultra-luxury yacht aerial view
- Five-star resort infinity pool
- Private jet interior
- Luxury penthouse suite view
- Champagne on superyacht deck

**Recommended Sources:**
- Unsplash: `luxury yacht aerial`
- Pexels: `five star resort pool`
- Description: Opulent, exclusive, breathtaking. Maximum wow factor.

---

## 7. 🦁 Nature & Wildlife
**Image Search Terms:**
- African safari wildlife
- Whale breaching ocean surface
- Pristine rainforest landscape
- Wildlife photography elephant/lion
- Untouched natural paradise

**Recommended Sources:**
- Unsplash: `safari wildlife africa`
- Pexels: `whale watching ocean`
- Description: Raw, majestic, awe-inspiring. Nature in its glory.

---

## 8. 🌊 Water Sports & Marine
**Image Search Terms:**
- Diving in crystal clear water
- Kitesurfing or windsurfing action
- Snorkeling coral reef
- Jet skiing turquoise water
- Sailing yacht in action

**Recommended Sources:**
- Unsplash: `diving crystal water`
- Pexels: `water sports turquoise`
- Description: Active, vibrant, refreshing. Bright blues and movement.

---

## 9. 🎨 Art & Architecture
**Image Search Terms:**
- Modern art museum interior
- Architectural masterpiece building
- Contemporary sculpture garden
- Design hotel architecture
- Art gallery with skylight

**Recommended Sources:**
- Unsplash: `modern architecture museum`
- Pexels: `contemporary art gallery`
- Description: Sophisticated, inspiring, elegant. Clean lines and beauty.

---

## 10. 👨‍👩‍👧‍👦 Family Luxury
**Image Search Terms:**
- Luxury family beach resort
- Multi-generational villa vacation
- Kids club luxury resort
- Family yacht charter
- Private island family getaway

**Recommended Sources:**
- Unsplash: `luxury family resort`
- Pexels: `family beach vacation luxury`
- Description: Warm, inclusive, luxurious. Multi-generational joy.

---

## 11. 🎉 Celebration & Milestones
**Image Search Terms:**
- Fireworks over luxury yacht
- Champagne celebration sunset
- Anniversary romantic setup
- Birthday luxury celebration
- Milestone celebration luxury venue

**Recommended Sources:**
- Unsplash: `celebration fireworks yacht`
- Pexels: `luxury celebration champagne`
- Description: Festive, special, memorable. Celebratory and elevated.

---

## 12. 🏝️ Solitude & Reflection
**Image Search Terms:**
- Private island aerial view
- Secluded beach hammock
- Remote luxury cabin mountain
- Solo traveler peaceful landscape
- Private villa infinity edge pool

**Recommended Sources:**
- Unsplash: `private island aerial`
- Pexels: `secluded beach solitude`
- Description: Peaceful, private, contemplative. Escape and serenity.

---

## Image Requirements

### Technical Specs:
- **Resolution:** Minimum 1920x1080 (landscape orientation)
- **Format:** JPEG or WebP for web optimization
- **License:** CC0 (Creative Commons Zero) or Unsplash License
- **Quality:** Professional photography only

### Visual Requirements:
- **Lighting:** Natural, warm tones preferred
- **Composition:** Should work with text overlay
- **Emotion:** Must instantly convey the theme feeling
- **Luxury Factor:** High-end, aspirational (not stock photo looking)

---

## Recommended Image Sources

### Free & License-Free:
1. **Unsplash.com** - Highest quality, best for luxury
2. **Pexels.com** - Good variety, reliable quality
3. **Pixabay.com** - Backup option

### Pro Tips:
- Search with "luxury" modifier for better results
- Use photographer names from hotel/travel brands
- Filter by orientation: Landscape
- Check image has no watermarks or branding
- Test with text overlay before finalizing

---

## Database Field Mapping

Once you have the images, store the URLs in Neo4j:

```cypher
MATCH (t:theme_category {name: "Romance & Intimacy"})
SET t.image_url = "https://images.unsplash.com/photo-xxxxxxx",
    t.icon = "💕",
    t.short_description = "Where every moment is designed for connection"
```

---

## Current Status

✅ **Documentation:** Complete  
⏳ **Images:** Need to be sourced  
⏳ **Neo4j Update:** Need to update database with URLs  
⏳ **Frontend UI:** Theme selection component to be built

---

**Next Steps:**
1. Source 12 high-quality images (one per theme)
2. Host on CDN or use Unsplash direct URLs
3. Update Neo4j `theme_category` nodes with `image_url` field
4. Build theme selection UI component
5. Test visual selection flow

