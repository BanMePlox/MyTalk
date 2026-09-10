/**
 * Brand mark — colorful MyTalk.png in light, quiet logo-dark.svg at night.
 * Uses CSS dark: toggle (html.dark) so both assets resolve without JS flash/404.
 */
export default function AppLogo({ className = '', alt = 'MyTalk' }) {
    return (
        <>
            <img
                src="/images/MyTalk.png"
                alt={alt}
                className={`${className} dark:hidden`}
            />
            <img
                src="/images/logo-dark.svg"
                alt={alt}
                className={`${className} hidden dark:block`}
            />
        </>
    );
}
