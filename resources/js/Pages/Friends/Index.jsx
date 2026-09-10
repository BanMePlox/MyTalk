import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';
import { notify } from '@/Hooks/useNotify';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ServerModal from '@/Components/ServerModal';
import { useTheme } from '@/Contexts/ThemeContext';
import ProfileModal from '@/Components/ProfileModal';
import ServerRail from '@/Components/ServerRail';

const STATUS_CONFIG = {
    online: { dot: 'bg-green-500' },
    away:   { dot: 'bg-yellow-400' },
    dnd:    { dot: 'bg-red-500' },
};

function StatusDot({ status, size = 'md' }) {
    const cfg = STATUS_CONFIG[status];
    const ring = size === 'sm' ? 'w-2.5 h-2.5 ring-1' : 'w-3 h-3 ring-2';
    if (!cfg) return <span className={`${ring} rounded-full bg-bg-muted ring-bg inline-block`} />;
    return <span className={`${ring} rounded-full ${cfg.dot} ring-bg inline-block`} />;
}

function Avatar({ user, size = 'md' }) {
    const dims = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-9 h-9 text-base';
    if (user?.avatar_url) {
        return <img src={user.avatar_url} alt={user.name} className={`${dims} rounded-full object-cover shrink-0`} />;
    }
    return (
        <div
            className={`${dims} rounded-full flex items-center justify-center font-bold shrink-0 text-text-on-accent`}
            style={{ backgroundColor: user?.banner_color ?? '#3F6F5B' }}
        >
            {user?.name?.[0]?.toUpperCase()}
        </div>
    );
}

