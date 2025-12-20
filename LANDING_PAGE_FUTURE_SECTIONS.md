# 📄 LEXA Landing Page - Future Sections

## ✅ Current Sections (Completed):
1. ✅ Logo with BETA badge (positioned on logo)
2. ✅ What is LEXA (Luxury Experience Assistant - Emotional Intelligence for Luxury Travel)
3. ✅ Value Proposition ("I anticipate and design the feeling...")
4. ✅ Benefits description
5. ✅ Promise ("90 seconds and three questions")
6. ✅ CTA Buttons (Begin Your Journey / Welcome Back)
7. ✅ Features Grid (Perceptive, Anticipatory, Precise)

---

## 🚧 Sections to Add (Once Content is Ready):

### 1. **Latest Experience Scripts** (After CTA buttons)
**Purpose:** Showcase recent AI-generated experience scripts, build trust, drive to marketplace

**Design:**
```
┌─────────────────────────────────────────────────┐
│  Featured Experiences                           │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ Card │  │ Card │  │ Card │  │ Card │       │
│  │  1   │  │  2   │  │  3   │  │  4   │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
│         [View All in Marketplace →]             │
└─────────────────────────────────────────────────┘
```

**Each Card:**
- Destination image (background)
- Theme name overlay
- Price range
- "View Details →" button
- Link to marketplace (once created)

**Sample Code:**
```tsx
{/* Latest Experience Scripts */}
<div className="max-w-6xl mx-auto mb-20">
  <h2 className="text-3xl font-bold text-white mb-4">Featured Experiences</h2>
  <p className="text-zinc-400 mb-8">Recently crafted by LEXA for travelers like you</p>
  
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    {/* Loop through 4 latest scripts */}
    {latestScripts.map(script => (
      <Link href={`/marketplace/${script.id}`} key={script.id}>
        <div className="group relative overflow-hidden rounded-2xl aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 hover:border-lexa-gold transition-all">
          <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"
               style={{backgroundImage: `url(${script.image})`}} />
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <h3 className="text-xl font-bold text-white mb-2">{script.theme}</h3>
            <p className="text-sm text-zinc-300 mb-2">{script.destination}</p>
            <p className="text-lexa-gold font-semibold">{script.priceRange}</p>
          </div>
        </div>
      </Link>
    ))}
  </div>
  
  <div className="text-center mt-8">
    <Link href="/marketplace" className="inline-flex items-center gap-2 text-lexa-gold hover:text-white transition-colors">
      View All Experiences <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
</div>
```

---

### 2. **Latest Blog Posts** (After scripts section)
**Purpose:** Share knowledge, SEO, establish authority

**Design:**
```
┌─────────────────────────────────────────────────┐
│  Luxury Travel Insights                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Post     │  │ Post     │  │ Post     │     │
│  │  1       │  │  2       │  │  3       │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐                                   │
│  │ Post 4   │         [View All Articles →]    │
│  └──────────┘                                   │
└─────────────────────────────────────────────────┘
```

**Each Post:**
- Featured image
- Category tag
- Title
- Excerpt (2-3 lines)
- "Read More →" button
- Publication date

**Sample Code:**
```tsx
{/* Latest Blog Posts */}
<div className="max-w-6xl mx-auto mb-20">
  <h2 className="text-3xl font-bold text-white mb-4">Luxury Travel Insights</h2>
  <p className="text-zinc-400 mb-8">Expert perspectives on emotional travel design</p>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {latestPosts.map(post => (
      <Link href={`/blog/${post.slug}`} key={post.id}>
        <article className="group rounded-2xl bg-white/5 border border-white/10 hover:border-lexa-gold transition-all overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-zinc-700 to-zinc-900 overflow-hidden">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="p-6">
            <span className="text-xs text-lexa-gold uppercase tracking-wider">{post.category}</span>
            <h3 className="text-lg font-bold text-white mt-2 mb-2 group-hover:text-lexa-gold transition-colors">{post.title}</h3>
            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{post.excerpt}</p>
            <p className="text-xs text-zinc-500">{post.date}</p>
          </div>
        </article>
      </Link>
    ))}
  </div>
  
  <div className="text-center mt-8">
    <Link href="/blog" className="inline-flex items-center gap-2 text-lexa-gold hover:text-white transition-colors">
      View All Articles <ArrowRight className="w-4 h-4" />
    </Link>
  </div>
</div>
```

---

### 3. **Theme Categories** (After blog section)
**Purpose:** Help users discover experience types, visual inspiration

