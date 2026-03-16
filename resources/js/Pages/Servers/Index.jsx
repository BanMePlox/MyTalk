import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Index({ servers }) {
    const createForm = useForm({ name: '' });
    const joinForm = useForm({ invite_code: '' });

    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route('servers.store'), { onSuccess: () => createForm.reset() });
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
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow hover:shadow-md transition"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold mb-2">
                                {server.name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{server.name}</span>
                        </Link>
                    ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {/* Crear servidor */}
                    <form onSubmit={submitCreate} className="bg-white p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-gray-800">Crear servidor</h3>
                        <input
                            type="text"
                            placeholder="Nombre del servidor"
                            value={createForm.data.name}
                            onChange={(e) => createForm.setData('name', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
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
                    <form onSubmit={submitJoin} className="bg-white p-5 rounded-xl shadow space-y-3">
                        <h3 className="font-semibold text-gray-800">Unirse con código</h3>
                        <input
                            type="text"
                            placeholder="Código de invitación"
                            value={joinForm.data.invite_code}
                            onChange={(e) => joinForm.setData('invite_code', e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
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
