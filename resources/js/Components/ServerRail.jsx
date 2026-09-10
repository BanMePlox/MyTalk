import { useEffect, useRef, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';

const FOLDER_COLORS = ['#3F6F5B', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9', '#14b8a6'];

// ── Module-level sub-components (outside ServerRail so identity is stable) ────

function ServerIcon({ srv, isCurrent, badge, dragOver, onDragStart, onDragEnd, onDragOverServer, onDropOnServer }) {
    const isOver = dragOver?.type === 'server' && dragOver.id === srv.id;
    return (
        <div
            className="relative"
            draggable
            onDragStart={e => onDragStart(e, srv)}
            onDragEnd={onDragEnd}
            onDragOver={e => onDragOverServer(e, srv)}
            onDrop={e => onDropOnServer(e, srv)}
        >
            <Link
                href={srv.first_channel_id ? route('channels.show', srv.first_channel_id) : route('servers.show', srv.id)}
                title={srv.name}
                prefetch
                draggable={false}
                className={`w-12 h-12 flex items-center justify-center font-bold text-lg transition-all duration-150 shrink-0 overflow-hidden ${
                    isOver
                        ? 'rounded-2xl ring-2 ring-accent scale-110'
                        : isCurrent
                            ? 'rounded-2xl bg-accent text-text-on-accent'
                            : 'rounded-full bg-bg-elevated text-text-secondary hover:rounded-2xl hover:bg-accent hover:text-text-on-accent border border-border'
                }`}
            >
                {srv.icon_url
                    ? <img src={srv.icon_url} alt={srv.name} className="w-full h-full object-cover" />
                    : srv.name[0].toUpperCase()
                }
            </Link>
            {badge > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-bg-muted pointer-events-none">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </div>
    );
}

function FolderIcon({
    folder, servers, currentServerId, mentionBadges,
    isCollapsed, dragOver,
    onToggle, onContextMenu,
    onDragOverFolder, onDropOnFolder,
    onDragStart, onDragEnd, onDragOverServer, onDropOnServer,
    onServerContextMenu,
}) {
    const totalBadge = servers.reduce((s, srv) => s + (mentionBadges[srv.id] ?? 0), 0);
    const hasCurrentServer = servers.some(s => s.id === currentServerId);
    const isOver = dragOver?.type === 'folder' && dragOver.id === folder.id;

    return (
        <div className="flex flex-col items-center w-full gap-0.5">
            <div className="flex items-center w-full px-1.5 group">
                <span className={`absolute left-0 w-1 rounded-r-full bg-accent transition-all ${
                    hasCurrentServer && isCollapsed ? 'h-8' : 'h-0 group-hover:h-5'
                }`} />
                <div
                    className="relative"
                    onDragOver={e => onDragOverFolder(e, folder.id)}
                    onDrop={e => onDropOnFolder(e, folder.id)}
                >
                    <button
                        onClick={() => onToggle(folder.id)}
                        onContextMenu={e => onContextMenu(e, 'folder', folder)}
                        title={folder.name}
                        className={`w-12 h-12 flex flex-col items-center justify-center gap-0.5 rounded-full hover:rounded-2xl transition-all duration-150 overflow-hidden ${isOver ? 'scale-110 rounded-2xl' : ''}`}
                        style={{
                            backgroundColor: folder.color + '33',
                            border: `2px solid ${isOver ? 'white' : folder.color}`,
                        }}
                    >
                        {servers.slice(0, 4).map(srv => (
                            <div key={srv.id} className="w-4 h-4 rounded-sm overflow-hidden shrink-0"
                                style={{ backgroundColor: folder.color }}>
                                {srv.icon_url
                                    ? <img src={srv.icon_url} alt="" className="w-full h-full object-cover" />
                                    : <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-text">
                                        {srv.name[0].toUpperCase()}
                                      </span>
                                }
                            </div>
                        ))}
                    </button>
                    {totalBadge > 0 && isCollapsed && (
                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-bg-muted pointer-events-none">
                            {totalBadge > 99 ? '99+' : totalBadge}
                        </span>
                    )}
                </div>
            </div>

            {!isCollapsed && servers.map(srv => {
                const isCurrent = srv.id === currentServerId;
                const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                return (
                    <div key={srv.id} className="flex items-center w-full px-1.5 group"
                        onContextMenu={e => onServerContextMenu(e, srv)}>
                        <span className={`absolute left-0 w-1 rounded-r-full bg-accent transition-all ${isCurrent ? 'h-8' : 'h-0 group-hover:h-5'}`} />
                        <ServerIcon
                            srv={srv} isCurrent={isCurrent} badge={badge} dragOver={dragOver}
                            onDragStart={onDragStart} onDragEnd={onDragEnd}
                            onDragOverServer={onDragOverServer} onDropOnServer={onDropOnServer}
                        />
                    </div>
                );
            })}

            {!isCollapsed && (
                <p className="text-[9px] text-text-muted truncate max-w-[60px] text-center leading-tight px-1">{folder.name}</p>
            )}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ServerRail({
    userServers = [],
    userFolders: initialFolders = [],
    mentionBadges = {},
    dmConversations = [],
    pendingFriendRequests = 0,
    currentServerId = null,
    onAddServer,
}) {
    const { auth } = usePage().props;
    const t = useTrans();
    const isAdmin = auth?.is_admin ?? false;

    const [folders, setFolders] = useState(initialFolders);
    const [collapsedFolders, setCollapsedFolders] = useState({});
    const [contextMenu, setContextMenu] = useState(null);
    const [folderModal, setFolderModal] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const dragSrv = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => { setFolders(initialFolders); }, [initialFolders.map(f => f.id).join(',')]);

    useEffect(() => {
        function handle(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setContextMenu(null);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Group servers
    const grouped = {};
    const ungrouped = [];
    userServers.forEach(srv => {
        if (srv.folder_id) {
            grouped[srv.folder_id] = grouped[srv.folder_id] ?? [];
            grouped[srv.folder_id].push(srv);
        } else {
            ungrouped.push(srv);
        }
    });

    function openContextMenu(e, type, target) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, type, target });
    }

    function toggleFolder(folderId) {
        setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
    }

    async function renameFolder(folderId, name, color) {
        const res = await window.axios.patch(`/server-folders/${folderId}`, { name, color });
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...res.data } : f));
    }

    async function deleteFolder(folderId) {
        await window.axios.delete(`/server-folders/${folderId}`);
        setFolders(prev => prev.filter(f => f.id !== folderId));
        router.reload({ only: ['userServers'] });
    }

    async function addToFolder(folderId, serverId) {
        await window.axios.post(`/server-folders/${folderId}/add`, { server_id: serverId });
        router.reload({ only: ['userServers'] });
    }

    async function removeFromFolder(folderId, serverId) {
        await window.axios.post(`/server-folders/${folderId}/remove`, { server_id: serverId });
        router.reload({ only: ['userServers'] });
    }

    // ── Drag & Drop ───────────────────────────────────────────────────────────

    function onDragStart(e, srv) {
        dragSrv.current = srv;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(srv.id));
        const target = e.currentTarget;
        setTimeout(() => { target.style.opacity = '0.4'; }, 0);
    }

    function onDragEnd(e) {
        e.currentTarget.style.opacity = '';
        dragSrv.current = null;
        setDragOver(null);
    }

    function onDragOverServer(e, targetSrv) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrv.current?.id === targetSrv.id) return;
        setDragOver({ type: 'server', id: targetSrv.id });
    }

    function onDragOverFolder(e, folderId) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOver({ type: 'folder', id: folderId });
    }

    function onDragOverRail(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOver?.type !== 'server' && dragOver?.type !== 'folder') {
            setDragOver({ type: 'rail' });
        }
    }

    async function onDropOnServer(e, targetSrv) {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
        const src = dragSrv.current;
        if (!src || src.id === targetSrv.id) return;

        if (targetSrv.folder_id) {
            await addToFolder(targetSrv.folder_id, src.id);
        } else {
            setFolderModal({ mode: 'create', serverId: src.id, targetServerId: targetSrv.id, name: t('folder.new'), color: '#3F6F5B' });
        }
    }

    async function onDropOnFolder(e, folderId) {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
        const src = dragSrv.current;
        if (!src) return;
        await addToFolder(folderId, src.id);
    }

    async function onDropOnRail(e) {
        e.preventDefault();
        setDragOver(null);
        const src = dragSrv.current;
        if (!src || !src.folder_id) return;
        await removeFromFolder(src.folder_id, src.id);
    }

    const dndHandlers = { onDragStart, onDragEnd, onDragOverServer, onDropOnServer };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <nav
                className="hidden sm:flex w-[72px] bg-bg-muted border-r border-border flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto"
                onDragOver={onDragOverRail}
                onDrop={onDropOnRail}
            >
                {ungrouped.map(srv => {
                    const isCurrent = srv.id === currentServerId;
                    const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                    return (
                        <div key={srv.id} className="flex items-center w-full px-1.5 group"
                            onContextMenu={e => openContextMenu(e, 'server', srv)}>
                            <span className={`absolute left-0 w-1 rounded-r-full bg-accent transition-all ${isCurrent ? 'h-8' : 'h-0 group-hover:h-5'}`} />
                            <ServerIcon srv={srv} isCurrent={isCurrent} badge={badge} dragOver={dragOver} {...dndHandlers} />
                        </div>
                    );
                })}

                {folders.map(folder => {
                    const servers = grouped[folder.id] ?? [];
                    if (!servers.length) return null;
                    return (
                        <FolderIcon
                            key={folder.id}
                            folder={folder}
                            servers={servers}
                            currentServerId={currentServerId}
                            mentionBadges={mentionBadges}
                            isCollapsed={collapsedFolders[folder.id] ?? true}
                            dragOver={dragOver}
                            onToggle={toggleFolder}
                            onContextMenu={openContextMenu}
                            onDragOverFolder={onDragOverFolder}
                            onDropOnFolder={onDropOnFolder}
                            onServerContextMenu={(e, srv) => openContextMenu(e, 'server', srv)}
                            {...dndHandlers}
                        />
                    );
                })}

                <div className="mt-1 w-8 border-t border-border" />

                {dmConversations.filter(c => c.unread > 0).map(conv => (
                    <div key={conv.id} className="flex items-center w-full px-1.5 group">
                        <div className="relative">
                            <Link href={route('conversations.show', conv.id)}
                                title={conv.type === 'group' ? (conv.name ?? t('conv.group')) : conv.user?.name}
                                prefetch
                                className={`w-12 h-12 flex items-center justify-center font-bold text-sm bg-bg-muted hover:opacity-90 text-text transition-all duration-150 overflow-hidden ${conv.type === 'group' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'}`}
                            >
                                {conv.type === 'group'
                                    ? <span style={{ backgroundColor: conv.icon_color ?? '#3F6F5B' }} className="w-full h-full flex items-center justify-center text-lg font-bold">{(conv.name ?? '#')[0].toUpperCase()}</span>
                                    : conv.user?.avatar_url
                                        ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                        : <span style={{ backgroundColor: conv.user?.banner_color ?? '#3F6F5B' }} className="w-full h-full flex items-center justify-center text-lg font-bold">{conv.user?.name?.[0]?.toUpperCase()}</span>
                                }
                            </Link>
                            {conv.unread > 0 && (
                                <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-bg-muted pointer-events-none">
                                    {conv.unread > 99 ? '99+' : conv.unread}
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                <div className="relative flex items-center w-full px-1.5 group">
                    <div className="relative">
                        <Link href={route('friends.index')} title={t('nav.friends')} prefetch
                            className="w-12 h-12 flex items-center justify-center text-xl text-accent bg-bg-muted rounded-full hover:rounded-2xl hover:opacity-90 hover:text-text transition-all duration-150"
                        >👥</Link>
                        {pendingFriendRequests > 0 && (
                            <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-text text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-bg-muted pointer-events-none">
                                {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-1 w-8 border-t border-border" />

                <div className="relative flex items-center w-full px-1.5 group">
                    <button type="button" onClick={onAddServer} title={t('nav.add_server')}
                        className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-bg-muted rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-text transition-all duration-150"
                    >+</button>
                </div>

                {isAdmin && (
                    <div className="relative flex items-center w-full px-1.5 group">
                        <Link href={route('admin.index')} title={t('folder.admin_panel')}
                            className="w-12 h-12 flex items-center justify-center bg-bg-muted rounded-full hover:rounded-2xl hover:opacity-90 hover:text-text transition-all duration-150"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent group-hover:text-text" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5ZM9.75 6.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM9.25 13.5A6.75 6.75 0 0 0 2.5 20.25a.75.75 0 0 0 .75.75h17.5a.75.75 0 0 0 .75-.75A6.75 6.75 0 0 0 14.75 13.5h-5.5Z" clipRule="evenodd" />
                            </svg>
                        </Link>
                        <div className="absolute left-full ml-3 px-2 py-1 bg-bg text-text text-xs rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                            {t('folder.admin_panel')}
                        </div>
                    </div>
                )}
            </nav>

            {/* Context menu */}
            {contextMenu && (
                <div ref={menuRef} className="fixed z-[600] bg-bg border border-border rounded-lg py-1 w-52"
                    style={{ top: contextMenu.y, left: contextMenu.x }}>
                    {contextMenu.type === 'server' && (
                        <>
                            <p className="px-3 py-1 text-xs text-text-muted font-semibold truncate">{contextMenu.target.name}</p>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => { setContextMenu(null); setFolderModal({ mode: 'create', serverId: contextMenu.target.id, name: t('folder.new'), color: '#3F6F5B' }); }}
                                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted">
                                {t('folder.new')}
                            </button>
                            {folders.length > 0 && (
                                <>
                                    <div className="border-t border-border my-1" />
                                    <p className="px-3 py-1 text-xs text-text-muted">{t('folder.move_to')}</p>
                                    {folders.map(f => (
                                        <button key={f.id} onClick={() => { setContextMenu(null); addToFolder(f.id, contextMenu.target.id); }}
                                            className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                                            {f.name}
                                        </button>
                                    ))}
                                </>
                            )}
                            {contextMenu.target.folder_id && (
                                <>
                                    <div className="border-t border-border my-1" />
                                    <button onClick={() => { setContextMenu(null); removeFromFolder(contextMenu.target.folder_id, contextMenu.target.id); }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-bg-muted">
                                        {t('folder.remove')}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    {contextMenu.type === 'folder' && (
                        <>
                            <p className="px-3 py-1 text-xs text-text-muted font-semibold truncate">{contextMenu.target.name}</p>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => { setContextMenu(null); setFolderModal({ mode: 'edit', folderId: contextMenu.target.id, name: contextMenu.target.name, color: contextMenu.target.color }); }}
                                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-muted">
                                {t('folder.edit')}
                            </button>
                            <button onClick={() => { setContextMenu(null); deleteFolder(contextMenu.target.id); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-bg-muted">
                                {t('folder.delete')}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Folder modal */}
            {folderModal && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center px-4" onClick={() => setFolderModal(null)}>
                    <div className="absolute inset-0 overlay-backdrop" />
                    <div className="relative bg-bg-elevated border border-border rounded-xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
                        <h3 className="text-text font-semibold mb-4">
                            {folderModal.mode === 'create' ? t('folder.new') : t('folder.edit')}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-text-muted font-semibold uppercase tracking-wide block mb-1">{t('folder.name_label')}</label>
                                <input autoFocus type="text" maxLength={50} value={folderModal.name}
                                    onChange={e => setFolderModal(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                            </div>
                            <div>
                                <label className="text-xs text-text-muted font-semibold uppercase tracking-wide block mb-2">{t('folder.color_label')}</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {FOLDER_COLORS.map(c => (
                                        <button key={c} type="button" onClick={() => setFolderModal(prev => ({ ...prev, color: c }))}
                                            className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                                            style={{ backgroundColor: c, boxShadow: folderModal.color === c ? `0 0 0 2px #1f2937, 0 0 0 4px ${c}` : 'none' }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => setFolderModal(null)}
                                className="flex-1 px-3 py-2 text-sm text-text-muted bg-bg-muted hover:bg-border-strong rounded-md transition-colors">
                                {t('folder.cancel')}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!folderModal.name.trim()) return;
                                    if (folderModal.mode === 'create') {
                                        const res = await window.axios.post('/server-folders', { name: folderModal.name, color: folderModal.color, server_id: folderModal.serverId });
                                        setFolders(prev => [...prev, res.data]);
                                        if (folderModal.targetServerId) {
                                            await window.axios.post(`/server-folders/${res.data.id}/add`, { server_id: folderModal.targetServerId });
                                        }
                                        router.reload({ only: ['userServers', 'userFolders'] });
                                    } else {
                                        await renameFolder(folderModal.folderId, folderModal.name, folderModal.color);
                                    }
                                    setFolderModal(null);
                                }}
                                className="flex-1 px-3 py-2 text-sm text-text bg-accent hover:opacity-90 rounded-md transition-colors">
                                {folderModal.mode === 'create' ? t('folder.create') : t('folder.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
