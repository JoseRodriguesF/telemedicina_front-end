export type SignalMessage =
  | { type: 'join'; role: 'medico' | 'paciente' }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }
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
};

export function createWebRTCSession(args: WebRTCSessionArgs): WebRTCSession {
  const pc = new RTCPeerConnection({ iceServers: args.iceServers });
  const ws = new WebSocket(`${args.wsBaseUrl}?roomId=${encodeURIComponent(args.roomId)}&token=${encodeURIComponent(args.token)}`);
  let localStream: MediaStream | null = null;
  let onRemote: ((stream: MediaStream) => void) | null = null;

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      const msg: SignalMessage = { type: 'candidate', candidate: e.candidate.toJSON() };
      ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(msg));
    }
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0];
    if (onRemote) onRemote(stream);
  };

  ws.onopen = () => {
    const joinMsg: SignalMessage = { type: 'join', role: args.role };
    ws.send(JSON.stringify(joinMsg));
  };

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data) as SignalMessage;
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
      } else if (msg.type === 'answer') {
        await pc.setRemoteDescription(msg.sdp);
      } else if (msg.type === 'candidate') {
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
    ws.send(JSON.stringify(msg));
  };

  const createAndSendAnswer = async () => {
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const msg: SignalMessage = { type: 'answer', sdp: answer };
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

  return { pc, ws, localStream, startLocalMedia, createAndSendOffer, createAndSendAnswer, end, onRemoteTrack };
}
