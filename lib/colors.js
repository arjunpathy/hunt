// Color Palette - Update colors here to change throughout the entire app
export const colors = {
  // Base colors
  background: "#fdf7dd",
  text: "#666a73",

  // Primary brand colors
  primary: "#0079ff",
  primaryDark: "#0066dd",
  accent: "#fece00",
  accentDark: "#f5b300",

  // Secondary colors
  secondaryText: "#000",
  tertiaryText: "#666666",
  infoText: "#99ccff",
  danger: "#ff6b6b",
  border: "#444444",

  // Transparent variants (for overlays and backgrounds)
  primaryLight: "rgba(0, 121, 255, 0.05)",
  primaryLighter: "rgba(0, 121, 255, 0.08)",
  primaryLightest: "rgba(0, 121, 255, 0.1)",
  primaryWash: "rgba(0, 121, 255, 0.15)",
  primarySubtle: "rgba(0, 121, 255, 0.06)",

  accentLight: "rgba(254, 206, 0, 0.08)",
  accentLighter: "rgba(254, 206, 0, 0.15)",
  accentWash: "rgba(254, 206, 0, 0.2)",
  accentMedium: "rgba(254, 206, 0, 0.25)",
  accentDarker: "rgba(254, 206, 0, 0.35)",
  accentBorder: "rgba(254, 206, 0, 0.3)",

  primaryBorder: "rgba(0, 121, 255, 0.2)",

  // Special overlays
  darkOverlay: "rgba(0, 0, 0, 0.5)",
  darkOverlayLight: "rgba(24, 24, 24, 0.85)",
  blueOverlay: "rgba(0, 121, 255, 0.15)",
  blueOverlayLight: "rgba(0, 121, 255, 0.3)",
};

// Helper function to apply hover effects on elements
export const getHoverStyles = (baseColor, hoverColor) => ({
  onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = hoverColor),
  onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = baseColor),
});
