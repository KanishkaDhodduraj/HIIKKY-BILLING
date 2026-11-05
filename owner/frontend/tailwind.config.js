/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { navy: '#1f3248', brand: { 50: '#f4f3ff', 100: '#e8e6ff', 200: '#d5d0ff', 400: '#9277ff', 500: '#6846ee', 600: '#4e2bdc', 700: '#3c22b7' }, ink: '#17223b', muted: '#68738a', surface: '#ffffff', canvas: '#f6f7fb', line: '#e2e6f0', success: '#17a66a', warning: '#e5a600', danger: '#e34752' },
    fontFamily: { sans: ['Inter', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'], display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    boxShadow: { soft: '0 3px 12px rgba(30,43,73,.07)', card: '0 6px 18px rgba(30,43,73,.08)' },
    borderRadius: { '4xl': '1.75rem' },
  } }, plugins: [],
};
