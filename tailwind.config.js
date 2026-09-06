/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mcp: '#3b82f6',
        skills: '#a855f7',
        agents: '#22c55e',
        memory: '#f59e0b'
      }
    }
  },
  plugins: []
};
