export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={`rounded-sm border-border text-accent accent-accent ${className}`}
        />
    );
}
