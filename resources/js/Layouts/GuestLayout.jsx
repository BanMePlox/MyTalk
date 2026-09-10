import AppLogo from '@/Components/AppLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-bg pt-6 sm:justify-center sm:pt-0 relative">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <div>
                <Link href="/">
                    <AppLogo className="h-16 w-16 object-contain" />
                </Link>
            </div>

            <div className="mt-6 w-full auth-card sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
