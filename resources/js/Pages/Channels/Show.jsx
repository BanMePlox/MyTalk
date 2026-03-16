import { useEffect, useRef, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_CONFIG = {
    online: { dot: 'bg-green-500', label: 'En línea' },
    away:   { dot: 'bg-yellow-400', label: 'Ausente' },
    dnd:    { dot: 'bg-red-500',   label: 'No molestar' },
};

const ROLE_LABEL = { owner: 'Propietario', admin: 'Admin' };
const ROLE_COLOR = { owner: 'text-yellow-400', admin: 'text-indigo-400' };

function StatusDot({ status, size = 'md' }) {
    const cfg = STATUS_CONFIG[status];
    const ring = size === 'sm' ? 'w-2.5 h-2.5 ring-1' : 'w-3 h-3 ring-2';
    if (!cfg) return <span className={`${ring} rounded-full bg-gray-600 ring-gray-900 inline-block`} />;
    return <span className={`${ring} rounded-full ${cfg.dot} ring-gray-900 inline-block`} />;
}

export default function Show({ channel, messages: initialMessages }) {
    const { auth } = usePage().props;
    const [messages, setMessages] = useState(initialMessages);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialMessages.length === 50);

    // { userId: status } — solo usuarios actualmente conectados
    const [onlineUsers, setOnlineUsers] = useState({});
    const [myStatus, setMyStatus] = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const statusMenuRef = useRef(null);

    // Scroll al fondo al montar
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    // Cerrar menú de estado al hacer clic fuera
    useEffect(() => {
        function handleClick(e) {
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
                setStatusOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Canal de presencia del servidor
    useEffect(() => {
        const presence = window.Echo.join(`presence-server.${channel.server_id}`)
            .here((users) => {
                const map = {};
                users.forEach((u) => { map[u.id] = u.status; });
                setOnlineUsers(map);
            })
            .joining((user) => {
                setOnlineUsers((prev) => ({ ...prev, [user.id]: user.status }));
            })
            .leaving((user) => {
                setOnlineUsers((prev) => {
                    const next = { ...prev };
                    delete next[user.id];
                    return next;
                });
            })
            .listen('UserStatusChanged', (e) => {
                setOnlineUsers((prev) => ({ ...prev, [e.user_id]: e.status }));
                if (e.user_id === auth.user.id) setMyStatus(e.status);
            });

        return () => window.Echo.leave(`presence-server.${channel.server_id}`);
    }, [channel.server_id]);

    // Canal de mensajes en tiempo real
    useEffect(() => {
        const echoChannel = window.Echo.private(`channel.${channel.id}`);
        echoChannel.listen('MessageSent', (e) => {
            setMessages((prev) => [...prev, e]);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
        return () => echoChannel.stopListening('MessageSent');
    }, [channel.id]);

    async function changeStatus(status) {
        setStatusOpen(false);
        setMyStatus(status);
        setOnlineUsers((prev) => ({ ...prev, [auth.user.id]: status }));
        await window.axios.patch(route('user.status'), { status });
    }

    async function loadMore() {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        const oldestId = messages[0]?.id;
        const container = containerRef.current;
        const prevScrollHeight = container?.scrollHeight;
        try {
            const res = await window.axios.get(route('messages.more', channel.id), {
                params: { before: oldestId },
            });
            const older = res.data;
            setMessages((prev) => [...older, ...prev]);
            setHasMore(older.length === 50);
            requestAnimationFrame(() => {
                if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
            });
        } finally {
            setLoadingMore(false);
        }
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
            user: { id: auth.user.id, name: auth.user.name },
        };
        setMessages((prev) => [...prev, optimistic]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        try {
            const res = await window.axios.post(route('messages.store', channel.id), { content: text });
            setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setContent(text);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title={`#${channel.name}`} />

            <div className="flex h-screen bg-gray-800 text-gray-100">
                {/* Sidebar izquierdo: canales */}
                <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
                    <div className="p-4 border-b border-gray-700">
                        <Link href={route('servers.show', channel.server_id)} className="font-bold text-white hover:text-indigo-300">
                            {channel.server?.name}
                        </Link>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                        {channel.server?.channels?.map((ch) => (
                            <Link
                                key={ch.id}
                                href={route('channels.show', ch.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                                    ch.id === channel.id
                                        ? 'bg-gray-700 text-white'
                                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <span className="text-gray-500">#</span> {ch.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Usuario actual + selector de estado */}
                    <div className="p-3 border-t border-gray-700 relative" ref={statusMenuRef}>
                        <button
                            onClick={() => setStatusOpen((o) => !o)}
                            className="flex items-center gap-2 w-full hover:bg-gray-800 rounded px-1 py-1 transition-colors"
                        >
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
                                    {auth.user.name[0].toUpperCase()}
                                </div>
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

                {/* Área principal: mensajes */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="px-4 py-3 border-b border-gray-700 font-semibold shrink-0">
                        # {channel.name}
                    </header>

                    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="w-full text-center text-xs text-gray-400 hover:text-gray-200 py-2 disabled:opacity-50 transition-colors"
                            >
                                {loadingMore ? 'Cargando...' : '↑ Cargar mensajes anteriores'}
                            </button>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                                <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">
                                    {msg.user?.name?.[0]?.toUpperCase()}
                                </div>
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

                    <form onSubmit={submit} className="p-4 border-t border-gray-700 shrink-0">
                        <div className="flex gap-2 bg-gray-700 rounded-lg px-4 py-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={`Mensaje en #${channel.name}`}
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={sending || !content.trim()}
                                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                            >
                                Enviar
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar derecho: miembros */}
                <aside className="w-48 bg-gray-900 flex flex-col shrink-0 border-l border-gray-700">
                    <div className="px-3 py-3 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Miembros &mdash; {channel.server?.members?.length ?? 0}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {channel.server?.members?.map((member) => {
                            const status = onlineUsers[member.id];
                            return (
                                <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                                    <div className="relative shrink-0">
                                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                                            {member.name[0].toUpperCase()}
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5">
                                            <StatusDot status={status} size="sm" />
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm truncate ${status ? 'text-gray-200' : 'text-gray-500'}`}>
                                            {member.name}
                                        </p>
                                        {ROLE_LABEL[member.pivot?.role] && (
                                            <p className={`text-xs ${ROLE_COLOR[member.pivot?.role]}`}>
                                                {ROLE_LABEL[member.pivot?.role]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>
        </AuthenticatedLayout>
    );
}
