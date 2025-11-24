import Link from "next/link";
import './header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <h1 className="brand"><Link href="/" aria-label="Início">Telemedicina</Link></h1>

        <div className="header-actions">
          <Link href="/login" className="btn btn-ghost" aria-label="Login">Login</Link>
          <Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-primary" aria-label="Cadastro">Cadastro</Link>
          <Link href={{ pathname: '/register', query: { tipo: 'medico' } }} className="btn btn-secondary" aria-label="Cadastro para médicos">Cadastro Médicos</Link>
        </div>
      </div>
    </header>
  );
}
