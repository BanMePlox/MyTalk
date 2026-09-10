import { useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { useTrans } from '@/Hooks/useTrans';

export default function DeleteUserForm() {
    const t = useTrans();
    const { auth } = usePage().props;
    const hasPassword = auth.user.has_password;

    const [confirming, setConfirming] = useState(false);
    const passwordInput = useRef();

    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({
        password: '',
    });

    const deleteUser = (e) => {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirming(false);
        clearErrors();
        reset();
    };

    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-base font-semibold text-text">{t('profile.delete_title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('profile.delete_subtitle')}</p>
            </div>

            <button
                onClick={() => setConfirming(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-text-on-accent text-sm font-medium rounded-lg transition"
            >
                {t('profile.delete_btn')}
            </button>

            {confirming && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overlay-backdrop px-4">
                    <div className="bg-bg-elevated rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-text font-semibold text-lg mb-2">{t('profile.delete_confirm_title')}</h3>
                        <p className="text-text/60 text-sm mb-5">{t('profile.delete_confirm_body')}</p>

                        <form onSubmit={deleteUser} className="space-y-4">
                            {hasPassword && (
                                <div>
                                    <label className="block text-sm text-text/60 mb-1.5">{t('auth.password')}</label>
                                    <input
                                        type="password"
                                        ref={passwordInput}
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        autoFocus
                                        className="w-full bg-bg-elevated/5 border border-white/10 rounded-lg px-4 py-2.5 text-text placeholder-white/20 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                                        placeholder="••••••••"
                                    />
                                    {errors.password && (
                                        <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-bg-elevated/10 hover:bg-bg-elevated/15 text-text text-sm font-medium rounded-lg transition"
                                >
                                    {t('server.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-text-on-accent text-sm font-medium rounded-lg transition"
                                >
                                    {t('profile.delete_btn')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
