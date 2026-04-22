"use client";

import Link from 'next/link';
import './header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          <div className="header-left">
            <Link href="/" className="brand">
              <img src="/images/logo_matriarca.png" alt="Matriarca" width="140" height="40" className="header-logo" />
            </Link>
            <nav className="header-nav">
              <Link href="#servicos">Serviços</Link>
              <Link href="#entender">Como Funciona</Link>
              <Link href="#faq">FAQ</Link>
            </nav>
          </div>
          <div className="header-actions">
            <Link href="/login" className="btn-login">Entrar</Link>
            <Link href="/register" className="btn-signup">Cadastrar</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
