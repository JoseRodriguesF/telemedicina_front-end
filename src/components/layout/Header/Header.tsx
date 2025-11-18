import Link from "next/link";
import './header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <h1 className="brand"><Link href="/" aria-label="Início">Telemedicina</Link></h1>

        <div className="header-actions">
          <Link href="/login" className="btn btn-ghost" aria-label="Login">Login</Link>
          <Link href="/register" className="btn btn-primary" aria-label="Cadastro">Cadastro</Link>
        </div>
      </div>
    </header>
  );
}