**Design:**
```
┌─────────────────────────────────────────────────┐
│  Explore Experience Themes                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │ Romantic   │  │ Culinary   │  │ Wellness   ││
│  │ Escape     │  │ Journey    │  │ Retreat    ││
│  └────────────┘  └────────────┘  └────────────┘│
│  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │ Adventure  │  │ Cultural   │  │ Pure       ││
│  │ Quest      │  │ Immersion  │  │ Indulgence ││
│  └────────────┘  └────────────┘  └────────────┘│
└─────────────────────────────────────────────────┘
```

**Each Theme Card:**
- Large hero image (full card background)
- Theme name overlay (gradient bottom)
- Icon
- Short description
- "Explore →" button
- Click → Start experience builder with this theme pre-selected

**Sample Code:**
```tsx
{/* Theme Categories */}
<div className="max-w-6xl mx-auto mb-20">
  <h2 className="text-3xl font-bold text-white mb-4 text-center">Explore Experience Themes</h2>
  <p className="text-zinc-400 mb-12 text-center max-w-2xl mx-auto">
    Each theme is designed to evoke specific emotions and create lasting memories. Choose your journey.
  </p>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {themes.map(theme => (
      <Link href={`/experience?theme=${theme.slug}`} key={theme.id}>
        <div className="group relative overflow-hidden rounded-2xl aspect-[4/5] hover:scale-105 transition-transform duration-300">
          {/* Background Image */}
          <div className="absolute inset-0 bg-cover bg-center"
               style={{backgroundImage: `url(${theme.image})`}} />
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />
          
          {/* Content */}
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <div className="text-5xl mb-4">{theme.icon}</div>
            <h3 className="text-2xl font-bold text-white mb-2">{theme.name}</h3>
            <p className="text-sm text-zinc-300 mb-4">{theme.description}</p>
            <span className="inline-flex items-center gap-2 text-lexa-gold font-semibold group-hover:gap-3 transition-all">
              Explore <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    ))}
  </div>
</div>
```

**Sample Theme Data:**
```typescript
const themes = [
  {
    id: 1,
    name: "Romantic Escape",
    slug: "romantic-escape",
    icon: "💕",
    description: "Intimate moments and deep connection in breathtaking settings",
    image: "/images/themes/romantic.jpg"
  },
  {
    id: 2,
    name: "Culinary Journey",
    slug: "culinary-journey",
    icon: "🍽️",
    description: "Michelin-starred dining and wine experiences that tell a story",
    image: "/images/themes/culinary.jpg"
  },
  // ... more themes
];
```

---

## 📐 Layout Order:

```
1. Logo with BETA
2. What is LEXA
3. Value Proposition
4. Benefits
5. Promise
6. CTA Buttons ← Current end

--- ADD BELOW ---

7. Latest Experience Scripts (4 cards + marketplace link)
8. Latest Blog Posts (4 cards + blog link)
9. Theme Categories (6 cards, full-width images)
10. Footer (powered by Claude & Neo4j)
```

---

## 🎨 Design Notes:

1. **Spacing:** Add `mb-20` between each major section
2. **Max Width:** Use `max-w-6xl` for wider sections (scripts, themes)
3. **Cards:** All hover effects should include:
   - Border color change to gold
   - Subtle scale or transform
   - Smooth transitions (300ms)
4. **Images:** Use aspect ratios:
   - Experience Scripts: `aspect-[3/4]` (portrait)
   - Blog Posts: `aspect-video` (landscape)
   - Themes: `aspect-[4/5]` (tall portrait)

---

## 🔄 When to Add These Sections:

### **Phase 1 (Now - MVP):**
- ✅ All current sections complete
- Focus on testing core user flow

### **Phase 2 (After User Feedback):**
- Add Theme Categories (static data first)
- Link themes to experience builder

### **Phase 3 (After Content Creation):**
- Add Latest Experience Scripts (from database)
- Create marketplace page

### **Phase 4 (Blog Launch):**
- Add Latest Blog Posts
- Create blog CMS or integrate Medium/Ghost

---

## 💡 Quick Win Ideas:

1. **Testimonials Section** (before themes)
   - 3-4 early user quotes
   - Photos optional
   - Rotating carousel

2. **Social Proof**
   - "Join 1,247 travelers who've found their perfect experience"
   - Email capture form

3. **Press Mentions** (if any)
   - Logos of publications
   - "As featured in..."

---

**All placeholder sections are marked with `{/* TODO: ... */}` in the code!**

**Ready to add when content is created! 🚀**

