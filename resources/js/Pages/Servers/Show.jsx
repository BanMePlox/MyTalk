import { Head, Link, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';

export default function Show({ server, channel, canManageChannels, inviteUrl }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });
    const [copied, setCopied] = useState(false);

    function submit(e) {
        e.preventDefault();
        post(route('channels.store', server.id), { onSuccess: () => reset() });
    }

    function copyInvite() {
        navigator.clipboard.writeText(inviteUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-100">{server.name}</h2>}>
            <Head title={server.name} />

            <div className="py-8 max-w-2xl mx-auto px-4 space-y-4">
                {/* Canales */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
                    <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wide">Canales</h3>

                    <div className="space-y-1">
                        {server.channels?.map((ch) => (
                            <Link
                                key={ch.id}
                                href={route('channels.show', ch.id)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                            >
                                <span className="text-gray-500">#</span> {ch.name}
                            </Link>
                        ))}
                    </div>

                    {canManageChannels && (
                        <form onSubmit={submit} className="pt-1 flex gap-2">
                            <input
                                type="text"
                                value={data.name}
                                onChange={e => setData('name', e.target.value)}
                                placeholder="nuevo-canal"
                                className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}

                    {channel && (
                        <Link
                            href={route('channels.show', channel.id)}
                            className="inline-block mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
                        >
                            Entrar a #general
                        </Link>
                    )}
                </div>

                {/* Invitación */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
                    <div>
                        <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wide">Invitar personas</h3>
                        <p className="text-gray-500 text-xs mt-0.5">Comparte este enlace para que otros puedan unirse al servidor</p>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-300 font-mono truncate">{inviteUrl}</span>
                        <button
                            onClick={copyInvite}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                                copied
                                    ? 'bg-green-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                        >
                            {copied ? '¡Copiado!' : 'Copiar'}
                        </button>
                    </div>

                    <p className="text-gray-600 text-xs">
                        Código: <span className="font-mono text-gray-400">{server.invite_code}</span>
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
