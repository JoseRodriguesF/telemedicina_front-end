"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import './ThemeToggle.css';

type Props = {
    minimal?: boolean;
};

export default function ThemeToggle({ minimal = false }: Props) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [mounted, setMounted] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // Toggle theme
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // Prevent flash of unstyled content
    if (!mounted) {
        if (minimal) return <div style={{ width: 24, height: 24 }} />;
        return (
            <button className="theme-toggle" aria-label="Toggle theme" disabled>
                <div className="theme-toggle-track">
                    <div className="theme-toggle-thumb" />
                </div>
            </button>
        );
    }

    if (minimal) {
        return (
            <button
                type="button"
                className="tool-btn theme-toggle-minimal"
                onClick={toggleTheme}
                aria-label={`Mudar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
                title={`Mudar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
                {theme === 'light' ? (
                    <Image src="/icons/icon-moon.png" alt="Mudar para Escuro" width={24} height={24} />
                ) : (
                    <Image src="/icons/icon-sun.png" alt="Mudar para Claro" width={28} height={28} />
                )}
            </button>
        );
    }

    return (
        <button
            className={`theme-toggle ${theme}`}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            <div className="theme-toggle-track">
                <div className="theme-toggle-thumb">
                    {theme === 'light' ? (
                        <Image src="/icons/icon-moon.png" alt="Dark Mode" width={14} height={14} />
                    ) : (
                        <Image src="/icons/icon-sun.png" alt="Light Mode" width={16} height={16} />
                    )}
                </div>
            </div>
        </button>
    );
}
