const tintColorLight = '#6366f1'; // Indigo-500
const tintColorDark = '#818cf8';  // Indigo-400

export const Colors = {
  link: '#3b82f6',
  light: {
    text: '#0f172a',          // Slate-900
    background: '#f8fafc',    // Slate-50
    tint: tintColorLight,
    tabIconDefault: '#94a3b8', // Slate-400
    tabIconSelected: tintColorLight,
    card: '#ffffff',          // Card background
    border: '#e2e8f0',        // Slate-200
  },
  dark: {
    text: '#f8fafc',          // Slate-50
    background: '#09090b',    // Zinc-950
    tint: tintColorDark,
    tabIconDefault: '#71717a', // Zinc-500
    tabIconSelected: tintColorDark,
    card: '#18181b',          // Zinc-900
    border: '#27272a',        // Zinc-800
  },
};

export default Colors;
