"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import './header.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="header-inner">
        <h1 className="brand">
          <Link href="/" aria-label="Início">Telemedicina</Link>
        </h1>

        <div className="header-actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
