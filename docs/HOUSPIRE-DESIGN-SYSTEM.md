# Houspire Staging — Design System v2
**Philosophy:** Chrome disappears. Renders lead.

The interface is a neutral gallery wall. Interior renders are the art.
Every chrome element (controls, labels, badges, nav) should recede so the
render images command visual authority. Color is reserved for operational
signal — never decoration.

---

## 1. Core Philosophy

| Principle | Figma Source | Houspire Adaptation |
|-----------|-------------|---------------------|
| Chrome = neutral | Strict B&W | Warm parchment + black text — no decorative color in chrome |
| Content = hero | Vibrant screenshots | Room renders take maximum width, minimum chrome overhead |
| Typography hierarchy via weight | figmaSans variable | Inter variable, subtle weight stops instead of dramatic jumps |
| Pill geometry | 50px radius buttons | Primary CTAs are pill (9999px), icon buttons are circular |
| Color for signal only | Product screenshots only | Status colors exist but desaturated — operational not decorative |

---

## 2. Color Tokens

### Base (unchanged — brand-appropriate for interior design)
```
--bg:              #F4F1EC   /* warm parchment — page background */
--surface:         #FFFFFF   /* card / panel surface */
--surface-2:       #F9F7F4   /* recessed surface */
--surface-3:       #F0EDE8   /* input fills */
```

### Chrome (new — tighter B&W approach)
```
--chrome-0:        #000000   /* primary text, solid CTA bg */
--chrome-1:        #18160F   /* headings (matches --text-primary) */
--chrome-2:        #3D3A33   /* secondary labels */
--chrome-3:        #6B6760   /* tertiary / captions */
--chrome-4:        #9B9185   /* placeholders */
--chrome-5:        #C8C3BB   /* dividers */
--chrome-6:        #E5DFD7   /* borders (matches --border) */
--chrome-7:        #F0EDE8   /* subtle bg (matches --surface-3) */
```

### Status (desaturated — signal without decoration)
```
--status-ok:       #2D6A4F   /* approved / success — deep sage */
--status-ok-bg:    #EAF2ED   /* approved background */
--status-warn:     #92400E   /* warning / pending — deep amber */
--status-warn-bg:  #FDF3E7   /* warning background */
--status-error:    #7F1D1D   /* rejected / error — deep red */
--status-error-bg: #FDF0F0   /* error background */
--status-info:     #1E3A5F   /* info — deep navy */
--status-info-bg:  #EDF3FA   /* info background */
--status-neutral:  #3D3A33   /* generated / pending — charcoal */
--status-neutral-bg: #F4F1EC /* neutral background */
```

### Brand (amber — used ONLY for primary CTA and active states, nowhere else)
```
--brand:           #C4913A
--brand-light:     #FDF4E7
--brand-mid:       #D4A84B
--brand-dark:      #8B6428
```

### Sidebar (unchanged — already excellent dark chrome)
```
--sidebar-bg:      #0E0D0B
--sidebar-border:  rgba(255,255,255,0.06)
--sidebar-text:    rgba(255,255,255,0.42)
--sidebar-text-h:  rgba(255,255,255,0.88)
--sidebar-hover:   rgba(255,255,255,0.05)
--sidebar-active-bg: rgba(196,145,58,0.12)
--sidebar-active:  #D4A84B
```

---

## 3. Typography

