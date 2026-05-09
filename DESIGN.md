# TruckBook — Design System

## Overview
Mobile-first React Native app. Two themes: dark (primary for night driving) and light. All values come from `src/constants/Themecontext.tsx`.

---

## Color Palette

### Strategy: Restrained + Semantic
One green accent (≤10% of surface), neutrals tinted warm, color reserved for meaning.

### Light Mode
| Token | Value | Role |
|---|---|---|
| `primary` | `#F7F7F5` | Screen background (warm off-white) |
| `cardBg` | `#FFFFFF` | Card surface |
| `surface` | `#EDEDEB` | Input backgrounds, list items |
| `text` | `#111111` | Primary text |
| `textSecondary` | `#6B6B6B` | Supporting text |
| `textMuted` | `#AFAFAF` | Labels, timestamps, hints |
| `border` | `#E4E4E2` | Dividers, card borders |
| `accent` | `#2ECC71` | Primary action, active state, brand |
| `income` | `#10B981` | Revenue, positive values |
| `expense` | `#EF4444` | Costs, negative values, alerts |
| `analytics` | `#6C5CE7` | Charts, reports, data |
| `warning` | `#F59E0B` | Pending states, caution |

### Dark Mode
| Token | Value | Role |
|---|---|---|
| `primary` | `#0A0A0A` | Screen background (near-black) |
| `cardBg` | `#161616` | Card surface |
| `surface` | `#1E1E1E` | Input backgrounds |
| `text` | `#F5F5F5` | Primary text |
| `textSecondary` | `#8A8A8E` | Supporting text |
| `textMuted` | `#4A4A4E` | Labels, hints |
| `border` | `#2A2A2A` | Dividers, card borders |
| `accent` | `#2ECC71` | Same green — consistent brand signal |
| `income` | `#30D158` | Brighter for dark surfaces |
| `expense` | `#FF453A` | Apple-system red |
| `analytics` | `#7C6FF0` | Lifted purple for dark |

### Vehicle Type Colors (identity palette)
| Type | Color |
|---|---|
| Estacas | `#00D9A5` |
| Volqueta | `#FFB800` |
| Furgón | `#6C5CE7` |
| Grúa | `#E94560` |
| Cisterna | `#74B9FF` |
| Planchón | `#FDCB6E` |
| Portacontenedor | `#00CEC9` |

These colors appear on the vehicle card outer bezel, icon rings, and placa badge. They are semantic identity — not decoration.

---

## Typography
System fonts only (San Francisco on iOS, Roboto on Android). No custom fonts loaded.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Screen title | 26px | 900 | -0.6 |
| Section heading | 20px | 800 | -0.3 |
| Card title | 15–16px | 700 | -0.2 |
| Body | 14–15px | 400 | 0 |
| Caption | 12–13px | 400–600 | 0 |
| Label (uppercase) | 11px | 700 | +1.4 |
| Plate (monospace) | 13px | 800 | +2.0 |

**Monospace exception**: License plate text uses `Courier New` (iOS) / `monospace` (Android) with `letterSpacing: 2`. This is the only case.

---

## Spacing Scale
Defined in `SPACING` constant:

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `lg` | 16px |
| `xl` | 20px |
| `xxl` | 24px |
| `xxxl` | 32px |

Screen horizontal padding: `20px` (`H_PAD`). Never go below this on any screen.

---

## Border Radius
Defined in `BORDER_RADIUS` constant:

| Token | Value | Usage |
|---|---|---|
| `sm` | 8px | Tags, chips, inputs |
| `md` | 12px | Small cards |
| `lg` | 16px | Standard cards |
| `xl` | 20px | Modal sheets inner |
| `xxl` | 28px | Modal sheets outer, bottom sheets |
| `full` | 9999px | Pills, circles, avatars |

---

## Elevation & Shadows

Light mode: subtle shadows tinted toward `c.text`.
Dark mode: border-based elevation (`borderWidth: 1, borderColor: c.border`).

```
getShadow(isDark, "sm") → offset 0/1, radius 2
getShadow(isDark, "md") → offset 0/2, radius 4
getShadow(isDark, "lg") → offset 0/4, radius 8
```

Never use pure `#000` for shadow color. Use `c.text` or `c.shadowColor` token.

---

## Component Patterns

### Cards — Double-Bezel
Premium cards use a two-layer system:
- **Outer shell**: tinted with vehicle/category color at `"1A"` opacity, `borderRadius: 24`, `padding: 4`
- **Inner core**: `c.cardBg`, `borderRadius: 21`, `overflow: hidden`

Standard cards: `backgroundColor: c.cardBg`, `borderRadius: 18`, shadow in light / border in dark.

### Icon Circles
All icon containers are circular (`borderRadius: 99`):
- **Outer ring**: 70px, `accentColor + "1A"` background
- **Inner core**: 52px, `accentColor + "2E"` background (Ionicons only)
- **Icon size**: capped at 52px regardless of `iconSize` prop

Vehicle card icon: outer 68px / inner 54px / icon 44px.

### Press Feedback (Emil Kowalski pattern)
All tappable cards:
```
onPressIn  → withTiming(0.95–0.98, { duration: 100 })
onPressOut → withSpring(1, { damping: 14–15, stiffness: 280–300 })
```

### Entrance Animations
Staggered fade + translateY on mount:
```
delay = Math.min(index * 55, 350)
easing = Easing.bezier(0.23, 1, 0.32, 1)   // ease-out expo
opacity: 0 → 1, duration 280ms
translateY: 12 → 0, duration 320ms
```

Header: `Animated.parallel` fade + translateY(-8 → 0) on data load.

### Opacity Suffixes (hex)
Standardized tint levels for color overlays:
| Suffix | Alpha | Usage |
|---|---|---|
| `"1A"` | 10% | Outer icon ring bg, card tint |
| `"2E"` | 18% | Inner icon core bg |
| `"40"` | 25% | Badge backgrounds |
| `"55"` | 33% | Border accents |
| `"80"` | 50% | Semi-visible elements |

### Bottom Sheets / Modals
- `borderTopLeftRadius: 28, borderTopRightRadius: 28`
- Handle: `width: 40, height: 4, borderRadius: 2, backgroundColor: c.border`
- Primary action button: `borderRadius: 99` (pill shape)
- Cancel: plain text, no border

### Section Labels
Uppercase micro-labels before content groups:
```
fontSize: 11, fontWeight: "700", letterSpacing: 1.4, color: c.textMuted
```

### License Plate Badge
```
fontFamily: Platform.select({ ios: "Courier New", android: "monospace" })
fontSize: 13, fontWeight: "800", letterSpacing: 2
backgroundColor: vehicleColor + "22", borderColor: vehicleColor + "55", borderWidth: 1
color: vehicleColor
```

---

## Motion Principles
- Easing: `Easing.bezier(0.23, 1, 0.32, 1)` (ease-out expo) for entrances
- Spring: `{ damping: 14–15, stiffness: 280–300 }` for press release
- Only animate `transform` and `opacity` — never layout properties
- Stagger: 55ms between list items, max 350ms total

---

## Anti-Patterns (banned)
- Emojis as functional UI elements
- Pure `#000` / `#fff` hardcoded — use tokens
- `border-left` colored accents on cards (side stripe)
- Gradient text (`background-clip: text`)
- Glassmorphism as decoration
- Same-size card grids with icon + heading + text repeated
- Consumer-app primary colors (red/yellow/blue triads)
- Serif fonts anywhere
