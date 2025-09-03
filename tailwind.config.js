/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['var(--font-roboto)', 'sans-serif'],
          roboto: ['var(--font-roboto)', 'sans-serif'],
        },
        colors: {
          // Stoic Onyx
          onyx: {
            100: '#181a1a',
            90: '#353839',
            80: '#555950',
            70: '#777d7f',
            60: '#9b9a5a',
            50: '#c0c9cc',
            40: '#eef0f1',
            30: '#bab8be',
            20: '#d7d8d9',
            10: '#f3f3f4',
          },
          // Anatomical Parchment
          ap: {
            100: '#17150F',
            90: '#363228',
            80: '#585342',
            70: '#7D765F',
            60: '#A49A7E',
            50: '#CCC19E',
            40: '#F1E9D2',
            30: '#F4EEDD',
            20: '#F6F1E2',
            10: '#F6F1E3',
          },
          // Bioluminescent Green
          green: {
            100: '#011500',
            90: '#033400',
            80: '#085900',
            70: '#118000',
            60: '#1AAA00',
            50: '#23D600',
            40: '#64FF58',
            30: '#99FF82',
            20: '#99FF93',
            10: '#D9FF97',
          },
          // Endurance Red
          red: {
            100: '#3F0202',
            90: '#780606',
            80: '#B60E0E',
            70: '#F81818',
            60: '#FC7C7C',
            50: '#FDB9B9',
            40: '#FEEEDD',
            30: '#FEF1F1',
            20: '#FFF3F3',
            10: '#FFFFF9',
          },
          // Live Blue
          blue: {
            100: '#172554',
            90: '#1E3A8A',
            80: '#1E40AF',
            70: '#1D4ED8',
            60: '#2563EB',
            50: '#3B82F6',
            40: '#60A5FA',
            30: '#93C5FD',
            20: '#BFDBFE',
            10: '#DBEAFE',
          },
          // Level Badge Colors - Single source of truth
          level: {
            beginner: {
              bg: '#64FF5B',
              text: '#000000'
            },
            intermediate: {
              bg: '#ff8044', 
              text: '#FFFFFF'
            },
            advanced: {
              bg: '#FC7C7C',
              text: '#FFFFFF'
            },
            default: {
              bg: '#3B82F6',
              text: '#FFFFFF'
            }
          },
        },
      },
    },
    plugins: [],
  }