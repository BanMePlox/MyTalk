import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-white/10 px-6 py-4">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                <p className="text-white/60 text-sm flex-1">
                    {t('cookie.message')}{' '}
                    <Link href={route('privacy')} className="text-indigo-400 hover:text-indigo-300 transition underline">
                        {t('auth.privacy')}
                    </Link>.
                </p>
                <button
                    onClick={accept}
                    className="shrink-0 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                    {t('cookie.accept')}
                </button>
            </div>
        </div>
    );
}
