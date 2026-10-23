/**
 * DESIGN TOKENS
 * Official Government Ledger & Terracotta Aesthetic
 */

export const INK = "#23324A";       // Headings, authoritative text
export const PAPER = "#F1ECDF";     // Sandstone / ledger parchment background
export const CARD = "#FBF9F3";      // Elevated warm card surface
export const SEAL = "#B5651D";      // Terracotta seal / stamp accent
export const OK = "#2F5D50";        // Deep emerald for eligible / satisfied criteria
export const VERIFY = "#8A5A17";    // Warm amber for verification needed
export const NO = "#9A3B32";        // Terracotta red for exclusions / gaps
export const RULE = "#DCD5C0";      // Hairline borders

export const serif = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
export const sans = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontFamily: sans,
  fontSize: "14.5px",
  color: INK,
  background: "#FFFFFF",
  border: `1px solid ${RULE}`,
  borderRadius: "4px",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};