export default function Index({ friends: initialFriends, incoming: initialIncoming, outgoing: initialOutgoing, userServers = [], userFolders = [] }) {
    const { auth, badges: initialBadges } = usePage().props;
    const t = useTrans();
    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [tab, setTab]             = useState('online');
    const [friends, setFriends]     = useState(initialFriends ?? []);
    const [incoming, setIncoming]   = useState(initialIncoming ?? []);
    const [outgoing, setOutgoing]   = useState(initialOutgoing ?? []);
    const [addInput, setAddInput]   = useState('');
    const [addMsg, setAddMsg]       = useState(null); // { type: 'success'|'error', text }
    const [adding, setAdding]       = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    const { dark, toggle: toggleTheme } = useTheme();
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [myStatus, setMyStatus]   = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen] = useState(false);
    const [mentionBadges, setMentionBadges] = useState(initialBadges?.mentions ?? {});
    const [dmConversations, setDmConversations] = useState(initialBadges?.dmConversations ?? []);
    const [mobileSidebar, setMobileSidebar] = useState(false);

    const statusMenuRef = useRef(null);



    useEffect(() => {
        function handleClick(e) {
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) setStatusOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Presencia
    useEffect(() => {
        if (!userServers.length) return;
        userServers.forEach((srv) => {
            window.Echo.join(`presence-server.${srv.id}`)
                .here((users) => {
                    setOnlineUsers((prev) => {
                        const map = { ...prev };
                        users.forEach((u) => { map[u.id] = u.status; });
                        return map;
                    });
                })
                .joining((user) => setOnlineUsers((prev) => ({ ...prev, [user.id]: user.status })))
                .leaving((user) => {
                    setOnlineUsers((prev) => { const next = { ...prev }; delete next[user.id]; return next; });
                })
                .listen('UserStatusChanged', (e) => {
                    setOnlineUsers((prev) => ({ ...prev, [e.user_id]: e.status }));
                    if (e.user_id === auth.user.id) setMyStatus(e.status);
                });
        });
        return () => userServers.forEach((srv) => window.Echo.leave(`presence-server.${srv.id}`));
    }, [userServers.map((s) => s.id).join(',')]);

    // Canal privado del usuario: solicitudes de amistad + DMs
    useEffect(() => {
        const userChannel = window.Echo.private(`App.Models.User.${auth.user.id}`);

        userChannel.listen('.FriendRequestReceived', (e) => {
            setIncoming((prev) => {
                if (prev.find((u) => u.id === e.sender_id)) return prev;
                return [...prev, { id: e.sender_id, name: e.sender_name, avatar_url: e.sender_avatar_url }];
            });
        });

        userChannel.listen('.FriendRequestAccepted', (e) => {
            // Move from outgoing to friends
            setOutgoing((prev) => prev.filter((u) => u.id !== e.user_id));
            setFriends((prev) => {
                if (prev.find((u) => u.id === e.user_id)) return prev;
                return [...prev, { id: e.user_id, name: e.name, avatar_url: e.avatar_url }];
            });
        });

        userChannel.listen('.MentionReceived', (e) => {
            if (e.server_id) setMentionBadges((prev) => ({ ...prev, [e.server_id]: (prev[e.server_id] ?? 0) + 1 }));
        });

        userChannel.listen('.NewDirectMessage', (e) => {
            setDmConversations((prev) => {
                const exists = prev.find((c) => c.id === e.conversation_id);
                if (exists) return prev.map((c) => c.id === e.conversation_id ? { ...c, unread: (c.unread ?? 0) + 1 } : c);
                if (e.is_group) {
                    return [...prev, { id: e.conversation_id, type: 'group', unread: 1, name: e.group_name, icon_color: e.group_icon_color, user: null }];
                }
                return [...prev, { id: e.conversation_id, type: 'direct', unread: 1, user: { id: e.sender_id, name: e.sender, avatar_url: e.sender_avatar, banner_color: e.sender_banner_color } }];
            });
            notify(`Mensaje de ${e.sender}`, e.content);
        });

        return () => {
            userChannel.stopListening('.FriendRequestReceived');
            userChannel.stopListening('.FriendRequestAccepted');
            userChannel.stopListening('.MentionReceived');
            userChannel.stopListening('.NewDirectMessage');
        };
    }, [auth.user.id]);

    async function sendFriendRequest() {
        if (!addInput.trim() || adding) return;
        setAdding(true);
        setAddMsg(null);
        try {
            await window.axios.post(route('friends.store', { user: parseInt(addInput.trim()) }));
            setAddMsg({ type: 'success', text: t('friends.request_sent') });
            setAddInput('');
            router.reload({ only: [] });
        } catch (err) {
            const status = err.response?.status;
            if (status === 422) setAddMsg({ type: 'error', text: t('friends.error_already') });
            else if (status === 404) setAddMsg({ type: 'error', text: t('friends.error_not_found') });
            else if (status === 403) setAddMsg({ type: 'error', text: t('friends.error_self') });
            else setAddMsg({ type: 'error', text: t('friends.error_generic') });
        } finally {
            setAdding(false);
        }
    }

    async function acceptRequest(user) {
        try {
            await window.axios.patch(route('friends.update', { user: user.id }));
            setIncoming((prev) => prev.filter((u) => u.id !== user.id));
            setFriends((prev) => [...prev, { ...user }]);
        } catch {
            // ignore
        }
    }

    async function declineRequest(user) {
        try {
            await window.axios.delete(route('friends.destroy', { user: user.id }));
            setIncoming((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            // ignore
        }
    }

    async function cancelRequest(user) {
        try {
            await window.axios.delete(route('friends.destroy', { user: user.id }));
            setOutgoing((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            // ignore
        }
    }

    async function removeFriend(user) {
        if (!confirm(t('friends.remove_confirm', { name: user.name }))) return;
        try {
            await window.axios.delete(route('friends.destroy', { user: user.id }));
            setFriends((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            // ignore
        }
    }

    function openDm(user) {
        router.post(route('conversations.open', user.id));
    }

    async function changeStatus(status) {
        setStatusOpen(false);
        setMyStatus(status);
        setOnlineUsers((prev) => ({ ...prev, [auth.user.id]: status }));
        await window.axios.patch(route('user.status'), { status });
    }

    const onlineFriends = friends.filter((f) => onlineUsers[f.id]);
    const displayList   = tab === 'online' ? onlineFriends : tab === 'all' ? friends : tab === 'pending' ? [] : [];
    const pendingCount  = incoming.length + outgoing.length;

    const convDisplayName = (conv) => {
        if (conv.type === 'group') return conv.name ?? 'Grupo';
        return conv.user?.name ?? '';
    };

    return (
        <AuthenticatedLayout>
            <Head title={t('friends.title')} />

            <div className="flex h-screen bg-bg-elevated text-text sm:pb-0 pb-14">

                <ServerRail
                    userServers={userServers}
                    userFolders={userFolders}
                    mentionBadges={mentionBadges}
                    dmConversations={dmConversations}
                    pendingFriendRequests={incoming.length}
                    onAddServer={() => setServerModalOpen(true)}
                />
                {serverModalOpen && <ServerModal onClose={() => setServerModalOpen(false)} />}
                {profileModalOpen && <ProfileModal onClose={() => setProfileModalOpen(false)} />}

                {mobileSidebar && (
                    <div className="fixed inset-0 z-40 sm:hidden overlay-backdrop" onClick={() => setMobileSidebar(false)} />
                )}
                {/* Sidebar */}
                <aside className={`${mobileSidebar ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden sm:flex'} w-52 bg-bg flex-col shrink-0`}>
                    <div className="px-4 py-3 border-b border-border">
                        <span className="font-bold text-text-on-accent block">{t('nav.direct_messages')}</span>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        <Link
                            href={route('friends.index')}
                            prefetch
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm channel-active"
                        >
                            <span className="text-base">👥</span>
                            <span className="truncate flex-1">{t('nav.friends')}</span>
                            {pendingCount > 0 && (
                                <span className="ml-auto min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shrink-0">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                        <div className="h-px bg-bg-muted my-1" />
                        {dmConversations.map((conv) => {
                            const unread = conv.unread ?? 0;
                            return (
                                <Link
                                    key={conv.id}
                                    href={route('conversations.show', conv.id)}
                                    prefetch
                                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-text-secondary hover:bg-bg-muted hover:text-text"
                                >
                                    <div className="shrink-0">
                                        {conv.type === 'group' ? (
                                            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-text-on-accent"
                                                style={{ backgroundColor: conv.icon_color ?? '#3F6F5B' }}>
                                                {(conv.name ?? '#')[0].toUpperCase()}
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Avatar user={conv.user} size="sm" />
                                                <span className="absolute -bottom-0.5 -right-0.5">
                                                    <StatusDot status={onlineUsers[conv.user?.id]} size="sm" />
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <span className="truncate flex-1">{convDisplayName(conv)}</span>
                                    {unread > 0 && (
                                        <span className="ml-auto min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shrink-0">
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Usuario actual */}
                    <div className="p-3 border-t border-border relative" ref={statusMenuRef}>
                        <button
                            onClick={() => setStatusOpen((o) => !o)}
                            className="flex items-center gap-2 w-full hover:bg-bg-elevated rounded px-1 py-1 transition-colors"
                        >
                            <div className="relative shrink-0">
                                <Avatar user={auth.user} size="sm" />
                                <span className="absolute -bottom-0.5 -right-0.5">
                                    <StatusDot status={myStatus} size="sm" />
                                </span>
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-sm text-text truncate leading-tight">{auth.user.name}</p>
                                <p className="text-xs text-text-secondary leading-tight">{t('status.' + (myStatus ?? 'online'))}</p>
                            </div>
                        </button>
                        {statusOpen && (
                            <div className="absolute bottom-full left-2 mb-1 bg-bg-elevated border border-border rounded-lg shadow-xl w-44 py-1 z-10">
                                {Object.entries(STATUS_CONFIG).map(([key, { dot }]) => (
                                    <button
                                        key={key}
                                        onClick={() => changeStatus(key)}
                                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-bg-muted transition-colors ${myStatus === key ? 'text-text' : 'text-text-secondary'}`}
                                    >
                                        <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                                        {t('status.' + key)}
                                        {myStatus === key && <span className="ml-auto text-accent">✓</span>}
                                    </button>
                                ))}
                                <div className="border-t border-border mt-1 pt-1">
                                    <button onClick={toggleTheme} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted transition-colors">
                                        {dark ? t('status.light_mode') : t('status.dark_mode')}
                                    </button>
                                    <button onClick={() => { setStatusOpen(false); setProfileModalOpen(true); }} className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted transition-colors">
                                        {t('status.my_profile')}
                                    </button>
                                    <Link href={route('logout')} method="post" as="button" className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:bg-bg-muted transition-colors">
                                        {t('status.logout')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Contenido principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <header className="px-4 py-2 border-b border-border flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setMobileSidebar(v => !v)} className="sm:hidden text-text-secondary hover:text-text mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <span className="font-semibold text-text mr-3 sm:inline hidden">👥 {t('nav.friends')}</span>
                        {[
                            { key: 'online',  label: t('friends.tab_online') },
                            { key: 'all',     label: t('friends.tab_all') },
                            { key: 'pending', label: `${t('friends.tab_pending')}${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                            { key: 'add',     label: `+ ${t('friends.add_friend')}` },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    tab === key
                                        ? key === 'add' ? 'bg-green-600 text-text-on-accent' : 'bg-bg-muted text-text'
                                        : key === 'add' ? 'text-green-400 hover:bg-bg-muted' : 'text-text-secondary hover:bg-bg-muted hover:text-text'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </header>

                    <div className="flex-1 overflow-y-auto">
                        {/* Añadir amigo */}
                        {tab === 'add' && (
                            <div className="max-w-xl mx-auto px-6 py-8">
                                <h2 className="text-text font-semibold text-lg mb-1">{t('friends.add_title')}</h2>
                                <p className="text-text-secondary text-sm mb-4">{t('friends.add_description')}</p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={addInput}
                                        onChange={(e) => { setAddInput(e.target.value); setAddMsg(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
                                        placeholder={t('friends.user_id_ph')}
                                        className="input-field flex-1 text-sm"
                                    />
                                    <button
                                        onClick={sendFriendRequest}
                                        disabled={adding || !addInput.trim()}
                                        className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                                    >
                                        {adding ? t('friends.sending') : t('friends.send')}
                                    </button>
                                </div>
                                {addMsg && (
                                    <p className={`mt-2 text-sm ${addMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {addMsg.text}
                                    </p>
                                )}
                                <p className="mt-3 text-xs text-text-muted">
                                    {t('friends.your_id')} <span className="font-mono text-text-secondary select-all">{auth.user.id}</span>
                                </p>
                            </div>
                        )}

                        {/* Lista de solicitudes pendientes */}
                        {tab === 'pending' && (
                            <div className="p-4 space-y-6">
                                {incoming.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
                                            {t('friends.received_header', { count: incoming.length })}
                                        </h3>
                                        <div className="space-y-1">
                                            {incoming.map((user) => (
                                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-muted/50">
                                                    <Avatar user={user} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-text truncate">{user.name}</p>
                                                        <p className="text-xs text-text-secondary">{t('friends.incoming_request')}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => acceptRequest(user)}
                                                            title={t('friends.accept')}
                                                            className="w-8 h-8 rounded-full bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-text-on-accent flex items-center justify-center transition-colors text-sm"
                                                        >✓</button>
                                                        <button
                                                            onClick={() => declineRequest(user)}
                                                            title={t('friends.decline')}
                                                            className="w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-text-on-accent flex items-center justify-center transition-colors text-sm"
                                                        >✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {outgoing.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
                                            {t('friends.sent_header', { count: outgoing.length })}
                                        </h3>
                                        <div className="space-y-1">
                                            {outgoing.map((user) => (
                                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-muted/50">
                                                    <Avatar user={user} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-text truncate">{user.name}</p>
                                                        <p className="text-xs text-text-secondary">{t('friends.pending_request')}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => cancelRequest(user)}
                                                        title={t('friends.cancel')}
                                                        className="w-8 h-8 rounded-full bg-bg-muted/40 hover:bg-bg-muted text-text-secondary hover:text-text flex items-center justify-center transition-colors text-sm shrink-0"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {incoming.length === 0 && outgoing.length === 0 && (
                                    <div className="text-center text-text-muted py-16">
                                        <p className="text-4xl mb-3">✉️</p>
                                        <p className="text-sm">{t('friends.no_pending')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lista de amigos (online / todos) */}
                        {(tab === 'online' || tab === 'all') && (
                            <div className="p-4">
                                {displayList.length > 0 ? (
                                    <>
                                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">
                                            {tab === 'online'
                                                ? t('friends.online_header', { count: displayList.length })
                                                : t('friends.all_header', { count: displayList.length })}
                                        </h3>
                                        <div className="space-y-1">
                                            {displayList.map((user) => {
                                                const status = onlineUsers[user.id];
                                                return (
                                                    <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-muted/50 group">
                                                        <div className="relative shrink-0">
                                                            <Avatar user={user} />
                                                            <span className="absolute -bottom-0.5 -right-0.5">
                                                                <StatusDot status={status} />
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-text truncate">{user.name}</p>
                                                            <p className="text-xs text-text-secondary">
                                                                {t('status.' + (status ?? 'offline'))}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openDm(user)}
                                                                title={t('friends.message')}
                                                                className="w-8 h-8 rounded-full bg-bg-muted/40 hover:bg-accent text-text-secondary hover:text-text-on-accent flex items-center justify-center transition-colors text-sm"
                                                            >💬</button>
                                                            <button
                                                                onClick={() => removeFriend(user)}
                                                                title={t('friends.remove')}
                                                                className="w-8 h-8 rounded-full bg-bg-muted/40 hover:bg-red-600 text-text-secondary hover:text-text-on-accent flex items-center justify-center transition-colors text-sm"
                                                            >✕</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-text-muted py-16">
                                        <p className="text-4xl mb-3">{tab === 'online' ? '😴' : '👥'}</p>
                                        <p className="text-sm">
                                            {tab === 'online' ? t('friends.no_online') : t('friends.no_friends')}
                                        </p>
                                        {tab === 'all' && (
                                            <button
                                                onClick={() => setTab('add')}
                                                className="mt-3 text-accent hover:text-accent text-sm underline"
                                            >
                                                {t('friends.add_link')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Barra de navegación inferior — solo móvil */}
            <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-bg-muted border-t border-border flex items-center z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex-1 flex items-center gap-2 overflow-x-auto px-2 py-2 no-scrollbar">
                    {userServers.map((srv) => {
                        const badge = mentionBadges[srv.id] ?? 0;
                        return (
                            <div key={srv.id} className="relative shrink-0">
                                <Link
                                    href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                    prefetch
                                    className="w-10 h-10 flex items-center justify-center font-bold text-sm rounded-xl overflow-hidden bg-bg-muted text-text-secondary"
                                >
                                    {srv.icon_url ? <img src={srv.icon_url} alt={srv.name} className="w-full h-full object-cover" /> : srv.name[0].toUpperCase()}
                                </Link>
                                {badge > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-500 text-text text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="w-px h-8 bg-bg-elevated shrink-0" />
                <div className="flex items-center gap-2 px-2 py-2 shrink-0">
                    {[...dmConversations].sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0)).slice(0, 2).map((conv) => (
                        <div key={conv.id} className="relative">
                            <Link href={route('conversations.show', conv.id)} className="w-10 h-10 rounded-xl overflow-hidden bg-bg-muted flex items-center justify-center">
                                {conv.type === 'group'
                                    ? <span className="w-full h-full flex items-center justify-center text-sm font-bold text-text-on-accent" style={{ backgroundColor: conv.icon_color ?? '#3F6F5B' }}>{(conv.name ?? '#')[0].toUpperCase()}</span>
                                    : conv.user?.avatar_url
                                        ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                        : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-text-on-accent" style={{ backgroundColor: conv.user?.banner_color ?? '#3F6F5B' }}>{conv.user?.name?.[0]?.toUpperCase()}</span>
                                }
                            </Link>
                            {conv.unread > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-500 text-text text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                                    {conv.unread > 99 ? '99+' : conv.unread}
                                </span>
                            )}
                        </div>
                    ))}
                    <Link href={route('friends.index')} prefetch className="w-10 h-10 flex items-center justify-center text-accent channel-active rounded-xl text-lg" title="Amigos">👥</Link>
                </div>
            </nav>
        </AuthenticatedLayout>
    );

}
