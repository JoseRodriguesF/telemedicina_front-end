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
  | { type: 'end' };

export type WebRTCSessionArgs = {
  roomId: string;
  token: string;
  role: 'medico' | 'paciente';
  wsBaseUrl: string; // e.g. wss://.../signal
  iceServers: RTCIceServer[];
};

export type SignalEvent = 'joined' | 'offerReceived' | 'answerSent' | 'answerReceived' | 'ready' | 'peer-joined' | 'peer-left';

export type WebRTCSession = {
  pc: RTCPeerConnection;
  ws: WebSocket;
  localStream: MediaStream | null;
  startLocalMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  setLocalStream: (stream: MediaStream | null) => void;
  createAndSendOffer: () => Promise<void>;
  createAndSendAnswer: () => Promise<void>;
  end: () => void;
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
    if (onSignalEv) {
      onSignalEv(ev, payload);
    } else {
      signalQueue.push({ ev, payload });
    }
  };

  const pendingIceCandidates: RTCIceCandidateInit[] = [];
  let isMakingOffer = false;

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
      }
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0];
    if (onRemote && stream) {
      onRemote(stream);
    }
  };

  pc.onconnectionstatechange = () => {
    if (onConnState) onConnState(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    if (onIceState) onIceState(pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      console.warn('[WebRTC] ICE failed, attempting restart');
      restartIce();
    }
  };

  pc.onnegotiationneeded = async () => {
    // Both roles can initiate negotiation if tracks change after initial connection.
    // However, we usually prefer medico to start.
    // If stable and tracks changed, or if medico and initial, we offer.
    if (args.role === 'medico' || (pc.remoteDescription && pc.signalingState === 'stable')) {
      try {
        isMakingOffer = true;
        await createAndSendOffer();
      } catch (err) {
        console.error('[WebRTC] Error during negotiation offer', err);
      } finally {
        isMakingOffer = false;
      }
    }
  };

  ws.onopen = () => {
    const joinMsg: SignalMessage = { type: 'join', role: args.role };
    ws.send(JSON.stringify(joinMsg));
  };

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;

      if (msg.type === 'joined') {
        emitSignal('joined', msg);
      } else if (msg.type === 'ready') {
        emitSignal('ready', msg);
      } else if (msg.type === 'peer-joined') {
        emitSignal('peer-joined', msg);
      } else if (msg.type === 'peer-left') {
        emitSignal('peer-left', msg);
      } else if (msg.type === 'offer') {
        emitSignal('offerReceived', msg);
        // Collision prevention (ignore if we are making offer and have higher precedence, 
        // though here medico is usually the only offerer)
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
      stream.getTracks().forEach((t) => {
        const sender = pc.getSenders().find(s => s.track === t);
        if (!sender) {
          pc.addTrack(t, stream);
        } else if (sender.track !== t) {
          sender.replaceTrack(t);
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
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const msg: SignalMessage = { type: 'offer', sdp: offer };
    await waitForOpen();
    ws.send(JSON.stringify(msg));
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

  return {
    pc, ws, localStream,
    startLocalMedia, setLocalStream, createAndSendOffer, createAndSendAnswer,
    end, restartIce, sendMediaState, onRemoteTrack, onRemoteMediaState, onRemoteEnd,
    createChatChannel, onChatMessage, sendMessage,
    onConnectionStateChange, onIceConnectionStateChange, onSignalEvent,
  };
}
