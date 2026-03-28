import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ServerModal from '@/Components/ServerModal';

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
            className={`${dims} rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0`}
            style={{ backgroundColor: user?.banner_color ?? undefined }}
        >
            {user?.name?.[0]?.toUpperCase()}
        </div>
    );
}

function GroupAvatar({ name, iconColor, size = 'md' }) {
    const dims = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-9 h-9 text-base';
    return (
        <div
            className={`${dims} rounded-lg flex items-center justify-center font-bold shrink-0 text-white`}
            style={{ backgroundColor: iconColor ?? '#6366f1' }}
        >
            {name?.[0]?.toUpperCase() ?? '#'}
        </div>
    );
}

function ConvAvatar({ conv, onlineUsers, size = 'md' }) {
    if (conv.type === 'group') {
        return <GroupAvatar name={conv.name} iconColor={conv.icon_color} size={size} />;
    }
    const user = conv.user;
    const dims = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
    return (
        <div className="relative shrink-0">
            <Avatar user={user} size={size} />
            <span className="absolute -bottom-0.5 -right-0.5">
                <StatusDot status={onlineUsers[user?.id]} size="sm" />
            </span>
        </div>
    );
}

export default function Show({ conversation, other, members: initialMembers = null, friendsToAdd: initialFriendsToAdd = [], messages: initialMessages, userServers = [] }) {
    const { auth, badges: initialBadges } = usePage().props;
    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [messages, setMessages]             = useState(initialMessages);
    const [content, setContent]               = useState('');
    const [sending, setSending]               = useState(false);
    const [onlineUsers, setOnlineUsers]       = useState({});
    const [myStatus, setMyStatus]             = useState(auth.user.status ?? 'online');
    const [statusOpen, setStatusOpen]         = useState(false);
    const [mentionBadges, setMentionBadges]   = useState(initialBadges?.mentions ?? {});
    const [dmConversations, setDmConversations] = useState(initialBadges?.dmConversations ?? []);

    const [attachmentFile, setAttachmentFile]       = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [editingId, setEditingId]                 = useState(null);
    const [editContent, setEditContent]             = useState('');
    const [confirmDeleteId, setConfirmDeleteId]     = useState(null);

    const [membersPanelOpen, setMembersPanelOpen] = useState(false);
    const [addMemberSearch, setAddMemberSearch]   = useState('');
    const [members, setMembers]                   = useState(initialMembers);
    const [friendsToAdd, setFriendsToAdd]         = useState(initialFriendsToAdd ?? []);
    const [leavingGroup, setLeavingGroup]         = useState(false);

    const [createGroupOpen, setCreateGroupOpen]     = useState(false);
    const [groupName, setGroupName]                 = useState('');
    const [groupColor, setGroupColor]               = useState('#6366f1');
    const [groupSelectedIds, setGroupSelectedIds]   = useState([]);
    const [groupFriendSearch, setGroupFriendSearch] = useState('');
    const [creatingGroup, setCreatingGroup]         = useState(false);
    const [groupFriends, setGroupFriends]           = useState([]);

    const isGroup = conversation.type === 'group';
    const myRole  = members?.find((m) => m.id === auth.user.id)?.pivot_role;
    const isAdmin = myRole === 'admin';

    const bottomRef    = useRef(null);
    const inputRef     = useRef(null);
    const statusMenuRef = useRef(null);
    const fileInputRef  = useRef(null);

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

    // Canal privado de esta conversación
    useEffect(() => {
        setDmConversations((prev) => prev.map((c) => c.id === conversation.id ? { ...c, unread: 0 } : c));

        const ch = window.Echo.private(`conversation.${conversation.id}`);
        ch.listen('.DirectMessageSent', (e) => {
            if (e.user.id === auth.user.id) return;
            setMessages((prev) => [...prev, e]);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
        ch.listen('.DirectMessageUpdated', (e) => {
            setMessages((prev) => prev.map((m) => m.id === e.id ? { ...m, content: e.content, updated_at: e.updated_at } : m));
        });
        ch.listen('.DirectMessageDeleted', (e) => {
            setMessages((prev) => prev.filter((m) => m.id !== e.id));
        });
        return () => {
            ch.stopListening('.DirectMessageSent');
            ch.stopListening('.DirectMessageUpdated');
            ch.stopListening('.DirectMessageDeleted');
        };
    }, [conversation.id]);

    // Canal privado del usuario: badges + notificaciones de amistad
    useEffect(() => {
        const userChannel = window.Echo.private(`App.Models.User.${auth.user.id}`);
        userChannel.listen('.MentionReceived', (e) => {
            if (e.server_id) {
                setMentionBadges((prev) => ({ ...prev, [e.server_id]: (prev[e.server_id] ?? 0) + 1 }));
            }
        });
        userChannel.listen('.NewDirectMessage', (e) => {
            if (e.conversation_id === conversation.id) return;
            setDmConversations((prev) => {
                const exists = prev.find((c) => c.id === e.conversation_id);
                if (exists) {
                    return prev.map((c) => c.id === e.conversation_id ? { ...c, unread: (c.unread ?? 0) + 1 } : c);
                }
                if (e.is_group) {
                    return [...prev, { id: e.conversation_id, type: 'group', unread: 1, name: e.group_name, icon_color: e.group_icon_color, user: null }];
                }
                return [...prev, {
                    id: e.conversation_id, type: 'direct', unread: 1, user: {
                        id: e.sender_id, name: e.sender, avatar_url: e.sender_avatar, banner_color: e.sender_banner_color,
                    },
                }];
            });
        });
        return () => {
            userChannel.stopListening('.MentionReceived');
            userChannel.stopListening('.NewDirectMessage');
        };
    }, [auth.user.id, conversation.id]);

    function startEdit(msg) {
        setEditingId(msg.id);
        setEditContent(msg.content ?? '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditContent('');
    }

    async function submitEdit(msg) {
        const trimmed = editContent.trim();
        const original = msg.content ?? '';
        if (!msg.attachment_url && (!trimmed || trimmed === original)) { cancelEdit(); return; }
        if (msg.attachment_url && trimmed === original) { cancelEdit(); return; }
        const updated = trimmed;
        const now = new Date().toISOString();
        setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: updated, updated_at: now } : m));
        cancelEdit();
        try {
            const res = await window.axios.patch(route('direct-messages.update', msg.id), { content: updated });
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, updated_at: res.data.updated_at } : m));
        } catch {
            setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: msg.content, updated_at: msg.updated_at } : m));
        }
    }

    async function deleteMessage(msg) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        setConfirmDeleteId(null);
        try {
            await window.axios.delete(route('direct-messages.destroy', msg.id));
        } catch {
            setMessages((prev) => {
                const idx = prev.findIndex((m) => m.created_at <= msg.created_at);
                const next = [...prev];
                next.splice(idx >= 0 ? idx : prev.length, 0, msg);
                return next;
            });
        }
    }

    async function changeStatus(status) {
        setStatusOpen(false);
        setMyStatus(status);
        setOnlineUsers((prev) => ({ ...prev, [auth.user.id]: status }));
        await window.axios.patch(route('user.status'), { status });
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
                res = await window.axios.post(route('conversations.store', conversation.id), fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                res = await window.axios.post(route('conversations.store', conversation.id), { content: text });
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

    function leaveGroup() {
        if (!confirm('¿Salir de este grupo?')) return;
        setLeavingGroup(true);
        router.delete(route('conversations.leave', conversation.id), {
            onError: () => setLeavingGroup(false),
        });
    }

    async function addMember(user) {
        try {
            await window.axios.post(route('conversations.members.add', conversation.id), { user_id: user.id });
            setMembers((prev) => [...(prev ?? []), { ...user, pivot_role: 'member' }]);
            setFriendsToAdd((prev) => prev.filter((u) => u.id !== user.id));
        } catch {
            // silently ignore
        }
        setAddMemberSearch('');
    }

    async function openCreateGroup() {
        setCreateGroupOpen(true);
        setGroupName('');
        setGroupSelectedIds([]);
        setGroupFriendSearch('');
        try {
            const res = await window.axios.get(route('friends.index'), { headers: { 'X-Inertia': 'true', 'X-Inertia-Version': '' } });
            // friends.index is Inertia, so use a dedicated endpoint instead
            // Fall back: use the dmConversations direct entries as friend proxies
        } catch {
            // ignore — we'll just use empty
        }
        // Use direct conversations from dmConversations as proxy for "known users"
        const knownUsers = dmConversations
            .filter((c) => c.type === 'direct' && c.user)
            .map((c) => c.user);
        setGroupFriends(knownUsers);
    }

    async function createGroup() {
        if (groupSelectedIds.length === 0 || creatingGroup) return;
        setCreatingGroup(true);
        try {
            router.post(route('conversations.group.create'), {
                name: groupName.trim() || null,
                icon_color: groupColor,
                user_ids: groupSelectedIds,
            }, {
                onError: () => setCreatingGroup(false),
                onFinish: () => setCreatingGroup(false),
            });
            setCreateGroupOpen(false);
        } catch {
            setCreatingGroup(false);
        }
    }

    const convName = isGroup
        ? (conversation.name ?? 'Grupo')
        : (other?.name ?? '');

    const convDisplayName = (conv) => {
        if (conv.type === 'group') return conv.name ?? 'Grupo';
        return conv.user?.name ?? '';
    };

    return (
        <AuthenticatedLayout>
            <Head title={isGroup ? convName : `@ ${convName}`} />

            <div className="flex h-screen bg-gray-800 text-gray-100">

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
                                        className="w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 rounded-full bg-gray-700 text-gray-300 hover:rounded-2xl hover:bg-indigo-500 hover:text-white overflow-hidden"
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

                    {/* Conversaciones DM con mensajes sin leer */}
                    {dmConversations.filter((c) => c.unread > 0).map((conv) => {
                        const isActive = conv.id === conversation.id;
                        return (
                            <div key={conv.id} className="flex items-center w-full px-1.5 group">
                                {isActive && <span className="absolute left-0 w-1 h-8 rounded-r-full bg-white" />}
                                <div className="relative">
                                    <Link
                                        href={route('conversations.show', conv.id)}
                                        title={convDisplayName(conv)}
                                        className={`w-12 h-12 flex items-center justify-center font-bold text-sm transition-all duration-150 overflow-hidden ${
                                            isActive ? 'ring-2 ring-white' : 'hover:opacity-90'
                                        } ${conv.type === 'group' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'}`}
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
                                    {!isActive && conv.unread > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
                                            {conv.unread > 99 ? '99+' : conv.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    <div className="relative flex items-center w-full px-1.5 group">
                        <Link
                            href={route('conversations.index')}
                            title="Todos los mensajes directos"
                            className="w-12 h-12 flex items-center justify-center text-xl text-indigo-300 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-150"
                        >✉</Link>
                    </div>

                    <div className="mt-1 w-8 border-t border-gray-700" />

                    <div className="relative flex items-center w-full px-1.5 group">
                        <button
                            type="button"
                            onClick={() => setServerModalOpen(true)}
                            title="Añadir servidor"
                            className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all duration-150"
                        >+</button>
                    </div>
                </nav>
                {serverModalOpen && <ServerModal onClose={() => setServerModalOpen(false)} />}

                {/* Sidebar izquierdo: conversaciones */}
                <aside className="w-52 bg-gray-900 flex flex-col shrink-0">
                    <div className="px-3 py-2.5 border-b border-gray-700 flex items-center justify-between">
                        <span className="font-bold text-white text-sm">Mensajes directos</span>
                        <button
                            onClick={openCreateGroup}
                            title="Nuevo grupo"
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors text-base leading-none"
                        >+</button>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        <Link
                            href={route('friends.index')}
                            className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-gray-700 hover:text-white"
                        >
                            <span className="text-base shrink-0">👥</span>
                            <span className="truncate">Amigos</span>
                        </Link>
                        <div className="h-px bg-gray-700 my-1" />
                        {dmConversations.map((conv) => {
                            const isActive = conv.id === conversation.id;
                            const unread   = conv.unread ?? 0;
                            return (
                                <Link
                                    key={conv.id}
                                    href={route('conversations.show', conv.id)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm ${
                                        isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <div className="shrink-0">
                                        {conv.type === 'group' ? (
                                            <GroupAvatar name={conv.name} iconColor={conv.icon_color} size="sm" />
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
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Header */}
                    <header className="px-4 py-2.5 border-b border-gray-700 flex items-center gap-3 shrink-0">
                        {isGroup ? (
                            <>
                                <GroupAvatar name={conversation.name} iconColor={conversation.icon_color} size="lg" />
                                <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-white block leading-tight truncate">
                                        {conversation.name ?? 'Grupo'}
                                    </span>
                                    <p className="text-xs text-gray-400 leading-none">
                                        {members?.length ?? 0} miembros
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 ml-auto shrink-0">
                                    <button
                                        onClick={() => setMembersPanelOpen((o) => !o)}
                                        title="Miembros del grupo"
                                        className={`px-3 py-1.5 rounded text-sm transition-colors ${membersPanelOpen ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                    >
                                        👥 {members?.length ?? 0}
                                    </button>
                                    <button
                                        onClick={leaveGroup}
                                        disabled={leavingGroup}
                                        title="Salir del grupo"
                                        className="px-3 py-1.5 rounded text-sm text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        Salir
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <Avatar user={other} size="sm" />
                                    <span className="absolute -bottom-0.5 -right-0.5">
                                        <StatusDot status={onlineUsers[other?.id]} size="sm" />
                                    </span>
                                </div>
                                <div>
                                    <span className="font-semibold text-white">{other?.name}</span>
                                    <p className="text-xs text-gray-400 leading-none">
                                        {onlineUsers[other?.id] ? STATUS_CONFIG[onlineUsers[other?.id]]?.label : 'Desconectado'}
                                    </p>
                                </div>
                            </>
                        )}
                    </header>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Mensajes */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => {
                                const isOwn     = msg.user?.id === auth.user.id;
                                const isTmp     = String(msg.id).startsWith('tmp-');
                                const isEditing = editingId === msg.id;
                                return (
                                    <div key={msg.id} className="group flex gap-3 px-2 py-0.5 rounded-lg hover:bg-gray-700/40 relative">
                                        <div className="shrink-0 self-start mt-0.5">
                                            <Avatar user={msg.user} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-semibold text-white">{msg.user?.name}</span>
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
                                                            {msg.content}
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
                                        {!isTmp && !isEditing && isOwn && (
                                            <div className="absolute right-2 top-1 hidden group-hover:flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-1 py-0.5 shadow-lg z-10">
                                                <button type="button" onClick={() => startEdit(msg)}
                                                    className="text-gray-400 hover:text-white px-1.5 py-0.5 rounded text-xs"
                                                    title="Editar">✏️</button>
                                                {confirmDeleteId === msg.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" onClick={() => deleteMessage(msg)}
                                                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded">Eliminar</button>
                                                        <button type="button" onClick={() => setConfirmDeleteId(null)}
                                                            className="text-xs text-gray-400 hover:text-gray-200 px-1">✕</button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setConfirmDeleteId(msg.id)}
                                                        className="text-gray-400 hover:text-red-400 px-1.5 py-0.5 rounded text-xs"
                                                        title="Eliminar">🗑️</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        {/* Panel de miembros del grupo */}
                        {isGroup && membersPanelOpen && (
                            <aside className="w-56 bg-gray-900 border-l border-gray-700 flex flex-col shrink-0">
                                <div className="px-3 py-2.5 border-b border-gray-700 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-300">Miembros</span>
                                    <button onClick={() => setMembersPanelOpen(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                    {members?.map((m) => (
                                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800">
                                            <div className="relative shrink-0">
                                                <Avatar user={m} size="sm" />
                                                <span className="absolute -bottom-0.5 -right-0.5">
                                                    <StatusDot status={onlineUsers[m.id]} size="sm" />
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-200 truncate leading-tight">{m.name}</p>
                                                {m.pivot_role === 'admin' && (
                                                    <p className="text-[10px] text-indigo-400 leading-none">Admin</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {isAdmin && friendsToAdd.length > 0 && (
                                    <div className="p-2 border-t border-gray-700">
                                        <p className="text-xs text-gray-500 mb-1.5 px-1">Añadir amigo</p>
                                        <input
                                            type="text"
                                            value={addMemberSearch}
                                            onChange={(e) => setAddMemberSearch(e.target.value)}
                                            placeholder="Filtrar amigos..."
                                            className="w-full bg-gray-800 text-sm text-white placeholder-gray-500 rounded px-2 py-1.5 outline-none border border-gray-600 focus:border-indigo-500"
                                        />
                                        <div className="mt-1 space-y-0.5 max-h-36 overflow-y-auto">
                                            {friendsToAdd
                                                .filter((u) => !addMemberSearch || u.name.toLowerCase().includes(addMemberSearch.toLowerCase()))
                                                .map((u) => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => addMember(u)}
                                                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-800 text-left"
                                                    >
                                                        <Avatar user={u} size="sm" />
                                                        <span className="text-sm text-gray-200 truncate">{u.name}</span>
                                                        <span className="ml-auto text-xs text-indigo-400 shrink-0">+</span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </aside>
                        )}
                    </div>

                    {/* Input */}
                    <div className="shrink-0 px-4 pb-4">
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
                        <form onSubmit={submit} className="flex gap-2 bg-gray-700 rounded-lg px-4 py-2">
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
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={isGroup ? `Mensaje en ${conversation.name ?? 'el grupo'}` : `Mensaje a ${other?.name}`}
                                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={sending || (!content.trim() && !attachmentFile)}
                                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
                            >
                                Enviar
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            {/* Modal: crear grupo */}
            {createGroupOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setCreateGroupOpen(false); }}>
                    <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="font-semibold text-white">Nuevo grupo</h2>
                            <button onClick={() => setCreateGroupOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Nombre del grupo (opcional)</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Mi grupo"
                                    maxLength={100}
                                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none border border-gray-600 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Color del icono</label>
                                <div className="flex items-center gap-2">
                                    {['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6'].map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setGroupColor(c)}
                                            className={`w-7 h-7 rounded-full transition-all ${groupColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Añadir usuarios</label>
                                <input
                                    type="text"
                                    value={groupFriendSearch}
                                    onChange={(e) => setGroupFriendSearch(e.target.value)}
                                    placeholder="Filtrar usuarios..."
                                    className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm outline-none border border-gray-600 focus:border-indigo-500 mb-2"
                                />
                                {groupFriends.length === 0 && (
                                    <p className="text-xs text-gray-500">No hay usuarios disponibles. Primero inicia conversaciones directas.</p>
                                )}
                                <div className="max-h-40 overflow-y-auto space-y-0.5">
                                    {groupFriends
                                        .filter((u) => !groupFriendSearch || u.name.toLowerCase().includes(groupFriendSearch.toLowerCase()))
                                        .map((u) => {
                                            const selected = groupSelectedIds.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    onClick={() => setGroupSelectedIds((prev) =>
                                                        selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                                    )}
                                                    className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors ${selected ? 'bg-indigo-600/30 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
                                                >
                                                    <Avatar user={u} size="sm" />
                                                    <span className="text-sm truncate flex-1">{u.name}</span>
                                                    {selected && <span className="text-indigo-400 text-xs shrink-0">✓</span>}
                                                </button>
                                            );
                                        })
                                    }
                                </div>
                                {groupSelectedIds.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">{groupSelectedIds.length} seleccionado{groupSelectedIds.length !== 1 ? 's' : ''}</p>
                                )}
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-700 flex justify-end gap-2">
                            <button onClick={() => setCreateGroupOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancelar</button>
                            <button
                                onClick={createGroup}
                                disabled={groupSelectedIds.length === 0 || creatingGroup}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {creatingGroup ? 'Creando…' : 'Crear grupo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
