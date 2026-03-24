import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <Head title="Iniciar sesión" />

            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-indigo-500/30">M</div>
                    <h1 className="text-white text-2xl font-bold">Bienvenido de nuevo</h1>
                    <p className="text-white/40 text-sm mt-1">Inicia sesión en tu cuenta</p>
                </div>

                {status && (
                    <div className="mb-4 text-sm text-green-400 bg-green-400/10 rounded-lg px-4 py-3">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-1.5">Correo electrónico</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            placeholder="tu@email.com"
                        />
                        <InputError message={errors.email} className="mt-1.5" />
                    </div>

                    <div>
                        <label className="block text-sm text-white/60 mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            placeholder="••••••••"
                        />
                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.remember}
                                onChange={e => setData('remember', e.target.checked)}
                                className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500"
                            />
                            Recuérdame
                        </label>
                        {canResetPassword && (
                            <Link href={route('password.request')} className="text-indigo-400 hover:text-indigo-300 transition">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition shadow-lg shadow-indigo-500/20"
                    >
                        {processing ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </button>
                </form>

                <p className="text-center text-white/40 text-sm mt-6">
                    ¿No tienes cuenta?{' '}
                    <Link href={route('register')} className="text-indigo-400 hover:text-indigo-300 transition">
                        Regístrate
                    </Link>
                </p>
            </div>
        </div>
    );
}
