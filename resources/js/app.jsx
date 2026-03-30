import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './Contexts/ThemeContext';
import { VoiceProvider } from './Contexts/VoiceContext';
import { Component, lazy, Suspense } from 'react';

class TitleBarBoundary extends Component {
    state = { crashed: false };
    static getDerivedStateFromError() { return { crashed: true }; }
    render() { return this.state.crashed ? null : this.props.children; }
}

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

        if (isTauri) document.documentElement.classList.add('in-tauri');

        root.render(
            <ThemeProvider>
                <VoiceProvider authUser={authUser}>
                    {isTauri && (
                        <TitleBarBoundary>
                            <Suspense fallback={null}><TitleBar /></Suspense>
                        </TitleBarBoundary>
                    )}
                    <App {...props} />
                </VoiceProvider>
            </ThemeProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
