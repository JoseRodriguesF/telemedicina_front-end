"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/common/ThemeToggle/ThemeToggle';
import Header from "@/components/layout/Header/Header";
import './Home.css';

export default function HomeScreen() {
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const toggleFaq = (index: number) => {
		setOpenFaq(openFaq === index ? null : index);
	};

	return (
		<div className="page-home">
			<Header />

			{/* Floating Theme Toggle */}
			<div className="landing-theme-toggle animate-fadeIn">
				<ThemeToggle />
			</div>

			{/* Hero Section */}
			<section className="hero-section">
				<div className="container">
					<div className="hero-content">
						<div className="hero-text animate-fadeIn">
							<h1 className="hero-title">
								<span className="text-highlight">Matriarca</span> Telemed
							</h1>
							<p className="hero-description">
								Acesso imediato a especialistas de alto nível através de uma plataforma segura e intuitiva. 
								O futuro do cuidado clínico, agora na palma da sua mão.
							</p>
							<div className="hero-actions">
								<Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-hero-primary">
									Começar Agora →
								</Link>
								<Link href="/login" className="btn btn-hero-secondary">
									Já Tenho Conta
								</Link>
							</div>
							
							<div className="hero-stats">
								<div className="stat-item">
									<span className="stat-number">1000+</span>
									<span className="stat-label">PACIENTES</span>
								</div>
								<div className="stat-item">
									<span className="stat-number">50+</span>
									<span className="stat-label">ESPECIALISTAS</span>
								</div>
								<div className="stat-item">
									<span className="stat-number">24/7</span>
									<span className="stat-label">DISPONIBILIDADE</span>
								</div>
							</div>
						</div>
						<div className="hero-image-v2 animate-fadeIn">
							<img 
								src="/images/hero-doctor.png" 
								alt="Medico Matriarca" 
								width="600" 
								height="700"
								className="doctor-main-img"
							/>
							<div className="floating-card-v2 consultation-active shadow-xl">
								<div className="card-header" style={{ color: '#10b981' }}>
									<div className="pulse-dot"></div>
									<span>Ambiente Seguro</span>
								</div>
								<div className="card-body">
									<p>100% Confidencial</p>
									<p className="timer" style={{ fontSize: '0.95rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>Criptografia de Ponta a Ponta</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Technology Section */}
			<section className="tech-section" id="servicos">
				<div className="container">
					<div className="section-header">
						<h2 className="display-title">Tecnologia que <span className="text-highlight">Humaniza</span></h2>
						<p className="section-subtitle">Combinamos inteligência clínica com o acolhimento digital para entregar o melhor diagnóstico.</p>
					</div>
					
					<div className="tech-grid">
						<div className="tech-card large-card animate-fadeIn">
							<div className="card-icon-round">
								<img src="/images/technology.png" alt="Inteligência Clínica" width="64" height="64" />
							</div>
							<h3>Inteligência Clínica</h3>
							<p>Algoritmos avançados que auxiliam médicos em diagnósticos precoces, garantindo precisão cirúrgica no seu tratamento.</p>
							<div className="card-visual">
								<img src="/images/brain-scan.png" alt="Brain Diagnostic" width="400" height="200" className="rounded-xl overflow-hidden" />
							</div>
						</div>
						
						<div className="tech-side-grid">
							<div className="tech-card mini-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/cronometro.png" alt="Rápido" width="56" height="56" />
								</div>
								<h3>Atendimento Rápido</h3>
								<p>Tempo médio de espera inferior a 15 minutos para triagem.</p>
							</div>
							<div className="tech-card mini-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/escudo.png" alt="Privacidade" width="56" height="56" />
								</div>
								<h3>Privacidade Total</h3>
								<p>Criptografia de ponta a ponta seguindo as mais rígidas normas.</p>
							</div>
							<div className="tech-card wide-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/verificar.png" alt="Especialistas" width="56" height="56" />
								</div>
								<h3>Profissionais Qualificados</h3>
								<p>Trabalhamos apenas com especialistas certificados pelas principais instituições nacionais e internacionais.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Benefits Dashboard Section */}
			<section className="benefits-dashboard-section" id="entender">
				<div className="container">
					<div className="benefits-layout">
						<div className="benefits-info">
							<div className="benefit-item">
								<span className="benefit-number">01</span>
								<div className="benefit-content">
									<h3>Economia de Tempo</h3>
									<p>Elimine deslocamentos e filas de espera. Consulte do conforto de onde você estiver.</p>
								</div>
							</div>
							<div className="benefit-item">
								<span className="benefit-number">02</span>
								<div className="benefit-content">
									<h3>Acesso 24/7</h3>
									<p>Emergências não têm hora. Nosso plantão está sempre ativo para sua segurança.</p>
								</div>
							</div>
							<div className="benefit-item">
								<span className="benefit-number">03</span>
								<div className="benefit-content">
									<h3>Prescrições Digitais</h3>
									<p>Receba receitas, atestados e pedidos de exames validados digitalmente em seu smartphone.</p>
								</div>
							</div>
						</div>
						<div className="dashboard-visual animate-fadeIn">
							<img 
								src="/images/dashboard-mockup.png" 
								alt="Matriarca Dashboard" 
								width="800" 
								height="600" 
								className="dashboard-img shadow-2xl"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="faq-section-v2" id="faq">
				<div className="container">
					<div className="section-header">
						<h2 className="display-title">Perguntas <span className="text-highlight">Frequentes</span></h2>
					</div>
					<div className="faq-list-v2">
						{[
							{ 
								q: "Como funciona o atendimento de telemedicina na Matriarca?", 
								a: "Nosso atendimento é rápido e prático. Após criar sua conta, você passa por uma triagem inovadora suportada por inteligência clínica. Em uma média de tempo inferior a 15 minutos, você é direcionado a um de nossos médicos que estão de plantão. Toda a consulta ocorre por vídeo com conexão estável, garantindo a mesma atenção humanizada das clínicas presenciais, além de diagnósticos ágeis." 
							},
							{ 
								q: "A teleconsulta é segura e meus dados são protegidos?", 
								a: "Sim, a máxima segurança e privacidade é parte do nosso compromisso. Todo o ambiente da plataforma emprega criptografia militar (ponta a ponta, AES-256). Seu prontuário eletrônico e a sala de vídeo são estritamente confidenciais e adequados 100% à LGPD e à Resolução CFM nº 2.314/2022, o que consolida nosso sigilo ético-profissional absoluto." 
							},
							{ 
								q: "Receberei minha receita médica, exame ou atestado de forma digital?", 
								a: "Com certeza. Durante ou ao final de cada sua consulta, caso necessário, o especialista prescreverá suas receitas, que são validadas através de assinatura digital certificada pelo ICP-Brasil. Esses documentos são imediatos de acessar, tendo a mesma validade de um papel chancelado em todas as farmácias e laboratórios do Brasil inteiro, poupando totalmente o seu tempo e logística física. Você os recebe no seu app, SMS e e-mail." 
							},
							{ 
								q: "Quais as especialidades de saúde estão incluídas na plataforma?", 
								a: "Mantemos uma rede vasta contendo os melhores especialistas do país, abrangendo mais de 50 áreas focais de atuação médica. Nossos pacientes encontram práticos Clínicos Gerais para plantão imediato 24h, passando por especialistas renomados em áreas como Pediatria, Psiquiatria, Terapia, Cardiologia, Ginecologia, Ortopedia e Nutrição, entre diversas outras modalidades cruciais de bem estar." 
							},
							{ 
								q: "Como o sistema de Home Care se vincula à telemedicina?", 
								a: "Entendemos que alguns quadros demandam atenção mais física. Enquanto a plataforma online atende ocorrências leves de rotina e acompanhamentos, a Matriarca também gerencia soluções integradas de serviço de saúde residencial (Home Care). Nossas equipes são enviadas (mediante cobertura geográfica ou contratação a parte) para oferecer amparo em loco e tratamentos continuados que complementam as visitas digitais do seu médico titular." 
							},
							{ 
								q: "Pessoas idosas têm dificuldade para utilizar o sistema de consulta online?", 
								a: "A usabilidade e o design da nossa plataforma foram construídos essencialmente para reduzir os atritos de qualquer perfil de tecnologia. O fluxo é limpo, visivelmente agradável e possuímos uma excelente assistência técnica preparada na retaguarda. Se o paciente idoso — ou até mesmo leigo com acessos digitais — encontrar qualquer dificuldade, em 1 ou 2 toques, nossos consultores e enfermeiros o ajudam a entrar na sua sala digital com seu médico no horário correto." 
							}
						].map((item, i) => (
							<div key={i} className={`faq-item-v2 ${openFaq === i ? 'active' : ''}`}>
								<button className="faq-trigger" onClick={() => toggleFaq(i)}>
									<span>{item.q}</span>
								</button>
								<div className="faq-content">
									<p>{item.a}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Final CTA Section */}
			<section className="final-cta">
				<div className="container">
					<div className="cta-box">
						<h2 className="cta-title">Pronto para transformar seu cuidado?</h2>
						<p className="cta-subtitle">Junte-se a milhares de pessoas que já descobriram a facilidade de cuidar da saúde.</p>
						<div className="cta-btns">
							<Link href="/register" className="btn btn-white">Criar Conta Grátis</Link>
							<Link href={{ pathname: '/register', query: { tipo: 'medico' } }} className="btn btn-outline-white">Sou Médico</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="site-footer">
				<div className="container">
					<div className="footer-top">
						<div className="footer-brand-info">
							<img src="/images/logo_matriarca.png" alt="Matriarca" width="180" height="60" style={{ marginBottom: "1rem" }} />
							<p>Excelência e rapidez no atendimento médico moderno, aliando tecnologia ao cuidado humano.</p>
							<div className="social-links">
								<span className="social-icon">🌐</span>
								<span className="social-icon">📸</span>
							</div>
						</div>
						<div className="footer-nav-groups">
							<div className="nav-group">
								<h4>Plataforma</h4>
								<Link href="#como-funciona">Como Funciona</Link>
								<Link href="#especialidades">Especialidades</Link>
								<Link href="#precos">Preços</Link>
							</div>
							<div className="nav-group">
								<h4>Suporte</h4>
								<Link href="#emergencia">Emergency Contact</Link>
								<Link href="#acessibilidade">Accessibility</Link>
								<Link href="#faq">FAQ</Link>
							</div>
							<div className="nav-group">
								<h4>Jurídico</h4>
								<Link href="/termos">Política de Privacidade</Link>
								<Link href="/termos">Termos de Uso</Link>
								<Link href="#cookies">Cookie Settings</Link>
							</div>
						</div>
					</div>
					<div className="footer-bottom">
						<p>© 2026 Matriarca. High-Tech Precision Care.</p>
						<div className="lang">
							<span>BRASIL</span>
							<span>ENGLISH</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}