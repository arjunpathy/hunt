export const colors = {
  background: "#fdf7dd",
  text: "#666a73",
  primary: "#0079ff",
  primaryDark: "#0066dd",
  accent: "#fece00",
  accentDark: "#f5b300",
  secondaryText: "#000",
  danger: "#ff6b6b",
  border: "#444444",
  overlay: "rgba(0, 121, 255, 0.1)",
};

export const getHoverStyles = (baseColor, hoverColor) => ({
  onMouseEnter: (e) => (e.currentTarget.style.backgroundColor = hoverColor),
  onMouseLeave: (e) => (e.currentTarget.style.backgroundColor = baseColor),
});
