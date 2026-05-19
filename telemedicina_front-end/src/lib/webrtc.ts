export type SignalMessage =
  | { type: 'join'; role: 'medico' | 'paciente' }
  | { type: 'joined'; roomId: string; participants: Array<{ userId: string | number; role: string }> }
  | { type: 'ready' }
  | { type: 'peer-joined'; userId: string | number; role: string }
  | { type: 'peer-left'; userId: string | number; role: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate', candidate: RTCIceCandidateInit }
  | { type: 'media-state'; video: boolean; audio: boolean }
  | { type: 'doctor-disconnecting' }
  | { type: 'end' };

export type WebRTCSessionArgs = {
  roomId: string;
  token: string;
  role: 'medico' | 'paciente';
  wsBaseUrl: string; // e.g. wss://.../signal
  iceServers: RTCIceServer[];
};

export type SignalEvent = 'joined' | 'offerReceived' | 'answerSent' | 'answerReceived' | 'ready' | 'peer-joined' | 'peer-left' | 'doctor-disconnecting';

export type WebRTCSession = {
  pc: RTCPeerConnection;
  ws: WebSocket;
  localStream: MediaStream | null;
  startLocalMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  setLocalStream: (stream: MediaStream | null) => void;
  createAndSendOffer: () => Promise<void>;
  createAndSendAnswer: () => Promise<void>;
  end: () => void;
  sendDoctorDisconnecting: () => void;
  restartIce: () => void;
  sendMediaState: (video: boolean, audio: boolean) => void;
  onRemoteTrack: (cb: (stream: MediaStream) => void) => void;
  onRemoteMediaState: (cb: (state: { video: boolean; audio: boolean }) => void) => void;
  onRemoteEnd: (cb: () => void) => void;
  createChatChannel: () => RTCDataChannel | null;
  onChatMessage: (cb: (text: string) => void) => void;
  onConnectionStateChange: (cb: (state: RTCPeerConnectionState) => void) => void;
  onIceConnectionStateChange: (cb: (state: RTCIceConnectionState) => void) => void;
  onSignalEvent: (cb: (ev: SignalEvent, payload?: any) => void) => void;
  sendMessage: (text: string) => void;
  setPeerReady: () => void;
};

/**
 * Inicializa a sessão WebRTC e os listeners do WebSocket (Sinalização).
 * Quando é utilizada: Quando o paciente ou médico entram na tela de "Atendimento", após a liberação da câmera e microfone.
 * Para que é utilizada: Cria a interface RTCPeerConnection, conecta ao WebSocket de sinalização, lida com eventos P2P e expõe métodos (startLocalMedia, end, sendMessage) para o componente React consumir de forma abstrata.
 */
export function createWebRTCSession(args: WebRTCSessionArgs): WebRTCSession {
  const pc = new RTCPeerConnection({
    iceServers: args.iceServers,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  });

  const ws = new WebSocket(`${args.wsBaseUrl}?roomId=${encodeURIComponent(args.roomId)}&token=${encodeURIComponent(args.token)}`);

  let localStream: MediaStream | null = null;
  let onRemote: ((stream: MediaStream) => void) | null = null;
  /** Stream usado para tracks remotas que chegam sem stream (ex.: oferta do médico com transceivers) */
  let fallbackRemoteStream: MediaStream | null = null;
  let onRemoteMedia: ((state: { video: boolean; audio: boolean }) => void) | null = null;
  let onRemoteEndCb: (() => void) | null = null;
  let chatChannel: RTCDataChannel | null = null;
  let onChatMsg: ((text: string) => void) | null = null;
  let onConnState: ((state: RTCPeerConnectionState) => void) | null = null;
  let onIceState: ((state: RTCIceConnectionState) => void) | null = null;

  let onSignalEv: ((ev: SignalEvent, payload?: any) => void) | null = null;
  const signalQueue: Array<{ ev: SignalEvent, payload?: any }> = [];

  const emitSignal = (ev: SignalEvent, payload?: any) => {
    console.log(`[WebRTC] Emit Signal: ${ev}`, payload);
    if (onSignalEv) {
      onSignalEv(ev, payload);
    } else {
      signalQueue.push({ ev, payload });
    }
  };

  const pendingIceCandidates: RTCIceCandidateInit[] = [];
  const outgoingIceQueue: SignalMessage[] = [];
  let isMakingOffer = false;
  let isNegotiating = false;
  let peerReady = false;

  const waitForOpen = () =>
    new Promise<void>((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        reject(new Error('WebSocket is closed'));
        return;
      }
      const onOpen = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Signal socket error')); };
      const onClose = () => { cleanup(); reject(new Error('Signal socket closed')); };
      const cleanup = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        ws.removeEventListener('close', onClose);
      };
      ws.addEventListener('open', onOpen, { once: true });
      ws.addEventListener('error', onError, { once: true });
      ws.addEventListener('close', onClose, { once: true });
    });

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      const msg: SignalMessage = { type: 'ice-candidate', candidate: e.candidate.toJSON() };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        outgoingIceQueue.push(msg);
      }
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0];
    console.log('[WebRTC] Remote track received:', e.track.kind, 'Stream ID:', stream?.id);
    if (!onRemote) return;
    if (stream) {
      onRemote(stream);
      return;
    }
    // Tracks podem vir sem stream quando o par usa replaceTrack em transceivers (ex.: médico)
    if (!fallbackRemoteStream) {
      fallbackRemoteStream = new MediaStream();
    }
    fallbackRemoteStream.addTrack(e.track);
    onRemote(fallbackRemoteStream);
  };

  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state:', pc.connectionState);
    if (onConnState) onConnState(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE state:', pc.iceConnectionState);
    if (onIceState) onIceState(pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.warn('[WebRTC] ICE failed, attempting restart');
      restartIce();
    }
  };

  pc.onnegotiationneeded = async () => {
    if (isNegotiating) return;

    // GATE: Only negotiate after the peer has joined the room
    if (!peerReady) {
      console.log('[WebRTC] Negotiation needed but peer not ready yet. Deferring...');
      return;
    }

    try {
      isNegotiating = true;
      console.log('[WebRTC] Negotiation needed. State:', pc.signalingState);
      if (args.role === 'medico' || (pc.remoteDescription && pc.signalingState === 'stable')) {
        await createAndSendOffer();
      }
    } catch (err) {
      console.error('[WebRTC] Error during negotiation offer', err);
    } finally {
      isNegotiating = false;
    }
  };

  // Pre-adicionar transceivers se for médico para garantir que a oferta inclua áudio/vídeo
  if (args.role === 'medico') {
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
  }

  ws.onopen = () => {
    console.log('[WebRTC] Signaling socket opened. Joining room:', args.roomId);
    const joinMsg: SignalMessage = { type: 'join', role: args.role };
    ws.send(JSON.stringify(joinMsg));

    while (outgoingIceQueue.length > 0) {
      const msg = outgoingIceQueue.shift();
      if (msg) ws.send(JSON.stringify(msg));
    }
  };

  /**
   * Listener principal do WebSocket de sinalização.
   * Quando é utilizada: A todo momento durante a vida útil da sala.
   * Para que é utilizada: Recebe pacotes de estado ('joined', 'ready') e pacotes de negociação P2P ('offer', 'answer', 'ice-candidate') enviados pelo outro participante.
   */
  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;

      if (msg.type === 'joined') {
        emitSignal('joined', msg);
        if (msg.participants && msg.participants.length >= 2) {
          peerReady = true;
          emitSignal('ready');
          // Médico: quando já há 2 na sala, inicia oferta. Paciente: marca peerReady para futura renegociação.
          if (args.role === 'medico') {
            setTimeout(() => createAndSendOffer().catch(() => { }), 150);
          }
        }
      } else if (msg.type === 'ready') {
        peerReady = true;
        emitSignal('ready', msg);
        // Crítico: quando o par entra, o médico deve iniciar a negociação imediatamente.
        // onnegotiationneeded pode ter sido ignorado antes (peer não estava pronto).
        if (args.role === 'medico') {
          setTimeout(() => createAndSendOffer().catch(() => { }), 100);
        }
      } else if (msg.type === 'peer-joined') {
        peerReady = true;
        emitSignal('peer-joined', msg);
        if (args.role === 'medico') {
          setTimeout(() => createAndSendOffer().catch(() => { }), 100);
        }
      } else if (msg.type === 'peer-left') {
        emitSignal('peer-left', msg);
      } else if (msg.type === 'doctor-disconnecting') {
        emitSignal('doctor-disconnecting', msg);
      } else if (msg.type === 'offer') {
        console.log('[WebRTC] Offer received');
        emitSignal('offerReceived', msg);
        peerReady = true;

        const sdp = msg.sdp;
        if (!sdp || typeof sdp !== 'object') {
          console.error('[WebRTC] Invalid offer SDP');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          if (cand) await pc.addIceCandidate(cand).catch(() => { });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const answerMsg = { type: 'answer' as const, sdp: answer };
        ws.send(JSON.stringify(answerMsg));
        emitSignal('answerSent', { sdp: answer });
      } else if (msg.type === 'answer') {
        console.log('[WebRTC] Answer received');
        const sdp = msg.sdp;
        if (!sdp || typeof sdp !== 'object') {
          console.error('[WebRTC] Invalid answer SDP');
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        emitSignal('answerReceived', msg);

        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          if (cand) await pc.addIceCandidate(cand).catch(() => { });
        }
      } else if (msg.type === 'ice-candidate') {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(msg.candidate).catch(() => { });
        } else {
          pendingIceCandidates.push(msg.candidate);
        }
      } else if (msg.type === 'media-state') {
        if (onRemoteMedia) onRemoteMedia({ video: msg.video, audio: msg.audio });
      } else if (msg.type === 'end') {
        if (onRemoteEndCb) onRemoteEndCb();
        pc.close();
        ws.close();
      }
    } catch (err) {
      console.error('[WebRTC] Signal handling error', err);
    }
  };

  /**
   * Associa os tracks de mídia local (vídeo/áudio) à conexão Peer-to-Peer.
   * Quando é utilizada: Ao capturar a câmera do usuário (startLocalMedia) ou quando as constraints mudam (ativar/desativar câmera).
   * Para que é utilizada: Extrai as faixas de mídia do dispositivo do usuário e as injeta nos Transceivers do WebRTC. Se houver mudanças, engatilha uma nova negociação SDP.
   */
  const setLocalStream = (stream: MediaStream | null) => {
    localStream = stream;
    if (stream) {
      console.log('[WebRTC] Setting local stream, tracks:', stream.getTracks().length);
      stream.getTracks().forEach((t) => {
        const senders = pc.getSenders();
        // Tenta encontrar um sender que já tenha essa track
        const existingSender = senders.find(s => s.track === t);

        if (existingSender) {
          console.log(`[WebRTC] Track ${t.kind} already has a sender.`);
          return;
        }

        // Tenta encontrar um transceiver vago do MESMO TIPO (audio ou video)
        // Isso resolve o erro "Track kind does not match Sender kind"
        const transceivers = pc.getTransceivers();
        const emptyTransceiver = transceivers.find(tr =>
          !tr.sender.track &&
          tr.receiver.track.kind === t.kind
        );

        if (emptyTransceiver) {
          console.log(`[WebRTC] Using empty ${t.kind} transceiver for track.`);
          emptyTransceiver.sender.replaceTrack(t);
          // Garantir que a direção permita o envio. Se era 'recvonly' ou 'inactive', mudar para 'sendrecv'
          // disparará onnegotiationneeded se o estado for estável.
          if (emptyTransceiver.direction !== 'sendrecv') {
            console.log(`[WebRTC] Changing ${t.kind} transceiver direction to sendrecv`);
            emptyTransceiver.direction = 'sendrecv';
          }
        } else {
          console.log(`[WebRTC] Adding new track ${t.kind} to peer connection.`);
          pc.addTrack(t, stream);
        }
      });
    }
  };

  const startLocalMedia = async (constraints: MediaStreamConstraints = { video: true, audio: true }) => {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    return stream;
  };

  /**
   * Cria uma Oferta SDP e a envia via WebSocket.
   * Quando é utilizada: Geralmente iniciada pelo 'medico' assim que ambos conectam na sala (evento 'ready'), ou ao reiniciar o ICE.
   * Para que é utilizada: Descreve os codecs (H264, VP8) e recursos (áudio/vídeo) do remetente, propondo a conexão ao outro peer, que deverá responder com um Answer.
   */
  const createAndSendOffer = async () => {
    if (isMakingOffer) return;
    // Permitimos que o médico envie oferta mesmo se não estiver perfeitamente estável (retry)
    if (pc.signalingState !== 'stable' && args.role !== 'medico') return;

    try {
      isMakingOffer = true;
      console.log('[WebRTC] Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const msg: SignalMessage = { type: 'offer', sdp: offer };
      await waitForOpen();
      ws.send(JSON.stringify(msg));
    } catch (err) {
      console.error('[WebRTC] Failed to create or send offer:', err);
      throw err;
    } finally {
      isMakingOffer = false;
    }
  };

  /**
   * Responde a uma Oferta SDP recebida.
   * Quando é utilizada: Automaticamente chamada pelo cliente que recebe um evento WebSocket do tipo 'offer' (normalmente o paciente).
   * Para que é utilizada: Gera a resposta SDP aceitando as rotas viáveis, completando o handshake do WebRTC.
   */
  const createAndSendAnswer = async () => {
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const msg: SignalMessage = { type: 'answer', sdp: answer };
    await waitForOpen();
    ws.send(JSON.stringify(msg));
  };

  const sendMediaState = (video: boolean, audio: boolean) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'media-state', video, audio }));
    }
  };

  /**
   * Reinicia o processo ICE (Interactivity Connectivity Establishment).
   * Quando é utilizada: Em cenários onde a conexão falha silenciosamente (estado 'failed') ou há perda severa de rota P2P.
   * Para que é utilizada: Força a criação de uma nova Oferta forçando a busca de novos candidatos de rede, tentando restaurar a chamada de vídeo sem recarregar a página.
   */
  const restartIce = () => {
    if (args.role === 'medico') {
      pc.createOffer({ iceRestart: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription }));
          }
        })
        .catch(e => console.error('[WebRTC] ICE Restart failed', e));
    }
  };

  const end = () => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'end' }));
      }
    } catch { }
    fallbackRemoteStream = null;
    pc.close();
    ws.close();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
  };

  const sendDoctorDisconnecting = () => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'doctor-disconnecting' }));
      }
    } catch (err) {
      console.error('[WebRTC] Erro ao enviar doctor-disconnecting:', err);
    }
  };

  const onRemoteTrack = (cb: (stream: MediaStream) => void) => { onRemote = cb; };
  const onRemoteMediaState = (cb: (state: { video: boolean; audio: boolean }) => void) => { onRemoteMedia = cb; };
  const onRemoteEnd = (cb: () => void) => { onRemoteEndCb = cb; };

  const createChatChannel = () => {
    if (chatChannel) return chatChannel;
    try {
      chatChannel = pc.createDataChannel('chat', { negotiated: false });
      chatChannel.onmessage = (ev) => {
        if (onChatMsg) onChatMsg(String(ev.data ?? ''));
      };
      return chatChannel;
    } catch {
      return null;
    }
  };

  pc.ondatachannel = (ev) => {
    chatChannel = ev.channel;
    chatChannel.onmessage = (e) => {
      if (onChatMsg) onChatMsg(String(e.data ?? ''));
    };
  };

  const onChatMessage = (cb: (text: string) => void) => { onChatMsg = cb; };
  const onConnectionStateChange = (cb: (state: RTCPeerConnectionState) => void) => { onConnState = cb; };
  const onIceConnectionStateChange = (cb: (state: RTCIceConnectionState) => void) => { onIceState = cb; };

  const onSignalEvent = (cb: (ev: SignalEvent, payload?: any) => void) => {
    onSignalEv = cb;
    while (signalQueue.length > 0) {
      const item = signalQueue.shift();
      if (item) cb(item.ev, item.payload);
    }
  };

  const sendMessage = (text: string) => {
    if (chatChannel && chatChannel.readyState === 'open') {
      chatChannel.send(text);
    }
  };

  const setPeerReady = () => {
    console.log('[WebRTC] Manually setting peerReady = true');
    peerReady = true;
  };

  return {
    pc, ws, localStream,
    startLocalMedia, setLocalStream, createAndSendOffer, createAndSendAnswer,
    end, sendDoctorDisconnecting, restartIce, sendMediaState, onRemoteTrack, onRemoteMediaState, onRemoteEnd,
    createChatChannel, onChatMessage, sendMessage, setPeerReady,
    onConnectionStateChange, onIceConnectionStateChange, onSignalEvent,
  };
}
