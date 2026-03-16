import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-800 flex flex-col">
            <nav className="bg-gray-900 border-b border-gray-700 shrink-0">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-14 items-center justify-between">
                        {/* Logo + nav links */}
                        <div className="flex items-center gap-6">
                            <Link href={route('servers.index')} className="flex items-center gap-2.5 shrink-0">
                                <img src="/images/logo.svg" alt="Logo" className="h-8 w-8" />
                                <span className="font-bold text-white text-base tracking-tight hidden sm:block">
                                    Discord<span className="text-indigo-400">App</span>
                                </span>
                            </Link>

                            <div className="hidden sm:flex items-center gap-1">
                                <NavItem href={route('servers.index')} active={route().current('servers.index')}>
                                    Servidores
                                </NavItem>
                            </div>
                        </div>

                        {/* Usuario desktop */}
                        <div className="hidden sm:flex items-center">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-sm text-gray-300 hover:text-white">
                                        {user.avatar_url
                                            ? <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                                            : (
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                                    style={{ backgroundColor: user.banner_color ?? '#6366f1' }}>
                                                    {user.name[0].toUpperCase()}
                                                </div>
                                            )
                                        }
                                        <span className="max-w-[120px] truncate">{user.name}</span>
                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content align="right" width="48">
                                    <Dropdown.Link href={route('profile.edit')}>Mi perfil</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Cerrar sesión
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>

                        {/* Hamburguesa mobile */}
                        <button
                            className="sm:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                            onClick={() => setMobileOpen((o) => !o)}
                        >
                            <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                {mobileOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                }
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Menú móvil */}
                {mobileOpen && (
                    <div className="sm:hidden border-t border-gray-700 px-4 py-3 space-y-1">
                        <MobileNavItem href={route('servers.index')} active={route().current('servers.index')}>
                            Servidores
                        </MobileNavItem>
                        <div className="pt-3 border-t border-gray-700 mt-2 flex items-center gap-3">
                            {user.avatar_url
                                ? <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                                : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                        style={{ backgroundColor: user.banner_color ?? '#6366f1' }}>
                                        {user.name[0].toUpperCase()}
                                    </div>
                                )
                            }
                            <div>
                                <p className="text-sm font-medium text-white">{user.name}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                        </div>
                        <MobileNavItem href={route('profile.edit')}>Mi perfil</MobileNavItem>
                        <MobileNavItem href={route('logout')} method="post" as="button">
                            Cerrar sesión
                        </MobileNavItem>
                    </div>
                )}
            </nav>

            {header && (
                <header className="bg-gray-900 border-b border-gray-700 shrink-0">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 text-gray-100">
                        {header}
                    </div>
                </header>
            )}

            <main className="flex-1">{children}</main>
        </div>
    );
}

function NavItem({ href, active, children }) {
    return (
        <Link
            href={href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
            {children}
        </Link>
    );
}

function MobileNavItem({ href, method, as, active, children }) {
    return (
        <Link
            href={href}
            method={method}
            as={as}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
        >
            {children}
        </Link>
    );
}
