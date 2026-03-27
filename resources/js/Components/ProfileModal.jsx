import { useRef, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';

const BANNER_PRESETS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9', '#14b8a6'];

function Field({ label, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
            {children}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}

function Input({ className = '', ...props }) {
    return (
        <input
            className={`w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors ${className}`}
            {...props}
        />
    );
}

function ProfileTab({ onClose }) {
    const user = usePage().props.auth.user;
    const avatarInput = useRef();
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url ?? null);

    const { data, setData, post, errors, processing, recentlySuccessful } = useForm({
        _method:       'PATCH',
        name:          user.name,
        email:         user.email,
        bio:           user.bio ?? '',
        custom_status: user.custom_status ?? '',
        banner_color:  user.banner_color ?? '#6366f1',
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
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                                style={{ backgroundColor: data.banner_color }}>
                                {user.name[0].toUpperCase()}
                            </div>
                        )
                    }
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-xs font-medium">Cambiar</span>
                    </div>
                </button>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-2">Color de banner</p>
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
                <p className="text-xs text-gray-500 text-right mt-0.5">{data.custom_status.length}/60</p>
            </Field>

            <Field label="Descripción" error={errors.bio}>
                <textarea
                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    rows={3}
                    value={data.bio}
                    onChange={(e) => setData('bio', e.target.value)}
                    placeholder="Cuéntanos algo sobre ti..."
                    maxLength={160}
                />
                <p className="text-xs text-gray-500 text-right -mt-1">{data.bio.length}/160</p>
            </Field>

            <div className="flex items-center gap-3 pt-1">
                <button
                    type="submit"
                    disabled={processing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                >
                    {processing ? 'Guardando...' : 'Guardar'}
                </button>
                {recentlySuccessful && <span className="text-green-400 text-sm">¡Guardado!</span>}
            </div>
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
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                >
                    {processing ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
                {recentlySuccessful && <span className="text-green-400 text-sm">¡Actualizada!</span>}
            </div>
        </form>
    );
}

export default function ProfileModal({ onClose }) {
    const [tab, setTab] = useState('profile');

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center px-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60" />
            <div
                className="relative bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-700">
                    <h2 className="text-white font-semibold text-base">Mi perfil</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 px-6">
                    {[['profile', 'Perfil'], ['password', 'Contraseña']].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
                                tab === key
                                    ? 'border-indigo-500 text-white'
                                    : 'border-transparent text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
                    {tab === 'profile' ? <ProfileTab onClose={onClose} /> : <PasswordTab />}
                </div>
            </div>
        </div>
    );
}
