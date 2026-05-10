'use client';

import React from 'react';
import './termos.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import DefaultTerms from '@/components/common/Modals/TermsModal/termsContent';

export default function TermosPage() {
  const router = useRouter();

  return (
    <div className="termos-page">
      <div className="termos-container">
        <header className="termos-header">
          <img src="/images/logo_matriarca_icon.svg" alt="Matriarca" className="termos-logo" />
          <h1>Termos de Uso e Política de Privacidade</h1>
          <p>Última atualização: 17 de abril de 2026</p>
        </header>

        <main className="termos-content">
          <section className="termos-section">
            {DefaultTerms}
          </section>

          <section className="termos-section">
            <h3 className="text-xl font-bold mb-4">5. Encarregado de Proteção de Dados (DPO)</h3>
            <p>
              Em conformidade com o Artigo 41 da LGPD, a Matriarca Telemedicina designou um Encarregado de Proteção de Dados para atuar como canal de comunicação entre o controlador, os titulares dos dados e a Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <div className="dpo-info mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <p><strong>Nome:</strong> Jose Alencar (DPO Interino)</p>
              <p><strong>Contato:</strong> privacidade@matriarca.med.br</p>
              <p><strong>Endereço:</strong> Setor de Conformidade e Proteção de Dados - Matriarca</p>
            </div>
          </section>

          <section className="termos-section">
            <h3 className="text-xl font-bold mb-4">6. Exercício de Direitos do Titular</h3>
            <p>
              Você pode solicitar a qualquer momento a confirmação da existência de tratamento, o acesso aos seus dados, a correção de dados incompletos ou a exclusão de dados desnecessários através da sua página de Perfil na plataforma ou entrando em contato com nosso DPO.
            </p>
          </section>

          <div className="termos-footer-actions">
            <Button variant="ghost" onClick={() => router.back()}>Voltar</Button>
          </div>
        </main>
      </div>
    </div>
  );
}
