/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#07090f',
        surface: '#0d1117',
        elevated: '#111827',
        border: '#1c2333',
        text: '#d4daf0',
        'text-sub': '#8899bb',
        'text-muted': '#3d4f72',
        signal: '#00ff88',
        prediction: '#4f8ef7',
        alert: '#ef4444',
        qrs: '#fbbf24',
        'model-lstm': '#c084fc',
        'model-gru': '#22d3ee',
        'model-cnngru': '#4ade80',
        'model-base': '#64748b',
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", 'sans-serif'],
        section: ["'Syne'", 'sans-serif'],
        data: ["'DM Mono'", 'monospace'],
        body: ["'Instrument Sans'", 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
}
