"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import '@/components/common/Inputs/input.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Input from '@/components/common/Inputs/Input';
import TagAutocomplete from '@/components/common/Inputs/TagAutocomplete';
import Button from '@/components/common/Buttons/Button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PreConsultaPage() {
  const router = useRouter();

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: integrate API when available
    router.push('/consultas/atendimento');
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
