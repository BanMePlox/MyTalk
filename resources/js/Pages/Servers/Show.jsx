import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';
import ServerSettingsModal from '@/Components/ServerSettingsModal';

export default function Show({ server, channel, canManageChannels, canManageRoles, canKickMembers, isOwner, inviteUrl }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });
    const leaveForm = useForm({});
    const [copied, setCopied] = useState(false);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    function handleLeave() {
        leaveForm.delete(route('servers.leave', server.id));
    }

    function handleDeleteChannel(channelId) {
        router.delete(route('channels.destroy', channelId));
    }

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
        <AuthenticatedLayout header={
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-gray-100">{server.name}</h2>
                {(canManageRoles || canKickMembers || isOwner) && (
                    <button onClick={() => setSettingsOpen(true)}
                        className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                        title="Ajustes del servidor">
                        ⚙️ Ajustes
                    </button>
                )}
            </div>
        }>
            <Head title={server.name} />

            <div className="py-8 max-w-2xl mx-auto px-4 space-y-4">
                {/* Canales */}
                <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
                    <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wide">Canales</h3>

                    {errors.channel && <p className="text-red-400 text-xs">{errors.channel}</p>}

                    <div className="space-y-1">
                        {server.channels?.map((ch) => (
                            <div key={ch.id} className="flex items-center gap-1 group">
                                <Link
                                    href={route('channels.show', ch.id)}
                                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                                >
                                    <span className="text-gray-500">#</span> {ch.name}
                                </Link>

                                {canManageChannels && (
                                    confirmDeleteChannel === ch.id ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleDeleteChannel(ch.id)}
                                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                                            >
                                                Borrar
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteChannel(null)}
                                                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteChannel(ch.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 px-2 py-1 rounded transition-all text-sm"
                                            title="Eliminar canal"
                                        >
                                            🗑
                                        </button>
                                    )
                                )}
                            </div>
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

                {/* Abandonar servidor */}
                {!isOwner && (
                    <div className="bg-gray-900 rounded-xl border border-red-900/40 p-5">
                        <h3 className="font-semibold text-red-400 text-sm uppercase tracking-wide mb-1">Zona de peligro</h3>
                        <p className="text-gray-500 text-xs mb-3">Al abandonar el servidor perderás el acceso a todos sus canales.</p>
                        {leaveForm.errors.leave && (
                            <p className="text-red-400 text-sm mb-2">{leaveForm.errors.leave}</p>
                        )}
                        {confirmLeave ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-300">¿Seguro?</span>
                                <button
                                    onClick={handleLeave}
                                    disabled={leaveForm.processing}
                                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
                                >
                                    Sí, abandonar
                                </button>
                                <button
                                    onClick={() => setConfirmLeave(false)}
                                    className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmLeave(true)}
                                className="text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-700 text-sm px-4 py-1.5 rounded-lg transition-colors"
                            >
                                Abandonar servidor
                            </button>
                        )}
                    </div>
                )}

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

            <ServerSettingsModal
                show={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                server={server}
                roles={server.roles ?? []}
                canManageRoles={canManageRoles}
                canManageChannels={canManageChannels}
                canKickMembers={canKickMembers}
                isOwner={isOwner}
            />
        </AuthenticatedLayout>
    );
}
