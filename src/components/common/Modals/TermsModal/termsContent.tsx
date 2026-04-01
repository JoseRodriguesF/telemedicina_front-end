import React from 'react';

const DefaultTerms: React.ReactNode = (
  <div className="tcle-content">
    <h3>Termo de Consentimento Livre e Esclarecido (TCLE)</h3>
    <p>
      Em conformidade com a <strong>Resolução CFM nº 2.314/2022</strong> e com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>, 
      pelo presente termo, eu autorizo expressamente a realização de atendimento médico por meio de telemedicina.
    </p>

    <h4>1. Natureza do Atendimento</h4>
    <p>
      Compreendo que a telemedicina é o exercício da medicina mediado por tecnologias digitais para fins de assistência, 
      e que a consulta presencial é o padrão ouro, sendo a telemedicina uma alternativa viável a critério do médico.
    </p>

    <h4>2. Sigilo e Transmissão de Dados</h4>
    <p>
      Autorizo a transmissão de minhas imagens, dados clínicos, exames e outras informações necessárias para a realização 
      do diagnóstico e tratamento. Estou ciente de que a plataforma utiliza medidas de segurança para garantir o sigilo 
      profissional e a privacidade dos dados.
    </p>

    <h4>3. Autonomia Médica e Limitações</h4>
    <p>
      Reconheço que o médico tem total autonomia para decidir sobre a interrupção do atendimento por telemedicina e 
      indicação de consulta presencial, caso julgue necessário para a minha segurança ou melhor condução do caso.
    </p>

    <h4>4. Consentimento e Revogação</h4>
    <p>
      Declaro que fui informado sobre os riscos e benefícios do atendimento remoto e que este consentimento pode ser 
      revogado por mim a qualquer momento, por meio de comunicação oficial à plataforma.
    </p>

    <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
      Ao clicar em "Aceito e Continuar", você confirma que leu e concorda com todos os termos acima.
    </p>
  </div>
);

export default DefaultTerms;
