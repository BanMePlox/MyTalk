import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ServerSettingsModal from '@/Components/ServerSettingsModal';

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

function ContextMenuItem({ onClick, danger, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-sm rounded transition-colors ${
                danger ? 'text-red-400 hover:bg-red-500/20' : 'text-gray-200 hover:bg-gray-700'
            }`}
        >
            {children}
        </button>
    );
}

function ContextMenu({ menu, onClose, authId, canManageMessages, canManageRoles, serverRoles, memberRolesMap, onEdit, onDelete, onPin, onOpenProfile, onOpenDM, onToggleRole }) {
    const ref = useRef();

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, []);

    const menuW = 208;
    const margin = 8;
    let left = Math.min(menu.x, window.innerWidth - menuW - margin);
    left = Math.max(margin, left);
    // Height is dynamic; anchor from bottom if near edge
    const fromBottom = window.innerHeight - menu.y < 220;

    const isOwn  = menu.msg?.user?.id === authId;
    const canDel = isOwn || canManageMessages;
    const member = menu.member;
    const memberRoles = member ? (memberRolesMap[member.id] ?? member.server_roles ?? []) : [];

    return (
        <div
            ref={ref}
            style={{ top: fromBottom ? undefined : menu.y, bottom: fromBottom ? window.innerHeight - menu.y : undefined, left }}
            className="fixed z-[200] w-52 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-1"
        >
            {menu.type === 'message' && (
                <>
                    {menu.msg?.content && (
                        <ContextMenuItem onClick={() => { navigator.clipboard.writeText(menu.msg.content); onClose(); }}>
                            <span>📋</span> Copiar texto
                        </ContextMenuItem>
                    )}
                    {isOwn && (
                        <ContextMenuItem onClick={() => { onEdit(menu.msg); onClose(); }}>
                            <span>✏️</span> Editar mensaje
                        </ContextMenuItem>
                    )}
                    {canManageMessages && (
                        <ContextMenuItem onClick={() => { onPin(menu.msg); onClose(); }}>
                            <span>📌</span> {menu.msg?.pinned_at ? 'Desfijar' : 'Fijar mensaje'}
                        </ContextMenuItem>
                    )}
                    {canDel && (
                        <ContextMenuItem danger onClick={() => { onDelete(menu.msg); onClose(); }}>
                            <span>🗑️</span> Eliminar mensaje
                        </ContextMenuItem>
                    )}
                </>
            )}

            {menu.type === 'user' && member && (
                <>
                    <ContextMenuItem onClick={() => { onOpenProfile(member, menu.x, menu.y); onClose(); }}>
                        <span>👤</span> Ver perfil
                    </ContextMenuItem>
                    {member.id !== authId && (
                        <ContextMenuItem onClick={() => { onOpenDM(member); onClose(); }}>
                            <span>💬</span> Mensaje directo
                        </ContextMenuItem>
                    )}
                    {canManageRoles && member.id !== authId && serverRoles.length > 0 && (
                        <>
                            <div className="border-t border-gray-700 mx-2 my-1" />
                            <p className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wide">Roles</p>
                            {serverRoles.map(role => {
                                const hasRole = memberRoles.some(r => r.id === role.id);
                                return (
                                    <ContextMenuItem key={role.id} onClick={() => onToggleRole(member, role, hasRole)}>
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: role.color }} />
                                        <span className="flex-1">{role.name}</span>
                                        {hasRole && <span className="text-green-400 text-xs">✓</span>}
                                    </ContextMenuItem>
                                );
                            })}
                        </>
                    )}
                </>
            )}
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

                {/* Roles del servidor */}
                {(member.server_roles?.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Roles</p>
                        <div className="flex flex-wrap gap-1.5">
                            {member.server_roles.map(role => (
                                <span key={role.id}
                                    className="text-xs px-2 py-0.5 rounded font-medium"
                                    style={{ backgroundColor: role.color + '33', color: role.color, border: `1px solid ${role.color}55` }}>
                                    {role.name}
                                </span>
                            ))}
                        </div>
                    </div>
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

export default function Show({ channel, messages: initialMessages, pinnedMessages: initialPinnedMessages = [], userServers = [], canManageMessages = false, canManageRoles = false, canManageChannels = false, canKickMembers = false, isOwner = false }) {
    const { auth, badges: initialBadges } = usePage().props;
    const [messages, setMessages] = useState(initialMessages);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(initialMessages.length === 50);

    // Badges: menciones por servidor y DMs por conversación
    const [mentionBadges, setMentionBadges] = useState(initialBadges?.mentions ?? {});
    const [dmConversations, setDmConversations] = useState(initialBadges?.dmConversations ?? []);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(initialBadges?.pendingFriendRequests ?? 0);

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

    const [attachmentFile, setAttachmentFile] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [mobileSidebar, setMobileSidebar] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null); // null = sin buscar, [] = sin resultados
    const [searching, setSearching] = useState(false);
    const [emojiPickerId, setEmojiPickerId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { type, x, y, msg?, member? }
    const [serverDropdownOpen, setServerDropdownOpen] = useState(false);
    const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [inviteCopied, setInviteCopied] = useState(false);
    const [confirmDeleteServer, setConfirmDeleteServer] = useState(false);
    const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState(null);
    const serverDropdownRef = useRef(null);
    // Mensajes fijados
    const [pinnedMessages, setPinnedMessages] = useState(initialPinnedMessages);
    const [pinnedPanelOpen, setPinnedPanelOpen] = useState(false);
    // Búsqueda global
    const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
    const [globalQuery, setGlobalQuery] = useState('');
    const [globalResults, setGlobalResults] = useState(null);
    const [globalSearching, setGlobalSearching] = useState(false);
    const globalSearchTimeout = useRef(null);
    // Categorías: estado de colapso { categoryId: bool }
    const [collapsedCategories, setCollapsedCategories] = useState({});
    // Canales con category_id actualizable sin recarga
    const [serverChannels, setServerChannels] = useState(channel.server?.channels ?? []);
    const [serverCategories, setServerCategories] = useState(channel.server?.categories ?? []);
    // Local optimistic map of member roles: userId → role[]
    const [memberRolesMap, setMemberRolesMap] = useState(() =>
        Object.fromEntries((channel.server?.members ?? []).map(m => [m.id, m.server_roles ?? []]))
    );

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const statusMenuRef = useRef(null);
    const fileInputRef = useRef(null);

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
            if (serverDropdownRef.current && !serverDropdownRef.current.contains(e.target)) {
                setServerDropdownOpen(false);
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
                })
                .listen('.MemberRoleUpdated', (e) => {
                    if (e.server_id && e.server_id !== channel.server_id) return;
                    setMemberRolesMap((prev) => ({ ...prev, [e.user_id]: e.roles }));
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

        echoChannel.listen('.MessageUpdated', (e) => {
            setMessages((prev) => prev.map((m) => m.id === e.id ? { ...m, content: e.content, updated_at: e.updated_at } : m));
        });

        echoChannel.listen('.MessageDeleted', (e) => {
            setMessages((prev) => prev.filter((m) => m.id !== e.id));
        });

        echoChannel.listen('.MessageReactionUpdated', (e) => {
            setMessages((prev) => prev.map((m) => m.id === e.message_id ? { ...m, reactions_grouped: e.reactions } : m));
        });

        echoChannel.listen('.MessagePinToggled', (e) => {
            setMessages((prev) => prev.map((m) => m.id === e.id ? { ...m, pinned_at: e.pinned_at } : m));
            if (e.pinned_at) {
                // Añadir a pinnedMessages si no está ya
                setMessages((prev) => {
                    const msg = prev.find((m) => m.id === e.id);
                    if (msg) setPinnedMessages((pins) => pins.some((p) => p.id === e.id) ? pins : [...pins, { ...msg, pinned_at: e.pinned_at }]);
                    return prev;
                });
            } else {
                setPinnedMessages((pins) => pins.filter((p) => p.id !== e.id));
            }
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
            echoChannel.stopListening('.MessageUpdated');
            echoChannel.stopListening('.MessageDeleted');
            echoChannel.stopListening('.MessageReactionUpdated');
            echoChannel.stopListening('.MessagePinToggled');
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
            setDmConversations((prev) => {
                const exists = prev.find((c) => c.id === e.conversation_id);
                if (exists) {
                    return prev.map((c) => c.id === e.conversation_id ? { ...c, unread: (c.unread ?? 0) + 1 } : c);
                }
                if (e.is_group) {
                    return [...prev, { id: e.conversation_id, type: 'group', unread: 1, name: e.group_name, icon_color: e.group_icon_color, user: null }];
                }
                return [...prev, { id: e.conversation_id, type: 'direct', unread: 1, user: { id: e.sender_id, name: e.sender, avatar_url: e.sender_avatar, banner_color: e.sender_banner_color } }];
            });
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

        userChannel.listen('.FriendRequestReceived', () => {
            setPendingFriendRequests((prev) => prev + 1);
        });

        return () => {
            userChannel.stopListening('.MentionReceived');
            userChannel.stopListening('.NewDirectMessage');
            userChannel.stopListening('.FriendRequestReceived');
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

    function pickFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        setAttachmentFile(file);
        setAttachmentPreview(URL.createObjectURL(file));
        e.target.value = '';
    }

    function clearAttachment() {
        setAttachmentFile(null);
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
        setAttachmentPreview(null);
    }

    async function submit(e) {
        e.preventDefault();
        if ((!content.trim() && !attachmentFile) || sending) return;
        const text = content.trim();
        const file = attachmentFile;
        const preview = attachmentPreview;
        setContent('');
        clearAttachment();
        setSending(true);
        const optimistic = {
            id: `tmp-${Date.now()}`,
            content: text,
            attachment_url: preview,
            created_at: new Date().toISOString(),
            user: { id: auth.user.id, name: auth.user.name, avatar_url: auth.user.avatar_url, banner_color: auth.user.banner_color },
        };
        setMessages((prev) => [...prev, optimistic]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        try {
            let res;
            if (file) {
                const fd = new FormData();
                if (text) fd.append('content', text);
                fd.append('attachment', file);
                res = await window.axios.post(route('messages.store', channel.id), fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                res = await window.axios.post(route('messages.store', channel.id), { content: text });
            }
            setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setContent(text);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    }

    async function doSearch(q) {
        setSearchQuery(q);
        if (q.trim().length < 2) { setSearchResults(null); return; }
        setSearching(true);
        try {
            const res = await window.axios.get(route('messages.search', channel.id), { params: { q: q.trim() } });
            setSearchResults(res.data);
        } finally {
            setSearching(false);
        }
    }

    async function createChannel(e) {
        e.preventDefault();
        if (!newChannelName.trim()) return;
        setCreatingChannel(true);
        try {
            await window.axios.post(route('channels.store', channel.server.id), { name: newChannelName });
            setNewChannelName('');
            setServerDropdownOpen(false);
            router.reload({ only: ['channel'] });
        } catch { /* ignore */ } finally {
            setCreatingChannel(false);
        }
    }

    function copyInvite() {
        const url = route('invite.accept', channel.server.invite_code);
        navigator.clipboard.writeText(url).then(() => {
            setInviteCopied(true);
            setTimeout(() => setInviteCopied(false), 2000);
        });
    }

    function openContextMenu(type, e, msg = null, member = null) {
        e.preventDefault();
        e.stopPropagation();
        setEmojiPickerId(null);
        setContextMenu({ type, x: e.clientX, y: e.clientY, msg, member });
    }

    async function toggleRoleFromMenu(member, role, hasRole) {
        // Optimistic update
        setMemberRolesMap(prev => {
            const current = prev[member.id] ?? [];
            const updated = hasRole
                ? current.filter(r => r.id !== role.id)
                : [...current, { id: role.id, name: role.name, color: role.color }];
            return { ...prev, [member.id]: updated };
        });
        try {
            await window.axios.patch(route('members.update', { server: channel.server.id, user: member.id }), {
                role_id: role.id,
                action: hasRole ? 'remove' : 'add',
            });
        } catch {
            // Rollback
            setMemberRolesMap(prev => {
                const current = prev[member.id] ?? [];
                const rolled = hasRole
                    ? [...current, { id: role.id, name: role.name, color: role.color }]
                    : current.filter(r => r.id !== role.id);
                return { ...prev, [member.id]: rolled };
            });
        }
    }

    async function toggleReaction(msg, emoji) {
        setEmojiPickerId(null);
        // Optimista
        setMessages((prev) => prev.map((m) => {
            if (m.id !== msg.id) return m;
            const grouped = [...(m.reactions_grouped ?? [])];
            const idx = grouped.findIndex((r) => r.emoji === emoji);
            const uid = auth.user.id;
            if (idx >= 0) {
                const alreadyReacted = grouped[idx].user_ids.includes(uid);
                if (alreadyReacted) {
                    const newUserIds = grouped[idx].user_ids.filter((id) => id !== uid);
                    if (newUserIds.length === 0) grouped.splice(idx, 1);
                    else grouped[idx] = { ...grouped[idx], count: grouped[idx].count - 1, user_ids: newUserIds };
                } else {
                    grouped[idx] = { ...grouped[idx], count: grouped[idx].count + 1, user_ids: [...grouped[idx].user_ids, uid] };
                }
            } else {
                grouped.push({ emoji, count: 1, user_ids: [uid] });
            }
            return { ...m, reactions_grouped: grouped };
        }));
        await window.axios.post(route('messages.react', msg.id), { emoji });
    }

    function startEdit(msg) {
        setEditingId(msg.id);
        setEditContent(msg.content);
    }

    function cancelEdit() {
        setEditingId(null);
        setEditContent('');
    }

    async function submitEdit(msg) {
        if (!editContent.trim() || editContent.trim() === msg.content) { cancelEdit(); return; }
        const updated = editContent.trim();
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: updated, updated_at: now } : m));
        cancelEdit();
        try {
            const res = await window.axios.patch(route('messages.update', msg.id), { content: updated });
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, updated_at: res.data.updated_at } : m));
        } catch {
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: msg.content, updated_at: msg.updated_at } : m));
        }
    }

    async function deleteMessage(msg) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        try {
            await window.axios.delete(route('messages.destroy', msg.id));
        } catch {
            setMessages((prev) => {
                const idx = prev.findIndex((m) => m.created_at <= msg.created_at);
                const next = [...prev];
                next.splice(idx === -1 ? next.length : idx, 0, msg);
                return next;
            });
        }
    }

    async function togglePin(msg) {
        const isPinned = !!msg.pinned_at;
        // Optimistic
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned_at: isPinned ? null : new Date().toISOString() } : m));
        if (isPinned) {
            setPinnedMessages((pins) => pins.filter((p) => p.id !== msg.id));
        } else {
            setPinnedMessages((pins) => [...pins, { ...msg, pinned_at: new Date().toISOString() }]);
        }
        try {
            if (isPinned) {
                await window.axios.patch(route('messages.unpin', msg.id));
            } else {
                await window.axios.patch(route('messages.pin', msg.id));
            }
        } catch {
            // Rollback
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, pinned_at: msg.pinned_at } : m));
            if (isPinned) {
                setPinnedMessages((pins) => [...pins, msg]);
            } else {
                setPinnedMessages((pins) => pins.filter((p) => p.id !== msg.id));
            }
        }
    }

    async function doGlobalSearch(q) {
        setGlobalQuery(q);
        clearTimeout(globalSearchTimeout.current);
        if (q.trim().length < 2) { setGlobalResults(null); return; }
        globalSearchTimeout.current = setTimeout(async () => {
            setGlobalSearching(true);
            try {
                const res = await window.axios.get(route('search.global'), { params: { q: q.trim() } });
                setGlobalResults(res.data);
            } finally {
                setGlobalSearching(false);
            }
        }, 300);
    }

    useEffect(() => {
        function onKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setGlobalSearchOpen((v) => !v);
                if (!globalSearchOpen) { setGlobalQuery(''); setGlobalResults(null); }
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [globalSearchOpen]);

    return (
        <AuthenticatedLayout>
            <Head title={`#${channel.name}`} />

            <div className="flex h-[calc(100vh-3.5rem)] bg-gray-800 text-gray-100">

                {/* Rail de servidores — lateral en desktop, oculto en móvil */}
                <nav className="hidden sm:flex w-[72px] bg-gray-950 flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto">
                    {userServers.map((srv) => {
                        const isCurrent = srv.id === channel.server_id;
                        const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                        return (
                            <div key={srv.id} className="flex items-center w-full px-1.5 group">
                                <span className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${
                                    isCurrent ? 'h-8' : 'h-0 group-hover:h-5'
                                }`} />
                                <div className="relative">
                                    <Link
                                        href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                        title={srv.name}
                                        className={`w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 overflow-hidden ${
                                            isCurrent
                                                ? 'rounded-2xl bg-indigo-500 text-white'
                                                : 'rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white'
                                        }`}
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

                    {/* Conversaciones DM — solo las que tienen mensajes sin leer */}
                    {dmConversations.filter((c) => c.unread > 0).map((conv) => (
                        <div key={conv.id} className="flex items-center w-full px-1.5 group">
                            <div className="relative">
                                <Link
                                    href={route('conversations.show', conv.id)}
                                    title={conv.type === 'group' ? (conv.name ?? 'Grupo') : conv.user?.name}
                                    className={`w-12 h-12 flex items-center justify-center font-bold text-sm bg-gray-700 hover:bg-indigo-500 text-white transition-all duration-150 overflow-hidden ${conv.type === 'group' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'}`}
                                >
                                    {conv.type === 'group' ? (
                                        <span style={{ backgroundColor: conv.icon_color ?? '#6366f1' }} className="w-full h-full flex items-center justify-center text-lg font-bold">
                                            {(conv.name ?? '#')[0].toUpperCase()}
                                        </span>
                                    ) : conv.user?.avatar_url
                                        ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                        : <span style={{ backgroundColor: conv.user?.banner_color ?? '#6366f1' }} className="w-full h-full flex items-center justify-center text-lg font-bold">
                                            {conv.user?.name?.[0]?.toUpperCase()}
                                          </span>
                                    }
                                </Link>
                                {conv.unread > 0 && (
                                    <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
                                        {conv.unread > 99 ? '99+' : conv.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Botón nueva conversación / ver todas */}
                    <div className="relative flex items-center w-full px-1.5 group">
                        <div className="relative">
                            <Link
                                href={route('conversations.index')}
                                title="Mensajes directos"
                                className="w-12 h-12 flex items-center justify-center text-xl text-indigo-300 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-150"
                            >✉</Link>
                        </div>
                    </div>

                    {/* Botón amigos */}
                    <div className="relative flex items-center w-full px-1.5 group">
                        <div className="relative">
                            <Link
                                href={route('friends.index')}
                                title="Amigos"
                                className="w-12 h-12 flex items-center justify-center text-xl text-indigo-300 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-150"
                            >👥</Link>
                            {pendingFriendRequests > 0 && (
                                <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
                                    {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-1 w-8 border-t border-gray-700" />

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

                {/* Sidebar izquierdo: canales — drawer en móvil, siempre visible en desktop */}
                {mobileSidebar && (
                    <div className="fixed inset-0 z-40 sm:hidden bg-black/50" onClick={() => setMobileSidebar(false)} />
                )}
                <aside className={`${mobileSidebar ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden sm:flex'} w-52 bg-gray-900 flex-col shrink-0`}>
                    {/* Cabecera con dropdown */}
                    <div className="relative border-b border-gray-700" ref={serverDropdownRef}>
                        <button
                            onClick={() => setServerDropdownOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors group"
                        >
                            <span className="font-bold text-white truncate">{channel.server?.name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${serverDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {serverDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-gray-900 border border-gray-700 rounded-b-lg shadow-2xl py-1">
                                {/* Copiar invitación */}
                                <button
                                    onClick={() => { copyInvite(); setServerDropdownOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                                >
                                    <span>🔗</span>
                                    <span>{inviteCopied ? '¡Copiado!' : 'Copiar invitación'}</span>
                                </button>

                                {/* Cambiar icono */}
                                {isOwner && (
                                    <label className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors cursor-pointer">
                                        <span>🖼️</span> Cambiar icono
                                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const fd = new FormData();
                                            fd.append('icon', file);
                                            try {
                                                await window.axios.post(route('servers.icon', channel.server.id), fd, {
                                                    headers: { 'Content-Type': 'multipart/form-data' },
                                                });
                                                router.reload({ only: ['channel'] });
                                            } catch { /* ignore */ }
                                            setServerDropdownOpen(false);
                                            e.target.value = '';
                                        }} />
                                    </label>
                                )}

                                {/* Ajustes del servidor */}
                                {(canManageRoles || canKickMembers || isOwner) && (
                                    <button
                                        onClick={() => { setServerSettingsOpen(true); setServerDropdownOpen(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                                    >
                                        <span>⚙️</span> Ajustes del servidor
                                    </button>
                                )}

                                {/* Crear canal */}
                                {canManageChannels && (
                                    <form onSubmit={createChannel} className="px-3 py-2 border-t border-gray-700">
                                        <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wide font-semibold">Nuevo canal</p>
                                        <div className="flex gap-1.5">
                                            <input
                                                type="text"
                                                value={newChannelName}
                                                onChange={e => setNewChannelName(e.target.value)}
                                                placeholder="nombre-canal"
                                                className="flex-1 min-w-0 bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button
                                                type="submit"
                                                disabled={creatingChannel}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 py-1 rounded disabled:opacity-50"
                                            >+</button>
                                        </div>
                                    </form>
                                )}

                                {/* Separador zona peligro */}
                                <div className="border-t border-gray-700 my-1" />

                                {/* Abandonar / Eliminar */}
                                {isOwner ? (
                                    confirmDeleteServer ? (
                                        <div className="px-3 py-2">
                                            <p className="text-xs text-red-400 mb-2">¿Eliminar <strong>{channel.server?.name}</strong>? Esta acción es irreversible.</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => router.delete(route('servers.destroy', channel.server.id))}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5 rounded"
                                                >
                                                    Sí, eliminar
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteServer(false)}
                                                    className="flex-1 text-gray-400 hover:text-gray-200 text-xs px-2 py-1.5 rounded hover:bg-gray-700"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmDeleteServer(true)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                                        >
                                            <span>🗑️</span> Eliminar servidor
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => { router.delete(route('servers.leave', channel.server.id)); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        <span>🚪</span> Abandonar servidor
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                        {(() => {
                            const allChannels = serverChannels;
                            const categories = serverCategories;
                            const categorized = new Set(allChannels.filter(ch => ch.category_id).map(ch => ch.id));
                            const uncategorized = allChannels.filter(ch => !ch.category_id);

                            function ChannelLink({ ch }) {
                                return (
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
                                );
                            }

                            return (
                                <>
                                    {uncategorized.map((ch) => <ChannelLink key={ch.id} ch={ch} />)}
                                    {categories.map((cat) => {
                                        const catChannels = allChannels.filter(ch => ch.category_id === cat.id);
                                        const collapsed = collapsedCategories[cat.id];
                                        return (
                                            <div key={cat.id} className="mt-2">
                                                <button
                                                    onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat.id]: !collapsed }))}
                                                    className="flex items-center gap-1 w-full px-2 py-0.5 text-xs font-semibold text-gray-400 hover:text-gray-200 uppercase tracking-wide transition-colors"
                                                >
                                                    <span className={`transition-transform ${collapsed ? '' : 'rotate-90'}`}>›</span>
                                                    {cat.name}
                                                </button>
                                                {!collapsed && catChannels.map((ch) => <ChannelLink key={ch.id} ch={ch} />)}
                                            </div>
                                        );
                                    })}
                                </>
                            );
                        })()}
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
                <div className="flex-1 flex flex-col overflow-hidden pb-[3.5rem] sm:pb-0 relative">
                    <header className="px-4 py-3 border-b border-gray-700 font-semibold shrink-0 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileSidebar((v) => !v)}
                            className="sm:hidden text-gray-400 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <span className="flex-1"># {channel.name}</span>
                        {pinnedMessages.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setPinnedPanelOpen((v) => !v)}
                                className={`text-gray-400 hover:text-white transition-colors ${pinnedPanelOpen ? 'text-white' : ''}`}
                                title="Mensajes fijados"
                            >
                                <span className="text-base leading-none">📌</span>
                                {pinnedMessages.length > 0 && (
                                    <span className="ml-0.5 text-xs font-bold">{pinnedMessages.length}</span>
                                )}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => { setGlobalSearchOpen(true); setGlobalQuery(''); setGlobalResults(null); }}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Búsqueda global (Ctrl+K)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSearchOpen((v) => !v); setSearchQuery(''); setSearchResults(null); }}
                            className={`text-gray-400 hover:text-white transition-colors ${searchOpen ? 'text-white' : ''}`}
                            title="Buscar en este canal"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6" />
                            </svg>
                        </button>
                    </header>

                    {/* Panel de mensajes fijados — lateral derecho flotante */}
                    {pinnedPanelOpen && (
                        <div className="absolute top-0 right-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-2xl z-20 flex flex-col">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 shrink-0">
                                <span className="text-yellow-400 text-base">📌</span>
                                <p className="text-sm font-semibold text-gray-200 flex-1">Mensajes fijados</p>
                                <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full">{pinnedMessages.length}</span>
                                <button onClick={() => setPinnedPanelOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none ml-1">&times;</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {pinnedMessages.length === 0
                                    ? <p className="text-xs text-gray-500 px-1 py-2">No hay mensajes fijados.</p>
                                    : pinnedMessages.map((msg) => (
                                        <div key={msg.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700/60 hover:border-gray-600 transition-colors group">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Avatar user={msg.user} size="sm" />
                                                <span className="text-xs font-semibold text-indigo-300 flex-1 truncate">{msg.user?.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(msg.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                                                </span>
                                                {canManageMessages && (
                                                    <button
                                                        onClick={() => togglePin(msg)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs shrink-0 transition-all"
                                                        title="Desfijar"
                                                    >✕</button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-300 break-words leading-relaxed">{msg.content}</p>
                                            {msg.pinned_by && (
                                                <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                                                    <span>📌</span> Fijado por <span className="text-gray-500">{msg.pinned_by.name}</span>
                                                </p>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* Panel de búsqueda */}
                    {searchOpen && (
                        <div className="shrink-0 border-b border-gray-700 bg-gray-850 px-4 py-3">
                            <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={(e) => doSearch(e.target.value)}
                                placeholder="Buscar mensajes..."
                                className="w-full bg-gray-700 text-sm text-white rounded-lg px-3 py-2 outline-none placeholder-gray-400 border border-gray-600 focus:border-indigo-500"
                            />
                            {searching && <p className="text-xs text-gray-400 mt-2">Buscando...</p>}
                            {searchResults !== null && !searching && (
                                <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                                    {searchResults.length === 0
                                        ? <p className="text-xs text-gray-400">Sin resultados.</p>
                                        : searchResults.map((msg) => (
                                            <div key={msg.id} className="text-sm bg-gray-700 rounded-lg px-3 py-2">
                                                <span className="font-semibold text-indigo-300 mr-2">{msg.user?.name}</span>
                                                <span className="text-gray-300">{msg.content}</span>
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {new Date(msg.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    )}

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
                            const memberRoles = member ? (memberRolesMap[member.id] ?? member?.server_roles ?? []) : [];
                            const primaryColor = memberRoles[0]?.color;
                            const isOwn = msg.user?.id === auth.user.id;
                            const isTmp = String(msg.id).startsWith('tmp-');
                            const isEditing = editingId === msg.id;
                            const openPopover = (e) => {
                                if (!member) return;
                                setProfilePopover({ member, anchorX: e.clientX, anchorY: e.clientY });
                            };
                            const memberWithRoles = member ? { ...member, server_roles: memberRoles } : member;
                            return (
                                <div
                                    key={msg.id}
                                    className={`group flex gap-3 px-2 py-0.5 rounded-lg hover:bg-gray-700/40 relative ${msg.pinned_at ? 'border-l-2 border-yellow-500/50' : ''}`}
                                    onContextMenu={(e) => !isTmp && openContextMenu('message', e, msg, memberWithRoles)}
                                >
                                    <button
                                        type="button"
                                        onClick={openPopover}
                                        onContextMenu={(e) => { e.stopPropagation(); member && openContextMenu('user', e, msg, memberWithRoles); }}
                                        className="shrink-0 self-start mt-0.5 hover:opacity-80 transition-opacity"
                                    >
                                        <Avatar user={msg.user} />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <button
                                                type="button"
                                                onClick={openPopover}
                                                onContextMenu={(e) => { e.stopPropagation(); member && openContextMenu('user', e, msg, memberWithRoles); }}
                                                className="font-semibold hover:underline leading-none"
                                                style={primaryColor ? { color: primaryColor } : { color: 'white' }}
                                            >
                                                {msg.user?.name}
                                            </button>
                                            <span className="text-xs text-gray-500">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {isEditing ? (
                                            <div className="mt-1">
                                                <input
                                                    autoFocus
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') submitEdit(msg);
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    className="w-full bg-gray-600 text-sm text-white rounded px-2 py-1 outline-none border border-indigo-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-0.5">Enter para guardar · Esc para cancelar</p>
                                            </div>
                                        ) : (
                                            <>
                                                {msg.content && (
                                                    <p className={`text-sm ${isTmp ? 'text-gray-500' : 'text-gray-300'}`}>
                                                        {renderContent(msg.content, channel.server?.members, auth.user.name)}
                                                        {!isTmp && msg.updated_at && msg.updated_at !== msg.created_at && (
                                                            <span className="text-xs text-gray-500 ml-1.5">(editado)</span>
                                                        )}
                                                    </p>
                                                )}
                                                {msg.attachment_url && (
                                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                                        <img src={msg.attachment_url} alt="adjunto" className="max-w-xs max-h-64 rounded-lg object-cover border border-gray-700 hover:opacity-90 transition-opacity" />
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {!isTmp && !isEditing && (
                                        <div className="absolute right-2 top-0 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-1 py-0.5 shadow-lg z-10">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setEmojiPickerId((id) => id === msg.id ? null : msg.id)}
                                                    className="text-gray-400 hover:text-yellow-300 px-1.5 py-0.5 rounded text-xs transition-colors"
                                                    title="Reaccionar"
                                                >😊</button>
                                                {emojiPickerId === msg.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 flex gap-1 shadow-xl z-20">
                                                        {['👍','👎','❤️','😂','😮','😢','🎉','🔥'].map((e) => (
                                                            <button
                                                                key={e}
                                                                type="button"
                                                                onMouseDown={(ev) => { ev.preventDefault(); toggleReaction(msg, e); }}
                                                                className="text-lg hover:scale-125 transition-transform"
                                                            >{e}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {isOwn && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEdit(msg)}
                                                    className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded text-xs transition-colors"
                                                    title="Editar"
                                                >✏️</button>
                                            )}
                                            {(isOwn || canManageMessages) && (
                                                confirmDeleteMsgId === msg.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => { deleteMessage(msg); setConfirmDeleteMsgId(null); }}
                                                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded"
                                                        >Eliminar</button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteMsgId(null)}
                                                            className="text-xs text-gray-400 hover:text-gray-200 px-1"
                                                        >✕</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeleteMsgId(msg.id)}
                                                        className="text-gray-400 hover:text-red-400 px-1.5 py-0.5 rounded text-xs transition-colors"
                                                        title="Eliminar"
                                                    >🗑️</button>
                                                )
                                            )}
                                        </div>
                                    )}
                                    {/* Burbujas de reacciones */}
                                    {(msg.reactions_grouped?.length > 0) && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {msg.reactions_grouped.map((r) => {
                                                const reacted = r.user_ids.includes(auth.user.id);
                                                return (
                                                    <button
                                                        key={r.emoji}
                                                        type="button"
                                                        onClick={() => toggleReaction(msg, r.emoji)}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                                            reacted
                                                                ? 'bg-indigo-600/40 border-indigo-500 text-white'
                                                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-indigo-500'
                                                        }`}
                                                    >
                                                        <span>{r.emoji}</span>
                                                        <span>{r.count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
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

                            {/* Previsualización de adjunto */}
                            {attachmentPreview && (
                                <div className="mb-2 relative inline-block">
                                    <img src={attachmentPreview} alt="preview" className="max-h-32 rounded-lg border border-gray-600" />
                                    <button
                                        type="button"
                                        onClick={clearAttachment}
                                        className="absolute -top-1.5 -right-1.5 bg-gray-900 text-gray-400 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs border border-gray-600"
                                    >✕</button>
                                </div>
                            )}

                        <div className="flex gap-2 bg-gray-700 rounded-lg px-4 py-2">
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-gray-400 hover:text-gray-200 transition-colors shrink-0"
                                title="Adjuntar imagen"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
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
                                disabled={sending || (!content.trim() && !attachmentFile)}
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
                        member={{ ...profilePopover.member, server_roles: memberRolesMap[profilePopover.member.id] ?? profilePopover.member.server_roles }}
                        status={onlineUsers[profilePopover.member.id]}
                        anchorX={profilePopover.anchorX}
                        anchorY={profilePopover.anchorY}
                        onClose={() => setProfilePopover(null)}
                        authId={auth.user.id}
                    />
                )}

                {/* Modal ajustes del servidor */}
                <ServerSettingsModal
                    show={serverSettingsOpen}
                    onClose={() => setServerSettingsOpen(false)}
                    server={{ ...channel.server, channels: serverChannels, categories: serverCategories, members: (channel.server?.members ?? []).map(m => ({ ...m, server_roles: memberRolesMap[m.id] ?? m.server_roles ?? [] })) }}
                    roles={channel.server?.roles ?? []}
                    canManageRoles={canManageRoles}
                    canManageChannels={canManageChannels}
                    canKickMembers={canKickMembers}
                    isOwner={isOwner}
                    reloadKey="channel"
                    onChannelAssign={(channelId, categoryId) =>
                        setServerChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, category_id: categoryId ? parseInt(categoryId) : null } : ch))
                    }
                    onCategoryChange={(updated) => setServerCategories(updated)}
                />

                {/* Menú contextual */}
                {contextMenu && (
                    <ContextMenu
                        menu={contextMenu}
                        onClose={() => setContextMenu(null)}
                        authId={auth.user.id}
                        canManageMessages={canManageMessages}
                        canManageRoles={canManageRoles}
                        serverRoles={channel.server?.roles ?? []}
                        memberRolesMap={memberRolesMap}
                        onEdit={(msg) => startEdit(msg)}
                        onDelete={(msg) => setConfirmDeleteMsgId(msg.id)}
                        onPin={togglePin}
                        onOpenProfile={(member, x, y) => setProfilePopover({ member, anchorX: x, anchorY: y })}
                        onOpenDM={(member) => router.post(route('conversations.open', member.id))}
                        onToggleRole={toggleRoleFromMenu}
                    />
                )}

                {/* Sidebar derecho: miembros — oculto en móvil */}
                {(() => {
                    const allMembers = channel.server?.members ?? [];
                    const serverRoles = channel.server?.roles ?? [];

                    // Assign each member to exactly one bucket: their first (primary) role by position
                    const assigned = new Set();
                    const buckets = serverRoles
                        .map(role => {
                            const roleMembers = allMembers.filter(m =>
                                !assigned.has(m.id) && m.server_roles?.some(r => r.id === role.id)
                            );
                            roleMembers.forEach(m => assigned.add(m.id));
                            return { role, members: roleMembers };
                        })
                        .filter(b => b.members.length > 0);

                    const noRoleMembers = allMembers.filter(m => !assigned.has(m.id));

                    const renderMember = (member) => {
                        const status = onlineUsers[member.id];
                        const customStatus = status ? (member.custom_status ?? null) : null;
                        const memberWithRoles = { ...member, server_roles: memberRolesMap[member.id] ?? member.server_roles ?? [] };
                        return (
                            <div
                                key={member.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 cursor-pointer"
                                onClick={(e) => setProfilePopover({ member: memberWithRoles, anchorX: e.clientX, anchorY: e.clientY })}
                                onContextMenu={(e) => openContextMenu('user', e, null, memberWithRoles)}
                            >
                                <div className="relative shrink-0">
                                    <Avatar user={member} size="sm" />
                                    <span className="absolute -bottom-0.5 -right-0.5">
                                        <StatusDot status={status} size="sm" />
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm truncate leading-tight ${!status ? 'text-gray-500' : ''}`}
                                        style={status && memberWithRoles.server_roles[0] ? { color: memberWithRoles.server_roles[0].color } : undefined}>
                                        {member.name}
                                    </p>
                                    {customStatus && (
                                        <p className="text-xs text-gray-400 truncate leading-tight">{customStatus}</p>
                                    )}
                                </div>
                            </div>
                        );
                    };

                    return (
                        <aside className="hidden md:flex w-48 bg-gray-900 flex-col shrink-0 border-l border-gray-700">
                            <div className="px-3 py-3 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                Miembros &mdash; {allMembers.length}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {buckets.map(({ role, members }) => (
                                    <div key={role.id} className="mb-3">
                                        <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wide"
                                            style={{ color: role.color }}>
                                            {role.name} &mdash; {members.length}
                                        </p>
                                        {members.map(renderMember)}
                                    </div>
                                ))}
                                {noRoleMembers.length > 0 && (
                                    <div className={buckets.length > 0 ? 'mt-1' : ''}>
                                        {buckets.length > 0 && (
                                            <p className="px-2 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Miembros &mdash; {noRoleMembers.length}
                                            </p>
                                        )}
                                        {noRoleMembers.map(renderMember)}
                                    </div>
                                )}
                            </div>
                        </aside>
                    );
                })()}
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
            {/* Barra de navegación inferior — solo móvil */}
            <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-gray-950 border-t border-gray-800 flex items-center justify-around px-2 py-2 z-30">
                {userServers.slice(0, 3).map((srv) => {
                    const isCurrent = srv.id === channel.server_id;
                    const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                    return (
                        <div key={srv.id} className="relative">
                            <Link
                                href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                                className={`w-10 h-10 flex items-center justify-center font-bold text-sm rounded-xl transition-all overflow-hidden ${
                                    isCurrent ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'
                                }`}
                            >
                                {srv.icon_url
                                    ? <img src={srv.icon_url} alt={srv.name} className="w-full h-full object-cover" />
                                    : srv.name[0].toUpperCase()
                                }
                            </Link>
                            {badge > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </div>
                    );
                })}
                {/* DMs con unread primero, máx 2 en móvil */}
                {[...dmConversations].sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0)).slice(0, 2).map((conv) => (
                    <div key={conv.id} className="relative">
                        <Link
                            href={route('conversations.show', conv.id)}
                            title={conv.type === 'group' ? (conv.name ?? 'Grupo') : conv.user?.name}
                            className="w-10 h-10 rounded-xl overflow-hidden bg-gray-700 flex items-center justify-center"
                        >
                            {conv.type === 'group' ? (
                                <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: conv.icon_color ?? '#6366f1' }}>
                                    {(conv.name ?? '#')[0].toUpperCase()}
                                </span>
                            ) : conv.user?.avatar_url
                                ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                : <span className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: conv.user?.banner_color ?? '#6366f1' }}>
                                    {conv.user?.name?.[0]?.toUpperCase()}
                                </span>
                            }
                        </Link>
                        {conv.unread > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                                {conv.unread > 99 ? '99+' : conv.unread}
                            </span>
                        )}
                    </div>
                ))}
                <Link
                    href={route('conversations.index')}
                    className="w-10 h-10 flex items-center justify-center text-indigo-300 bg-gray-700 rounded-xl text-lg"
                    title="Todos los DMs"
                >✉</Link>
                <div className="relative">
                    <Link
                        href={route('friends.index')}
                        className="w-10 h-10 flex items-center justify-center text-indigo-300 bg-gray-700 rounded-xl text-lg"
                        title="Amigos"
                    >👥</Link>
                    {pendingFriendRequests > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 pointer-events-none">
                            {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                        </span>
                    )}
                </div>
            </nav>

            {/* Modal de búsqueda global (Ctrl+K) */}
            {globalSearchOpen && (
                <div
                    className="fixed inset-0 z-[300] flex items-start justify-center pt-24 px-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) { setGlobalSearchOpen(false); } }}
                >
                    <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                            <input
                                autoFocus
                                type="text"
                                value={globalQuery}
                                onChange={(e) => doGlobalSearch(e.target.value)}
                                placeholder="Buscar en todos los servidores..."
                                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                                onKeyDown={(e) => { if (e.key === 'Escape') setGlobalSearchOpen(false); }}
                            />
                            <kbd className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Esc</kbd>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {globalSearching && (
                                <p className="text-xs text-gray-400 px-4 py-3">Buscando...</p>
                            )}
                            {!globalSearching && globalResults !== null && globalResults.length === 0 && (
                                <p className="text-xs text-gray-400 px-4 py-3">Sin resultados para "{globalQuery}".</p>
                            )}
                            {!globalSearching && globalResults !== null && globalResults.map((result) => (
                                <button
                                    key={result.id}
                                    className="w-full flex gap-3 items-start px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0"
                                    onClick={() => {
                                        setGlobalSearchOpen(false);
                                        router.visit(route('channels.show', result.channel_id));
                                    }}
                                >
                                    <Avatar user={result.user} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-indigo-300">{result.user?.name}</span>
                                            <span className="text-xs text-gray-500">en #{result.channel_name}</span>
                                            <span className="text-xs text-gray-600">· {result.server_name}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 truncate mt-0.5">{result.content}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(result.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            {globalResults === null && !globalSearching && (
                                <p className="text-xs text-gray-500 px-4 py-3">Escribe al menos 2 caracteres para buscar.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
