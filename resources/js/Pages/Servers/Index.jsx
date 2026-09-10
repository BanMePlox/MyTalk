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
                            className="flex flex-col items-center justify-center p-6 bg-bg-elevated dark:bg-bg-muted rounded-xl shadow hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-text-on-accent text-xl font-bold mb-2 overflow-hidden">
                                {server.icon_url
                                    ? <img src={server.icon_url} className="w-full h-full object-cover" />
                                    : server.name[0].toUpperCase()
                                }
                            </div>
                            <span className="text-sm font-medium text-text-secondary dark:text-text">{server.name}</span>
                        </Link>
                    ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Crear servidor */}
                    <form onSubmit={submitCreate} className="bg-bg-elevated dark:bg-bg-muted p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-text dark:text-text">Crear servidor</h3>
                        <label className="flex flex-col items-center cursor-pointer">
                            <div className="w-16 h-16 rounded-full bg-accent-soft dark:bg-accent-chip flex items-center justify-center overflow-hidden mb-1">
                                {iconPreview
                                    ? <img src={iconPreview} className="w-full h-full object-cover" />
                                    : <span className="text-accent text-2xl">🖼️</span>
                                }
                            </div>
                            <span className="text-xs text-text-muted dark:text-text-secondary">Icono (opcional)</span>
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
                            className="w-full border border-border dark:border-border bg-bg-elevated dark:bg-bg-elevated text-text dark:text-text rounded px-3 py-2 text-sm"
                        />
                        {createForm.errors.name && <p className="text-red-500 text-xs">{createForm.errors.name}</p>}
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="w-full bg-accent text-text-on-accent rounded px-4 py-2 text-sm hover:opacity-90"
                        >
                            Crear
                        </button>
                    </form>

                    {/* Unirse a servidor */}
                    <form onSubmit={submitJoin} className="bg-bg-elevated dark:bg-bg-muted p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-text dark:text-text">Unirse con código</h3>
                        <input
                            type="text"
                            placeholder="Código de invitación"
                            value={joinForm.data.invite_code}
                            onChange={(e) => joinForm.setData('invite_code', e.target.value)}
                            className="w-full border border-border dark:border-border bg-bg-elevated dark:bg-bg-elevated text-text dark:text-text rounded px-3 py-2 text-sm"
                        />
                        {joinForm.errors.invite_code && <p className="text-red-500 text-xs">{joinForm.errors.invite_code}</p>}
                        <button
                            type="submit"
                            disabled={joinForm.processing}
                            className="w-full bg-green-600 text-text-on-accent rounded px-4 py-2 text-sm hover:bg-green-700"
                        >
                            Unirse
                        </button>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
