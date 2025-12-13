"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import '@/components/common/Inputs/input.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Input from '@/components/common/Inputs/Input';
import TagAutocomplete from '@/components/common/Inputs/TagAutocomplete';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useState } from 'react';
import { getToken, getUser } from '@/lib/auth';
import { psCreateRoom } from '@/lib/axios/consultas';

function PreConsultaInner() {
  const router = useRouter();
  // consultaId será gerado na criação da sala ao enviar o formulário

  const [queixa, setQueixa] = useState('');
  const [descricao, setDescricao] = useState('');
  const [antecedentesPessoais, setAntecedentesPessoais] = useState<string[]>([]);
  const [antecedentesFamiliares, setAntecedentesFamiliares] = useState<string[]>([]);
  const [estiloVida, setEstiloVida] = useState('');
  const [vacinacao, setVacinacao] = useState<string[]>([]);

  const sugestoes = ["Diabetes", "Colesterol alto", "Hipertensão", "Asma", "Alergia a penicilina", "Hipotireoidismo", "Ansiedade"];
  const vacinasSugestoes = [
    "COVID-19 (2 doses)",
    "Influenza",
    "Tétano",
    "Hepatite B",
    "Sarampo",
    "HPV",
  ];

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    if (list.includes(tag)) setList(list.filter(t => t !== tag));
    else setList([...list, tag]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    const user = getUser();
    if (user?.tipo_usuario !== 'paciente') {
      alert('Apenas pacientes podem iniciar consultas no pronto socorro. (forbidden_only_paciente_can_create_room)');
      return;
    }
    if (!token) {
      alert('Faça login novamente para continuar.');
      return;
    }
    try {
      const { roomId, consultaId, iceServers } = await psCreateRoom(token);
      sessionStorage.setItem('ps_room', JSON.stringify({ roomId, consultaId, iceServers }));
      router.push(`/consultas/atendimento?id=${encodeURIComponent(consultaId)}`);
    } catch (err: any) {
      const msg = String(err?.message || 'Não foi possível criar sua consulta. Tente novamente.');
      if (msg.includes('forbidden_only_paciente_can_create_room')) {
        alert('Apenas pacientes podem criar consulta no pronto socorro.');
      } else if (msg.includes('paciente_record_not_found_for_usuario')) {
        alert('Seu usuário não está vinculado a um cadastro de Paciente. Complete o cadastro para continuar.');
      } else {
        alert(msg);
      }
    }
  }

  return (
    <div className="inicio-page">
      <Sidebar activeId="consultas" />
      <main className="inicio-main">
        <div className="center-card">
          <div className="pc-card">
            <h2>Formulario pré consulta</h2>
            <form className="pc-form" onSubmit={handleSubmit}>
              <div className="pc-field">
                <label className="pc-label">Queixa principal</label>
                <Input placeholder="Ex: Dor de cabeça forte" value={queixa} onChange={(e) => setQueixa(e.target.value)} />
              </div>

              <div className="pc-field">
                <label className="pc-label">Descrição dos sintomas / Doença atual</label>
                <textarea className="pc-textarea" placeholder="Ex: Como você está se sentindo e como os sintomas começaram." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>

              <div className="pc-field">
                <label className="pc-label">Antecedentes pessoais</label>
                <TagAutocomplete
                  placeholder="Digite para procurar"
                  suggestions={sugestoes}
                  selected={antecedentesPessoais}
                  onChangeSelected={setAntecedentesPessoais}
                />
              </div>

              <div className="pc-field">
                <label className="pc-label">Antecedentes familiares</label>
                <TagAutocomplete
                  placeholder="Digite para procurar"
                  suggestions={sugestoes}
                  selected={antecedentesFamiliares}
                  onChangeSelected={setAntecedentesFamiliares}
                />
              </div>

              <div className="pc-field">
                <label className="pc-label">Estilo de vida</label>
                <textarea className="pc-textarea" placeholder="Descreva seus hábitos: alimentação, atividade física, tabagismo, consumo de alcool" value={estiloVida} onChange={(e) => setEstiloVida(e.target.value)} />
              </div>

              <div className="pc-field">
                <label className="pc-label">Vacinação</label>
                <TagAutocomplete
                  placeholder="Digite para procurar"
                  suggestions={vacinasSugestoes}
                  selected={vacinacao}
                  onChangeSelected={setVacinacao}
                />
              </div>

              <div className="pc-actions">
                <Button type="button" variant="ghost" onClick={() => router.push('/consultas')}>Cancelar</Button>
                <Button type="submit" variant="primary">Enviar</Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PreConsultaPage() {
  return (
    <Suspense fallback={<div className="pc-loading">Carregando pré-consulta...</div>}>
      <PreConsultaInner />
    </Suspense>
  );
}
