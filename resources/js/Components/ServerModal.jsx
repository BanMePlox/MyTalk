import { useState } from 'react';
import { useForm } from '@inertiajs/react';

export default function ServerModal({ onClose }) {
    const [tab, setTab] = useState('create'); // 'create' | 'join'
    const [iconPreview, setIconPreview] = useState(null);

    const createForm = useForm({ name: '', icon: null });
    const joinForm   = useForm({ invite_code: '' });

    function submitCreate(e) {
        e.preventDefault();
        createForm.post(route('servers.store'), {
            forceFormData: true,
            onSuccess: () => { createForm.reset(); setIconPreview(null); onClose(); },
        });
    }

    function submitJoin(e) {
        e.preventDefault();
        const raw = joinForm.data.invite_code.trim();
        const code = raw.includes('/') ? raw.split('/').pop() : raw;
        joinForm.setData('invite_code', code);
        joinForm.post(route('servers.join'), {
            onSuccess: () => { joinForm.reset(); onClose(); },
        });
    }

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Añadir un servidor</h2>
                    <p className="text-sm text-gray-400 mt-1">Crea uno nuevo o únete a uno existente</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setTab('create')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            tab === 'create'
                                ? 'text-white border-b-2 border-indigo-500'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Crear servidor
                    </button>
                    <button
                        onClick={() => setTab('join')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            tab === 'join'
                                ? 'text-white border-b-2 border-green-500'
                                : 'text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        Unirse con código
                    </button>
                </div>

                <div className="p-6">
                    {tab === 'create' ? (
                        <form onSubmit={submitCreate} className="space-y-4">
                            {/* Icon picker */}
                            <div className="flex justify-center">
                                <label className="cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full bg-gray-700 border-2 border-dashed border-gray-600 group-hover:border-indigo-400 flex items-center justify-center overflow-hidden transition-colors">
                                        {iconPreview
                                            ? <img src={iconPreview} className="w-full h-full object-cover" />
                                            : <span className="text-3xl text-gray-500 group-hover:text-indigo-400 transition-colors">🖼️</span>
                                        }
                                    </div>
                                    <p className="text-xs text-gray-500 text-center mt-1.5">Icono (opcional)</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                createForm.setData('icon', file);
                                                setIconPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">
                                    Nombre del servidor
                                </label>
                                <input
                                    type="text"
                                    placeholder="Mi servidor"
                                    maxLength={100}
                                    autoFocus
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                                />
                                {createForm.errors.name && (
                                    <p className="text-red-400 text-xs mt-1">{createForm.errors.name}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing || !createForm.data.name.trim()}
                                    className="flex-1 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {createForm.processing ? 'Creando...' : 'Crear servidor'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitJoin} className="space-y-4">
                            <div className="flex justify-center py-2">
                                <span className="text-5xl">🔗</span>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide font-semibold">
                                    Código de invitación
                                </label>
                                <input
                                    type="text"
                                    placeholder="aBcD1234"
                                    autoFocus
                                    value={joinForm.data.invite_code}
                                    onChange={(e) => joinForm.setData('invite_code', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-green-500 font-mono tracking-widest"
                                />
                                {joinForm.errors.invite_code && (
                                    <p className="text-red-400 text-xs mt-1">{joinForm.errors.invite_code}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={joinForm.processing || !joinForm.data.invite_code.trim()}
                                    className="flex-1 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {joinForm.processing ? 'Uniéndose...' : 'Unirse'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
