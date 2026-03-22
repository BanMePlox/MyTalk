import { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_CONFIG = {
    online: { dot: 'bg-green-500', label: 'En línea' },
    away:   { dot: 'bg-yellow-400', label: 'Ausente' },
    dnd:    { dot: 'bg-red-500',   label: 'No molestar' },
};

function StatusDot({ status, size = 'md' }) {
    const cfg = STATUS_CONFIG[status];
    const ring = size === 'sm' ? 'w-2.5 h-2.5 ring-1' : 'w-3 h-3 ring-2';
    if (!cfg) return <span className={`${ring} rounded-full bg-gray-600 ring-gray-900 inline-block`} />;
    return <span className={`${ring} rounded-full ${cfg.dot} ring-gray-900 inline-block`} />;
}

function Avatar({ user, size = 'md' }) {
    const dims = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-9 h-9 text-base';
    if (user?.avatar_url) {
        return <img src={user.avatar_url} alt={user.name} className={`${dims} rounded-full object-cover shrink-0`} />;
    }
    return (
        <div
            className={`${dims} rounded-full flex items-center justify-center font-bold shrink-0 text-white`}
            style={{ backgroundColor: user?.banner_color ?? '#6366f1' }}
        >
            {user?.name?.[0]?.toUpperCase()}
        </div>
    );
}

export default function Index({ friends: initialFriends, incoming: initialIncoming, outgoing: initialOutgoing, userServers = [] }) {
    const { auth, badges: initialBadges } = usePage().props;
    const [tab, setTab]             = useState('online');
    const [friends, setFriends]     = useState(initialFriends ?? []);
    const [incoming, setIncoming]   = useState(initialIncoming ?? []);
    const [outgoing, setOutgoing]   = useState(initialOutgoing ?? []);
    const [addInput, setAddInput]   = useState('');
    const [addMsg, setAddMsg]       = useState(null); // { type: 'success'|'error', text }
    const [adding, setAdding]       = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [myStatus, setMyStatus]   = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen] = useState(false);
    const [mentionBadges, setMentionBadges] = useState(initialBadges?.mentions ?? {});
    const [dmConversations, setDmConversations] = useState(initialBadges?.dmConversations ?? []);

    const statusMenuRef = useRef(null);

    const totalDmUnread = dmConversations.reduce((s, c) => s + (c.unread ?? 0), 0);

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
            setAddMsg({ type: 'success', text: 'Solicitud enviada.' });
            setAddInput('');
            router.reload({ only: [] });
        } catch (err) {
            const status = err.response?.status;
            if (status === 422) setAddMsg({ type: 'error', text: 'Ya tienes o enviaste una solicitud a este usuario.' });
            else if (status === 404) setAddMsg({ type: 'error', text: 'Usuario no encontrado.' });
            else if (status === 403) setAddMsg({ type: 'error', text: 'No puedes añadirte a ti mismo.' });
            else setAddMsg({ type: 'error', text: 'Error al enviar la solicitud.' });
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
        if (!confirm(`¿Eliminar a ${user.name} de tus amigos?`)) return;
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
            <Head title="Amigos" />

            <div className="flex h-[calc(100vh-3.5rem)] bg-gray-800 text-gray-100">

                {/* Rail de servidores */}
                <nav className="w-[72px] bg-gray-950 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
                    {userServers.map((srv) => {
                        const badge = mentionBadges[srv.id] ?? 0;
                        return (
                            <div key={srv.id} className="flex items-center w-full px-1.5 group">
                                <span className="absolute left-0 w-1 rounded-r-full bg-white transition-all h-0 group-hover:h-5" />
                                <div className="relative">
                                    <Link
                                        href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                        title={srv.name}
                                        className="w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white overflow-hidden"
                                    >
                                        {srv.icon_url
                                            ? <img src={srv.icon_url} alt={srv.name} className="w-full h-full object-cover" />
                                            : srv.name[0].toUpperCase()
                                        }
                                    </Link>
                                    {badge > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div className="mt-1 w-8 border-t border-gray-700" />

                    {/* DMs con unread */}
                    {dmConversations.filter((c) => c.unread > 0).map((conv) => (
                        <div key={conv.id} className="flex items-center w-full px-1.5 group">
                            <div className="relative">
                                <Link
                                    href={route('conversations.show', conv.id)}
                                    title={convDisplayName(conv)}
                                    className={`w-12 h-12 flex items-center justify-center font-bold text-sm transition-all duration-150 overflow-hidden ${conv.type === 'group' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'} bg-gray-700 text-white`}
                                >
                                    {conv.type === 'group' ? (
                                        <span className="w-full h-full flex items-center justify-center text-lg font-bold text-white rounded-2xl"
                                            style={{ backgroundColor: conv.icon_color ?? '#6366f1' }}>
                                            {(conv.name ?? '#')[0].toUpperCase()}
                                        </span>
                                    ) : (
                                        conv.user?.avatar_url
                                            ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                            : <span className="w-full h-full flex items-center justify-center text-lg font-bold text-white"
                                                style={{ backgroundColor: conv.user?.banner_color ?? '#6366f1' }}>
                                                {conv.user?.name?.[0]?.toUpperCase()}
                                              </span>
                                    )}
                                </Link>
                                {conv.unread > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
                                        {conv.unread > 99 ? '99+' : conv.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="relative flex items-center w-full px-1.5">
                        <Link
                            href={route('conversations.index')}
                            title="Mensajes directos"
                            className="w-12 h-12 flex items-center justify-center text-xl text-indigo-300 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-150"
                        >✉</Link>
                    </div>

                    <div className="mt-1 w-8 border-t border-gray-700" />

                    <div className="relative flex items-center w-full px-1.5">
                        <Link
                            href={route('servers.index')}
                            title="Servidores"
                            className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all duration-150"
                        >+</Link>
                    </div>
                </nav>

                {/* Sidebar */}
                <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <span className="font-bold text-white block">Mensajes directos</span>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        <Link
                            href={route('friends.index')}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm bg-gray-700 text-white"
                        >
                            <span className="text-base">👥</span>
                            <span className="truncate flex-1">Amigos</span>
                            {pendingCount > 0 && (
                                <span className="ml-auto min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shrink-0">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                        <div className="h-px bg-gray-700 my-1" />
                        {dmConversations.map((conv) => {
                            const unread = conv.unread ?? 0;
                            return (
                                <Link
                                    key={conv.id}
                                    href={route('conversations.show', conv.id)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white"
                                >
                                    <div className="shrink-0">
                                        {conv.type === 'group' ? (
                                            <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white"
                                                style={{ backgroundColor: conv.icon_color ?? '#6366f1' }}>
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
                                        <span className="ml-auto min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shrink-0">
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Usuario actual */}
                    <div className="p-3 border-t border-gray-700 relative" ref={statusMenuRef}>
                        <button
                            onClick={() => setStatusOpen((o) => !o)}
                            className="flex items-center gap-2 w-full hover:bg-gray-800 rounded px-1 py-1 transition-colors"
                        >
                            <div className="relative shrink-0">
                                <Avatar user={auth.user} size="sm" />
                                <span className="absolute -bottom-0.5 -right-0.5">
                                    <StatusDot status={myStatus} size="sm" />
                                </span>
                            </div>
                            <div className="text-left min-w-0">
                                <p className="text-sm text-gray-200 truncate leading-tight">{auth.user.name}</p>
                                <p className="text-xs text-gray-400 leading-tight">{STATUS_CONFIG[myStatus]?.label}</p>
                            </div>
                        </button>
                        {statusOpen && (
                            <div className="absolute bottom-full left-2 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-44 py-1 z-10">
                                {Object.entries(STATUS_CONFIG).map(([key, { dot, label }]) => (
                                    <button
                                        key={key}
                                        onClick={() => changeStatus(key)}
                                        className={`flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${myStatus === key ? 'text-white' : 'text-gray-300'}`}
                                    >
                                        <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
                                        {label}
                                        {myStatus === key && <span className="ml-auto text-indigo-400">✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Contenido principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <header className="px-4 py-2 border-b border-gray-700 flex items-center gap-1 shrink-0">
                        <span className="font-semibold text-white mr-3">👥 Amigos</span>
                        {[
                            { key: 'online', label: 'En línea' },
                            { key: 'all',    label: 'Todos' },
                            { key: 'pending', label: `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
                            { key: 'add',    label: '+ Añadir amigo' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                    tab === key
                                        ? key === 'add' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'
                                        : key === 'add' ? 'text-green-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
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
                                <h2 className="text-white font-semibold text-lg mb-1">Añadir amigo</h2>
                                <p className="text-gray-400 text-sm mb-4">Puedes añadir amigos usando su ID de usuario.</p>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={addInput}
                                        onChange={(e) => { setAddInput(e.target.value); setAddMsg(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
                                        placeholder="ID de usuario"
                                        className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2.5 outline-none border border-gray-600 focus:border-indigo-500 text-sm"
                                    />
                                    <button
                                        onClick={sendFriendRequest}
                                        disabled={adding || !addInput.trim()}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {adding ? 'Enviando…' : 'Enviar'}
                                    </button>
                                </div>
                                {addMsg && (
                                    <p className={`mt-2 text-sm ${addMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                        {addMsg.text}
                                    </p>
                                )}
                                <p className="mt-3 text-xs text-gray-500">
                                    Tu ID: <span className="font-mono text-gray-300 select-all">{auth.user.id}</span>
                                </p>
                            </div>
                        )}

                        {/* Lista de solicitudes pendientes */}
                        {tab === 'pending' && (
                            <div className="p-4 space-y-6">
                                {incoming.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                            Recibidas — {incoming.length}
                                        </h3>
                                        <div className="space-y-1">
                                            {incoming.map((user) => (
                                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700/50">
                                                    <Avatar user={user} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-400">Solicitud entrante</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => acceptRequest(user)}
                                                            title="Aceptar"
                                                            className="w-8 h-8 rounded-full bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white flex items-center justify-center transition-colors text-sm"
                                                        >✓</button>
                                                        <button
                                                            onClick={() => declineRequest(user)}
                                                            title="Rechazar"
                                                            className="w-8 h-8 rounded-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white flex items-center justify-center transition-colors text-sm"
                                                        >✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {outgoing.length > 0 && (
                                    <section>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                            Enviadas — {outgoing.length}
                                        </h3>
                                        <div className="space-y-1">
                                            {outgoing.map((user) => (
                                                <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700/50">
                                                    <Avatar user={user} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-400">Solicitud pendiente</p>
                                                    </div>
                                                    <button
                                                        onClick={() => cancelRequest(user)}
                                                        title="Cancelar"
                                                        className="w-8 h-8 rounded-full bg-gray-600/40 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-sm shrink-0"
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                                {incoming.length === 0 && outgoing.length === 0 && (
                                    <div className="text-center text-gray-500 py-16">
                                        <p className="text-4xl mb-3">✉️</p>
                                        <p className="text-sm">No tienes solicitudes pendientes.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lista de amigos (online / todos) */}
                        {(tab === 'online' || tab === 'all') && (
                            <div className="p-4">
                                {displayList.length > 0 ? (
                                    <>
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
                                            {tab === 'online' ? 'En línea' : 'Todos los amigos'} — {displayList.length}
                                        </h3>
                                        <div className="space-y-1">
                                            {displayList.map((user) => {
                                                const status = onlineUsers[user.id];
                                                return (
                                                    <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-700/50 group">
                                                        <div className="relative shrink-0">
                                                            <Avatar user={user} />
                                                            <span className="absolute -bottom-0.5 -right-0.5">
                                                                <StatusDot status={status} />
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {status ? STATUS_CONFIG[status]?.label : 'Desconectado'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openDm(user)}
                                                                title="Mensaje"
                                                                className="w-8 h-8 rounded-full bg-gray-600/40 hover:bg-indigo-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors text-sm"
                                                            >💬</button>
                                                            <button
                                                                onClick={() => removeFriend(user)}
                                                                title="Eliminar amigo"
                                                                className="w-8 h-8 rounded-full bg-gray-600/40 hover:bg-red-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-sm"
                                                            >✕</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-gray-500 py-16">
                                        <p className="text-4xl mb-3">{tab === 'online' ? '😴' : '👥'}</p>
                                        <p className="text-sm">
                                            {tab === 'online' ? 'Ningún amigo está en línea.' : 'Todavía no tienes amigos.'}
                                        </p>
                                        {tab === 'all' && (
                                            <button
                                                onClick={() => setTab('add')}
                                                className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm underline"
                                            >
                                                Añadir amigo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );

}
