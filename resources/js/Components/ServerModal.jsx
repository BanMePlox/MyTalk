import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { useTrans } from '@/Hooks/useTrans';

export default function ServerModal({ onClose }) {
    const t = useTrans();
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
        router.post(route('servers.join'), { invite_code: code }, {
            onSuccess: () => { joinForm.reset(); onClose(); },
        });
    }

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center px-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="absolute inset-0 overlay-backdrop" aria-hidden />
            <div className="relative modal-panel w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center border-b border-border">
                    <h2 className="text-lg font-bold text-text-on-accent">{t('server.add')}</h2>
                    <p className="text-sm text-text-secondary mt-1">{t('server.subtitle')}</p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button
                        onClick={() => setTab('create')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            tab === 'create'
                                ? 'text-text border-b-2 border-accent'
                                : 'text-text-secondary hover:text-text'
                        }`}
                    >
                        {t('server.create')}
                    </button>
                    <button
                        onClick={() => setTab('join')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${
                            tab === 'join'
                                ? 'text-text border-b-2 border-green-500'
                                : 'text-text-secondary hover:text-text'
                        }`}
                    >
                        {t('server.join_code')}
                    </button>
                </div>

                <div className="p-6">
                    {tab === 'create' ? (
                        <form onSubmit={submitCreate} className="space-y-4">
                            <div className="flex justify-center">
                                <label className="cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full bg-bg-muted border-2 border-dashed border-border group-hover:border-accent flex items-center justify-center overflow-hidden transition-colors">
                                        {iconPreview
                                            ? <img src={iconPreview} className="w-full h-full object-cover" />
                                            : <span className="text-3xl text-text-muted group-hover:text-accent transition-colors">🖼️</span>
                                        }
                                    </div>
                                    <p className="text-xs text-text-muted text-center mt-1.5">{t('server.icon_label')}</p>
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
                                <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wide font-semibold">
                                    {t('server.name_label')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('server.name_ph')}
                                    maxLength={100}
                                    autoFocus
                                    value={createForm.data.name}
                                    onChange={(e) => createForm.setData('name', e.target.value)}
                                    className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:border-accent"
                                />
                                {createForm.errors.name && (
                                    <p className="text-red-400 text-xs mt-1">{createForm.errors.name}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm text-text-secondary hover:text-text bg-bg-elevated hover:bg-bg-muted rounded-lg transition-colors"
                                >
                                    {t('chat.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createForm.processing || !createForm.data.name.trim()}
                                    className="flex-1 py-2.5 text-sm font-medium text-text bg-accent hover:bg-accent rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {createForm.processing ? t('server.creating') : t('server.create')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={submitJoin} className="space-y-4">
                            <div className="flex justify-center py-2">
                                <span className="text-5xl">🔗</span>
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-1.5 uppercase tracking-wide font-semibold">
                                    {t('server.invite_label')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('server.invite_ph')}
                                    autoFocus
                                    value={joinForm.data.invite_code}
                                    onChange={(e) => joinForm.setData('invite_code', e.target.value)}
                                    className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder-text-muted outline-none focus:border-green-500 font-mono tracking-widest"
                                />
                                {joinForm.errors.invite_code && (
                                    <p className="text-red-400 text-xs mt-1">{joinForm.errors.invite_code}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 text-sm text-text-secondary hover:text-text bg-bg-elevated hover:bg-bg-muted rounded-lg transition-colors"
                                >
                                    {t('chat.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={joinForm.processing || !joinForm.data.invite_code.trim()}
                                    className="flex-1 py-2.5 text-sm font-medium text-text bg-green-600 hover:bg-green-500 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {joinForm.processing ? t('server.joining') : t('server.join')}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
