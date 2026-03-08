import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { socket } from '../services/socket';
import { 
  FaMicrophone, FaMicrophoneSlash, 
  FaVideo, FaVideoSlash, 
  FaTimes, FaUserShield, FaVolumeMute 
} from 'react-icons/fa';

// Single Video Component
const Video = ({ peer }) => {
  const ref = useRef();
  
  useEffect(() => {
    peer.on('stream', stream => {
      if (ref.current) ref.current.srcObject = stream;
    });
  }, [peer]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video border border-gray-800 shadow-sm">
      <video playsInline autoPlay ref={ref} className="w-full h-full object-cover" />
    </div>
  );
};

const VideoGrid = ({ roomId, user, isAdmin }) => {
  const [peers, setPeers] = useState([]);
  const [myStream, setMyStream] = useState(null);
  
  // Self Control States
  const [isMyMicOn, setIsMyMicOn] = useState(true);
  const [isMyCamOn, setIsMyCamOn] = useState(true);

  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef(); // Ref to hold stream for cleanup

  useEffect(() => {
    // 1. Get Permissions & Stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      setMyStream(stream);
      streamRef.current = stream; // Store for cleanup
      if (userVideo.current) userVideo.current.srcObject = stream;

      // 2. Connect to users
      socket.on('all-users', (users) => {
        const p = [];
        users.forEach(userID => {
          const peer = createPeer(userID, socket.id, stream);
          peersRef.current.push({ peerID: userID, peer });
          p.push({ peerID: userID, peer });
        });
        setPeers(p);
      });

      // 3. Signal Handlers
      socket.on('peer-signal', payload => {
        const peer = addPeer(payload.signal, payload.callerID, stream);
        peersRef.current.push({ peerID: payload.callerID, peer });
        setPeers(users => [...users, { peerID: payload.callerID, peer }]);
      });

      socket.on('return-signal', payload => {
        const item = peersRef.current.find(p => p.peerID === payload.id);
        if(item && !item.peer.destroyed) {
            item.peer.signal(payload.signal);
        }
      });

      // 4. Handle Disconnects
      socket.on('user-disconnected', id => {
        const peerObj = peersRef.current.find(p => p.peerID === id);
        if(peerObj) peerObj.peer.destroy();
        const peers = peersRef.current.filter(p => p.peerID !== id);
        peersRef.current = peers;
        setPeers(peers);
      });

      // 5. Admin Commands
      socket.on('admin-command', ({ action }) => {
        if (action === 'mute-audio') {
            stream.getAudioTracks()[0].enabled = false;
            setIsMyMicOn(false);
            alert("The admin muted your microphone.");
        }
        if (action === 'stop-video') {
            stream.getVideoTracks()[0].enabled = false;
            setIsMyCamOn(false);
            alert("The admin turned off your camera.");
        }
        if (action === 'kick-user') {
            alert("You have been kicked from the room.");
            window.location.href = '/dashboard';
        }
      });
    });

    // ✅ CLEANUP FUNCTION
    return () => {
        // Stop my camera
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        // Destroy all peer connections
        peersRef.current.forEach(({ peer }) => {
            if (peer && !peer.destroyed) peer.destroy();
        });
        // Remove socket listeners to prevent duplicates
        socket.off('all-users');
        socket.off('peer-signal');
        socket.off('return-signal');
        socket.off('user-disconnected');
        socket.off('admin-command');
    };
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({ initiator: true, trickl: false, stream });
    peer.on('signal', signal => {
        if (!peer.destroyed) {
            socket.emit('signal-peer', { userToSignal, callerID, signal });
        }
    });
    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({ initiator: false, trickl: false, stream });
    peer.on('signal', signal => {
        if (!peer.destroyed) {
            socket.emit('return-signal', { signal, callerID });
        }
    });
    peer.signal(incomingSignal);
    return peer;
  }

  // --- SELF CONTROLS ---
  const toggleMic = () => {
    if (!myStream) return;
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMyMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    if (!myStream) return;
    const videoTrack = myStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsMyCamOn(videoTrack.enabled);
    }
  };

  // --- ADMIN ACTIONS ---
  const handleAdminAction = (targetId, action) => {
    if (!isAdmin) return;
    socket.emit('admin-action', { action, targetSocketId: targetId, roomId });
  };

  return (
    <div className="flex flex-col h-full bg-[#111] border-l border-gray-800 p-2 overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Camera Feed ({peers.length + 1})</h3>
        {isAdmin && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><FaUserShield/> ADMIN</span>}
      </div>
      
      {/* --- MY VIDEO --- */}
      <div className="relative mb-4 bg-gray-800 rounded-lg overflow-hidden border-2 border-netflixRed shadow-lg group">
        <video muted ref={userVideo} autoPlay playsInline className={`w-full h-full object-cover aspect-video transform scale-x-[-1] ${!isMyCamOn ? 'opacity-0' : 'opacity-100'}`} />
        
        {!isMyCamOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500">
                <div className="flex flex-col items-center">
                    <FaVideoSlash size={24} />
                    <span className="text-xs mt-2">Camera Off</span>
                </div>
            </div>
        )}

        <span className="absolute top-2 left-2 text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded font-bold">You</span>

        <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm p-2 flex justify-center gap-4 transition-transform translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
            <button onClick={toggleMic} className={`p-2 rounded-full transition ${isMyMicOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 text-white'}`}>
                {isMyMicOn ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
            </button>
            <button onClick={toggleCam} className={`p-2 rounded-full transition ${isMyCamOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 text-white'}`}>
                {isMyCamOn ? <FaVideo size={14} /> : <FaVideoSlash size={14} />}
            </button>
        </div>
      </div>

      {/* --- PEER VIDEOS --- */}
      <div className="space-y-3">
        {peers.map((p, index) => (
            <div key={index} className="relative group bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                <Video peer={p.peer} />
                
                {isAdmin && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-all duration-200 z-10">
                        <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Admin Controls</p>
                        <div className="flex gap-2">
                            <button onClick={() => handleAdminAction(p.peerID, 'mute-audio')} className="bg-gray-700 hover:bg-red-600 text-white p-2 rounded-full" title="Mute User">
                                <FaMicrophoneSlash size={14}/>
                            </button>
                            <button onClick={() => handleAdminAction(p.peerID, 'stop-video')} className="bg-gray-700 hover:bg-red-600 text-white p-2 rounded-full" title="Stop User Video">
                                <FaVideoSlash size={14}/>
                            </button>
                            <button onClick={() => handleAdminAction(p.peerID, 'kick-user')} className="bg-red-600 hover:bg-red-800 text-white p-2 rounded-full" title="Kick User">
                                <FaTimes size={14}/>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;