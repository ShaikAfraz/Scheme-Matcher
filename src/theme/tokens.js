/**
 * DESIGN TOKENS
 * Professional Indian Civic-Tech Design System
 * Sandstone, Warm Ivory, Terracotta Accent, and Deep Slate Navy
 */

export const INK = "#162032";          // Primary text & headings (deep navy slate)
export const INK_MUTED = "#475569";    // Secondary text (slate gray, accessible contrast)
export const INK_LIGHT = "#64748B";    // Tertiary / caption text

export const PAPER = "#F8F6F0";        // Natural sandstone warm page background
export const CARD = "#FFFFFF";         // Clean elevated content surface
export const SURFACE_MUTED = "#F2EFE8";// Subdued toolbar / table header background

export const SEAL = "#A35619";         // Terracotta civic accent (buttons, primary links)
export const SEAL_HOVER = "#8A440F";   // Hover state for primary buttons
export const SEAL_LIGHT = "#FDF6EC";   // Subtle terracotta tint for highlights

export const OK = "#1B5E3C";           // Deep forest green for verified / satisfied criteria
export const OK_BG = "#EDF7ED";        // Soft green background
export const VERIFY = "#854D0E";       // Warm amber for action needed
export const VERIFY_BG = "#FEF9C3";    // Soft amber background
export const NO = "#991B1B";           // Deep crimson for unmet requirements
export const NO_BG = "#FEE2E2";        // Soft crimson background

export const RULE = "#DCD5C4";         // Crisp hairline border
export const RULE_LIGHT = "#EAE4D6";   // Soft inner divider

export const serif = "'Cinzel', Georgia, 'Times New Roman', serif";
export const sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  fontFamily: sans,
  fontSize: "14px",
  color: INK,
  background: "#FFFFFF",
  border: `1px solid ${RULE}`,
  borderRadius: "4px",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

