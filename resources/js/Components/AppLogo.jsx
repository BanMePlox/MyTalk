import { useTheme } from '@/Contexts/ThemeContext';

/**
 * Brand mark — colorful MyTalk.png in light, quiet logo-dark.svg at night.
 */
export default function AppLogo({ className = '', alt = 'MyTalk' }) {
    const { dark } = useTheme();

    return (
        <img
            src={dark ? '/images/logo-dark.svg' : '/images/MyTalk.png'}
            alt={alt}
            className={className}
        />
    );
}
