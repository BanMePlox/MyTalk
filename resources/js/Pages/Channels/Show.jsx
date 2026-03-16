import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

const STATUS_CONFIG = {
    online: { dot: 'bg-green-500', label: 'En línea' },
    away:   { dot: 'bg-yellow-400', label: 'Ausente' },
    dnd:    { dot: 'bg-red-500',   label: 'No molestar' },
};

const ROLE_LABEL = { owner: 'Propietario', admin: 'Admin' };
const ROLE_COLOR = { owner: 'text-yellow-400', admin: 'text-indigo-400' };

function formatTyping(names) {
    if (names.length === 1) return `${names[0]} está escribiendo...`;
    if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo...`;
    return 'Varios usuarios están escribiendo...';
}

function TypingDots() {
    return (
        <span className="inline-flex gap-0.5 mr-1.5 align-middle">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-gray-400 inline-block animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </span>
    );
}

// Resalta @Nombre en el contenido del mensaje
function renderContent(text, members = [], selfName = '') {
    if (!members.length) return text;

    const escaped = [...members]
        .sort((a, b) => b.name.length - a.name.length)
        .map(m => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const parts = text.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'));

    return parts.map((part, i) => {
        if (part.startsWith('@')) {
            const isSelf = part.slice(1) === selfName;
            return (
                <span key={i} className={`rounded px-0.5 font-medium ${
                    isSelf ? 'bg-yellow-500/20 text-yellow-300' : 'bg-indigo-500/20 text-indigo-300'
                }`}>
                    {part}
                </span>
            );
        }
        return part;
    });
}

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
        <div className={`${dims} rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0`}
            style={{ backgroundColor: user?.banner_color ?? undefined }}>
            {user?.name?.[0]?.toUpperCase()}
        </div>
    );
}

function ProfilePopover({ member, status, anchorX, anchorY, onClose, authId }) {
    const ref = useRef();

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        function onMouseDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onMouseDown);
        };
    }, []);

    const cardW = 288; // w-72
    const cardH = 320;
    const margin = 8;

    // Horizontal: preferimos mostrar a la derecha del clic, si no cabe a la izquierda
    let left = anchorX + 12;
    if (left + cardW > window.innerWidth - margin) {
        left = anchorX - cardW - 12;
    }
    left = Math.max(margin, left);

    // Vertical: centrado en el clic, sin salirse
    const top = Math.min(Math.max(anchorY - cardH / 2, margin), window.innerHeight - cardH - margin);

    return (
        <div
            ref={ref}
            style={{ top, left }}
            className="fixed z-50 w-72 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 animate-fade-in"
        >
            {/* Banner */}
            <div className="h-16" style={{ backgroundColor: member.banner_color ?? '#6366f1' }} />

            {/* Avatar + cierre */}
            <div className="px-4 pb-4">
                <div className="flex items-end justify-between -mt-8 mb-3">
                    <div className="relative">
                        <Avatar user={member} size="lg" />
                        <span className="absolute bottom-0.5 right-0.5">
                            <StatusDot status={status} />
                        </span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200 mb-1 text-lg leading-none">&times;</button>
                </div>

                {/* Nombre y rol */}
                <p className="font-bold text-white text-lg leading-tight">{member.name}</p>
                {ROLE_LABEL[member.pivot?.role] && (
                    <p className={`text-xs font-medium ${ROLE_COLOR[member.pivot?.role]}`}>{ROLE_LABEL[member.pivot?.role]}</p>
                )}

                {/* Estado de conexión */}
                <p className="text-xs text-gray-400 mt-0.5">
                    {status ? STATUS_CONFIG[status]?.label : 'Desconectado'}
                </p>

                {/* Estado personalizado */}
                {member.custom_status && (
                    <p className="text-sm text-gray-300 mt-1 italic">"{member.custom_status}"</p>
                )}

                {/* Bio */}
                {member.bio && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Sobre mí</p>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{member.bio}</p>
                    </div>
                )}

                {/* Botón DM — no se muestra si es el propio usuario */}
                {member.id !== authId && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <button
                            onClick={() => router.post(route('conversations.open', member.id))}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
                        >
                            Mensaje directo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Show({ channel, messages: initialMessages, userServers = [] }) {
    const { auth, badges: initialBadges } = usePage().props;
    const [messages, setMessages] = useState(initialMessages);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialMessages.length === 50);

    // Badges: menciones por servidor y DMs no leídos
    const [mentionBadges, setMentionBadges] = useState(initialBadges?.mentions ?? {});
    const [dmBadge, setDmBadge] = useState(initialBadges?.dms ?? 0);

    // { userId: status } — solo usuarios actualmente conectados
    const [onlineUsers, setOnlineUsers] = useState({});
    const [myStatus, setMyStatus] = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen] = useState(false);
    const [profilePopover, setProfilePopover] = useState(null); // { member, anchorY }

    // { userId: name } de usuarios que están escribiendo ahora mismo
    const [typingUsers, setTypingUsers] = useState({});
    const typingTimeouts = useRef({});
    const lastWhisperAt = useRef(0);

    // Autocompletado de menciones
    const [mentionSuggestions, setMentionSuggestions] = useState([]);
    const [mentionStart, setMentionStart] = useState(0);
    const [mentionIndex, setMentionIndex] = useState(0);

    // Notificaciones in-app de menciones
    const [toasts, setToasts] = useState([]);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const statusMenuRef = useRef(null);

    // Scroll al fondo al montar
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    // Cerrar menús al hacer clic fuera
    useEffect(() => {
        function handleClick(e) {
            if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
                setStatusOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Canales de presencia — se une a TODOS los servidores del usuario
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
                .joining((user) => {
                    setOnlineUsers((prev) => ({ ...prev, [user.id]: user.status }));
                })
                .leaving((user) => {
                    // Solo eliminar si ningún otro servidor lo reporta como presente.
                    // En la práctica, si abandona un canal abandona todos a la vez.
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
        });

        return () => userServers.forEach((srv) => window.Echo.leave(`presence-server.${srv.id}`));
    }, [userServers.map((s) => s.id).join(',')]);

    // Canal de mensajes en tiempo real + indicador de escritura
    useEffect(() => {
        const echoChannel = window.Echo.private(`channel.${channel.id}`);

        echoChannel.listen('MessageSent', (e) => {
            setMessages((prev) => [...prev, e]);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });

        echoChannel.listenForWhisper('typing', (e) => {
            if (e.id === auth.user.id) return;

            setTypingUsers((prev) => ({ ...prev, [e.id]: e.name }));

            clearTimeout(typingTimeouts.current[e.id]);
            typingTimeouts.current[e.id] = setTimeout(() => {
                setTypingUsers((prev) => {
                    const next = { ...prev };
                    delete next[e.id];
                    return next;
                });
            }, 2500);
        });

        return () => {
            echoChannel.stopListening('MessageSent');
            echoChannel.stopListeningForWhisper('typing');
            Object.values(typingTimeouts.current).forEach(clearTimeout);
        };
    }, [channel.id]);

    // Notificaciones de menciones
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const userChannel = window.Echo.private(`App.Models.User.${auth.user.id}`);

        userChannel.listen('.MentionReceived', (e) => {
            // Solo incrementar badge si no estamos en ese servidor ahora mismo
            if (e.server_id && e.server_id !== channel.server_id) {
                setMentionBadges((prev) => ({ ...prev, [e.server_id]: (prev[e.server_id] ?? 0) + 1 }));
            }
            if (document.hidden) {
                new Notification(`${e.sender} te mencionó en #${e.channel}`, {
                    body: e.content,
                    icon: '/images/logo.svg',
                });
            } else {
                const id = Date.now();
                setToasts((prev) => [...prev, { id, type: 'mention', ...e }]);
                setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
            }
        });

        userChannel.listen('.NewDirectMessage', (e) => {
            setDmBadge((prev) => prev + 1);
            if (document.hidden) {
                new Notification(`Mensaje de ${e.sender}`, {
                    body: e.content,
                    icon: '/images/logo.svg',
                });
            } else {
                const id = Date.now();
                setToasts((prev) => [...prev, { id, type: 'dm', ...e }]);
                setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
            }
        });

        return () => {
            userChannel.stopListening('.MentionReceived');
            userChannel.stopListening('.NewDirectMessage');
        };
    }, [auth.user.id]);

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

    function onType(e) {
        const val = e.target.value;
        const cursor = e.target.selectionStart;
        setContent(val);
        setMentionIndex(0);

        const match = val.slice(0, cursor).match(/@([^@\s]*)$/);
        if (match) {
            const query = match[1].toLowerCase();
            setMentionSuggestions(
                (channel.server?.members ?? []).filter(m => m.name.toLowerCase().includes(query))
            );
            setMentionStart(match.index);
        } else {
            setMentionSuggestions([]);
        }

        const now = Date.now();
        if (now - lastWhisperAt.current > 1000) {
            lastWhisperAt.current = now;
            window.Echo.private(`channel.${channel.id}`)
                .whisper('typing', { id: auth.user.id, name: auth.user.name });
        }
    }

    function selectMention(member) {
        const before = content.slice(0, mentionStart);
        const after = content.slice(inputRef.current?.selectionStart ?? content.length);
        const inserted = `${before}@${member.name} ${after}`;
        setContent(inserted);
        setMentionSuggestions([]);
        setTimeout(() => {
            const pos = (before + '@' + member.name + ' ').length;
            inputRef.current?.setSelectionRange(pos, pos);
            inputRef.current?.focus();
        }, 0);
    }

    function onKeyDown(e) {
        if (!mentionSuggestions.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setMentionIndex(i => Math.min(i + 1, mentionSuggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setMentionIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            selectMention(mentionSuggestions[mentionIndex]);
        } else if (e.key === 'Escape') {
            setMentionSuggestions([]);
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

            <div className="flex h-[calc(100vh-3.5rem)] bg-gray-800 text-gray-100">

                {/* Rail de servidores */}
                <nav className="w-[72px] bg-gray-950 flex flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
                    {userServers.map((srv) => {
                        const isCurrent = srv.id === channel.server_id;
                        const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                        return (
                            <div key={srv.id} className="relative flex items-center w-full px-1.5 group">
                                <span className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${
                                    isCurrent ? 'h-8' : 'h-0 group-hover:h-5'
                                }`} />
                                <Link
                                    href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                    title={srv.name}
                                    className={`relative w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 ${
                                        isCurrent
                                            ? 'rounded-2xl bg-indigo-500 text-white'
                                            : 'rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white'
                                    }`}
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

                    {/* Mensajes directos */}
                    <div className="relative flex items-center w-full px-1.5 group">
                        <Link
                            href={route('conversations.index')}
                            title="Mensajes directos"
                            className="relative w-12 h-12 flex items-center justify-center text-xl text-indigo-300 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-150"
                        >
                            ✉
                            {dmBadge > 0 && (
                                <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950">
                                    {dmBadge > 99 ? '99+' : dmBadge}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Botón añadir servidor */}
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

                {/* Sidebar izquierdo: canales del servidor actual */}
                <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
                    {/* Cabecera */}
                    <div className="px-4 py-3 border-b border-gray-700">
                        <span className="font-bold text-white truncate block">{channel.server?.name}</span>
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

                        {messages.map((msg) => {
                            const member = (channel.server?.members ?? []).find(m => m.id === msg.user?.id) ?? msg.user;
                            const openPopover = (e) => {
                                if (!member) return;
                                setProfilePopover({ member, anchorX: e.clientX, anchorY: e.clientY });
                            };
                            return (
                                <div key={msg.id} className="flex gap-3">
                                    <button type="button" onClick={openPopover} className="shrink-0 self-start mt-0.5 hover:opacity-80 transition-opacity">
                                        <Avatar user={msg.user} />
                                    </button>
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <button type="button" onClick={openPopover} className="font-semibold text-white hover:underline leading-none">
                                                {msg.user?.name}
                                            </button>
                                            <span className="text-xs text-gray-500">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className={`text-sm ${String(msg.id).startsWith('tmp-') ? 'text-gray-500' : 'text-gray-300'}`}>
                                            {renderContent(msg.content, channel.server?.members, auth.user.name)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    <div className="shrink-0">
                        {/* Indicador de escritura */}
                        <div className="h-5 px-5 flex items-center">
                            {Object.keys(typingUsers).length > 0 && (
                                <p className="text-xs text-gray-400 italic">
                                    <TypingDots />
                                    {formatTyping(Object.values(typingUsers))}
                                </p>
                            )}
                        </div>

                        <form onSubmit={submit} className="px-4 pb-4 relative">
                            {/* Dropdown de menciones */}
                            {mentionSuggestions.length > 0 && (
                                <div className="absolute bottom-full left-4 right-4 mb-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-10">
                                    <p className="px-3 pt-2 pb-1 text-xs text-gray-500">Miembros</p>
                                    {mentionSuggestions.slice(0, 8).map((member, i) => (
                                        <button
                                            key={member.id}
                                            type="button"
                                            onMouseDown={(e) => { e.preventDefault(); selectMention(member); }}
                                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                                                i === mentionIndex
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                            <Avatar user={member} size="sm" />
                                            <span>{member.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                        <div className="flex gap-2 bg-gray-700 rounded-lg px-4 py-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={content}
                                onChange={onType}
                                onKeyDown={onKeyDown}
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
                </div>

                {/* Popover de perfil */}
                {profilePopover && (
                    <ProfilePopover
                        member={profilePopover.member}
                        status={onlineUsers[profilePopover.member.id]}
                        anchorX={profilePopover.anchorX}
                        anchorY={profilePopover.anchorY}
                        onClose={() => setProfilePopover(null)}
                        authId={auth.user.id}
                    />
                )}

                {/* Sidebar derecho: miembros */}
                <aside className="w-48 bg-gray-900 flex flex-col shrink-0 border-l border-gray-700">
                    <div className="px-3 py-3 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Miembros &mdash; {channel.server?.members?.length ?? 0}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {channel.server?.members?.map((member) => {
                            const status = onlineUsers[member.id];
                            const customStatus = onlineUsers[member.id] ? (member.custom_status ?? null) : null;
                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer"
                                    onClick={(e) => setProfilePopover({ member, anchorX: e.clientX, anchorY: e.clientY })}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar user={member} size="sm" />
                                        <span className="absolute -bottom-0.5 -right-0.5">
                                            <StatusDot status={status} size="sm" />
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm truncate leading-tight ${status ? 'text-gray-200' : 'text-gray-500'}`}>
                                            {member.name}
                                        </p>
                                        {customStatus
                                            ? <p className="text-xs text-gray-400 truncate leading-tight">{customStatus}</p>
                                            : ROLE_LABEL[member.pivot?.role] && (
                                                <p className={`text-xs ${ROLE_COLOR[member.pivot?.role]} leading-tight`}>
                                                    {ROLE_LABEL[member.pivot?.role]}
                                                </p>
                                            )
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </div>

            {/* Toasts */}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`bg-gray-800 rounded-xl shadow-2xl p-4 flex gap-3 items-start animate-fade-in border ${
                                toast.type === 'dm' ? 'border-green-500/50' : 'border-indigo-500/50'
                            }`}
                        >
                            <div className={`text-lg shrink-0 ${toast.type === 'dm' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {toast.type === 'dm' ? '✉' : '@'}
                            </div>
                            <div className="flex-1 min-w-0">
                                {toast.type === 'dm' ? (
                                    <>
                                        <p className="text-sm font-semibold text-white">Mensaje de {toast.sender}</p>
                                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">{toast.content}</p>
                                        <Link
                                            href={route('conversations.show', toast.conversation_id)}
                                            className="text-xs text-green-400 hover:underline mt-1 inline-block"
                                        >
                                            Abrir conversación →
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-white">
                                            {toast.sender} te mencionó en #{toast.channel}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{toast.server}</p>
                                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">{toast.content}</p>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                                className="text-gray-500 hover:text-gray-300 shrink-0 text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
