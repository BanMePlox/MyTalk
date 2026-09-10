import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { useTrans } from '@/Hooks/useTrans';

const STATUS_DOT = {
    online: 'bg-green-500',
    away:   'bg-yellow-400',
    dnd:    'bg-red-500',
};

function ProfileCard({ user }) {
    const t = useTrans();
    return (
        <div className="rounded-xl overflow-hidden shadow-lg w-72 bg-bg-elevated text-text">
            {/* Banner */}
            <div className="h-20" style={{ backgroundColor: user.banner_color ?? '#3F6F5B' }} />

            {/* Avatar sobre el banner */}
            <div className="px-4 pb-4">
                <div className="relative -mt-10 mb-3">
                    <div className="relative inline-block">
                        {user.avatar_url
                            ? <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-bg-elevated" />
                            : (
                                <div className="w-20 h-20 rounded-full ring-4 ring-bg-elevated flex items-center justify-center text-3xl font-bold"
                                    style={{ backgroundColor: user.banner_color ?? '#3F6F5B' }}>
                                    {user.name[0].toUpperCase()}
                                </div>
                            )
                        }
                        {/* Estado dot */}
                        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-bg-elevated ${STATUS_DOT[user.status] ?? 'bg-text-muted'}`} />
                    </div>
                </div>

                {/* Nombre y estado */}
                <p className="font-bold text-lg leading-tight">{user.name}</p>
                {user.custom_status && (
                    <p className="text-sm text-text-secondary mt-0.5">{user.custom_status}</p>
                )}
                <p className="text-xs text-text-secondary mt-0.5">{['online','away','dnd'].includes(user.status) ? t(`status.${user.status}`) : t('chat.offline_status')}</p>

                {/* Bio */}
                {user.bio && (
                    <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{t('chat.about_me')}</p>
                        <p className="text-sm text-text-secondary whitespace-pre-wrap">{user.bio}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;
    const t = useTrans();

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-text">{t('profile.my_profile')}</h2>}
        >
            <Head title={t('profile.page_title')} />

            <div className="py-10">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Formularios */}
                        <div className="flex-1 space-y-6 min-w-0">
                            <div className="bg-bg-elevated p-6 shadow sm:rounded-xl">
                                <UpdateProfileInformationForm
                                    mustVerifyEmail={mustVerifyEmail}
                                    status={status}
                                />
                            </div>

                            <div className="bg-bg-elevated p-6 shadow sm:rounded-xl">
                                <UpdatePasswordForm />
                            </div>

                            <div className="bg-bg-elevated p-6 shadow sm:rounded-xl">
                                <DeleteUserForm />
                            </div>
                        </div>

                        {/* Preview fija en el lateral */}
                        <div className="lg:sticky lg:top-8 shrink-0">
                            <p className="text-sm font-medium text-text-muted mb-3">{t('profile.preview')}</p>
                            <ProfileCard user={auth.user} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
