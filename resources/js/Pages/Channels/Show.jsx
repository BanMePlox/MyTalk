import { useEffect, useRef, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Show({ channel, messages: initialMessages }) {
    const { auth } = usePage().props;
    const [messages, setMessages] = useState(initialMessages);
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const echoChannel = window.Echo.private(`channel.${channel.id}`);
        echoChannel.listen('MessageSent', (e) => {
            setMessages((prev) => [...prev, e]);
        });
        return () => echoChannel.stopListening('MessageSent');
    }, [channel.id]);

    async function submit(e) {
        e.preventDefault();
        if (!content.trim() || sending) return;

        const text = content.trim();
        setContent('');
        setSending(true);

        // Añadir mensaje optimísticamente
        const optimistic = {
            id: `tmp-${Date.now()}`,
            content: text,
            created_at: new Date().toISOString(),
            user: { id: auth.user.id, name: auth.user.name },
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            const res = await window.axios.post(route('messages.store', channel.id), { content: text });
            // Reemplazar el mensaje temporal con el real
            setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
        } catch {
            // Si falla, eliminar el mensaje optimístico
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
                {/* Sidebar de canales */}
                <aside className="w-56 bg-gray-900 flex flex-col">
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
                                    ch.id === channel.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                            >
                                <span className="text-gray-500">#</span> {ch.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="p-3 border-t border-gray-700 text-sm text-gray-400">
                        {auth.user.name}
                    </div>
                </aside>

                {/* Área principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <header className="px-4 py-3 border-b border-gray-700 font-semibold shrink-0">
                        # {channel.name}
                    </header>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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

                    {/* Input */}
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
            </div>
        </AuthenticatedLayout>
    );
}
