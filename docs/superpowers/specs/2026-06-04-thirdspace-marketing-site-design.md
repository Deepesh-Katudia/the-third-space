# The Third Space — Pre-Launch Marketing Site Design Spec

**Date:** 2026-06-04
**Project:** Your Third Space LLC — pre-launch marketing and waitlist page
**Founder:** Samantha Aleman
**Competition context:** PowerUP 2026 Business Plan Competition (Brooklyn Public Library, $20K prize)

---

## 1. Purpose

A mobile-first, single-page marketing website that:
1. Explains what The Third Space is and why it exists
2. Captures email waitlist signups persisted to Firebase Firestore
3. Pitches venue partners to contact Samantha directly
4. Serves as a live demo for PowerUP judges and early investors

This is **not** the app itself — it is the pre-launch presence.

---

## 2. Tech Stack

| Concern | Tool |
|---|---|
| Framework | React 18 + Vite (`--template react`) |
| Styling | Tailwind CSS with custom theme extension |
| Animations | Framer Motion (scroll-triggered + hover + floating phone) |
| Backend | Firebase Firestore (waitlist email capture only) |
| Fonts | Google Fonts — DM Serif Display + DM Sans |
| Icons | Emoji only (no icon library) |
| Hosting | Vercel (free tier, auto-deploy from GitHub) |
| Routing | None — single-page scroll site, no client-side router |

**Dependencies:**
```
react, react-dom
framer-motion
firebase
tailwindcss, postcss, autoprefixer
```

**No** `react-router-dom` — all navigation is anchor-scroll within a single page.

---

## 3. Color Palette

All values registered as Tailwind theme extensions. Note: camelCase keys become kebab-case in class utilities — e.g. `warmWhite` is used as `bg-warm-white`, `softOrange` as `text-soft-orange`.

```js
// tailwind.config.js — colors
cream:        '#FBF7F2'  // page background
warmWhite:    '#FFF9F4'  // card backgrounds
terracotta:   '#C4614A'  // primary CTA, accents
softOrange:   '#E8855F'  // gradient partner, hover states
deepBrown:    '#2C1810'  // headings, dark section backgrounds
midBrown:     '#6B3F2A'  // body text, secondary headings
lightBrown:   '#A0673A'  // tertiary accents
sage:         '#7A8C6E'  // step 02 accent
blush:        '#F2C5A0'  // blob backgrounds, soft highlights
warmGray:     '#8C7B70'  // body text on light backgrounds
```

**Gradients (CSS variables in `index.css`):**
```css
--primary-gradient: linear-gradient(135deg, #C4614A, #E8855F);
```

---

## 4. Typography

```js
// tailwind.config.js — fontFamily
serif:  ['DM Serif Display', 'Georgia', 'serif']
sans:   ['DM Sans', 'system-ui', 'sans-serif']
```

**Loaded via Google Fonts in `index.html`:**
```
https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap
```

**Rules:**
- All headings: `font-serif`, tight letter-spacing (`-0.04em` to `-0.06em`)
- Each headline has exactly one italic word: `<em>` or `italic` class on that word, terracotta color
- All body copy: `font-sans font-light` (300 weight), `text-warmGray`, `leading-relaxed` (1.65)
- Section labels above headlines: `text-[11px] tracking-[0.08em] uppercase text-terracotta` inside a pill badge

---

## 5. File Structure

```
thirdspace-web/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── WhySection.jsx
│   │   ├── HowItWorks.jsx
│   │   ├── ForVenues.jsx
│   │   ├── WaitlistForm.jsx
│   │   └── Footer.jsx
│   ├── firebase/
│   │   └── config.js
│   ├── hooks/
│   │   └── useScrollShadow.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env                  ← Firebase keys (never commit)
├── .env.example          ← empty keys template (safe to commit)
├── .gitignore
├── index.html            ← SEO + OG meta tags + Google Fonts
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 6. Global Visual Atmosphere

Applied once in `App.jsx` and `index.css`:

**Grain texture overlay:**
- Fixed `<div>`, `z-index: 50`, `pointer-events: none`, `opacity: 0.03`
- SVG `feTurbulence` noise filter applied as background-image
- Covers the entire viewport at all times

**Blob decorations:**
- Absolute-positioned `<div>`s with asymmetric `border-radius` (e.g. `60% 40% 70% 30% / 50% 60% 40% 50%`)
- Colors: blush (`#F2C5A0`) and soft-orange (`#E8855F`)
- `opacity: 0.15–0.20`, `filter: blur(60–80px)`
- Placed in Hero and Waitlist sections

