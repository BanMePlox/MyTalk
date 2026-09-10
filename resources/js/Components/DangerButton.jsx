export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={`inline-flex items-center rounded-sm px-4 py-2 text-sm font-medium transition-opacity bg-danger text-text-on-accent hover:opacity-90 disabled:opacity-50 ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
}
