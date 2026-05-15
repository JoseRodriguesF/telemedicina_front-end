"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

			{/* Hero Section */}
			<section className="hero-section">
				<div className="container">
					<div className="hero-content">
						<div className="hero-text animate-fadeIn" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
							<Image 
								src="/images/logo_matriarca_icon.svg" 
								alt="Logo Matriarca" 
								width={180} 
								height={180} 
								className="hero-logo-img"
								style={{ marginBottom: '1.5rem', objectFit: 'contain' }}
								priority
							/>
							<h1 className="hero-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem', lineHeight: 1.1 }}>
								<span className="text-highlight" style={{ fontSize: 'clamp(4rem, 8vw, 6.5rem)', fontWeight: 900 }}>Matriarca</span>
								<span style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 600, color: 'var(--color-primary-600)', letterSpacing: '0.15em', marginTop: '0.5rem', textTransform: 'uppercase' }}>Telemedicina</span>
							</h1>
							
							<div className="hero-actions" style={{ justifyContent: 'center', gap: '2rem', width: '100%' }}>
								<Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-hero-primary" style={{ padding: '1.25rem 3.5rem', fontSize: '1.2rem' }}>
									Começar Agora →
								</Link>
								<Link href="/login" className="btn btn-hero-secondary" style={{ padding: '1.25rem 3.5rem', fontSize: '1.2rem' }}>
									Já Tenho Conta
								</Link>
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
						<p className="section-subtitle">Da triagem inteligente à videoconsulta em tempo real, cada etapa foi pensada para tornar o cuidado médico simples, seguro e acessível.</p>
					</div>
					
					<div className="tech-grid">
						<div className="tech-card large-card animate-fadeIn">
							<div className="card-icon-round">
								<img src="/images/technology.png" alt="Inteligência Clínica" width="64" height="64" />
							</div>
							<h3>Triagem com Inteligência</h3>
							<p>Antes de cada consulta, nosso sistema coleta seus sintomas e gera automaticamente um resumo clínico estruturado para o médico — acelerando o diagnóstico desde o primeiro contato.</p>
							<div className="card-visual">
								<img src="/images/smart-triage.png" alt="Triagem com Inteligência" width="400" className="rounded-xl overflow-hidden" style={{ width: '100%', height: 'auto', aspectRatio: '16/9', objectFit: 'cover' }} />
							</div>
						</div>
						
						<div className="tech-side-grid">
							<div className="tech-card mini-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/cronometro.png" alt="Rápido" width="56" height="56" />
								</div>
								<h3>Pronto Atendimento</h3>
								<p>Entre na fila e seja atendido por um clínico geral disponível, sem hora marcada.</p>
							</div>
							<div className="tech-card mini-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/escudo.png" alt="Privacidade" width="56" height="56" />
								</div>
								<h3>Privacidade & LGPD</h3>
								<p>Seus dados e prontuários são protegidos em conformidade com a LGPD e a Resolução CFM nº 2.314/2022.</p>
							</div>
							<div className="tech-card wide-card animate-fadeIn">
								<div className="card-icon-small">
									<img src="/icons/verificar.png" alt="Especialistas" width="56" height="56" />
								</div>
								<h3>Médicos Verificados</h3>
								<p>Todo profissional passa por verificação documental antes de atender — você consulta apenas médicos habilitados e validados pela plataforma.</p>
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
									<h3>Sem Deslocamento</h3>
									<p>Consulte de onde estiver via videochamada. Nada de filas, deslocamentos ou salas de espera.</p>
								</div>
							</div>
							<div className="benefit-item">
								<span className="benefit-number">02</span>
								<div className="benefit-content">
									<h3>Agendamento Flexível</h3>
									<p>Marque consultas com especialistas no horário que for melhor para você, ou use o pronto atendimento imediato sem agendamento.</p>
								</div>
							</div>
							<div className="benefit-item">
								<span className="benefit-number">03</span>
								<div className="benefit-content">
									<h3>Prescrições com Validade Legal</h3>
									<p>Receitas, atestados e pedidos de exame emitidos com assinatura digital ICP-Brasil — aceitos em qualquer farmácia ou laboratório do país.</p>
								</div>
							</div>
						</div>
						<div className="dashboard-visual animate-fadeIn">
							<img 
								src="/images/Gemini_Generated_Image_8zx0rz8zx0rz8zx0.png" 
								alt="Benefícios Telemedicina" 
								width="800" 
								className="dashboard-img shadow-2xl"
								style={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '1rem' }}
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
								q: "Como funciona o atendimento na Matriarca? Preciso agendar ou posso consultar na hora?", 
								a: "A Matriarca oferece dois modos de atendimento. No Pronto Atendimento, você entra na fila e é atendido por um clínico geral disponível sem hora marcada — ideal para sintomas imediatos. No Agendamento, você escolhe um especialista, seleciona data e horário, e entra na sala de vídeo no momento marcado. Em ambos os casos, antes da consulta você preenche uma triagem rápida que prepara o médico com um resumo clínico do seu caso." 
							},
							{ 
								q: "O que acontece durante a triagem antes da consulta?", 
								a: "A triagem é uma etapa essencial antes de qualquer atendimento. Você responde perguntas sobre seus sintomas, histórico e motivo da consulta. Essas informações geram automaticamente um resumo clínico estruturado que é disponibilizado ao médico antes mesmo de você entrar na videochamada — tornando o atendimento mais ágil e preciso desde o primeiro minuto." 
							},
							{ 
								q: "Como funciona a videoconsulta? Preciso instalar algum aplicativo?", 
								a: "Não é necessário instalar nada. A videoconsulta acontece diretamente no navegador, dentro da própria plataforma. Ao entrar na sala, você e o médico se conectam via chamada de vídeo em tempo real. A sala fica disponível poucos minutos antes do horário agendado e você pode reconectar caso a conexão seja interrompida, sem perder a consulta." 
							},
							{ 
								q: "Receberei minha receita médica, exame ou atestado de forma digital?", 
								a: "Sim. Durante ou ao final da consulta, o médico pode emitir receitas, atestados e pedidos de exame com assinatura digital — com a mesma validade jurídica de um documento físico. Os documentos ficam disponíveis no seu histórico na plataforma e podem ser apresentados em qualquer farmácia ou laboratório do país." 
							},
							{ 
								q: "Meus dados e prontuários são protegidos?", 
								a: "Sim. Toda a comunicação na plataforma é protegida por criptografia de ponta a ponta, garantindo que nenhum dado trafegue de forma exposta. Seus prontuários e os dados da triagem ficam armazenados de forma segura e criptografada, com acesso restrito exclusivamente a você e ao médico responsável pelo atendimento." 
							},
							{ 
								q: "Como sei que os médicos da plataforma são habilitados?", 
								a: "Antes de realizar qualquer atendimento, todos os médicos cadastrados passam por um processo de verificação documental dentro da plataforma. Apenas profissionais com documentação validada — incluindo registro no CRM — recebem liberação para atender. Essa verificação é um requisito obrigatório, garantindo que você sempre seja atendido por um profissional legalmente habilitado." 
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
						<h2 className="cta-title">Sua saúde a um clique de distância.</h2>
						<p className="cta-subtitle">Crie sua conta e acesse pronto atendimento, agendamento com especialistas e prescrições digitais — tudo em um só lugar.</p>
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
								<span className="social-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </span>
								<span className="social-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </span>
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
