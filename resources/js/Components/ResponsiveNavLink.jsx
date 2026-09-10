import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-accent bg-accent-soft text-accent focus:border-accent focus:bg-accent-soft focus:text-text'
                    : 'border-transparent text-text-muted hover:border-border hover:bg-bg-muted hover:text-text focus:border-border focus:bg-bg-muted focus:text-text'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
