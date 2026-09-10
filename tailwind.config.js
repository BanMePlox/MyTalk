import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['IBM Plex Sans', 'Source Sans 3', ...defaultTheme.fontFamily.sans],
                mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono],
            },
            colors: {
                bg: 'var(--bg)',
                'bg-elevated': 'var(--bg-elevated)',
                'bg-muted': 'var(--bg-muted)',
                text: 'var(--text)',
                'text-secondary': 'var(--text-secondary)',
                'text-muted': 'var(--text-muted)',
                border: 'var(--border)',
                'border-strong': 'var(--border-strong)',
                accent: 'var(--accent)',
                'accent-soft': 'var(--accent-soft)',
                danger: 'var(--danger)',
                success: 'var(--success)',
                'bubble-me': 'var(--bubble-me)',
                'bubble-them': 'var(--bubble-them)',
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
                sm: 'var(--radius-sm)',
            },
        },
    },

    plugins: [forms],
};
