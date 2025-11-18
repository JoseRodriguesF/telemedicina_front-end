import './inicio.css';
import Link from 'next/link';

export default function InicioPage() {
  return (
    <div className="inicio-page">
      <aside className="inicio-sidebar">
        <div className="brand">Telemedicina</div>
        <nav className="inicio-nav">
          <Link href="/inicio" className="nav-item active">Início</Link>
          <Link href="/register" className="nav-item">Cadastro</Link>
          <Link href="/login" className="nav-item">Login</Link>
        </nav>
      </aside>

      <main className="inicio-main">
        <div className="center-card">Início</div>
      </main>
    </div>
  );
}
