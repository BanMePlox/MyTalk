import { Head, Link } from '@inertiajs/react';
import CookieBanner from '@/Components/CookieBanner';
import ThemeToggle from '@/Components/ThemeToggle';
import AppLogo from '@/Components/AppLogo';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="MyTalk — Chat en tiempo real" />
            <div
                className="min-h-screen bg-bg text-text flex flex-col"
                style={isTauri ? { paddingTop: '2rem' } : {}}
            >
                {/* Nav */}
                <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <AppLogo className="w-8 h-8 rounded-sm object-contain" />
                        <span className="font-semibold text-lg tracking-tight">MyTalk</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {!isTauri && (
                            <a
                                href="/downloads/MyTalk-setup.exe"
                                download
                                className="text-text-secondary hover:text-text px-4 py-2 text-sm transition flex items-center gap-1.5"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Descargar app
                            </a>
                        )}
                        {auth?.user ? (
                            <Link href={route('friends.index')} className="btn-primary text-sm px-4 py-2">
                                Ir a la app
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="text-text-secondary hover:text-text px-4 py-2 text-sm transition">
                                    Iniciar sesión
                                </Link>
                                <Link href={route('register')} className="btn-primary text-sm px-4 py-2">
                                    Registrarse
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Hero */}
                <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
                    <AppLogo className="w-16 h-16 rounded object-contain mb-8" />
                    <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight tracking-tight text-text">
                        Tu espacio para<br />
                        <span className="text-accent">hablar en tiempo real</span>
                    </h1>
                    <p className="text-text-muted text-lg max-w-lg mb-10 leading-relaxed">
                        Crea servidores, organiza canales, chatea con tu equipo y mantente conectado. Todo en un solo lugar.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {auth?.user ? (
                            <Link href={route('friends.index')} className="btn-primary text-base px-6 py-3">
                                Abrir MyTalk
                            </Link>
                        ) : (
                            <>
                                <Link href={route('register')} className="btn-primary text-base px-6 py-3">
                                    Crear cuenta gratis
                                </Link>
                                <Link href={route('login')} className="btn-secondary text-base px-6 py-3">
                                    Iniciar sesión
                                </Link>
                            </>
                        )}
                        {!isTauri && (
                            <a
                                href="/downloads/MyTalk-setup.exe"
                                download
                                className="btn-secondary text-base px-6 py-3 flex items-center gap-2"
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
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5 px-8 pb-16 max-w-4xl mx-auto w-full">
                    {[
                        { title: 'Mensajes en tiempo real', desc: 'Chatea con WebSockets propios. Sin retrasos, sin depender de servicios externos.' },
                        { title: 'Hilos y canales', desc: 'Organiza las conversaciones en canales, categorías e hilos para no perder el hilo.' },
                        { title: 'Notificaciones push', desc: 'Recibe avisos aunque tengas la pestaña cerrada, con notificaciones Web Push.' },
                    ].map(f => (
                        <div key={f.title} className="feature-card">
                            <h3 className="font-semibold mb-2 text-text">{f.title}</h3>
                            <p className="text-text-muted text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </section>

                {/* Footer */}
                <footer className="text-center text-text-muted text-sm py-6 border-t border-border">
                    Desarrollado por Pedro Jiménez Luján · Código abierto bajo licencia MIT
                </footer>
            </div>
            {!isTauri && <CookieBanner />}
        </>
    );
}
