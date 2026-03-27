import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved ? saved === 'dark' : true; // dark by default
    });

    const [compact, setCompact] = useState(() =>
        localStorage.getItem('compact') === 'true'
    );

    useEffect(() => {
        const root = document.documentElement;
        if (dark) root.classList.add('dark');
        else       root.classList.remove('dark');
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);

    useEffect(() => {
        localStorage.setItem('compact', compact ? 'true' : 'false');
    }, [compact]);

    return (
        <ThemeContext.Provider value={{
            dark,    toggle:        () => setDark(d => !d),
            compact, toggleCompact: () => setCompact(c => !c),
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
