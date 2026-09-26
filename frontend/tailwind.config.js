/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        ui:      ['Sora', 'system-ui', 'sans-serif'],
        sans:    ['Sora', 'system-ui', 'sans-serif'], // override default sans
      },
      colors: {
        // Base surfaces
        base:    '#F8F7F4',
        surface: '#FFFFFF',
        recessed:'#F0EFE9',

        // Ink
        ink: {
          DEFAULT: '#141413',
          2: '#3D3C39',
          3: '#6B6A65',
          4: '#9B9A93',
        },

        // Signal system
        signal: {
          red:        '#D93B2B',
          'red-dim':  '#FBE9E7',
          green:      '#1A7F4E',
          'green-dim':'#E5F5EC',
          amber:      '#C4780A',
          'amber-dim':'#FEF3DC',
          blue:       '#1854B4',
          'blue-dim': '#E6EEFB',
        },

        // Border
        border: {
          DEFAULT: '#E5E3DC',
          strong:  '#CBC9C0',
        },
      },
      borderRadius: {
        none:  '0',
        sm:    '3px',
        DEFAULT:'6px',
        md:    '6px',
        lg:    '10px',
        xl:    '16px',
        '2xl': '20px',
        full:  '9999px',
      },
      boxShadow: {
        card:     '0 1px 3px rgba(20,20,19,0.07), 0 0 0 1px rgba(20,20,19,0.05)',
        hover:    '0 4px 16px rgba(20,20,19,0.10), 0 0 0 1px rgba(20,20,19,0.07)',
        elevated: '0 8px 32px rgba(20,20,19,0.12)',
        input:    '0 0 0 2px rgba(217,59,43,0.15)',
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },
    },
  },
  plugins: [],
}