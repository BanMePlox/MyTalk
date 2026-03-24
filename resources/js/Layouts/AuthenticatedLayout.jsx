import Dropdown from '@/Components/Dropdown';
import { useTheme } from '@/Contexts/ThemeContext';
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);
    const { dark, toggle } = useTheme();

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-800 flex flex-col">
            <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-14 items-center justify-between">
                        {/* Logo + nav links */}
                        <div className="flex items-center gap-6">
                            <Link href={route('servers.index')} className="flex items-center gap-2.5 shrink-0">
                                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow shadow-indigo-500/30">M</div>
                                <span className="font-bold text-gray-900 dark:text-white text-base tracking-tight hidden sm:block">
                                    My<span className="text-indigo-400">Talk</span>
                                </span>
                            </Link>

                            <div className="hidden sm:flex items-center gap-1">
                                <NavItem href={route('servers.index')} active={route().current('servers.index')}>
                                    Servidores
                                </NavItem>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Theme toggle */}
                            <button
                                onClick={toggle}
                                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                title={dark ? 'Modo claro' : 'Modo oscuro'}
                            >
                                {dark ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                )}
                            </button>

                            {/* Usuario desktop */}
                            <div className="hidden sm:flex items-center">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
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
                                className="sm:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                </div>

                {/* Menú móvil */}
                {mobileOpen && (
                    <div className="sm:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-3 space-y-1">
                        <MobileNavItem href={route('servers.index')} active={route().current('servers.index')}>
                            Servidores
                        </MobileNavItem>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-2 flex items-center gap-3">
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
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
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
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 text-gray-800 dark:text-gray-100">
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
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
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
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            {children}
        </Link>
    );
}