### Font
**Inter variable** (already web-safe, supports weight axis 100–900).

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
font-feature-settings: "kern" 1, "liga" 1, "cv01" 1;
```

### Scale & Weight Stops
Inspired by Figma's philosophy of granular weight control.
Use these stops — avoid the blunt 400/500/600/700 jumps.

| Role | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| Display | 32px | 350 | 1.10 | -0.64px | Page titles (rare) |
| Section heading | 20px | 500 | 1.20 | -0.32px | Card/section titles |
| Body strong | 14px | 500 | 1.45 | -0.14px | Labels, button text |
| Body | 13px | 400 | 1.50 | -0.10px | Default body copy |
| Body light | 13px | 350 | 1.50 | -0.08px | Secondary descriptions |
| Caption | 11px | 500 | 1.30 | 0.08px | Uppercase tags (SMALL CAPS feel) |
| Micro | 10px | 500 | 1.20 | 0.16px | Tiny labels, cost figures |

### Rules
- **Negative tracking everywhere on body** — -0.08px to -0.32px
- **Positive tracking only on ALL-CAPS labels** — 0.08px to 0.16px
- **Weight 350–380 as the "regular"** — lighter than most UIs, creates air
- **Weight 500 for emphasis** — not 600, not 700 (except display)
- **No font-weight above 600** in the chrome — renders deserve the visual weight

---

## 4. Geometry

### Border Radius
```
--radius-none:   0
--radius-xs:     3px    /* inline tags */
--radius-sm:     6px    /* small inputs, chips */
--radius-md:     10px   /* cards, modals */
--radius-lg:     14px   /* panels */
--radius-pill:   9999px /* primary buttons, CTAs */
--radius-circle: 50%    /* icon buttons */
```

### Button Geometry (new philosophy)
| Type | Radius | Padding | Weight | Usage |
|------|--------|---------|--------|-------|
| Primary CTA | pill (9999px) | 10px 20px | 500 | Main actions (Generate, Approve, Save) |
| Secondary | pill (9999px) | 8px 16px | 400 | Destructive / alternate actions |
| Ghost | none | 6px 12px | 400 | Navigation, inline actions |
| Icon | circle (50%) | 8px | 400 | Toolbar icons |

### Primary Button Colors
| Variant | Background | Text | When to use |
|---------|-----------|------|-------------|
| Black | #000000 | #FFFFFF | Dominant action per screen |
| White | #FFFFFF | #000000 | On dark surfaces |
| Brand | #C4913A | #FFFFFF | ONLY for Generate (the revenue action) |
| Danger | #7F1D1D | #FFFFFF | Reject / destructive |

---

## 5. Component Patterns

### Status Badges
Replace bright Tailwind colors with the desaturated status palette.
```
approved / team_approved  → bg-[--status-ok-bg]     text-[--status-ok]
rejected                  → bg-[--status-error-bg]   text-[--status-error]
generated / pending       → bg-[--status-neutral-bg] text-[--status-neutral]
client_approved           → bg-[--chrome-0]          text-white
```

Geometry: `radius-xs` (3px), padding `2px 8px`, `font-size: 10px`, `font-weight: 500`, `letter-spacing: 0.12px`, ALL-CAPS.

### Cards
```
background:     var(--surface)            /* white */
border:         1px solid var(--chrome-6) /* #E5DFD7 — very subtle */
border-radius:  var(--radius-md)          /* 10px */
shadow:         none at rest              /* elevation only on hover */
shadow hover:   0 4px 16px rgba(24,22,15,0.06) 0 1px 3px rgba(24,22,15,0.04)
```

### Render Cards (special treatment)
Renders are the product. Their cards get maximum elevation.
```
border-radius:  var(--radius-md)  /* 10px */
overflow:       hidden
image:          object-cover, fills entire card
overlay:        black/0 at rest → black/25 on hover (reveal action buttons)
action buttons: white pill buttons floating in overlay bottom-left
```

### Input / Textarea
```
background:    var(--surface-3)    /* #F0EDE8 — warm fill */
border:        1px solid var(--chrome-6)
border-radius: var(--radius-sm)    /* 6px */
padding:       8px 12px
font-size:     13px, weight 400
focus:         border-color: var(--brand), box-shadow: 0 0 0 3px var(--brand-glow)
```

### Section Labels (Figma mono feel without figmaMono)
```
font-size:        10px
font-weight:      600
letter-spacing:   0.6px
text-transform:   uppercase
color:            var(--chrome-4)   /* #9B9185 */
```

---

## 6. Layout Principles

### Pass Pages — Render First
The render gallery deserves **at least 60%** of the horizontal space.
Controls are support, not co-stars.

```
Desktop (≥1024px):  left panel 280px fixed width | right gallery: flex-1
Mobile (<1024px):   stacked — gallery first (swapped from current order)
```

Left panel: `position: sticky; top: topbar-height; max-height: calc(100vh - topbar-height); overflow-y: auto`
No max-width constraint — flex-1 gives renders room to breathe.

### Spacing Scale (8px base)
```
2px  — micro gaps (badge padding-y)
4px  — tight gaps (icon + label)
6px  — compact (inline row gaps)
8px  — base unit
12px — section within a card
16px — card padding
20px — between cards
24px — section break
32px — major section
```

### Whitespace Philosophy
- Sections breathe. Don't stack cards edge-to-edge — 20px between.
- Render images have NO internal padding in their container. Edge-to-edge.
- Text in cards: 16px padding, not 12px. Labels need room.

---

## 7. Motion

```
--ease:         cubic-bezier(0.2, 0, 0, 1)    /* standard */
--ease-spring:  cubic-bezier(0.34,1.56,0.64,1) /* spring — use sparingly */

Hover state transitions: 120ms --ease
Focus rings: 100ms --ease
Modal/drawer: 200ms --ease
Page transitions: 150ms --ease
```

No spinning loaders on buttons — use a slim progress bar or pulse on the element.

---

## 8. Implementation Priority

### Phase 1 — Foundation (globals.css + tailwind.config)
Update CSS variables. Zero visual change but prepares all tokens.

### Phase 2 — Chrome Typography
`letter-spacing`, `font-weight` tuning across layout components.
Bodies at 350, captions at 500 uppercase with positive tracking.

### Phase 3 — Buttons
All primary CTAs → pill geometry, black/brand fill.
Secondary actions → ghost style.

### Phase 4 — Status Badges
All `bg-emerald-*`, `bg-red-*`, `bg-amber-*` status chips →
desaturated semantic palette.

### Phase 5 — Pass Page Layout
Render gallery → flex-1 (more width).
Left panel → fixed 280px.
Gallery images → edge-to-edge in cards.

### Phase 6 — Cards & Borders
Reduce border noise: from `border-stone-200` everywhere →
subtle `var(--chrome-6)` only on outer containers.
Inner sections use background contrast, not borders.

---

## 9. Anti-Patterns (What Not to Do)

- ❌ `bg-emerald-100 text-emerald-700` for status — use desaturated semantic vars
- ❌ `bg-stone-900 text-white` rounded-xl for primary buttons — use pill geometry
- ❌ Nested border on border (card inside card with both having borders)
- ❌ `font-weight: 700` in body copy — maximum 500 in chrome
- ❌ `text-stone-400` for important labels — use `--chrome-3` (#6B6760) minimum
- ❌ `space-y-2` between every element — let sections breathe at 16-20px
- ❌ Color for decoration — amber/brand only on Generate button and active nav state