**No images anywhere** — all decorative elements are pure CSS/SVG.

---

## 7. Framer Motion Animation Pattern

Used consistently across all sections:

```jsx
// Fade-up on scroll into view
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
/>

// Stagger container
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

// Button hover
<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} />

// Card hover
<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }} />

// Phone floating loop
<motion.div
  animate={{ y: [0, -8, 0] }}
  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
/>
```

All animations are slow and warm — no jarring or fast motion.

---

## 8. SEO & Open Graph (`index.html`)

Static meta tags hardcoded in `index.html`:

```html
<!-- Primary -->
<title>The Third Space — Find Your People in NYC</title>
<meta name="description" content="Join real, interest-based gatherings at local NYC venues. ID-verified profiles. Genuine community. Launching in Brooklyn & Manhattan." />

<!-- Open Graph -->
<meta property="og:title" content="The Third Space — Find Your People in NYC" />
<meta property="og:description" content="Real gatherings. Real people. Real community in Brooklyn & Manhattan." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://thethirdspace.nyc" />  <!-- PLACEHOLDER: update to real Vercel URL before launch -->
<meta property="og:image" content="/og-image.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="The Third Space — Find Your People in NYC" />
<meta name="twitter:description" content="Real gatherings. Real people. Real community in Brooklyn & Manhattan." />
<meta name="twitter:image" content="/og-image.png" />
```

OG image (`public/og-image.png`): 1200×630, terracotta gradient background with white wordmark — generated as a static file (no server-side rendering needed).

---

## 9. Component Specifications

### 9.1 Navbar

- Sticky top, `backdrop-blur-md`, `bg-cream/80`
- `useScrollShadow` hook: adds `shadow-sm` when `scrollY > 10`
- **Desktop:** Logo (terracotta circle "T" + "The Third Space") | Why | How It Works | For Venues | [Join Waitlist] pill button
- **Mobile:** Logo only on left + [Join Waitlist] pill button on right (nav links hidden)
- "Join Waitlist" scrolls to `#waitlist` anchor

### 9.2 Hero

- **Desktop layout (Option A):** 2-column grid — text left, phone mockup right
- **Mobile layout:** text stacked above phone
- **Headline:** `"Find your people. In` *`real life.`* `In NYC."` — "real life." in italic terracotta
- **Subheadline:** DM Sans 300, warm-gray, max-width ~520px
- **CTAs:**
  - Primary: terracotta gradient pill → scrolls to `#waitlist`
  - Secondary: ghost pill outline → scrolls to `#how-it-works`
- **Phone mockup** (pure CSS divs):
  - Dark shell: `deep-brown` gradient, `border-radius: 28px`, subtle box-shadow
  - Screen: cream background, 3 event cards (Ceramics Night, Rooftop Social, Book Club)
  - Each card: event name, venue name, category tag pill, 3 blurred profile circles
  - Framer Motion floating animation: `y: [0, -8, 0]`, 4s loop
- **Social proof row:** `1K+ Early signups | 20+ Venue partners | 5 NYC boroughs` — small, warm-gray, below CTAs
- **Blobs:** 2 large blurred circles (blush + soft-orange), absolute positioned, `opacity: 0.15`

### 9.3 Why Section

- Background: `deep-brown` (`#2C1810`), light text throughout
- **Headline:** `"NYC has 8 million people. You're still` *`eating alone.`*`"` — "eating alone." italic blush
- **Body paragraph:** loneliness framing, Surgeon General reference
- **Stats row:** 3 cards, warm-white text on slightly lighter dark surface
  - "58%" — NYC adults feeling lonely (U.S. Surgeon General, 2023)
  - "#1" — Loneliest major US city (Cigna Loneliness Index)
  - "3 in 4" — Gen Z & Millennials burned out on dating apps (Bumble research)
- **Competitor failure list:** ✕ Meetup / ✕ Bumble BFF / ✕ Eventbrite / ✕ Timeleft — with one-line explanations
- Framer Motion fade-up on each element as it enters viewport

### 9.4 How It Works

