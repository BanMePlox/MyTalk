import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ servers }) {
    const createForm = useForm({ name: '', icon: null });
    const joinForm = useForm({ invite_code: '' });
    const [iconPreview, setIconPreview] = useState(null);

    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route('servers.store'), {
            forceFormData: true,
            onSuccess: () => { createForm.reset(); setIconPreview(null); },
        });
    }

    function submitJoin(e) {
        e.preventDefault();
        joinForm.post(route('servers.join'), { onSuccess: () => joinForm.reset() });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">Mis Servidores</h2>}>
            <Head title="Servidores" />

            <div className="py-8 max-w-4xl mx-auto px-4 space-y-6">
                {/* Lista de servidores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {servers.map((server) => (
                        <Link
                            key={server.id}
                            href={route('servers.show', server.id)}
                            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 rounded-xl shadow hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold mb-2 overflow-hidden">
                                {server.icon_url
                                    ? <img src={server.icon_url} className="w-full h-full object-cover" />
                                    : server.name[0].toUpperCase()
                                }
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{server.name}</span>
                        </Link>
                    ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Crear servidor */}
                    <form onSubmit={submitCreate} className="bg-white dark:bg-gray-700 p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Crear servidor</h3>
                        <label className="flex flex-col items-center cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center overflow-hidden mb-1">
                                {iconPreview
                                    ? <img src={iconPreview} className="w-full h-full object-cover" />
                                    : <span className="text-indigo-400 text-2xl">🖼️</span>
                                }
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Icono (opcional)</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        createForm.setData('icon', file);
                                        setIconPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </label>
                        <input
                            type="text"
                            placeholder="Nombre del servidor"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm"
                        />
                        {createForm.errors.name && <p className="text-red-500 text-xs">{createForm.errors.name}</p>}
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm hover:bg-indigo-700"
                        >
                            Crear
                        </button>
                    </form>

                    {/* Unirse a servidor */}
                    <form onSubmit={submitJoin} className="bg-white dark:bg-gray-700 p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Unirse con código</h3>
                        <input
                            type="text"
                            placeholder="Código de invitación"
                            value={joinForm.data.invite_code}
                            onChange={(e) => joinForm.setData('invite_code', e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm"
                        />
                        {joinForm.errors.invite_code && <p className="text-red-500 text-xs">{joinForm.errors.invite_code}</p>}
                        <button
                            type="submit"
                            disabled={joinForm.processing}
                            className="w-full bg-green-600 text-white rounded px-4 py-2 text-sm hover:bg-green-700"
                        >
                            Unirse
                        </button>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
