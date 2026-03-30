import { Head, Link } from '@inertiajs/react';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="MyTalk — Chat en tiempo real" />
            <div className="min-h-screen bg-gray-900 text-white flex flex-col">

                {/* Nav */}
                <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <img src="/images/MyTalk.png" alt="MyTalk" className="w-8 h-8 rounded-lg object-contain" />
                        <span className="font-semibold text-lg">MyTalk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isTauri && (
                            <a
                                href="/downloads/MyTalk-setup.exe"
                                download
                                className="text-white/60 hover:text-white px-4 py-2 text-sm transition flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar app
                            </a>
                        )}
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
                    <img src="/images/MyTalk.png" alt="MyTalk" className="w-16 h-16 rounded-2xl object-contain mb-8 shadow-lg" />
                    <h1 className="text-5xl font-bold mb-4 leading-tight">
                        Tu espacio para<br />
                        <span className="text-indigo-400">hablar en tiempo real</span>
                    </h1>
                    <p className="text-white/50 text-lg max-w-lg mb-10">
                        Crea servidores, organiza canales, chatea con tu equipo y mantente conectado. Todo en un solo lugar.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
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
                        {!isTauri && (
                            <a
                                href="/downloads/MyTalk-setup.exe"
                                download
                                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg font-medium text-base transition flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Descargar para Windows
                            </a>
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
