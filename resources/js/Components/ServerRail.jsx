import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';

const FOLDER_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9', '#14b8a6'];

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
                        ? 'rounded-2xl ring-2 ring-white scale-110'
                        : isCurrent
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
                <span className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${
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
                                    : <span className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">
                                        {srv.name[0].toUpperCase()}
                                      </span>
                                }
                            </div>
                        ))}
                    </button>
                    {totalBadge > 0 && isCollapsed && (
                        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-gray-950 pointer-events-none">
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
                        <span className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${isCurrent ? 'h-8' : 'h-0 group-hover:h-5'}`} />
                        <ServerIcon
                            srv={srv} isCurrent={isCurrent} badge={badge} dragOver={dragOver}
                            onDragStart={onDragStart} onDragEnd={onDragEnd}
                            onDragOverServer={onDragOverServer} onDropOnServer={onDropOnServer}
                        />
                    </div>
                );
            })}

            {!isCollapsed && (
                <p className="text-[9px] text-gray-500 truncate max-w-[60px] text-center leading-tight px-1">{folder.name}</p>
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
            setFolderModal({ mode: 'create', serverId: src.id, targetServerId: targetSrv.id, name: 'Nueva carpeta', color: '#6366f1' });
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
                className="hidden sm:flex w-[72px] bg-gray-950 flex-col items-center py-3 gap-1 shrink-0 overflow-y-auto"
                onDragOver={onDragOverRail}
                onDrop={onDropOnRail}
            >
                {ungrouped.map(srv => {
                    const isCurrent = srv.id === currentServerId;
                    const badge = !isCurrent && mentionBadges[srv.id] ? mentionBadges[srv.id] : 0;
                    return (
                        <div key={srv.id} className="flex items-center w-full px-1.5 group"
                            onContextMenu={e => openContextMenu(e, 'server', srv)}>
                            <span className={`absolute left-0 w-1 rounded-r-full bg-white transition-all ${isCurrent ? 'h-8' : 'h-0 group-hover:h-5'}`} />
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

                <div className="mt-1 w-8 border-t border-gray-700" />

                {dmConversations.filter(c => c.unread > 0).map(conv => (
                    <div key={conv.id} className="flex items-center w-full px-1.5 group">
                        <div className="relative">
                            <Link href={route('conversations.show', conv.id)}
                                title={conv.type === 'group' ? (conv.name ?? 'Grupo') : conv.user?.name}
                                prefetch
                                className={`w-12 h-12 flex items-center justify-center font-bold text-sm bg-gray-700 hover:bg-indigo-500 text-white transition-all duration-150 overflow-hidden ${conv.type === 'group' ? 'rounded-2xl' : 'rounded-full hover:rounded-2xl'}`}
                            >
                                {conv.type === 'group'
                                    ? <span style={{ backgroundColor: conv.icon_color ?? '#6366f1' }} className="w-full h-full flex items-center justify-center text-lg font-bold">{(conv.name ?? '#')[0].toUpperCase()}</span>
                                    : conv.user?.avatar_url
                                        ? <img src={conv.user.avatar_url} alt={conv.user.name} className="w-full h-full object-cover" />
                                        : <span style={{ backgroundColor: conv.user?.banner_color ?? '#6366f1' }} className="w-full h-full flex items-center justify-center text-lg font-bold">{conv.user?.name?.[0]?.toUpperCase()}</span>
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

                <div className="relative flex items-center w-full px-1.5 group">
                    <div className="relative">
                        <Link href={route('friends.index')} title="Amigos" prefetch
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

                <div className="relative flex items-center w-full px-1.5 group">
                    <button type="button" onClick={onAddServer} title="Añadir servidor"
                        className="w-12 h-12 flex items-center justify-center font-bold text-2xl text-green-400 bg-gray-700 rounded-full hover:rounded-2xl hover:bg-green-500 hover:text-white transition-all duration-150"
                    >+</button>
                </div>
            </nav>

            {/* Context menu */}
            {contextMenu && (
                <div ref={menuRef} className="fixed z-[600] bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 w-52"
                    style={{ top: contextMenu.y, left: contextMenu.x }}>
                    {contextMenu.type === 'server' && (
                        <>
                            <p className="px-3 py-1 text-xs text-gray-500 font-semibold truncate">{contextMenu.target.name}</p>
                            <div className="border-t border-gray-700 my-1" />
                            <button onClick={() => { setContextMenu(null); setFolderModal({ mode: 'create', serverId: contextMenu.target.id, name: 'Nueva carpeta', color: '#6366f1' }); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                Nueva carpeta
                            </button>
                            {folders.length > 0 && (
                                <>
                                    <div className="border-t border-gray-700 my-1" />
                                    <p className="px-3 py-1 text-xs text-gray-500">Mover a carpeta</p>
                                    {folders.map(f => (
                                        <button key={f.id} onClick={() => { setContextMenu(null); addToFolder(f.id, contextMenu.target.id); }}
                                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                                            {f.name}
                                        </button>
                                    ))}
                                </>
                            )}
                            {contextMenu.target.folder_id && (
                                <>
                                    <div className="border-t border-gray-700 my-1" />
                                    <button onClick={() => { setContextMenu(null); removeFromFolder(contextMenu.target.folder_id, contextMenu.target.id); }}
                                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700">
                                        Quitar de carpeta
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    {contextMenu.type === 'folder' && (
                        <>
                            <p className="px-3 py-1 text-xs text-gray-500 font-semibold truncate">{contextMenu.target.name}</p>
                            <div className="border-t border-gray-700 my-1" />
                            <button onClick={() => { setContextMenu(null); setFolderModal({ mode: 'edit', folderId: contextMenu.target.id, name: contextMenu.target.name, color: contextMenu.target.color }); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700">
                                Editar carpeta
                            </button>
                            <button onClick={() => { setContextMenu(null); deleteFolder(contextMenu.target.id); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700">
                                Disolver carpeta
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Folder modal */}
            {folderModal && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center px-4" onClick={() => setFolderModal(null)}>
                    <div className="absolute inset-0 bg-black/60" />
                    <div className="relative bg-gray-800 border border-gray-700 rounded-xl w-full max-w-xs p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-white font-semibold mb-4">
                            {folderModal.mode === 'create' ? 'Nueva carpeta' : 'Editar carpeta'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide block mb-1">Nombre</label>
                                <input autoFocus type="text" maxLength={50} value={folderModal.name}
                                    onChange={e => setFolderModal(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wide block mb-2">Color</label>
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
                                className="flex-1 px-3 py-2 text-sm text-gray-400 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors">
                                Cancelar
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
                                className="flex-1 px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors">
                                {folderModal.mode === 'create' ? 'Crear' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
