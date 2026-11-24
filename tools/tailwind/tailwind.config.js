// Fester Tailwind-Build (statt Play-CDN im Browser).
// Neu bauen nach HTML-Änderungen:  tools\tailwind\build.ps1
module.exports = {
  content: [
    "./*.html",
    "./blog/*.html",
    "./js/*.js",
    "./theme.js",
    "./tools/build_nav.py",
  ],
  theme: {
    extend: {
      colors: { bg: "#090D16", line: "#1E293B", cy: "#06B6D4", ind: "#6366F1" },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
};
