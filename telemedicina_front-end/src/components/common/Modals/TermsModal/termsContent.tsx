import React from 'react';

const DefaultTerms: React.ReactNode = (
  <div className="tcle-content space-y-4">
    <h3 className="text-xl font-bold mb-4">Termo de Consentimento Livre e Esclarecido (TCLE)</h3>
    <p>
      Em estrita observância à <strong>Resolução CFM nº 2.314/2022</strong> e à <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>, 
      pelo presente termo, eu autorizo expressamente a realização de atendimento médico por meio de telemedicina.
    </p>

    <h4 className="font-semibold mt-4">1. Natureza e Finalidade do Atendimento</h4>
    <p>
      Compreendo que a telemedicina é o exercício da medicina mediado por tecnologias digitais para fins de assistência, 
      pesquisa, prevenção de doenças e promoção da saúde. Estou ciente de que a consulta presencial é o padrão ouro na medicina, 
      sendo a telemedicina uma alternativa viável e segura a critério do médico.
    </p>

    <h4 className="font-semibold mt-4">2. Limitações e Riscos</h4>
    <p>
      Reconheço que o atendimento remoto apresenta limitações inerentes à impossibilidade de realização de exame físico direto (palpação, percussão, ausculta física). 
      Em casos de urgência ou necessidade técnica, o médico assistente tem total autonomia para interromper a teleconsulta e indicar o encaminhamento imediato para atendimento presencial.
    </p>

    <h4 className="font-semibold mt-4">3. Sigilo, Privacidade e LGPD</h4>
    <p>
      Autorizo a transmissão e processamento de minhas imagens, dados clínicos, exames e informações sensíveis necessários para o diagnóstico. 
      Declaro estar ciente de que:
    </p>
    <ul className="list-disc pl-5 space-y-1">
      <li>A plataforma utiliza criptografia e medidas de segurança para garantir o sigilo profissional.</li>
      <li>Meus dados serão armazenados em prontuário eletrônico seguro, conforme exigido pelo CFM.</li>
      <li>Possuo direitos de acesso, retificação e exclusão de dados, respeitando os prazos legais de guarda documental médica (mínimo de 20 anos).</li>
    </ul>

    <h4 className="font-semibold mt-4">4. Autonomia e Revogação</h4>
    <p>
      Declaro que fui informado sobre os riscos e benefícios do atendimento remoto. Este consentimento é voluntário e pode ser 
      revogado por mim a qualquer momento, sem prejuízo à continuidade da assistência médica que venha a necessitar de forma presencial.
    </p>

    <p className="mt-6 text-sm text-slate-500 italic border-t pt-4">
      Ao clicar em "Aceito e Continuar", confirmo que li, compreendi e concordo integralmente com as condições deste termo para a realização da teleconsulta.
    </p>
  </div>
);

export default DefaultTerms;
