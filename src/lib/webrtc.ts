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
  console.log('[WebRTC] Creating session for role:', args.role);
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

  const pendingIceCandidates: RTCIceCandidateInit[] = [];

  const waitForOpen = () =>
    new Promise<void>((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const onOpen = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Signal socket error')); };
      const onClose = () => { cleanup(); reject(new Error('Signal socket closed before open')); };
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
      console.log('[WebRTC] sending local ice-candidate');
      const candidate = e.candidate.toJSON();
      const msg: SignalMessage = { type: 'ice-candidate', candidate };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }
  };

  pc.ontrack = (e) => {
    console.log('[WebRTC] ontrack event received', e.streams.length);
    const stream = e.streams[0];
    if (onRemote && stream) {
      onRemote(stream);
    } else {
      console.warn('[WebRTC] ontrack received but onRemote listener is missing or stream empty');
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[WebRTC] Connection state changed:', pc.connectionState);
    if (onConnState) onConnState(pc.connectionState);
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE state changed:', pc.iceConnectionState);
    if (onIceState) onIceState(pc.iceConnectionState);
  };

  ws.onopen = () => {
    console.log('[WebRTC] Signal socket opened');
    const joinMsg: SignalMessage = { type: 'join', role: args.role };
    ws.send(JSON.stringify(joinMsg));
  };

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;
      console.log('[WebRTC] Incoming signal:', msg.type);

      if (msg.type === 'joined') {
        if (onSignalEv) onSignalEv('joined', msg);
      } else if (msg.type === 'ready') {
        if (onSignalEv) onSignalEv('ready', msg);
      } else if (msg.type === 'peer-joined') {
        if (onSignalEv) onSignalEv('peer-joined', msg);
      } else if (msg.type === 'peer-left') {
        if (onSignalEv) onSignalEv('peer-left', msg);
      } else if (msg.type === 'offer') {
        console.log('[WebRTC] Offer received, setting remote description');
        if (onSignalEv) onSignalEv('offerReceived', msg);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));

        // Process pending candidates
        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          if (cand) await pc.addIceCandidate(cand).catch(e => console.warn('[WebRTC] Error adding pending ICE', e));
        }

        console.log('[WebRTC] Creating and sending answer');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
        if (onSignalEv) onSignalEv('answerSent', { sdp: answer });
      } else if (msg.type === 'answer') {
        console.log('[WebRTC] Answer received, setting remote description');
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        if (onSignalEv) onSignalEv('answerReceived', msg);

        // Process pending candidates
        while (pendingIceCandidates.length > 0) {
          const cand = pendingIceCandidates.shift();
          if (cand) await pc.addIceCandidate(cand).catch(e => console.warn('[WebRTC] Error adding pending ICE', e));
        }
      } else if (msg.type === 'ice-candidate') {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(msg.candidate).catch(e => console.warn('[WebRTC] Error adding ICE', e));
        } else {
          console.log('[WebRTC] ICE candidate arrived before remote description, queuing');
          pendingIceCandidates.push(msg.candidate);
        }
      } else if (msg.type === 'media-state') {
        if (onRemoteMedia) onRemoteMedia({ video: msg.video, audio: msg.audio });
      } else if (msg.type === 'end') {
        console.log('[WebRTC] "end" signal received');
        if (onRemoteEndCb) onRemoteEndCb();
        pc.close();
        ws.close();
      }
    } catch (err) {
      console.error('[WebRTC] WS message handling error', err);
    }
  };

  const setLocalStream = (stream: MediaStream | null) => {
    console.log('[WebRTC] setLocalStream called', stream?.getTracks().length);
    localStream = stream;
    if (stream) {
      stream.getTracks().forEach((t) => {
        // Evita duplicar tracks se já existirem no PC
        const alreadyAdded = pc.getSenders().some(s => s.track === t);
        if (!alreadyAdded) {
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
    console.log('[WebRTC] createAndSendOffer called');
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pc.setLocalDescription(offer);
    const msg: SignalMessage = { type: 'offer', sdp: offer };
    await waitForOpen();
    ws.send(JSON.stringify(msg));
  };

  const createAndSendAnswer = async () => {
    console.log('[WebRTC] createAndSendAnswer called');
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

  const end = () => {
    console.log('[WebRTC] ending session');
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
    console.log('[WebRTC] creating data channel "chat"');
    try {
      chatChannel = pc.createDataChannel('chat', { negotiated: false });
      chatChannel.onmessage = (ev) => {
        if (onChatMsg) onChatMsg(String(ev.data ?? ''));
      };
      chatChannel.onopen = () => console.log('[WebRTC] Chat channel opened');
      chatChannel.onerror = (e) => console.error('[WebRTC] Chat channel error', e);
      return chatChannel;
    } catch (err) {
      console.error('[WebRTC] failed to create data channel', err);
      return null;
    }
  };

  pc.ondatachannel = (ev) => {
    console.log('[WebRTC] ondatachannel event received:', ev.channel.label);
    chatChannel = ev.channel;
    chatChannel.onmessage = (e) => {
      if (onChatMsg) onChatMsg(String(e.data ?? ''));
    };
    chatChannel.onopen = () => console.log('[WebRTC] Remote chat channel opened');
  };

  const onChatMessage = (cb: (text: string) => void) => { onChatMsg = cb; };
  const onConnectionStateChange = (cb: (state: RTCPeerConnectionState) => void) => { onConnState = cb; };
  const onIceConnectionStateChange = (cb: (state: RTCIceConnectionState) => void) => { onIceState = cb; };
  const onSignalEvent = (cb: (ev: SignalEvent, payload?: any) => void) => { onSignalEv = cb; };

  const sendMessage = (text: string) => {
    if (chatChannel && chatChannel.readyState === 'open') {
      chatChannel.send(text);
    } else {
      console.warn('[WebRTC] cannot send message, chat channel not open');
    }
  };

  return {
    pc, ws, localStream,
    startLocalMedia, setLocalStream, createAndSendOffer, createAndSendAnswer,
    end, sendMediaState, onRemoteTrack, onRemoteMediaState, onRemoteEnd,
    createChatChannel, onChatMessage, sendMessage,
    onConnectionStateChange, onIceConnectionStateChange, onSignalEvent,
  };
}
