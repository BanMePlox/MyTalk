import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ServerModal from '@/Components/ServerModal';

export default function Index({ userServers = [] }) {
    const [serverModalOpen, setServerModalOpen] = useState(false);
    return (
        <AuthenticatedLayout>
            <Head title="Mensajes directos" />

            <div className="flex h-screen bg-gray-800 text-gray-100">

                {/* Rail de servidores */}
                <nav className="w-[72px] bg-gray-950 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
                    {userServers.map((srv) => (
                        <div key={srv.id} className="relative flex items-center w-full px-1.5 group">
                            <span className="absolute left-0 w-1 rounded-r-full bg-white transition-all h-0 group-hover:h-5" />
                            <Link
                                href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                title={srv.name}
                                className="w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white"
                            >
                                {srv.name[0].toUpperCase()}
                            </Link>
                        </div>
                    ))}

                    <div className="mt-1 w-8 border-t border-gray-700" />

                    {/* DMs activo */}
                    <div className="relative flex items-center w-full px-1.5">
                        <span className="absolute left-0 w-1 h-8 rounded-r-full bg-white" />
                        <Link
                            href={route('conversations.index')}
                            title="Mensajes directos"
                            className="w-12 h-12 flex items-center justify-center text-xl text-white bg-indigo-500 rounded-2xl"
                        >
                            ✉
                        </Link>
                    </div>

                    <div className="relative flex items-center w-full px-1.5 group">
                        <button
                            type="button"
                            onClick={() => setServerModalOpen(true)}
                            title="Añadir servidor"
                            className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all duration-150"
                        >+</button>
                    </div>
                </nav>
                {serverModalOpen && <ServerModal onClose={() => setServerModalOpen(false)} />}

                {/* Contenido vacío */}
                <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-500">
                    <span className="text-5xl">✉</span>
                    <p className="text-lg font-medium text-gray-400">No tienes mensajes directos</p>
                    <p className="text-sm">Haz clic en el perfil de un usuario y pulsa <span className="text-indigo-400">Mensaje directo</span></p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
