import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { socket } from '../services/socket';
import { FaVolumeUp, FaVolumeMute, FaVolumeDown, FaClosedCaptioning, FaMusic, FaSyncAlt } from 'react-icons/fa';

const VideoPlayer = ({ mediaType, src, roomId, hasRemote }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Track States
  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const [currentSubtitle, setCurrentSubtitle] = useState(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

  // Refresh Mechanism
  const [refreshKey, setRefreshKey] = useState(0);

  // --- Player Logic (Supports both HLS m3u8 and Native MP4) ---
  useEffect(() => {
    // 🛡️ CRITICAL FIX: Stops the crash by waiting for a valid URL
    if (mediaType !== 'tv' || !src) return;

    let hls;
    const video = videoRef.current;

    if (!video) return;

    if (src.includes('.m3u8')) {
      if (Hls.isSupported()) {
        hls = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true
        });
        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (hasRemote) video.play().catch(e => console.log("Autoplay blocked", e));

          // Load tracks
          setAudioTracks(hls.audioTracks || []);
          setSubtitleTracks(hls.subtitleTracks || []);
          setCurrentAudio(hls.audioTrack);
          setCurrentSubtitle(hls.subtitleTrack);
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          if (hasRemote) video.play().catch(e => console.log("Autoplay blocked", e));
          checkNativeTracks(video);
        });
      }
    } else {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        checkNativeTracks(video);
      });
      if (hasRemote) {
        video.play().catch(e => console.log("Auto-play prevented", e));
      }
    }

    const checkNativeTracks = (vid) => {
      if (vid.audioTracks && vid.audioTracks.length > 1) {
        const aTracks = [];
        for (let i = 0; i < vid.audioTracks.length; i++) {
          aTracks.push({ id: i, name: vid.audioTracks[i].language || `Audio ${i + 1}` });
          if (vid.audioTracks[i].enabled) setCurrentAudio(i);
        }
        setAudioTracks(aTracks);
      }
    };

    return () => {
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src, mediaType, hasRemote, refreshKey]);

  // --- Socket Sync ---
  useEffect(() => {
    if (!roomId || mediaType !== 'tv') return;

    const handleSync = ({ type, timestamp }) => {
      const video = videoRef.current;
      if (!video) return;

      isRemoteUpdate.current = true;
      // Snapping tightly to host time
      if (Math.abs(video.currentTime - timestamp) > 0.3) {
        video.currentTime = timestamp;
      }
      if (type === 'play') video.play().catch(e => console.error(e));
      else if (type === 'pause') video.pause();

      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
    };

    const handleSeek = ({ timestamp }) => {
      const video = videoRef.current;
      if (!video) return;

      // If the difference is big, teleport everyone
      if (Math.abs(video.currentTime - timestamp) > 0.5) {
        isRemoteUpdate.current = true;
        video.currentTime = timestamp;
        setTimeout(() => { isRemoteUpdate.current = false; }, 500);
      }
    };

    const handleSpeed = ({ speed }) => {
      const video = videoRef.current;
      if (!video) return;
      isRemoteUpdate.current = true;
      video.playbackRate = speed;
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
    };

    socket.on('sync-action', handleSync);
    socket.on('sync-seek', handleSeek);
    socket.on('sync-speed', handleSpeed);
    return () => {
      socket.off('sync-action', handleSync);
      socket.off('sync-seek', handleSeek);
      socket.off('sync-speed', handleSpeed);
    };
  }, [roomId, mediaType]);

  // --- User Actions ---
  const handlePlay = () => {
    if (isRemoteUpdate.current || mediaType !== 'tv') return;
    socket.emit('sync-action', { roomId, type: 'play', timestamp: videoRef.current.currentTime });
  };

  const handlePause = () => {
    if (isRemoteUpdate.current || mediaType !== 'tv') return;
    socket.emit('sync-action', { roomId, type: 'pause', timestamp: videoRef.current.currentTime });
  };

  const handleSeeked = () => {
    if (isRemoteUpdate.current || mediaType !== 'tv') return;
    socket.emit('sync-seek', { roomId, timestamp: videoRef.current.currentTime });
  };

  const handleRateChange = () => {
    if (isRemoteUpdate.current || mediaType !== 'tv') return;
    socket.emit('sync-speed', { roomId, speed: videoRef.current.playbackRate });
  };

  // --- Local Volume Control ---
  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setLocalVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;

    if (newVol === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = localVolume > 0 ? localVolume : 1;
        setLocalVolume(videoRef.current.volume);
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const changeAudio = (trackId) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudio(trackId);
    } else if (videoRef.current?.audioTracks) {
      for (let i = 0; i < videoRef.current.audioTracks.length; i++) {
        videoRef.current.audioTracks[i].enabled = (i === trackId);
      }
      setCurrentAudio(trackId);
    }
    setShowAudioMenu(false);
  };

  const changeSubtitle = (trackId) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
      setCurrentSubtitle(trackId);
    }
    setShowSubtitleMenu(false);
  };

  // --- RENDER ---
  if (mediaType === 'movie') {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative">
        <iframe
          src={src}
          title="Movie Stream"
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="origin"
        />
        {/* Transparent overlay blocks clicks for non-controllers */}
        {!hasRemote && <div className="absolute inset-0 z-10" title="Remote Locked" />}
      </div>
    );
  }

  // Standard Player for TV
  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative group pointer-events-auto">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls={hasRemote}
        onPlay={hasRemote ? handlePlay : undefined}
        onPause={hasRemote ? handlePause : undefined}
        onSeeked={hasRemote ? handleSeeked : undefined}
        onRateChange={hasRemote ? handleRateChange : undefined}
      />

      {/* Custom Media Controls Overlay */}
      {/* (We now show this overlay for everyone if there are tracks, but restrict play/pause natively elsewhere) */}
      <>
        {/* Massive transparent shield to block clicks on video itself (play/pause) if NO REMOTE */}
        {!hasRemote && <div className="absolute inset-0 z-10" title="Remote Locked" />}

        {/* Floating Controls Bar */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity pointer-events-auto">

          {/* Subtitle Selector */}
          {hasRemote && subtitleTracks.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowSubtitleMenu(!showSubtitleMenu)} className={`bg-black/70 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-xl transition hover:text-netflixRed ${currentSubtitle !== -1 ? 'text-white' : 'text-gray-400'}`}>
                <FaClosedCaptioning size={20} />
              </button>
              {showSubtitleMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-2 overflow-hidden z-30 flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase px-4 py-1 border-b border-gray-800 mb-1">Subtitles</span>
                  <button onClick={() => changeSubtitle(-1)} className={`text-left px-4 py-2 text-sm hover:bg-gray-800 ${currentSubtitle === -1 ? 'text-netflixRed font-bold' : 'text-white'}`}>Off</button>
                  {subtitleTracks.map((trk, i) => (
                    <button key={i} onClick={() => changeSubtitle(i)} className={`text-left px-4 py-2 text-sm hover:bg-gray-800 truncate ${currentSubtitle === i ? 'text-netflixRed font-bold' : 'text-white'}`}>
                      {trk.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audio Track Selector */}
          {hasRemote && audioTracks.length > 1 && (
            <div className="relative">
              <button onClick={() => setShowAudioMenu(!showAudioMenu)} className="bg-black/70 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-xl text-white hover:text-netflixRed transition">
                <FaMusic size={18} />
              </button>
              {showAudioMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-2 overflow-hidden z-30 flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase px-4 py-1 border-b border-gray-800 mb-1">Audio Tracks</span>
                  {audioTracks.map((trk, i) => (
                    <button key={i} onClick={() => changeAudio(i)} className={`text-left px-4 py-2 text-sm hover:bg-gray-800 truncate ${currentAudio === i ? 'text-netflixRed font-bold' : 'text-white'}`}>
                      {trk.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Refresh Buttons and Volume Controls ONLY for non-remote holders */}
          {!hasRemote && (
            <>
              {/* Force Refresh Viewer Stream */}
              <button onClick={() => setRefreshKey(k => k + 1)} className="bg-black/70 backdrop-blur-md p-3 rounded-full border border-white/10 shadow-xl text-gray-300 hover:text-netflixRed transition" title="Reload Video">
                <FaSyncAlt size={16} />
              </button>

              {/* Volume Slider */}
              <div className="bg-black/70 backdrop-blur-md px-4 py-3 rounded-full flex items-center gap-3 border border-white/10 shadow-xl">
                <button onClick={toggleMute} className="text-white hover:text-netflixRed transition">
                  {isMuted || localVolume === 0 ? <FaVolumeMute size={20} /> : localVolume < 0.5 ? <FaVolumeDown size={20} /> : <FaVolumeUp size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : localVolume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-netflixRed"
                />
              </div>
            </>
          )}
        </div>
      </>
    </div>
  );
};

export default VideoPlayer;