import { useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';

export default function AdminIndex({ stats }) {
    const { auth } = usePage().props;
    const [sent, setSent] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        message: '',
    });

    function submit(e) {
        e.preventDefault();
        post(route('admin.broadcast'), {
            onSuccess: () => {
                reset('message');
                setSent(true);
                setTimeout(() => setSent(false), 4000);
            },
        });
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Head title="Panel de administración" />

            <div className="max-w-3xl mx-auto px-6 py-12">
                <div className="flex items-center gap-3 mb-10">
                    <img src="/images/MyTalk.png" alt="MyTalk" className="w-8 h-8 rounded-lg" />
                    <h1 className="text-2xl font-bold">Panel de administración</h1>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-gray-800 rounded-xl p-5">
                        <p className="text-3xl font-bold text-indigo-400">{stats.users}</p>
                        <p className="text-sm text-gray-400 mt-1">Usuarios registrados</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-5">
                        <p className="text-3xl font-bold text-indigo-400">{stats.conversations}</p>
                        <p className="text-sm text-gray-400 mt-1">Conversaciones</p>
                    </div>
                </div>

                {/* Broadcast */}
                <div className="bg-gray-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-1">Enviar mensaje a todos los usuarios</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        El mensaje se enviará como DM desde la cuenta <span className="text-white font-medium">MyTalk</span> a cada usuario.
                    </p>

                    <form onSubmit={submit} className="flex flex-col gap-3">
                        <textarea
                            value={data.message}
                            onChange={e => setData('message', e.target.value)}
                            placeholder="Escribe el mensaje del sistema..."
                            rows={4}
                            maxLength={4000}
                            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 resize-none"
                        />
                        {errors.message && (
                            <p className="text-red-400 text-sm">{errors.message}</p>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{data.message.length}/4000</span>
                            <button
                                type="submit"
                                disabled={processing || !data.message.trim()}
                                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                            >
                                {processing ? 'Enviando...' : 'Enviar broadcast'}
                            </button>
                        </div>
                    </form>

                    {sent && (
                        <div className="mt-4 bg-green-900/40 border border-green-700 rounded-lg px-4 py-3 text-green-400 text-sm">
                            Mensaje enviado correctamente a todos los usuarios.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
