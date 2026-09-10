import { useState, useEffect } from 'react';

import { useTrans } from '@/Hooks/useTrans';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function CookieBanner() {
    const t = useTrans();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isTauri && !localStorage.getItem('cookies_accepted')) {
            setVisible(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem('cookies_accepted', '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-elevated border-t border-border px-6 py-4">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                <p className="text-text-secondary text-sm flex-1">
                    {t('cookie.message')}{' '}
                    <a href={route('privacy')} target="_blank" rel="noopener noreferrer" className="text-accent hover:opacity-80 transition underline">
                        {t('auth.privacy')}
                    </a>.
                </p>
                <button
                    onClick={accept}
                    className="btn-primary shrink-0 text-sm px-5 py-2"
                >
                    {t('cookie.accept')}
                </button>
            </div>
        </div>
    );
}
