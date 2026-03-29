import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './Contexts/ThemeContext';
import { VoiceProvider } from './Contexts/VoiceContext';

const appName = import.meta.env.VITE_APP_NAME || 'MyTalk';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const authUser = props.initialPage?.props?.auth?.user ?? null;

        root.render(<ThemeProvider><VoiceProvider authUser={authUser}><App {...props} /></VoiceProvider></ThemeProvider>);
    },
    progress: {
        color: '#4B5563',
    },
});
