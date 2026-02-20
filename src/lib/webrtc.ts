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
    if (onRemote && stream) {
      onRemote(stream);
    }
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

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;

      if (msg.type === 'joined') {
        emitSignal('joined', msg);
        if (msg.participants && msg.participants.length >= 2) {
          peerReady = true;
          emitSignal('ready');
        }
      } else if (msg.type === 'ready') {
        peerReady = true;
        emitSignal('ready', msg);
      } else if (msg.type === 'peer-joined') {
        peerReady = true;
        emitSignal('peer-joined', msg);
      } else if (msg.type === 'peer-left') {
        emitSignal('peer-left', msg);
      } else if (msg.type === 'doctor-disconnecting') {
        emitSignal('doctor-disconnecting', msg);
      } else if (msg.type === 'offer') {
        console.log('[WebRTC] Offer received');
        emitSignal('offerReceived', msg);

        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          if (cand) await pc.addIceCandidate(cand).catch(() => { });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        emitSignal('answerSent', { sdp: answer });
      } else if (msg.type === 'answer') {
        console.log('[WebRTC] Answer received');
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
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
