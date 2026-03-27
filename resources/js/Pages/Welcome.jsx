import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="MyTalk — Chat en tiempo real" />
            <div className="min-h-screen bg-gray-900 text-white flex flex-col">

                {/* Nav */}
                <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm">M</div>
                        <span className="font-semibold text-lg">MyTalk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth?.user ? (
                            <Link href={route('friends.index')} className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition">
                                Ir a la app
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="text-white/70 hover:text-white px-4 py-2 text-sm transition">
                                    Iniciar sesión
                                </Link>
                                <Link href={route('register')} className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition">
                                    Registrarse
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Hero */}
                <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
                    <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center text-3xl font-bold mb-8 shadow-lg shadow-indigo-500/30">
                        M
                    </div>
                    <h1 className="text-5xl font-bold mb-4 leading-tight">
                        Tu espacio para<br />
                        <span className="text-indigo-400">hablar en tiempo real</span>
                    </h1>
                    <p className="text-white/50 text-lg max-w-lg mb-10">
                        Crea servidores, organiza canales, chatea con tu equipo y mantente conectado. Todo en un solo lugar.
                    </p>
                    <div className="flex gap-4">
                        {auth?.user ? (
                            <Link href={route('friends.index')} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-lg font-medium text-base transition shadow-lg shadow-indigo-500/30">
                                Abrir MyTalk
                            </Link>
                        ) : (
                            <>
                                <Link href={route('register')} className="bg-indigo-500 hover:bg-indigo-600 px-6 py-3 rounded-lg font-medium text-base transition shadow-lg shadow-indigo-500/30">
                                    Crear cuenta gratis
                                </Link>
                                <Link href={route('login')} className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg font-medium text-base transition">
                                    Iniciar sesión
                                </Link>
                            </>
                        )}
                    </div>
                </main>

                {/* Features */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-16 max-w-4xl mx-auto w-full">
                    {[
                        { icon: '💬', title: 'Mensajes en tiempo real', desc: 'Chatea con WebSockets propios. Sin retrasos, sin depender de servicios externos.' },
                        { icon: '🧵', title: 'Hilos y canales', desc: 'Organiza las conversaciones en canales, categorías e hilos para no perder el hilo.' },
                        { icon: '🔔', title: 'Notificaciones push', desc: 'Recibe avisos aunque tengas la pestaña cerrada, con notificaciones Web Push.' },
                    ].map(f => (
                        <div key={f.title} className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <div className="text-2xl mb-3">{f.icon}</div>
                            <h3 className="font-semibold mb-2">{f.title}</h3>
                            <p className="text-white/50 text-sm">{f.desc}</p>
                        </div>
                    ))}
                </section>

                {/* Footer */}
                <footer className="text-center text-white/30 text-sm py-6 border-t border-white/10">
                    Desarrollado por Pedro Jiménez Luján · Código abierto bajo licencia MIT
                </footer>
            </div>
        </>
    );
}
