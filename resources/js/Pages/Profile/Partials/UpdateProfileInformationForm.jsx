import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { useTrans } from '@/Hooks/useTrans';

const BANNER_PRESETS = ['#3F6F5B', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9', '#14b8a6'];

export default function UpdateProfileInformationForm({ className = '' }) {
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
        post(route('profile.update'), { forceFormData: true });
    }

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-text">{t('profile.info_title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('profile.info_subtitle')}</p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-5">
                    <button
                        type="button"
                        onClick={() => avatarInput.current.click()}
                        className="relative group shrink-0"
                        title={t('profile.change_avatar')}
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
                        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-text text-xs font-medium">{t('profile.change')}</span>
                        </div>
                    </button>
                    <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                    <div className="text-sm text-text-muted">
                        <p className="font-medium text-text-secondary">{t('profile.avatar')}</p>
                        <p>{t('profile.avatar_hint')}</p>
                        <InputError message={errors.avatar} className="mt-1" />
                    </div>
                </div>

                {/* Nombre */}
                <div>
                    <InputLabel htmlFor="name" value={t('profile.name_label')} />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        autoComplete="name"
                    />
                    <InputError className="mt-2" message={errors.name} />
                </div>

                {/* Email */}
                <div>
                    <InputLabel htmlFor="email" value="Email" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-2" message={errors.email} />
                </div>

                {/* Estado personalizado */}
                <div>
                    <InputLabel htmlFor="custom_status" value={t('status.custom_status')} />
                    <TextInput
                        id="custom_status"
                        className="mt-1 block w-full"
                        value={data.custom_status}
                        onChange={(e) => setData('custom_status', e.target.value)}
                        placeholder={t('profile.status_ph')}
                        maxLength={60}
                    />
                    <p className="mt-1 text-xs text-text-secondary text-right">{data.custom_status.length}/60</p>
                    <InputError className="mt-1" message={errors.custom_status} />
                </div>

                {/* Bio */}
                <div>
                    <InputLabel htmlFor="bio" value={t('profile.bio_label')} />
                    <textarea
                        id="bio"
                        className="mt-1 block w-full border-border rounded-md shadow-sm focus:ring-accent focus:border-accent text-sm"
                        rows={3}
                        value={data.bio}
                        onChange={(e) => setData('bio', e.target.value)}
                        placeholder={t('profile.bio_ph')}
                        maxLength={160}
                    />
                    <p className="mt-1 text-xs text-text-secondary text-right">{data.bio.length}/160</p>
                    <InputError className="mt-1" message={errors.bio} />
                </div>

                {/* Color de banner */}
                <div>
                    <InputLabel value={t('profile.banner_color')} />
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                        {BANNER_PRESETS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => setData('banner_color', color)}
                                className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                                style={{ backgroundColor: color, boxShadow: data.banner_color === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none' }}
                                title={color}
                            />
                        ))}
                        <input
                            type="color"
                            value={data.banner_color}
                            onChange={(e) => setData('banner_color', e.target.value)}
                            className="w-8 h-8 rounded-full border-0 cursor-pointer p-0"
                            title={t('profile.custom_color')}
                        />
                    </div>
                    <InputError className="mt-2" message={errors.banner_color} />
                </div>

                {/* Idioma */}
                <div>
                    <InputLabel value={t('profile.language')} />
                    <div className="mt-2 flex gap-2">
                        {[
                            { key: 'es', label: t('profile.lang_es') },
                            { key: 'en', label: t('profile.lang_en') },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => router.patch(route('profile.locale'), { locale: key })}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    locale === key
                                        ? 'bg-accent text-text-on-accent border-accent'
                                        : 'bg-bg-elevated text-text-secondary border-border hover:border-accent'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>{t('profile.save')}</PrimaryButton>
                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-text-muted">{t('profile.saved_msg')}</p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