- Background: `cream`
- **Headline:** `"Built` *`different.`* `Actually works."` — "different." italic terracotta
- **3 step cards** (vertical on mobile, horizontal row on desktop):
  - Step 01 — "Create your verified profile" — accent: terracotta — icon: 🛡️
  - Step 02 — "Find events with your people" — accent: sage — icon: 📍
  - Step 03 — "Connect before, during & after" — accent: light-brown — icon: 💬
  - Each card: step number label, icon, title, body paragraph
  - `border-radius: 24px`, hover: `y: -2` via Framer
- **Feature pills row** (4 pills, staggered entrance):
  🛡️ ID verified profiles | 👥 See who's going first | 💬 Pre-event messaging | 🏆 Points & rewards

### 9.5 For Venues

- Background: gradient `#F5EDE4 → #EDD9C8` (left to right)
- **Headline:** `"Fill your space.` *`Build your community.`*`"` — "Build your community." italic mid-brown
- **Body:** pitch paragraph about verified, interest-matched attendees
- **4 benefit cards** (2×2 grid on desktop, stacked on mobile):
  - 🎁 First 2 events free
  - 📊 Real analytics
  - 📢 Direct announcement channel
  - 💰 Monthly listing from $50
- **CTA:** "Partner with us →" pill button → `mailto:macusamantha@gmail.com?subject=Venue Partner Inquiry`

### 9.6 Waitlist Form (`WaitlistForm.jsx`)

- Background: `deep-brown`
- **Headline:** `"Be the first.` *`Your city is waiting.`*`"` — "Your city is waiting." italic blush
- **Body:** launch boroughs + founding member perks pitch
- **Form layout:** email input + button inline on desktop, stacked on mobile
- **Validation:** basic email format check before Firestore write
- **On submit:**
  ```js
  addDoc(collection(db, 'waitlist'), {
    email,
    timestamp: serverTimestamp(),
    source: 'marketing-site'
  })
  ```
- **States:**
  - Default: input + button
  - Loading: button shows spinner, disabled
  - Success: `"🎉 You're on the list!"` warm success message replaces form
  - Error: `"Something went wrong. Try again."` in soft-orange below form
- **Duplicate handling:** Firestore allows duplicates; form shows success regardless (no pre-check query — keeps it simple)
- **Feature checklist:** 2-column grid — ✓ ID-verified profiles / ✓ Interest-based events / ✓ See who's going first / ✓ Pre-event messaging / ✓ Real group chats / ✓ Points & rewards
- **Micro-copy:** "No spam. No selling your email. Just launch updates and event invites."

### 9.7 Footer

- Background: `deep-brown`
- Logo (small version) + tagline: "Brooklyn & Manhattan · Launching 2026 · Founded by Samantha Aleman"
- Links: Instagram | TikTok | Contact | For Venues
- Copyright: `© 2026 Your Third Space LLC · All rights reserved · NYC`

---

## 10. Firebase Configuration

```js
// src/firebase/config.js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export default app
```

**Prerequisite:** Samantha must create a Firebase project and copy credentials into `.env` before the waitlist form will work. The app renders and looks correct without credentials — only form submission fails.

---

## 11. Custom Hook

```js
// src/hooks/useScrollShadow.js
// Returns true when window.scrollY > threshold (default: 10px)
// Used by Navbar to add shadow class on scroll
```

---

## 12. Design Rules Summary

| Rule | Value |
|---|---|
| Mobile base width | 375px (iPhone SE) |
| Section padding (vertical) | min 80px top + bottom |
| Section padding (horizontal) | min 24px on mobile |
| Card border-radius | 24px |
| Button border-radius | 100px (pill) |
| No sharp corners | Anywhere on the page |
| Body line-height | 1.65–1.7 |
| Animation speed | Slow and warm (0.4–0.6s, ease-out-expo) |
| Images | None — pure CSS/SVG only |

---

## 13. What This Is Not

- Not a dating app — copy and positioning never implies romantic connection
- Not a generic SaaS template — warm, human, NYC-specific throughout
- Not a multi-page app — single scroll, no routing
- Not feature-complete — this is a pre-launch marketing page only

---

## 14. Prerequisites Before Launch

1. Firebase project created + credentials in `.env`
2. Vercel project connected to GitHub repo
3. Domain configured (optional for PowerUP demo)
4. OG image (`public/og-image.png`) created at 1200×630
5. Real social media URLs added to Footer links
