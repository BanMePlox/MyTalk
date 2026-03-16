import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

const STATUS_CONFIG = {
    online: { dot: 'bg-green-500', label: 'En línea' },
    away:   { dot: 'bg-yellow-400', label: 'Ausente' },
    dnd:    { dot: 'bg-red-500',   label: 'No molestar' },
};

function ProfileCard({ user }) {
    return (
        <div className="rounded-xl overflow-hidden shadow-lg w-72 bg-gray-800 text-white">
            {/* Banner */}
            <div className="h-20" style={{ backgroundColor: user.banner_color ?? '#6366f1' }} />

            {/* Avatar sobre el banner */}
            <div className="px-4 pb-4">
                <div className="relative -mt-10 mb-3">
                    <div className="relative inline-block">
                        {user.avatar_url
                            ? <img src={user.avatar_url} alt={user.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-800" />
                            : (
                                <div className="w-20 h-20 rounded-full ring-4 ring-gray-800 flex items-center justify-center text-3xl font-bold"
                                    style={{ backgroundColor: user.banner_color ?? '#6366f1' }}>
                                    {user.name[0].toUpperCase()}
                                </div>
                            )
                        }
                        {/* Estado dot */}
                        <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ring-2 ring-gray-800 ${STATUS_CONFIG[user.status]?.dot ?? 'bg-gray-500'}`} />
                    </div>
                </div>

                {/* Nombre y estado */}
                <p className="font-bold text-lg leading-tight">{user.name}</p>
                {user.custom_status && (
                    <p className="text-sm text-gray-300 mt-0.5">{user.custom_status}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{STATUS_CONFIG[user.status]?.label ?? 'Desconectado'}</p>

                {/* Bio */}
                {user.bio && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Sobre mí</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{user.bio}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Edit({ mustVerifyEmail, status }) {
    const { auth } = usePage().props;

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Mi perfil</h2>}
        >
            <Head title="Perfil" />

            <div className="py-10">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Formularios */}
                        <div className="flex-1 space-y-6 min-w-0">
                            <div className="bg-white p-6 shadow sm:rounded-xl">
                                <UpdateProfileInformationForm
                                    mustVerifyEmail={mustVerifyEmail}
                                    status={status}
                                />
                            </div>

                            <div className="bg-white p-6 shadow sm:rounded-xl">
                                <UpdatePasswordForm />
                            </div>

                            <div className="bg-white p-6 shadow sm:rounded-xl">
                                <DeleteUserForm />
                            </div>
                        </div>

                        {/* Preview fija en el lateral */}
                        <div className="lg:sticky lg:top-8 shrink-0">
                            <p className="text-sm font-medium text-gray-500 mb-3">Vista previa</p>
                            <ProfileCard user={auth.user} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
