import { useRef, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';

function DeleteAccountSection() {
    const t = useTrans();
    const { auth } = usePage().props;
    const hasPassword = auth.user.has_password;
    const [confirming, setConfirming] = useState(false);
    const passwordRef = useRef();

    const { data, setData, delete: destroy, processing, reset, errors } = useForm({ password: '' });

    function submit(e) {
        e.preventDefault();
        destroy(route('profile.destroy'), {
            onError: () => passwordRef.current?.focus(),
            onFinish: () => reset(),
        });
    }

    return (
        <div className="border-t border-red-900/40 pt-4 mt-2">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">{t('profile.delete_title')}</p>
            <p className="text-xs text-text-muted mb-3">{t('profile.delete_subtitle')}</p>

            {!confirming ? (
                <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 text-red-400 hover:text-red-300 text-sm font-medium rounded-md transition-colors"
                >
                    {t('profile.delete_btn')}
                </button>
            ) : (
                <form onSubmit={submit} className="space-y-3 bg-red-950/30 border border-red-900/40 rounded-lg p-4">
                    <p className="text-sm text-red-300 font-medium">{t('profile.delete_confirm_title')}</p>
                    {hasPassword && (
                        <div>
                            <input
                                type="password"
                                ref={passwordRef}
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                autoFocus
                                placeholder={t('auth.password')}
                                className="w-full bg-bg border border-red-800/50 rounded-md px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-red-500 transition-colors"
                            />
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => { setConfirming(false); reset(); }}
                            className="px-3 py-1.5 bg-bg-muted hover:bg-bg-muted text-text text-sm rounded-md transition-colors"
                        >
                            {t('server.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-text-on-accent text-sm font-medium rounded-md transition-colors"
                        >
                            {t('profile.delete_btn')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

const BANNER_PRESETS = ['#3F6F5B', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9', '#14b8a6'];

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{label}</label>
            {children}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}

function Input({ className = '', ...props }) {
    return (
        <input
            className={`input-field text-sm ${className}`}
            {...props}
        />
    );
}

function ProfileTab({ onClose }) {
    const { auth, locale } = usePage().props;
    const user = auth.user;
    const t = useTrans();
    const avatarInput = useRef();
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url ?? null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        _method:       'PATCH',
        name:          user.name,
        email:         user.email,
        bio:           user.bio ?? '',
        custom_status: user.custom_status ?? '',
        banner_color:  user.banner_color ?? '#3F6F5B',
        avatar:        null,
    });

    function onAvatarChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        setData('avatar', file);
        setAvatarPreview(URL.createObjectURL(file));
    }

    function submit(e) {
        e.preventDefault();
        post(route('profile.update'), {
            forceFormData: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            {/* Avatar + banner color */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => avatarInput.current.click()}
                    className="relative group shrink-0"
                    title="Cambiar avatar"
                >
                    {avatarPreview
                        ? <img src={avatarPreview} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
                        : (
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-text-on-accent"
                                style={{ backgroundColor: data.banner_color }}>
                                {user.name[0].toUpperCase()}
                            </div>
                        )
                    }
                    <div className="absolute inset-0 rounded-full overlay-backdrop opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-text text-xs font-medium">Cambiar</span>
                    </div>
                </button>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-2">Color de banner</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {BANNER_PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setData('banner_color', color)}
                                className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none shrink-0"
                                style={{ backgroundColor: color, boxShadow: data.banner_color === color ? `0 0 0 2px #1f2937, 0 0 0 4px ${color}` : 'none' }}
                            />
                        ))}
                        <input
                            type="color"
                            value={data.banner_color}
                            onChange={(e) => setData('banner_color', e.target.value)}
                            className="w-6 h-6 rounded-full border-0 cursor-pointer p-0 bg-transparent"
                            title="Color personalizado"
                        />
                    </div>
                    {errors.avatar && <p className="text-red-400 text-xs mt-1">{errors.avatar}</p>}
                </div>
            </div>

            <Field label="Nombre" error={errors.name}>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} required autoComplete="name" />
            </Field>

            <Field label="Email" error={errors.email}>
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required autoComplete="username" />
            </Field>

            <Field label="Estado personalizado" error={errors.custom_status}>
                <Input
                    value={data.custom_status}
                    onChange={(e) => setData('custom_status', e.target.value)}
                    placeholder="¿En qué estás?"
                    maxLength={60}
                />
                <p className="text-xs text-text-muted text-right mt-0.5">{data.custom_status.length}/60</p>
            </Field>

            <Field label="Descripción" error={errors.bio}>
                <textarea
                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
                    rows={3}
                    value={data.bio}
                    onChange={(e) => setData('bio', e.target.value)}
                    placeholder="Cuéntanos algo sobre ti..."
                    maxLength={160}
                />
                <p className="text-xs text-text-muted text-right -mt-1">{data.bio.length}/160</p>
            </Field>

            <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">{t('profile.language')}</p>
                <div className="flex gap-2">
                    {[{ key: 'es', label: t('profile.lang_es') }, { key: 'en', label: t('profile.lang_en') }].map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => router.patch(route('profile.locale'), { locale: key })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                locale === key
                                    ? 'bg-accent text-text-on-accent border-accent'
                                    : 'bg-bg text-text-secondary border-border hover:border-accent'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-accent hover:bg-accent disabled:opacity-50 text-text-on-accent text-sm font-medium rounded-md transition-colors"
                >
                    {processing ? t('profile.saving') : t('profile.save')}
                </button>
                {recentlySuccessful && <span className="text-green-400 text-sm">{t('profile.saved')}</span>}
            </div>

            <DeleteAccountSection />
        </form>
    );
}

function PasswordTab() {
    const passwordInput = useRef();
    const currentPasswordInput = useRef();

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password:      '',
        password:              '',
        password_confirmation: '',
    });

    function submit(e) {
        e.preventDefault();
        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) { reset('password', 'password_confirmation'); passwordInput.current?.focus(); }
                if (errs.current_password) { reset('current_password'); currentPasswordInput.current?.focus(); }
            },
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <Field label="Contraseña actual" error={errors.current_password}>
                <Input ref={currentPasswordInput} type="password" value={data.current_password} onChange={(e) => setData('current_password', e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="Nueva contraseña" error={errors.password}>
                <Input ref={passwordInput} type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirmar contraseña" error={errors.password_confirmation}>
                <Input type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} autoComplete="new-password" />
            </Field>
            <div className="flex items-center gap-3 pt-1">
                <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-accent hover:bg-accent disabled:opacity-50 text-text-on-accent text-sm font-medium rounded-md transition-colors"
                >
                    {processing ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
                {recentlySuccessful && <span className="text-green-400 text-sm">¡Actualizada!</span>}
            </div>
        </form>
    );
}

function EmojiTab({ onUserEmojisChange }) {
    const fileInput = useRef();
    const [emojis, setEmojis] = useState(usePage().props.auth.userEmojis ?? []);

    function updateEmojis(newEmojis) {
        setEmojis(newEmojis);
        onUserEmojisChange?.(newEmojis);
    }
    const [name, setName] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    function onFileChange(e) {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setError('');
    }

    async function upload(e) {
        e.preventDefault();
        if (!file || !name.trim()) { setError('Nombre e imagen requeridos.'); return; }
        setUploading(true);
        setError('');
        try {
            const form = new FormData();
            form.append('name', name.trim());
            form.append('image', file);
            const res = await window.axios.post('/user-emojis', form);
            updateEmojis([...emojis, res.data]);
            setName('');
            setFile(null);
            setPreview(null);
            fileInput.current.value = '';
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error al subir el emoji.');
        } finally {
            setUploading(false);
        }
    }

    async function remove(id) {
        await window.axios.delete(`/user-emojis/${id}`);
        updateEmojis(emojis.filter(e => e.id !== id));
    }

    return (
        <div className="space-y-5">
            <p className="text-xs text-text-secondary">Hasta 4 emojis personales. Úsalos como reacciones en cualquier servidor.</p>

            {/* Lista de emojis actuales */}
            <div className="flex flex-wrap gap-3">
                {emojis.map(e => (
                    <div key={e.id} className="relative group">
                        <img src={e.url} alt={e.name} title={`:${e.name}:`}
                            className="w-12 h-12 rounded-lg object-contain bg-bg p-1" />
                        <p className="text-[10px] text-text-muted text-center truncate w-12">{e.name}</p>
                        <button
                            onClick={() => remove(e.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-400 text-text rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >×</button>
                    </div>
                ))}
                {emojis.length === 0 && (
                    <p className="text-sm text-text-muted">Sin emojis todavía.</p>
                )}
            </div>

            {/* Formulario de subida */}
            {emojis.length < 4 && (
                <form onSubmit={upload} className="space-y-3 border-t border-border pt-4">
                    <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide">Añadir emoji</p>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => fileInput.current.click()}
                            className="w-12 h-12 rounded-lg bg-bg border border-dashed border-border hover:border-accent flex items-center justify-center shrink-0 overflow-hidden transition-colors">
                            {preview
                                ? <img src={preview} alt="" className="w-full h-full object-contain" />
                                : <span className="text-text-muted text-xl">+</span>
                            }
                        </button>
                        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                        <Input
                            placeholder="nombre (a-z, 0-9, _)"
                            value={name}
                            onChange={e => { setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setError(''); }}
                            maxLength={32}
                            className="flex-1"
                        />
                        <button type="submit" disabled={uploading || !file || !name.trim()}
                            className="px-3 py-2 bg-accent hover:bg-accent disabled:opacity-40 text-text-on-accent text-sm rounded-md transition-colors shrink-0">
                            {uploading ? '...' : 'Subir'}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-xs">{error}</p>}
                </form>
            )}
        </div>
    );
}

export default function ProfileModal({ onClose, onUserEmojisChange }) {
    const [tab, setTab] = useState('profile');

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4" onClick={onClose}>
            <div className="absolute inset-0 overlay-backdrop" />
            <div
                className="relative modal-panel w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
                    <h2 className="text-text font-semibold text-base">Mi perfil</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border px-6">
                    {[['profile', 'Perfil'], ['password', 'Contraseña'], ['emojis', 'Emojis']].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
                                tab === key
                                    ? 'border-accent text-text'
                                    : 'border-transparent text-text-secondary hover:text-text'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
                    {tab === 'profile' && <ProfileTab onClose={onClose} />}
                    {tab === 'password' && <PasswordTab />}
                    {tab === 'emojis' && <EmojiTab onUserEmojisChange={onUserEmojisChange} />}
                </div>
            </div>
        </div>
    );
}
