import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './Contexts/ThemeContext';
import { VoiceProvider } from './Contexts/VoiceContext';
import { lazy, Suspense } from 'react';

const appName = import.meta.env.VITE_APP_NAME || 'MyTalk';
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const TitleBar = isTauri ? lazy(() => import('./Components/TitleBar')) : null;

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

        root.render(
            <ThemeProvider>
                <VoiceProvider authUser={authUser}>
                    <div className={isTauri ? 'flex flex-col h-screen overflow-hidden' : 'contents'}>
                        {isTauri && TitleBar && <Suspense fallback={null}><TitleBar /></Suspense>}
                        <div className={isTauri ? 'flex-1 overflow-hidden' : 'contents'}>
                            <App {...props} />
                        </div>
                    </div>
                </VoiceProvider>
            </ThemeProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
