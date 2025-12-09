"use client";

import '../../inicio/inicio.css';
import '@/components/layout/Header/header.css';
import Button from '@/components/common/Buttons/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState } from 'react';
import { getUser, getToken } from '@/lib/auth';
import { createWebRTCSession } from '@/lib/webrtc';
import { endConsulta, getRoom, joinRoom, listParticipants } from '@/lib/axios/consultas';

type ChatMessage = { author: 'Você' | 'Médico'; text: string };

  function AtendimentoInner() {
  const router = useRouter();
  const search = useSearchParams();
  const consultaId = search.get('id') || '';
  const token = getToken();
  const user = getUser();
  const role = (user?.tipo_usuario === 'medico' ? 'medico' : 'paciente') as 'medico' | 'paciente';
  // Deriva a URL de sinalização a partir da URL da API, trocando protocolo para ws/wss e usando caminho /signal
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const wsBaseUrl = (() => {
    if (!apiUrl) return '';
    try {
      const u = new URL(apiUrl);
      const isHttps = u.protocol === 'https:';
      u.protocol = isHttps ? 'wss:' : 'ws:';
      // caminho base: manter host e possivel basePath, anexar /signal
      // se API tiver caminho (ex: https://dominio.com/api), mantemos origem e usamos /signal na raiz do serviço
      return `${u.origin}/signal`;
    } catch {
      return '';
    }
  })();

  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<ReturnType<typeof createWebRTCSession> | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { author: 'Você', text: 'Olá' },
    { author: 'Médico', text: 'Olá, como se sente?' },
  ]);
  const [draft, setDraft] = useState('');

  // Paciente deve iniciar automaticamente ao entrar na tela
  if (role === 'paciente' && consultaId && token && wsBaseUrl && !connecting && !roomId) {
    // Defer to next tick to avoid rendering loop
    setTimeout(() => { startCall().catch(() => {}); }, 0);
  }

  function sendMessage() {
    const t = draft.trim();
    if (!t) return;
    setMessages([...messages, { author: 'Você', text: t }]);
    setDraft('');
  }

  async function startCall() {
    if (!consultaId) {
      alert('Consulta não identificada. Retorne e selecione novamente.');
      return;
    }
    if (!token) {
      alert('Token não encontrado. Faça login novamente.');
      return;
    }
    if (!wsBaseUrl) {
      alert('URL de sinalização indisponível. Verifique NEXT_PUBLIC_API_URL.');
      return;
    }
    try {
      setConnecting(true);
      const { roomId, iceServers } = await getRoom(consultaId, token);
      setRoomId(roomId);
      const session = createWebRTCSession({ roomId, token, role, wsBaseUrl, iceServers });
      sessionRef.current = session;
      session.onRemoteTrack((stream) => {
        if (remoteRef.current) {
          remoteRef.current.srcObject = stream;
        }
      });
      const local = await session.startLocalMedia();
      if (localRef.current) {
        localRef.current.srcObject = local;
        localRef.current.muted = true;
        localRef.current.play().catch(() => {});
      }
      await joinRoom(consultaId, { userId: user?.id || 0, role }, token);
      // Regra: o segundo participante cria a offer.
      // Se o médico entrou após o paciente, ele cria a offer.
      // Se o paciente entrou depois do médico, o paciente cria a offer.
      try {
        const { participants } = await listParticipants(consultaId, token);
        if (participants.length >= 2) {
          await session.createAndSendOffer();
        }
      } catch {}
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.error || 'Falha ao iniciar chamada');
    } finally {
      setConnecting(false);
    }
  }

  async function finishCall() {
    try {
      sessionRef.current?.end();
      if (consultaId && token) await endConsulta(consultaId, token);
    } finally {
      router.push('/consultas');
    }
  }

  return (
    <div className="atendimento-page">
      <main className="atendimento-main">
        <section className="call-area">
          <div className="call-header">Você está em uma consulta</div>
          <div className="call-screen">
            <video ref={remoteRef} className="remote-video" playsInline autoPlay aria-label="Vídeo remoto" />
            <video ref={localRef} className="self-video" playsInline autoPlay aria-label="Sua câmera" />
          </div>
          <div className="call-controls">
            <button className="control-btn" aria-label="Abrir chat">💬</button>
            <button className="control-btn" aria-label="Iniciar chamada" onClick={startCall} disabled={connecting}>{connecting ? 'Conectando...' : 'Iniciar'}</button>
            <button className="control-btn end" aria-label="Encerrar chamada" onClick={finishCall}>📞</button>
          </div>
        </section>

        <aside className="chat-panel" aria-label="Chat da consulta">
          <div className="chat-header">Chat da consulta</div>
          <div className="chat-body">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-msg ${m.author === 'Você' ? 'me' : 'doctor'}`}>
                <div className="chat-author">{m.author}</div>
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              className="c-input"
              placeholder="Digite..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            />
            <Button variant="primary" onClick={sendMessage} aria-label="Enviar">➤</Button>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function AtendimentoPage() {
  return (
    <Suspense fallback={<div className="atendimento-loading">Carregando atendimento...</div>}>
      <AtendimentoInner />
    </Suspense>
  );
}
