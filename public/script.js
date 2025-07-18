// public/script.js
const socket = io();
const roomId = 'demo-room';

const localVideo = document.getElementById('localVideo');
const remoteContainer = document.querySelector('.remote-container');
const participantsBtn = document.getElementById('showParticipants');
const participantsModal = document.getElementById('participantsModal');
const participantsList = document.getElementById('participantsList');

let localStream;
let peers = {};
let isMuted = false;
let isVideoOff = false;

// UI Buttons
const startCallBtn = document.getElementById("startCall");
const hangUpBtn = document.getElementById("hangUp");
const muteBtn = document.getElementById("muteBtn");
const videoBtn = document.getElementById("videoBtn");

participantsBtn.onclick = () => {
  participantsModal.style.display = participantsModal.style.display === 'block' ? 'none' : 'block';
};

startCallBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  socket.emit('join', roomId);
};

hangUpBtn.onclick = () => {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
  for (let peerId in peers) {
    peers[peerId].close();
    const videoEl = document.getElementById(peerId);
    if (videoEl) videoEl.remove();
  }
  peers = {};
  participantsList.innerHTML = '';
};

muteBtn.onclick = () => {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
};

videoBtn.onclick = () => {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  videoTrack.enabled = !videoTrack.enabled;
  isVideoOff = !isVideoOff;
  videoBtn.textContent = isVideoOff ? "Video On" : "Video Off";
};

function createPeerConnection(socketId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('ice-candidate', { target: socketId, candidate: e.candidate });
    }
  };

  pc.ontrack = e => {
    if (!document.getElementById(socketId)) {
      const video = document.createElement('video');
      video.id = socketId;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = e.streams[0];
      remoteContainer.appendChild(video);

      const li = document.createElement('li');
      li.textContent = socketId;
      participantsList.appendChild(li);
    }
  };

  return pc;
}

socket.on('user-joined', async socketId => {
  const pc = createPeerConnection(socketId);
  peers[socketId] = pc;
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('offer', { target: socketId, offer });
});

socket.on('offer', async ({ from, offer }) => {
  const pc = createPeerConnection(from);
  peers[from] = pc;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { target: from, answer });
});

socket.on('answer', async ({ from, answer }) => {
  await peers[from].setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async ({ from, candidate }) => {
  if (peers[from]) {
    await peers[from].addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socket.on('user-disconnected', socketId => {
  if (peers[socketId]) {
    peers[socketId].close();
    delete peers[socketId];
    const video = document.getElementById(socketId);
    if (video) video.remove();

    const items = participantsList.querySelectorAll('li');
    items.forEach(item => {
      if (item.textContent === socketId) item.remove();
    });
  }
});
