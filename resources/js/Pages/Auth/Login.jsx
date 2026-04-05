import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';
import CookieBanner from '@/Components/CookieBanner';
import LegalModal from '@/Components/LegalModal';
import { useState } from 'react';

export default function Login({ status, canResetPassword }) {
    const t = useTrans();
    const [legalModal, setLegalModal] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <Head title={t('auth.login_btn')} />

            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <img src="/images/MyTalk.png" alt="MyTalk" className="w-12 h-12 rounded-xl object-contain mx-auto mb-4" />
                    <h1 className="text-white text-2xl font-bold">{t('auth.login_title')}</h1>
                    <p className="text-white/40 text-sm mt-1">{t('auth.login_subtitle')}</p>
                </div>

                {status && (
                    <div className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-4 py-3">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1.5">{t('auth.email')}</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            placeholder="tu@email.com"
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1.5">{t('auth.password')}</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            placeholder="••••••••"
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={e => setData('remember', e.target.checked)}
                                className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                            />
                            {t('auth.remember')}
                        </label>
                        {canResetPassword && (
                            <Link href={route('password.request')} className="text-indigo-400 hover:text-indigo-300 transition">
                                {t('auth.forgot_password')}
                            </Link>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition shadow-lg shadow-indigo-500/20"
                    >
                        {processing ? t('auth.login_processing') : t('auth.login_btn')}
                    </button>
                </form>

                {/* OAuth */}
                <div className="mt-6">
                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/30 text-xs shrink-0">{t('auth.or_continue')}</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                        <a
                            href={route('oauth.redirect', 'github')}
                            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-medium py-2.5 rounded-lg transition"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            {t('auth.github')}
                        </a>
                    </div>
                </div>

                <p className="text-center text-white/40 text-sm mt-6">
                    {t('auth.no_account')}{' '}
                    <Link href={route('register')} className="text-indigo-400 hover:text-indigo-300 transition">
                        {t('auth.register_link')}
                    </Link>
                </p>

                <p className="text-center text-white/20 text-xs mt-4">
                    <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-white/40 transition">{t('auth.terms')}</button>
                    {' · '}
                    <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-white/40 transition">{t('auth.privacy')}</button>
                </p>
            </div>
        </div>
        <CookieBanner />
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
        </>
    );
}
