import { useEffect, useRef, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
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
    const dims = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-9 h-9 text-base';
    if (user?.avatar_url) {
        return <img src={user.avatar_url} alt={user.name} className={`${dims} rounded-full object-cover shrink-0`} />;
    }
    return (
        <div
            className={`${dims} rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0`}
            style={{ backgroundColor: user?.banner_color ?? undefined }}
        >
            {user?.name?.[0]?.toUpperCase()}
        </div>
    );
}

export default function Show({ conversation, other, messages: initialMessages, userServers = [], conversations = [] }) {
    const { auth, badges: initialBadges } = usePage().props;
    const [messages, setMessages] = useState(initialMessages);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [myStatus, setMyStatus] = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen] = useState(false);
    const [mentionBadges, setMentionBadges] = useState(initialBadges?.mentions ?? {});

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const statusMenuRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    useEffect(() => {
        function handleClick(e) {
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
                setStatusOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Presencia en todos los servidores del usuario
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

    // Canal privado de esta conversación
    useEffect(() => {
        const ch = window.Echo.private(`conversation.${conversation.id}`);
        ch.listen('.DirectMessageSent', (e) => {
            if (e.user.id === auth.user.id) return; // ya lo añadimos optimistamente
            setMessages((prev) => [...prev, e]);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
        return () => ch.stopListening('.DirectMessageSent');
    }, [conversation.id]);

    // Menciones en servidores (para badges en el rail)
    useEffect(() => {
        const userChannel = window.Echo.private(`App.Models.User.${auth.user.id}`);
        userChannel.listen('.MentionReceived', (e) => {
            if (e.server_id) {
                setMentionBadges((prev) => ({ ...prev, [e.server_id]: (prev[e.server_id] ?? 0) + 1 }));
            }
        });
        return () => userChannel.stopListening('.MentionReceived');
    }, [auth.user.id]);

    async function changeStatus(status) {
        setStatusOpen(false);
        setMyStatus(status);
        setOnlineUsers((prev) => ({ ...prev, [auth.user.id]: status }));
        await window.axios.patch(route('user.status'), { status });
    }

    async function submit(e) {
        e.preventDefault();
        if (!content.trim() || sending) return;
        const text = content.trim();
        setContent('');
        setSending(true);
        const optimistic = {
            id: `tmp-${Date.now()}`,
            content: text,
            created_at: new Date().toISOString(),
            user: { id: auth.user.id, name: auth.user.name, avatar_url: auth.user.avatar_url, banner_color: auth.user.banner_color },
        };
        setMessages((prev) => [...prev, optimistic]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        try {
            const res = await window.axios.post(route('conversations.store', conversation.id), { content: text });
            setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setContent(text);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }

    const otherStatus = onlineUsers[other?.id];

    return (
        <AuthenticatedLayout>
            <Head title={`@ ${other?.name}`} />

            <div className="flex h-[calc(100vh-3.5rem)] bg-gray-800 text-gray-100">

                {/* Rail de servidores */}
                <nav className="w-[72px] bg-gray-950 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
                    {userServers.map((srv) => {
                        const badge = mentionBadges[srv.id] ?? 0;
                        return (
                            <div key={srv.id} className="relative flex items-center w-full px-1.5 group">
                                <span className="absolute left-0 w-1 rounded-r-full bg-white transition-all h-0 group-hover:h-5" />
                                <Link
                                    href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                    title={srv.name}
                                    className="relative w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white"
                                >
                                    {srv.name[0].toUpperCase()}
                                    {badge > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950">
                                            {badge > 99 ? '99+' : badge}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        );
                    })}
                    <div className="mt-1 w-8 border-t border-gray-700" />

                    {/* DMs activo */}
                    <div className="relative flex items-center w-full px-1.5 group">
                        <span className="absolute left-0 w-1 h-8 rounded-r-full bg-white" />
                        <Link
                            href={route('conversations.index')}
                            title="Mensajes directos"
                            className="w-12 h-12 flex items-center justify-center text-xl text-white bg-indigo-500 rounded-2xl transition-all duration-150"
                        >
                            ✉
                        </Link>
                    </div>

                    <div className="relative flex items-center w-full px-1.5 group">
                        <Link
                            href={route('servers.index')}
                            title="Servidores"
                            className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all duration-150"
                        >
                            +
                        </Link>
                    </div>
                </nav>

                {/* Sidebar izquierdo: conversaciones */}
                <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
                    <div className="px-4 py-3 border-b border-gray-700">
                        <span className="font-bold text-white block">Mensajes directos</span>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                        {conversations.map((conv) => {
                            const peer = conv.users?.[0];
                            if (!peer) return null;
                            const isActive = conv.id === conversation.id;
                            const peerStatus = onlineUsers[peer.id];
                            return (
                                <Link
                                    key={conv.id}
                                    href={route('conversations.show', conv.id)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                                        isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar user={peer} size="sm" />
                                        <span className="absolute -bottom-0.5 -right-0.5">
                                            <StatusDot status={peerStatus} size="sm" />
                                        </span>
                                    </div>
                                    <span className="truncate">{peer.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Usuario actual + selector de estado */}
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

                {/* Área principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header con info del otro usuario */}
                    <header className="px-4 py-3 border-b border-gray-700 flex items-center gap-3 shrink-0">
                        <div className="relative">
                            <Avatar user={other} size="sm" />
                            <span className="absolute -bottom-0.5 -right-0.5">
                                <StatusDot status={otherStatus} size="sm" />
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold text-white">{other?.name}</span>
                            <p className="text-xs text-gray-400 leading-none">
                                {otherStatus ? STATUS_CONFIG[otherStatus]?.label : 'Desconectado'}
                            </p>
                        </div>
                    </header>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                                <Avatar user={msg.user} />
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-white">{msg.user?.name}</span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${String(msg.id).startsWith('tmp-') ? 'text-gray-500' : 'text-gray-300'}`}>
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 px-4 pb-4">
                        <form onSubmit={submit} className="flex gap-2 bg-gray-700 rounded-lg px-4 py-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={`Mensaje a ${other?.name}`}
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={sending || !content.trim()}
                                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                            >
                                Enviar
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
