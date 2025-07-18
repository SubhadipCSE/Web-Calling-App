const socket = io();
const roomId = 'demo-room';
socket.emit('join', roomId);

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    localStream = stream;
  });

socket.on('user-connected', async () => {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('ice-candidate', e.candidate);
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
});

socket.on('offer', async (offer) => {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('ice-candidate', e.candidate);
    }
  };

  peerConnection.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error('Error adding received ICE candidate', e);
  }
});
