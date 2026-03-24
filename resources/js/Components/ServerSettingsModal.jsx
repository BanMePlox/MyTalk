import { useRef, useState } from 'react';
import { router } from '@inertiajs/react';

const PERMISSIONS = [
    { key: 'manage_roles',    label: 'Gestionar roles' },
    { key: 'manage_channels', label: 'Gestionar canales' },
    { key: 'kick_members',    label: 'Expulsar miembros' },
    { key: 'ban_members',     label: 'Banear miembros' },
    { key: 'manage_messages', label: 'Gestionar mensajes' },
];

const DEFAULT_COLORS = ['#5865f2', '#57f287', '#fee75c', '#eb459e', '#ed4245', '#ff7043', '#99aab5', '#ffffff'];

function Avatar({ user, size = 8 }) {
    if (user?.avatar_url) {
        return <img src={user.avatar_url} alt={user.name} className={`w-${size} h-${size} rounded-full object-cover`} />;
    }
    const initials = user?.name?.[0]?.toUpperCase() ?? '?';
    const color = user?.banner_color ?? '#6366f1';
    return (
        <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm`}
            style={{ backgroundColor: color }}>
            {initials}
        </div>
    );
}

function RolesTab({ server, roles, setRoles, canManageRoles }) {
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm]   = useState({});
    const [newRole, setNewRole]     = useState({ name: '', color: '#5865f2', permissions: [] });
    const [creating, setCreating]   = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    function togglePerm(perms, key) {
        return perms.includes(key) ? perms.filter(p => p !== key) : [...perms, key];
    }

    function startEdit(role) {
        setEditingId(role.id);
        setEditForm({ name: role.name, color: role.color, permissions: [...(role.permissions ?? [])] });
    }

    async function saveEdit() {
        try {
            const res = await window.axios.patch(route('roles.update', editingId), editForm);
            setRoles(prev => prev.map(r => r.id === editingId ? res.data : r));
            setEditingId(null);
        } catch (e) {
            console.error(e);
        }
    }

    async function createRole(e) {
        e.preventDefault();
        if (!newRole.name.trim()) return;
        setCreating(true);
        try {
            const res = await window.axios.post(route('roles.store', server.id), newRole);
            setRoles(prev => [...prev, res.data]);
            setNewRole({ name: '', color: '#5865f2', permissions: [] });
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    }

    async function deleteRole(roleId) {
        try {
            await window.axios.delete(route('roles.destroy', roleId));
            setRoles(prev => prev.filter(r => r.id !== roleId));
            setConfirmDelete(null);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="space-y-3">
            {roles.length === 0 && (
                <p className="text-gray-500 text-sm">No hay roles creados todavía.</p>
            )}

            {roles.map(role => (
                <div key={role.id} className="bg-gray-800 rounded-lg p-3">
                    {editingId === role.id ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full bg-gray-700 border border-gray-600 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400">Color:</span>
                                {DEFAULT_COLORS.map(c => (
                                    <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                                        style={{ backgroundColor: c, borderColor: editForm.color === c ? '#fff' : 'transparent' }} />
                                ))}
                                <input type="color" value={editForm.color}
                                    onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                            </div>
                            <div className="space-y-1">
                                {PERMISSIONS.map(p => (
                                    <label key={p.key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                        <input type="checkbox"
                                            checked={editForm.permissions.includes(p.key)}
                                            onChange={() => setEditForm(f => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))}
                                            className="accent-indigo-500" />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={saveEdit}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded">
                                    Guardar
                                </button>
                                <button onClick={() => setEditingId(null)}
                                    className="text-gray-400 hover:text-gray-200 text-xs px-3 py-1.5 rounded hover:bg-gray-700">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                            <span className="font-medium text-gray-100 text-sm flex-1">{role.name}</span>
                            <div className="flex gap-1 text-xs text-gray-500 mr-2">
                                {(role.permissions ?? []).map(p => (
                                    <span key={p} className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">
                                        {PERMISSIONS.find(x => x.key === p)?.label ?? p}
                                    </span>
                                ))}
                            </div>
                            {canManageRoles && (
                                <>
                                    <button onClick={() => startEdit(role)}
                                        className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 rounded hover:bg-gray-700">
                                        ✏️
                                    </button>
                                    {confirmDelete === role.id ? (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => deleteRole(role.id)}
                                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">
                                                Borrar
                                            </button>
                                            <button onClick={() => setConfirmDelete(null)}
                                                className="text-xs text-gray-400 hover:text-gray-200 px-1">✕</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDelete(role.id)}
                                            className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-700">
                                            🗑
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {canManageRoles && (
                <form onSubmit={createRole} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-dashed border-gray-600">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nuevo rol</p>
                    <input
                        type="text"
                        value={newRole.name}
                        onChange={e => setNewRole(f => ({ ...f, name: e.target.value }))}
                        placeholder="Nombre del rol"
                        className="w-full bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">Color:</span>
                        {DEFAULT_COLORS.map(c => (
                            <button type="button" key={c} onClick={() => setNewRole(f => ({ ...f, color: c }))}
                                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                                style={{ backgroundColor: c, borderColor: newRole.color === c ? '#fff' : 'transparent' }} />
                        ))}
                        <input type="color" value={newRole.color}
                            onChange={e => setNewRole(f => ({ ...f, color: e.target.value }))}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                    </div>
                    <div className="space-y-1">
                        {PERMISSIONS.map(p => (
                            <label key={p.key} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                <input type="checkbox"
                                    checked={newRole.permissions.includes(p.key)}
                                    onChange={() => setNewRole(f => ({ ...f, permissions: togglePerm(f.permissions, p.key) }))}
                                    className="accent-indigo-500" />
                                {p.label}
                            </label>
                        ))}
                    </div>
                    <button type="submit" disabled={creating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded disabled:opacity-50">
                        {creating ? 'Creando...' : '+ Crear rol'}
                    </button>
                </form>
            )}
        </div>
    );
}

function MembersTab({ server, roles, canManageRoles, canKickMembers, isOwner, reloadKey }) {
    const [confirmKick, setConfirmKick] = useState(null);
    const [assigningRole, setAssigningRole] = useState({});

    async function toggleRole(userId, roleId, hasRole) {
        const key = `${userId}-${roleId}`;
        setAssigningRole(prev => ({ ...prev, [key]: true }));
        try {
            await window.axios.patch(route('members.update', { server: server.id, user: userId }), {
                role_id: roleId,
                action: hasRole ? 'remove' : 'add',
            });
            router.reload({ only: [reloadKey] });
        } catch (e) {
            console.error(e);
        } finally {
            setAssigningRole(prev => ({ ...prev, [key]: false }));
        }
    }

    async function kickMember(userId) {
        try {
            await window.axios.delete(route('members.destroy', { server: server.id, user: userId }));
            router.reload({ only: [reloadKey] });
            setConfirmKick(null);
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <div className="space-y-2">
            {(server.members ?? []).map(member => {
                const memberRoles = member.server_roles ?? [];
                const isThisOwner = server.owner_id === member.id;
                const canKickThis = canKickMembers && !isThisOwner;

                return (
                    <div key={member.id} className="bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <Avatar user={member} size={8} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-gray-100 text-sm">{member.name}</span>
                                    {isThisOwner && (
                                        <span className="text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded">
                                            Propietario
                                        </span>
                                    )}
                                    {memberRoles.map(role => (
                                        <span key={role.id} className="text-xs px-1.5 py-0.5 rounded font-medium"
                                            style={{ backgroundColor: role.color + '33', color: role.color }}>
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {canKickThis && (
                                confirmKick === member.id ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => kickMember(member.id)}
                                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">
                                            Expulsar
                                        </button>
                                        <button onClick={() => setConfirmKick(null)}
                                            className="text-xs text-gray-400 px-1">✕</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmKick(member.id)}
                                        className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-gray-700 shrink-0">
                                        Expulsar
                                    </button>
                                )
                            )}
                        </div>

                        {canManageRoles && !isThisOwner && roles.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pl-10">
                                <span className="text-xs text-gray-500">Roles:</span>
                                {roles.map(role => {
                                    const hasRole = memberRoles.some(r => r.id === role.id);
                                    const key = `${member.id}-${role.id}`;
                                    return (
                                        <button key={role.id}
                                            onClick={() => toggleRole(member.id, role.id, hasRole)}
                                            disabled={assigningRole[key]}
                                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                                hasRole
                                                    ? 'text-white border-transparent'
                                                    : 'text-gray-400 border-gray-600 hover:border-gray-400'
                                            }`}
                                            style={hasRole ? { backgroundColor: role.color, borderColor: role.color } : {}}>
                                            {hasRole ? '✓ ' : '+ '}{role.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CategoriesTab({ server, canManageChannels, onChannelAssign, onCategoryChange }) {
    const [categories, setCategories] = useState(server.categories ?? []);
    const [channels, setChannels] = useState(server.channels ?? []);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    async function createCategory(e) {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await window.axios.post(route('categories.store', server.id), { name: newName });
            const updated = [...categories, { ...res.data, channels: [] }];
            setCategories(updated);
            onCategoryChange?.(updated);
            setNewName('');
        } catch (err) { console.error(err); } finally { setCreating(false); }
    }

    async function saveEdit(cat) {
        try {
            const res = await window.axios.patch(route('categories.update', cat.id), { name: editName });
            const updated = categories.map(c => c.id === cat.id ? { ...c, name: res.data.name } : c);
            setCategories(updated);
            onCategoryChange?.(updated);
            setEditingId(null);
        } catch (err) { console.error(err); }
    }

    async function deleteCategory(catId) {
        try {
            await window.axios.delete(route('categories.destroy', catId));
            const updatedCats = categories.filter(c => c.id !== catId);
            const affected = channels.filter(ch => ch.category_id == catId).map(ch => ch.id);
            const updatedChannels = channels.map(ch => ch.category_id == catId ? { ...ch, category_id: null } : ch);
            setCategories(updatedCats);
            setChannels(updatedChannels);
            onCategoryChange?.(updatedCats);
            affected.forEach(id => onChannelAssign?.(id, null));
            setConfirmDelete(null);
        } catch (err) { console.error(err); }
    }

    async function assignChannel(channelId, categoryId) {
        try {
            await window.axios.patch(route('channels.assign', channelId), { category_id: categoryId || null });
            setChannels(prev => prev.map(ch => ch.id === channelId ? { ...ch, category_id: categoryId || null } : ch));
            onChannelAssign?.(channelId, categoryId || null);
        } catch (err) { console.error(err); }
    }

    return (
        <div className="space-y-4">
            {/* Lista de categorías */}
            {categories.length === 0 && (
                <p className="text-gray-500 text-sm">No hay categorías todavía.</p>
            )}
            {categories.map(cat => (
                <div key={cat.id} className="bg-gray-800 rounded-lg p-3">
                    {editingId === cat.id ? (
                        <div className="flex gap-2 items-center">
                            <input
                                autoFocus
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(cat); if (e.key === 'Escape') setEditingId(null); }}
                                className="flex-1 bg-gray-700 border border-gray-600 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button onClick={() => saveEdit(cat)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded">Guardar</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-200 px-1">✕</button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-100 text-sm flex-1">{cat.name}</span>
                            {canManageChannels && (
                                <>
                                    <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                                        className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 rounded hover:bg-gray-700">✏️</button>
                                    {confirmDelete === cat.id ? (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => deleteCategory(cat.id)}
                                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded">Borrar</button>
                                            <button onClick={() => setConfirmDelete(null)}
                                                className="text-xs text-gray-400 hover:text-gray-200 px-1">✕</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDelete(cat.id)}
                                            className="text-gray-500 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-700">🗑</button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Asignar canales a categorías */}
            {channels.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Asignar canales</p>
                    {channels.map(ch => (
                        <div key={ch.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-300 flex-1">#{ch.name}</span>
                            <select
                                value={ch.category_id ?? ''}
                                onChange={e => assignChannel(ch.id, e.target.value)}
                                disabled={!canManageChannels}
                                className="bg-gray-700 border border-gray-600 text-gray-100 rounded px-2 py-0.5 text-xs focus:outline-none"
                            >
                                <option value="">— Sin categoría</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            {/* Crear categoría */}
            {canManageChannels && (
                <form onSubmit={createCategory} className="bg-gray-800 rounded-lg p-3 space-y-2 border border-dashed border-gray-600">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nueva categoría</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Nombre de la categoría"
                            className="flex-1 bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button type="submit" disabled={creating}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1 rounded disabled:opacity-50">
                            {creating ? '...' : '+ Crear'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

function BansTab({ server }) {
    const [bans, setBans] = useState(null);
    const [loading, setLoading] = useState(false);
    const [confirmUnban, setConfirmUnban] = useState(null);

    async function load() {
        setLoading(true);
        try {
            const res = await window.axios.get(route('bans.index', server.id));
            setBans(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function unban(userId) {
        try {
            await window.axios.delete(route('bans.destroy', { server: server.id, user: userId }));
            setBans(prev => prev.filter(b => b.user.id !== userId));
            setConfirmUnban(null);
        } catch (e) {
            console.error(e);
        }
    }

    if (bans === null && !loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <button onClick={load} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded">
                    Cargar bans
                </button>
            </div>
        );
    }

    if (loading) return <p className="text-gray-400 text-sm py-4">Cargando...</p>;

    return (
        <div className="space-y-2">
            {bans.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios baneados.</p>}
            {bans.map(ban => (
                <div key={ban.id} className="bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                    <Avatar user={ban.user} size={8} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100">{ban.user.name}</p>
                        {ban.reason && <p className="text-xs text-gray-400 truncate">Razón: {ban.reason}</p>}
                        <p className="text-xs text-gray-500">Baneado por {ban.banned_by.name}</p>
                    </div>
                    {confirmUnban === ban.user.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => unban(ban.user.id)}
                                className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded">
                                Desbanear
                            </button>
                            <button onClick={() => setConfirmUnban(null)}
                                className="text-xs text-gray-400 px-1">✕</button>
                        </div>
                    ) : (
                        <button onClick={() => setConfirmUnban(ban.user.id)}
                            className="text-xs text-gray-500 hover:text-green-400 px-2 py-1 rounded hover:bg-gray-700 shrink-0">
                            Desbanear
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

function ChannelsTab({ server, roles, canManageChannels }) {
    // Local state: { channelId: { roleId: { can_view, can_send } } }
    const [perms, setPerms] = useState(() => {
        const map = {};
        (server.channels ?? []).forEach(ch => {
            map[ch.id] = {};
            (ch.channel_permissions ?? []).forEach(p => {
                map[ch.id][p.role_id] = { can_view: p.can_view, can_send: p.can_send };
            });
        });
        return map;
    });
    const [channelTypes, setChannelTypes] = useState(() =>
        Object.fromEntries((server.channels ?? []).map(ch => [ch.id, ch.type ?? 'text']))
    );
    const [expanded, setExpanded] = useState(null); // channelId
    const [saving, setSaving] = useState({}); // { `${channelId}-${roleId}`: bool }

    async function changeType(channelId, type) {
        setChannelTypes(prev => ({ ...prev, [channelId]: type }));
        try {
            await window.axios.patch(route('channels.type', channelId), { type });
        } catch (e) {
            console.error(e);
        }
    }

    async function save(channelId, roleId, newPerm) {
        const key = `${channelId}-${roleId}`;
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            await window.axios.put(route('channels.permissions.upsert', { channel: channelId, role: roleId }), newPerm);
            setPerms(prev => ({
                ...prev,
                [channelId]: { ...prev[channelId], [roleId]: newPerm },
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    }

    async function remove(channelId, roleId) {
        const key = `${channelId}-${roleId}`;
        setSaving(prev => ({ ...prev, [key]: true }));
        try {
            await window.axios.delete(route('channels.permissions.destroy', { channel: channelId, role: roleId }));
            setPerms(prev => {
                const next = { ...prev, [channelId]: { ...prev[channelId] } };
                delete next[channelId][roleId];
                return next;
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(prev => ({ ...prev, [key]: false }));
        }
    }

    const channels = server.channels ?? [];

    return (
        <div className="space-y-2">
            {channels.length === 0 && <p className="text-gray-500 text-sm">No hay canales.</p>}
            {channels.map(ch => {
                const chPerms = perms[ch.id] ?? {};
                const isOpen = expanded === ch.id;
                const hasOverrides = Object.keys(chPerms).length > 0;

                return (
                    <div key={ch.id} className="bg-gray-800 rounded-lg overflow-hidden">
                        {/* Channel header */}
                        <button
                            onClick={() => setExpanded(isOpen ? null : ch.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-750 transition-colors text-left"
                        >
                            <span className="text-gray-500 text-sm">{channelTypes[ch.id] === 'announcement' ? '📢' : '#'}</span>
                            <span className="flex-1 text-sm font-medium text-gray-100">{ch.name}</span>
                            {hasOverrides && (
                                <span className="text-xs bg-indigo-600/40 text-indigo-300 px-1.5 py-0.5 rounded">
                                    {Object.keys(chPerms).length} override{Object.keys(chPerms).length > 1 ? 's' : ''}
                                </span>
                            )}
                            <span className={`text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                        </button>

                        {/* Permissions panel */}
                        {isOpen && (
                            <div className="border-t border-gray-700 px-3 py-3 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">Tipo:</span>
                                    <select
                                        value={channelTypes[ch.id] ?? 'text'}
                                        onChange={e => changeType(ch.id, e.target.value)}
                                        className="bg-gray-700 text-gray-200 text-xs rounded px-2 py-1 border border-gray-600 outline-none"
                                    >
                                        <option value="text"># Texto</option>
                                        <option value="announcement">📢 Anuncios</option>
                                    </select>
                                </div>
                                {roles.length === 0 && (
                                    <p className="text-xs text-gray-500">No hay roles en este servidor. Crea roles primero.</p>
                                )}
                                {roles.map(role => {
                                    const override = chPerms[role.id];
                                    const key = `${ch.id}-${role.id}`;
                                    const isSaving = saving[key];

                                    return (
                                        <div key={role.id} className="flex items-center gap-3">
                                            {/* Role badge */}
                                            <div className="flex items-center gap-1.5 w-28 shrink-0">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                                                <span className="text-xs text-gray-200 truncate">{role.name}</span>
                                            </div>

                                            {/* Toggles or "default" label */}
                                            {override ? (
                                                <div className="flex items-center gap-3 flex-1">
                                                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={override.can_view}
                                                            disabled={isSaving || !canManageChannels}
                                                            onChange={e => save(ch.id, role.id, { ...override, can_view: e.target.checked })}
                                                            className="accent-indigo-500"
                                                        />
                                                        Ver canal
                                                    </label>
                                                    <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={override.can_send}
                                                            disabled={isSaving || !canManageChannels}
                                                            onChange={e => save(ch.id, role.id, { ...override, can_send: e.target.checked })}
                                                            className="accent-indigo-500"
                                                        />
                                                        Enviar mensajes
                                                    </label>
                                                    {canManageChannels && (
                                                        <button
                                                            onClick={() => remove(ch.id, role.id)}
                                                            disabled={isSaving}
                                                            className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-auto"
                                                            title="Quitar override"
                                                        >✕ quitar</button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-xs text-gray-500 italic">Por defecto (todo permitido)</span>
                                                    {canManageChannels && (
                                                        <button
                                                            onClick={() => save(ch.id, role.id, { can_view: true, can_send: true })}
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >+ Añadir override</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function EmojisTab({ server, initialEmojis }) {
    const [emojis, setEmojis] = useState(initialEmojis ?? []);
    const [name, setName]     = useState('');
    const [error, setError]   = useState('');
    const [uploading, setUploading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const fileRef = useRef(null);

    async function upload(e) {
        e.preventDefault();
        setError('');
        const file = fileRef.current?.files[0];
        if (!name.trim()) { setError('Introduce un nombre.'); return; }
        if (!file) { setError('Selecciona un archivo.'); return; }
        if (!/^[a-z0-9_]+$/.test(name)) {
            setError('Solo letras minúsculas, números y guiones bajos.');
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append('name', name);
            form.append('image', file);
            const res = await window.axios.post(`/servers/${server.id}/emojis`, form);
            setEmojis(prev => [...prev, res.data]);
            setName('');
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            setError(err.response?.data?.message ?? err.message ?? 'Error al subir el emoji.');
        } finally {
            setUploading(false);
        }
    }

    async function remove(emoji) {
        try {
            await window.axios.delete(route('server.emojis.destroy', emoji.id));
            setEmojis(prev => prev.filter(e => e.id !== emoji.id));
            setConfirmDelete(null);
        } catch {}
    }

    return (
        <div className="space-y-4">
            <form onSubmit={upload} className="flex flex-col gap-2">
                <p className="text-xs text-gray-400">Sube imágenes PNG/GIF (máx. 512 KB). Úsalas en mensajes con <code className="bg-gray-700 text-pink-300 rounded px-1">:nombre:</code></p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="nombre (ej: pepe)"
                        value={name}
                        onChange={e => setName(e.target.value.toLowerCase())}
                        className="flex-1 bg-gray-700 text-gray-100 rounded px-3 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500"
                    />
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="text-xs text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded disabled:opacity-50"
                    >{uploading ? '...' : 'Subir'}</button>
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
            </form>

            {emojis.length === 0 ? (
                <p className="text-sm text-gray-500">No hay emojis aún.</p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {emojis.map(emoji => (
                        <div key={emoji.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                            <img src={emoji.url} alt={emoji.name} className="w-8 h-8 object-contain" />
                            <span className="text-sm text-gray-200 flex-1 font-mono">:{emoji.name}:</span>
                            {confirmDelete === emoji.id ? (
                                <div className="flex gap-1">
                                    <button onClick={() => remove(emoji)} className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded">Eliminar</button>
                                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:text-gray-200">✕</button>
                                </div>
                            ) : (
                                <button onClick={() => setConfirmDelete(emoji.id)} className="text-gray-500 hover:text-red-400 text-sm">🗑️</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function ServerSettingsModal({ show, onClose, server, roles: initialRoles, canManageRoles, canKickMembers, canBanMembers = false, isOwner, canManageChannels = false, serverEmojis = [], reloadKey = 'server', onChannelAssign, onCategoryChange }) {
    const [tab, setTab]   = useState('roles');
    const [roles, setRoles] = useState(initialRoles ?? []);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
                    <h2 className="text-gray-100 font-semibold">Ajustes del servidor — {server.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-xl leading-none">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-3 shrink-0 flex-wrap">
                    {[
                        { key: 'roles', label: 'Roles', show: true },
                        { key: 'members', label: 'Miembros', show: true },
                        { key: 'categories', label: 'Categorías', show: true },
                        { key: 'channels', label: 'Canales', show: canManageChannels || isOwner },
                        { key: 'bans', label: 'Bans', show: canBanMembers || isOwner },
                        { key: 'emojis', label: 'Emojis', show: isOwner },
                    ].filter(t => t.show).map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                                tab === t.key ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {tab === 'roles' && (
                        <RolesTab
                            server={server}
                            roles={roles}
                            setRoles={setRoles}
                            canManageRoles={canManageRoles}
                        />
                    )}
                    {tab === 'members' && (
                        <MembersTab
                            server={server}
                            roles={roles}
                            canManageRoles={canManageRoles}
                            canKickMembers={canKickMembers}
                            isOwner={isOwner}
                            reloadKey={reloadKey}
                        />
                    )}
                    {tab === 'categories' && (
                        <CategoriesTab
                            server={server}
                            canManageChannels={canManageChannels}
                            onChannelAssign={onChannelAssign}
                            onCategoryChange={onCategoryChange}
                        />
                    )}
                    {tab === 'channels' && (
                        <ChannelsTab
                            server={server}
                            roles={roles}
                            canManageChannels={canManageChannels}
                        />
                    )}
                    {tab === 'bans' && <BansTab server={server} />}
                    {tab === 'emojis' && <EmojisTab server={server} initialEmojis={serverEmojis} />}
                </div>
            </div>
        </div>
    );
}
