import { useState } from 'react';
import { router } from '@inertiajs/react';

const PERMISSIONS = [
    { key: 'manage_roles',    label: 'Gestionar roles' },
    { key: 'manage_channels', label: 'Gestionar canales' },
    { key: 'kick_members',    label: 'Expulsar miembros' },
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

export default function ServerSettingsModal({ show, onClose, server, roles: initialRoles, canManageRoles, canKickMembers, isOwner, canManageChannels = false, reloadKey = 'server', onChannelAssign, onCategoryChange }) {
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
                <div className="flex gap-1 px-5 pt-3 shrink-0">
                    {['roles', 'members', 'categories'].map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                                tab === t ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'
                            }`}>
                            {t === 'roles' ? 'Roles' : t === 'members' ? 'Miembros' : 'Categorías'}
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
                </div>
            </div>
        </div>
    );
}
