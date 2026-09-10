import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useState } from 'react';
import ServerSettingsModal from '@/Components/ServerSettingsModal';
import { useTrans } from '@/Hooks/useTrans';

export default function Show({ server, channel, canManageChannels, canManageRoles, canKickMembers, isOwner, inviteUrl }) {
    const t = useTrans();
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
                <h2 className="text-xl font-semibold text-text">{server.name}</h2>
                {(canManageRoles || canKickMembers || isOwner) && (
                    <button onClick={() => setSettingsOpen(true)}
                        className="text-sm text-text-secondary hover:text-text px-2 py-1 rounded hover:bg-bg-muted transition-colors"
                        title={t('settings.server_settings', { name: server.name })}>
                        ⚙️ {t('server.settings')}
                    </button>
                )}
            </div>
        }>
            <Head title={server.name} />

            <div className="py-8 max-w-2xl mx-auto px-4 space-y-4">
                {/* Canales */}
                <div className="bg-bg rounded-xl border border-border p-5 space-y-3">
                    <h3 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">{t('server.channels_title')}</h3>

                    {errors.channel && <p className="text-red-400 text-xs">{errors.channel}</p>}

                    <div className="space-y-1">
                        {server.channels?.map((ch) => (
                            <div key={ch.id} className="flex items-center gap-1 group">
                                <Link
                                    href={route('channels.show', ch.id)}
                                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-elevated text-text-secondary hover:text-text transition-colors"
                                >
                                    <span className="text-text-muted">#</span> {ch.name}
                                </Link>

                                {canManageChannels && (
                                    confirmDeleteChannel === ch.id ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => handleDeleteChannel(ch.id)}
                                                className="text-xs bg-red-600 hover:bg-red-700 text-text-on-accent px-2 py-1 rounded"
                                            >
                                                {t('server.delete_channel')}
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteChannel(null)}
                                                className="text-xs text-text-secondary hover:text-text px-2 py-1 rounded hover:bg-bg-elevated"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteChannel(ch.id)}
                                            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 px-2 py-1 rounded transition-all text-sm"
                                            title={t('server.delete_channel_title')}
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
                                placeholder={t('server.channel_ph')}
                                className="flex-1 bg-bg-elevated border border-border text-text placeholder-text-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            />
                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-accent text-text-on-accent px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
                            >
                                {t('server.add_channel')}
                            </button>
                        </form>
                    )}
                    {errors.name && <p className="text-red-400 text-sm">{errors.name}</p>}

                    {channel && (
                        <Link
                            href={route('channels.show', channel.id)}
                            className="inline-block mt-2 bg-accent text-text-on-accent px-4 py-2 rounded-lg hover:opacity-90 text-sm"
                        >
                            {t('server.enter_general')}
                        </Link>
                    )}
                </div>

                {/* Abandonar servidor */}
                {!isOwner && (
                    <div className="bg-bg rounded-xl border border-red-900/40 p-5">
                        <h3 className="font-semibold text-red-400 text-sm uppercase tracking-wide mb-1">{t('server.danger_zone')}</h3>
                        <p className="text-text-muted text-xs mb-3">{t('server.leave_warning')}</p>
                        {leaveForm.errors.leave && (
                            <p className="text-red-400 text-sm mb-2">{leaveForm.errors.leave}</p>
                        )}
                        {confirmLeave ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-text-secondary">{t('server.are_you_sure')}</span>
                                <button
                                    onClick={handleLeave}
                                    disabled={leaveForm.processing}
                                    className="bg-red-600 hover:bg-red-700 text-text-on-accent text-sm px-4 py-1.5 rounded-lg disabled:opacity-50"
                                >
                                    {t('server.confirm_leave')}
                                </button>
                                <button
                                    onClick={() => setConfirmLeave(false)}
                                    className="text-text-secondary hover:text-text text-sm px-3 py-1.5 rounded-lg hover:bg-bg-elevated"
                                >
                                    {t('settings.cancel')}
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmLeave(true)}
                                className="text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-700 text-sm px-4 py-1.5 rounded-lg transition-colors"
                            >
                                {t('server.leave_server')}
                            </button>
                        )}
                    </div>
                )}

                {/* Invitación */}
                <div className="bg-bg rounded-xl border border-border p-5 space-y-3">
                    <div>
                        <h3 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">{t('server.invite_people')}</h3>
                        <p className="text-text-muted text-xs mt-0.5">{t('server.invite_description')}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-bg-elevated border border-border rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-text-secondary font-mono truncate">{inviteUrl}</span>
                        <button
                            onClick={copyInvite}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                                copied
                                    ? 'bg-green-600 text-text-on-accent'
                                    : 'bg-accent hover:opacity-90 text-text-on-accent'
                            }`}
                        >
                            {copied ? t('server.copied') : t('server.copy')}
                        </button>
                    </div>

                    <p className="text-text-muted text-xs">
                        {t('server.code')} <span className="font-mono text-text-secondary">{server.invite_code}</span>
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
