export type SignalMessage =
  | { type: 'join'; role: 'medico' | 'paciente' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit }
  | { type: 'end' };

export type WebRTCSessionArgs = {
  roomId: string;
  token: string;
  role: 'medico' | 'paciente';
  wsBaseUrl: string; // e.g. wss://.../signal
  iceServers: RTCIceServer[];
};

export type WebRTCSession = {
  pc: RTCPeerConnection;
  ws: WebSocket;
  localStream: MediaStream | null;
  startLocalMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  createAndSendOffer: () => Promise<void>;
  createAndSendAnswer: () => Promise<void>;
  end: () => void;
  onRemoteTrack: (cb: (stream: MediaStream) => void) => void;
  createChatChannel: () => RTCDataChannel | null;
  onChatMessage: (cb: (text: string) => void) => void;
  onConnectionStateChange: (cb: (state: RTCPeerConnectionState) => void) => void;
  onIceConnectionStateChange: (cb: (state: RTCIceConnectionState) => void) => void;
  onSignalEvent: (cb: (ev: 'joined' | 'offerReceived' | 'answerSent' | 'answerReceived') => void) => void;
};

export function createWebRTCSession(args: WebRTCSessionArgs): WebRTCSession {
  const pc = new RTCPeerConnection({ iceServers: args.iceServers });
  const ws = new WebSocket(`${args.wsBaseUrl}?roomId=${encodeURIComponent(args.roomId)}&token=${encodeURIComponent(args.token)}`);
  let localStream: MediaStream | null = null;
  let onRemote: ((stream: MediaStream) => void) | null = null;
  let chatChannel: RTCDataChannel | null = null;
  let onChatMsg: ((text: string) => void) | null = null;
  let onConnState: ((state: RTCPeerConnectionState) => void) | null = null;
  let onIceState: ((state: RTCIceConnectionState) => void) | null = null;
  let onSignalEv: ((ev: 'joined' | 'offerReceived' | 'answerSent' | 'answerReceived') => void) | null = null;

  const waitForOpen = () =>
    new Promise<void>((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Signal socket error'));
      };
      const onClose = () => {
        cleanup();
        reject(new Error('Signal socket closed before open'));
      };
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
      const candidate = e.candidate.toJSON();
      // Prefer 'ice-candidate' but also support 'candidate'
      const msg: SignalMessage = { type: 'ice-candidate', candidate };
      ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0];
    if (onRemote) onRemote(stream);
  };

  pc.onconnectionstatechange = () => {
    if (onConnState) onConnState(pc.connectionState);
  };

  // Note: oniceconnectionstatechange also fires during negotiation
  pc.oniceconnectionstatechange = () => {
    if (onIceState) onIceState(pc.iceConnectionState);
  };

  ws.onopen = () => {
    const joinMsg: SignalMessage = { type: 'join', role: args.role };
    ws.send(JSON.stringify(joinMsg));
    if (onSignalEv) onSignalEv('joined');
  };

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;
      if (msg.type === 'offer') {
        if (onSignalEv) onSignalEv('offerReceived');
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        if (onSignalEv) onSignalEv('answerSent');
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(msg.sdp);
        if (onSignalEv) onSignalEv('answerReceived');
      } else if (msg.type === 'candidate' || msg.type === 'ice-candidate') {
        await pc.addIceCandidate(msg.candidate);
      } else if (msg.type === 'end') {
        pc.close();
        ws.close();
      }
    } catch (err) {
      console.error('WS message handling error', err);
    }
  };

  const startLocalMedia = async (constraints: MediaStreamConstraints = { video: true, audio: true }) => {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localStream.getTracks().forEach((t) => pc.addTrack(t, localStream!));
    return localStream;
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

  const end = () => {
    try {
      ws.send(JSON.stringify({ type: 'end' }));
    } catch {}
    pc.close();
    ws.close();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
  };

  const onRemoteTrack = (cb: (stream: MediaStream) => void) => {
    onRemote = cb;
  };

  // Chat via DataChannel
  const createChatChannel = () => {
    if (chatChannel) return chatChannel;
    try {
      chatChannel = pc.createDataChannel('chat');
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

  const onChatMessage = (cb: (text: string) => void) => {
    onChatMsg = cb;
  };

  const onConnectionStateChange = (cb: (state: RTCPeerConnectionState) => void) => {
    onConnState = cb;
  };

  const onIceConnectionStateChange = (cb: (state: RTCIceConnectionState) => void) => {
    onIceState = cb;
  };

  const onSignalEvent = (cb: (ev: 'joined' | 'offerReceived' | 'answerSent' | 'answerReceived') => void) => {
    onSignalEv = cb;
  };

  return {
    pc,
    ws,
    localStream,
    startLocalMedia,
    createAndSendOffer,
    createAndSendAnswer,
    end,
    onRemoteTrack,
    createChatChannel,
    onChatMessage,
    onConnectionStateChange,
    onIceConnectionStateChange,
    onSignalEvent,
  };
}
