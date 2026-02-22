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

	const features = [
		{
			title: "Atendimento Rápido e Eficiente",
			description: "Conecte-se com médicos qualificados em minutos, sem sair de casa.",
			icon: "/icons/cronometro.png"
		},
		{
			title: "Profissionais Qualificados",
			description: "Nossa equipe é composta por médicos certificados e experientes.",
			icon: "/icons/verificar.png"
		},
		{
			title: "Segurança e Privacidade",
			description: "Seus dados médicos protegidos com criptografia de ponta.",
			icon: "/icons/escudo.png"
		}
	];

	const benefits = [
		{
			title: "Economia de Tempo",
			description: "Não perca horas em deslocamento e salas de espera. Consulte de onde estiver.",
			icon: "/icons/gerenciamento-de-tempo.png"
		},
		{
			title: "Acesso 24/7",
			description: "Atendimento disponível a qualquer hora, todos os dias da semana.",
			icon: "/icons/relogio-de-24-horas.png"
		},
		{
			title: "Histórico Completo",
			description: "Acesse todo seu histórico médico em um só lugar, sempre que precisar.",
			icon: "/icons/historia.png"
		},
		{
			title: "Prescrições Digitais",
			description: "Receba receitas médicas digitais válidas em todo território nacional.",
			icon: "/icons/comprimido.png"
		}
	];

	const faqs = [
		{
			question: "O que é Telemedicina?",
			answer: "Telemedicina é a prática de cuidados de saúde à distância, usando tecnologia de comunicação. Permite consultas médicas por vídeo, diagnósticos remotos e acompanhamento de tratamentos sem necessidade de deslocamento."
		},
		{
			question: "A telemedicina substitui a consulta presencial?",
			answer: "A telemedicina complementa o atendimento presencial, sendo ideal para consultas de rotina, acompanhamento de tratamentos, orientações médicas e casos que não exigem exame físico. Em situações que necessitam procedimentos ou exames específicos, o médico orientará sobre a necessidade de consulta presencial."
		},
		{
			question: "Meus dados estão seguros na plataforma?",
			answer: "Sim! Utilizamos criptografia de ponta a ponta e seguimos rigorosamente a LGPD (Lei Geral de Proteção de Dados). Seus dados médicos são armazenados com segurança e apenas profissionais autorizados têm acesso."
		},
		{
			question: "Como funciona o atendimento?",
			answer: "Após fazer seu cadastro, você pode solicitar uma consulta. Será conectado com um médico disponível em poucos minutos. A consulta acontece por videochamada, onde você pode conversar, tirar dúvidas e receber orientações médicas."
		},
		{
			question: "Como funciona a fatura?",
			answer: "O pagamento é processado de forma segura através da plataforma. Você pode pagar com cartão de crédito, débito ou PIX. Após a consulta, você recebe um recibo detalhado que pode ser usado para reembolso pelo seu plano de saúde."
		}
	];

	return (
		<div className="page-home">
			<Header />

			{/* Hero Section */}
			<section className="hero-section">
				<div className="container">
					<div className="hero-content">
						<div className="hero-text animate-fadeIn">
							<h1 className="hero-title">
								Cuide da sua saúde com <span className="text-gradient">Telemedicina</span>
							</h1>
							<p className="hero-description">
								Consultas médicas online de qualidade, com profissionais certificados.
								Atendimento rápido, seguro e no conforto da sua casa.
							</p>
							<div className="hero-actions">
								<Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-hero-primary">
									Começar Agora
								</Link>
								<Link href="/login" className="btn btn-hero-secondary">
									Já tenho conta
								</Link>
							</div>
							<div className="hero-stats">
								<div className="stat-item">
									<span className="stat-number">1000+</span>
									<span className="stat-label">Pacientes Atendidos</span>
								</div>
								<div className="stat-item">
									<span className="stat-number">50+</span>
									<span className="stat-label">Médicos Especialistas</span>
								</div>
								<div className="stat-item">
									<span className="stat-number">24/7</span>
									<span className="stat-label">Disponibilidade</span>
								</div>
							</div>
						</div>
						<div className="hero-image animate-fadeIn">
							<div className="hero-image-wrapper">
								<div className="floating-card card-1">
									<div className="card-icon">📝</div>
									<div className="card-text">Prescrição Digital</div>
								</div>
								<div className="floating-card card-2">
									<div className="card-icon">📱</div>
									<div className="card-text">Consulta Online</div>
								</div>
								<div className="floating-card card-3">
									<div className="card-icon">⚡</div>
									<div className="card-text">Atendimento Rápido</div>
								</div>
								<div className="hero-illustration">
									<div className="illustration-circle"></div>
									<div className="illustration-icon">🏥</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="features-section">
				<div className="container">
					<div className="section-header">
						<h2 className="section-title">Como a Telemedicina transforma seu bem-estar</h2>
						<p className="section-description">
							Tecnologia de ponta para cuidar da sua saúde com praticidade e segurança
						</p>
					</div>
					<div className="features-grid">
						{features.map((feature, index) => (
							<div key={index} className="feature-card hover-lift">
								<div className="feature-icon">
									<Image
										src={feature.icon}
										alt={feature.title}
										width={80}
										height={80}
										style={{ width: '80px', height: '80px' }}
									/>
								</div>
								<h3 className="feature-title">{feature.title}</h3>
								<p className="feature-description">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="benefits-section">
				<div className="container">
					<div className="section-header">
						<h2 className="section-title">Descubra os benefícios da Telemedicina</h2>
						<p className="section-description">
							Atendimento médico de qualidade, quando e onde você precisar
						</p>
					</div>
					<div className="benefits-grid">
						{benefits.map((benefit, index) => (
							<div key={index} className="benefit-card">
								<div className="benefit-icon-wrapper">
									<Image
										src={benefit.icon}
										alt={benefit.title}
										width={64}
										height={64}
										style={{ width: '64px', height: '64px' }}
									/>
								</div>
								<div className="benefit-content">
									<h3 className="benefit-title">{benefit.title}</h3>
									<p className="benefit-description">{benefit.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="faq-section">
				<div className="container">
					<div className="section-header">
						<h2 className="section-title">Sua saúde tem perguntas?</h2>
						<p className="section-description">
							Encontre respostas para as dúvidas mais comuns sobre telemedicina
						</p>
					</div>
					<div className="faq-list">
						{faqs.map((faq, index) => (
							<div key={index} className={`faq-item ${openFaq === index ? 'active' : ''}`}>
								<button
									className="faq-question"
									onClick={() => toggleFaq(index)}
									aria-expanded={openFaq === index}
								>
									<span>{faq.question}</span>
									<span className="faq-icon">{openFaq === index ? '−' : '+'}</span>
								</button>
								<div className="faq-answer">
									<p>{faq.answer}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="cta-section">
				<div className="container">
					<div className="cta-content">
						<div className="cta-text">
							<h2 className="cta-title">Pronto para cuidar da sua saúde?</h2>
							<p className="cta-description">
								Cadastre-se agora e tenha acesso a consultas médicas de qualidade,
								quando e onde você precisar.
							</p>
						</div>
						<div className="cta-actions">
							<Link href={{ pathname: '/register', query: { tipo: 'paciente' } }} className="btn btn-cta-primary">
								Criar Conta Gratuita
							</Link>
							<Link href={{ pathname: '/register', query: { tipo: 'medico' } }} className="btn btn-cta-secondary">
								Sou Médico
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="footer">
				<div className="container">
					<div className="footer-content">
						<div className="footer-brand">
							<h3 className="text-gradient">Telemedicina</h3>
							<p>Cuidando da sua saúde com tecnologia e humanização.</p>
						</div>
						<div className="footer-links">
							<div className="footer-column">
								<h4>Plataforma</h4>
								<Link href="/login">Login</Link>
								<Link href={{ pathname: '/register', query: { tipo: 'paciente' } }}>Cadastro</Link>
								<Link href={{ pathname: '/register', query: { tipo: 'medico' } }}>Para Médicos</Link>
							</div>
							<div className="footer-column">
								<h4>Suporte</h4>
								<a href="#faq">FAQ</a>
								<a href="#contato">Contato</a>
								<a href="#privacidade">Privacidade</a>
							</div>
						</div>
					</div>
					<div className="footer-bottom">
						<p>&copy; 2026 Telemedicina. Todos os direitos reservados.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}