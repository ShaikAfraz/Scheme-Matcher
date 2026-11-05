/**
 * DESIGN TOKENS
 * Modern Indian Government-Style Citizen Services Portal Design System
 * Inspired by MyScheme, India.gov.in, Digital India, and GIGW 2.0 Guidelines.
 *
 * Scheme Matcher is an independent civic-tech project.
 */

// 1. Core Color Palette
export const GOVT_NAVY = "#0F2E5A";        // Official Deep Indian Navy (Masthead, Primary actions)
export const GOVT_NAVY_DARK = "#091D3B";   // Deepest navy for header bars & text emphasis
export const GOVT_NAVY_LIGHT = "#1E427B";  // Secondary navy tint
export const GOVT_BLUE_TINT = "#EFF6FF";   // Very subtle blue tint for active tabs/cards

export const SAFFRON = "#E06714";          // Indian Saffron / Warm Orange (Accent, CTAs, Highlights)
export const SAFFRON_HOVER = "#C55309";    // Saffron hover state
export const SAFFRON_LIGHT = "#FFF7ED";    // Warm saffron background tint

export const INK = "#0F172A";              // Primary high-contrast text (Slate 900)
export const INK_MUTED = "#475569";        // Secondary readable text (Slate 600, WCAG AAA compliant)
export const INK_LIGHT = "#64748B";        // Tertiary / meta captions (Slate 500)

export const PAPER = "#F8FAFC";            // Clean, professional portal background (Slate 50)
export const CARD = "#FFFFFF";             // Pure white card surface
export const SURFACE_MUTED = "#F1F5F9";    // Subdued neutral section background (Slate 100)

// Backward compatibility with legacy tokens
export const SEAL = SAFFRON;
export const SEAL_HOVER = SAFFRON_HOVER;
export const SEAL_LIGHT = SAFFRON_LIGHT;

// 2. Semantic Status Colors (GIGW & WCAG AA Accessible)
export const OK = "#15803D";               // Success Green (Emerald 700)
export const OK_BG = "#DCFCE7";            // Success Green Background (Emerald 100)
export const OK_BORDER = "#86EFAC";        // Success Border

export const VERIFY = "#B45309";           // Warning / Attention Needed Amber (Amber 700)
export const VERIFY_BG = "#FEF3C7";        // Warning Amber Background (Amber 100)
export const VERIFY_BORDER = "#FCD34D";    // Warning Border

export const NO = "#B91C1C";               // Error / Unmet Crimson (Red 700)
export const NO_BG = "#FEE2E2";            // Error Background (Red 100)
export const NO_BORDER = "#FCA5A5";        // Error Border

// 3. Borders & Dividers
export const RULE = "#E2E8F0";             // Clean slate border (Slate 200)
export const RULE_LIGHT = "#F1F5F9";       // Ultra-soft inner divider (Slate 100)
export const RULE_STRONG = "#CBD5E1";      // Prominent input border (Slate 300)

// 4. Typography
export const sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', sans-serif";
export const serif = "'Lora', 'Noto Serif', Georgia, serif";

// 5. Shadows & Elevations
export const SHADOW_SM = "0 1px 2px 0 rgba(15, 23, 42, 0.05)";
export const SHADOW_MD = "0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)";
export const SHADOW_LG = "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)";
export const SHADOW_CARD_HOVER = "0 8px 24px rgba(15, 46, 90, 0.12)";

// 6. Common Accessible Form & Input Styles
export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 14px",
  fontFamily: sans,
  fontSize: "14px",
  color: INK,
  background: "#FFFFFF",
  border: `1px solid ${RULE_STRONG}`,
  borderRadius: "6px",
  outline: "none",
  transition: "border-color 0.18s ease, box-shadow 0.18s ease",
};
