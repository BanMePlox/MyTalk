import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Show({ server, channel, canManageChannels }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    function submit(e) {
        e.preventDefault();
        post(route('channels.store', server.id), {
            onSuccess: () => reset(),
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold">{server.name}</h2>}>
            <Head title={server.name} />

            <div className="py-8 max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-xl shadow p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-700">Canales</h3>
                    </div>

                    <div className="space-y-2">
                        {server.channels?.map((ch) => (
                            <Link
                                key={ch.id}
                                href={route('channels.show', ch.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-700"
                            >
                                <span className="text-gray-400">#</span> {ch.name}
                            </Link>
                        ))}
                    </div>

                    {canManageChannels && (
                        <form onSubmit={submit} className="pt-2 flex gap-2">
                            <input
                                type="text"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="nuevo-canal"
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                            >
                                + Canal
                            </button>
                        </form>
                    )}
                    {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

                    {channel && (
                        <Link
                            href={route('channels.show', channel.id)}
                            className="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                        >
                            Entrar a #general
                        </Link>
                    )}

                    <div className="pt-4 border-t text-sm text-gray-500">
                        Código de invitación: <span className="font-mono font-bold text-gray-700">{server.invite_code}</span>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
