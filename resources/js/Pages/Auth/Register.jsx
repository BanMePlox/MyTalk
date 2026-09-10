import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';
import CookieBanner from '@/Components/CookieBanner';
import LegalModal from '@/Components/LegalModal';
import ThemeToggle from '@/Components/ThemeToggle';
import { useState } from 'react';

export default function Register() {
    const t = useTrans();
    const [legalModal, setLegalModal] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };

    return (
        <>
        <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative">
            <Head title={t('auth.register_title')} />
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-sm auth-card">
                <div className="text-center mb-8">
                    <img src="/images/MyTalk.png" alt="MyTalk" className="w-12 h-12 rounded-sm object-contain mx-auto mb-4" />
                    <h1 className="text-text text-2xl font-bold">{t('auth.register_title')}</h1>
                    <p className="text-text-muted text-sm mt-1">{t('auth.register_subtitle')}</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-text-secondary mb-1.5 font-medium">{t('auth.username')}</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            autoFocus
                            className="input-field"
                            placeholder="tunombre"
                        />
                        <InputError message={errors.name} className="mt-1.5" />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1.5 font-medium">{t('auth.email')}</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            className="input-field"
                            placeholder="tu@email.com"
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1.5 font-medium">{t('auth.password')}</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div>
                        <label className="block text-sm text-text-secondary mb-1.5 font-medium">{t('auth.confirm_password')}</label>
                        <input
                            type="password"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                        />
                        <InputError message={errors.password_confirmation} className="mt-1.5" />
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="btn-primary w-full py-2.5"
                    >
                        {processing ? t('auth.register_processing') : t('auth.register_btn')}
                    </button>

                    <p className="text-center text-text-muted text-xs">
                        {t('auth.accept_terms')}{' '}
                        <button type="button" onClick={() => setLegalModal('terms')} className="underline hover:text-text-secondary transition">{t('auth.terms')}</button>
                        {' '}{t('auth.and')}{' '}
                        <button type="button" onClick={() => setLegalModal('privacy')} className="underline hover:text-text-secondary transition">{t('auth.privacy')}</button>.
                    </p>
                </form>

                {/* OAuth */}
                <div className="mt-6">
                    <div className="relative flex items-center gap-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-text-muted text-xs shrink-0">{t('auth.or_continue')}</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                        <a
                            href={route('oauth.redirect', 'github')}
                            className="btn-secondary w-full py-2.5 gap-3"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            {t('auth.github')}
                        </a>
                    </div>
                </div>

                <p className="text-center text-text-muted text-sm mt-6">
                    {t('auth.has_account')}{' '}
                    <Link href={route('login')} className="text-accent hover:opacity-80 transition font-medium">
                        {t('auth.login_link')}
                    </Link>
                </p>

                <p className="text-center text-text-muted text-xs mt-4">
                    <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-text-secondary transition">{t('auth.terms')}</button>
                    {' · '}
                    <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-text-secondary transition">{t('auth.privacy')}</button>
                </p>
            </div>
        </div>
        <CookieBanner />
        {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
        </>
    );
}
