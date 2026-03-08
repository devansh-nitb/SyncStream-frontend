import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Chat from '../components/Chat';
import axios from 'axios';
import { socket } from '../services/socket';
import { IPTV_CATEGORIES } from '../data/channels';
import AuthContext from '../context/AuthContext';
import Modal from '../components/Modal'; // Add Modal import
import { FaTv, FaFilm, FaSearch, FaBars, FaCommentDots, FaGamepad, FaLock, FaTimes, FaSignOutAlt } from 'react-icons/fa';

const TMDB_API_KEY = "61cc64956d456a17e2d25dd3ee925e08";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w200";

const Room = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Layout State (Persisted)
  const [leftPanelOpen, setLeftPanelOpen] = useState(() => localStorage.getItem('syncstream_leftPanel') !== 'false');
  const [rightPanelOpen, setRightPanelOpen] = useState(() => localStorage.getItem('syncstream_rightPanel') !== 'false');

  useEffect(() => {
    localStorage.setItem('syncstream_leftPanel', leftPanelOpen);
  }, [leftPanelOpen]);

  useEffect(() => {
    localStorage.setItem('syncstream_rightPanel', rightPanelOpen);
  }, [rightPanelOpen]);
  const [activeTab, setActiveTab] = useState('tv');
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false); // New leave confirmation State

  // Room Data
  const [movies, setMovies] = useState([]);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [controllerId, setControllerId] = useState(null);

  // Reaction State
  const [reactions, setReactions] = useState([]);

  const hasRemote = user && (controllerId === user.id || controllerId === user._id);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Room Data
    axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        const data = res.data;
        setChatHistory(data.messages || []);
        setParticipants(data.participants || []);

        const cId = data.controller?._id || data.controller || data.host?._id || data.host;
        setControllerId(cId);

        if (data.currentMedia) setCurrentMedia(data.currentMedia);
      })
      .catch(err => console.error("Room Fetch Error:", err));

    fetchMovies('/movie/popular');

    // 2. Socket Connection
    socket.connect();
    socket.emit('join-room', { roomId, userId: user.id, username: user.displayName });

    // 3. Listeners
    socket.on('media-change', (data) => {
      // The server sends `{ roomId, media }` based on our emit structure
      // If data has a media property, use it. Otherwise, assume data is the media object itself.
      const newMedia = data.media || data;
      setCurrentMedia(newMedia);
    });

    socket.on('remote-update', ({ controller }) => setControllerId(controller));
    socket.on('update-participants', (list) => setParticipants(list));

    socket.on('remote-holder-left', ({ username }) => {
      setCurrentMedia(null);
      setChatHistory(prev => [...prev, {
        type: 'system',
        text: `⚠️ Remote controller (${username}) has left. Media stopped.`,
        timestamp: new Date()
      }]);
    });

    // ✅ UPDATED: Handle Reaction with Username
    socket.on('show-reaction', ({ emoji, username }) => addFloatingReaction(emoji, username));

    // ✅ UPDATED: Handle Local Reaction Object
    const handleLocalReaction = (e) => addFloatingReaction(e.detail.emoji, e.detail.username);
    window.addEventListener('local-reaction', handleLocalReaction);

    return () => {
      socket.off('media-change');
      socket.off('show-reaction');
      socket.off('remote-update');
      socket.off('update-participants');
      socket.off('remote-holder-left');
      window.removeEventListener('local-reaction', handleLocalReaction);
      // Emit intentional leave before disconnecting
      socket.emit('leave-room', { roomId, userId: user.id || user._id, username: user.displayName });
      socket.disconnect();
    };
  }, [roomId, user]);

  // ✅ UPDATED: Store username in reaction state
  const addFloatingReaction = (emoji, user) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 60) + 20;
    setReactions(prev => [...prev, { id, emoji, user, left }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const fetchMovies = async (endpoint) => {
    try {
      const { data } = await axios.get(`${TMDB_BASE}${endpoint}`, { params: { api_key: TMDB_API_KEY } });
      setMovies(data.results);
    } catch (err) { console.error("TMDB Error", err); }
  };

  const searchMovies = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    fetchMovies(`/search/movie?query=${searchQuery}`);
  };

  const handleSwitchChannel = (ch) => {
    if (!hasRemote) return;
    const newMedia = { type: 'tv', src: ch.streamUrl, info: { title: ch.name } };
    setCurrentMedia(newMedia);
    socket.emit('media-change', { roomId, media: newMedia });
  };

  const handleSwitchMovie = (movie) => {
    if (!hasRemote) return;
    const src = `https://multiembed.mov/?video_id=${movie.id}&tmdb=1`;
    const newMedia = { type: 'movie', src, info: { title: movie.title } };
    setCurrentMedia(newMedia);
    socket.emit('media-change', { roomId, media: newMedia });
  };

  const passRemote = (targetUserId, targetUserName) => {
    if (!hasRemote) return;
    socket.emit('pass-remote', { roomId, newControllerId: targetUserId, newControllerName: targetUserName });
    setShowParticipantModal(false);
  };

  if (!user) return <div className="h-screen w-full bg-black flex items-center justify-center text-netflixRed text-2xl animate-pulse">Loading Profile...</div>;

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden font-body text-white">

      {/* Header */}
      <header className="h-16 bg-netflixDark border-b border-gray-800 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowLeaveModal(true)} className="hover:text-netflixRed transition tooltip" title="Leave Room">
            <FaSignOutAlt size={20} />
          </button>
          <h1 className="text-netflixRed text-2xl font-heading tracking-wider hidden md:block">SyncStream</h1>
          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className={`p-2 rounded hover:bg-gray-800 ${!leftPanelOpen ? 'text-gray-500' : 'text-white'}`}><FaBars /></button>
        </div>

        <div
          onClick={() => hasRemote && setShowParticipantModal(true)}
          className={`flex items-center gap-2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition ${hasRemote ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 opacity-50'}`}
        >
          <FaGamepad />
          {hasRemote ? "You have Control" : "Remote Locked"}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-800 rounded overflow-hidden scale-90 md:scale-100 min-w-[120px] justify-center">
            {hasRemote ? (
              <>
                <button onClick={() => setActiveTab('tv')} className={`px-4 py-2 flex items-center gap-2 text-sm ${activeTab === 'tv' ? 'bg-netflixRed' : 'text-gray-400 hover:text-white'}`}><FaTv /> TV</button>
                <button onClick={() => setActiveTab('movies')} className={`px-4 py-2 flex items-center gap-2 text-sm ${activeTab === 'movies' ? 'bg-netflixRed' : 'text-gray-400 hover:text-white'}`}><FaFilm /> Movies</button>
              </>
            ) : (
              <span className="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2"><FaLock size={10} /> Browsing Locked</span>
            )}
          </div>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-2 rounded hover:bg-gray-800 ${!rightPanelOpen ? 'text-gray-500' : 'text-white'}`}><FaCommentDots size={20} /></button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left Sidebar */}
        <div className={`${leftPanelOpen ? 'w-full md:w-80' : 'w-0'} bg-netflixDark border-r border-gray-800 transition-all duration-300 overflow-hidden flex flex-col absolute md:relative z-10 h-full relative`}>
          {!hasRemote && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-gray-400">
              <FaLock size={32} className="mb-2" />
              <p className="text-xs uppercase tracking-widest font-bold">Remote Locked</p>
              <p className="text-[10px] mt-1">Ask admin to change media</p>
            </div>
          )}

          {activeTab === 'tv' ? (
            <div className="overflow-y-auto flex-1">
              <h3 className="p-4 text-gray-400 font-bold text-xs uppercase sticky top-0 bg-netflixDark z-10 border-b border-gray-800">Live TV Channels</h3>
              <div className="pb-4">
                {IPTV_CATEGORIES.map(category => (
                  <div key={category.name} className="mt-4">
                    <h4 className="px-4 py-2 text-netflixRed font-bold text-xs uppercase tracking-wider">{category.name}</h4>
                    <ul>
                      {category.channels.map(ch => (
                        <li key={ch.id} onClick={() => handleSwitchChannel(ch)}
                          className={`p-4 cursor-pointer hover:bg-gray-800 border-l-4 transition ${currentMedia?.info?.title === ch.name ? 'border-netflixRed bg-gray-800' : 'border-transparent'}`}>
                          <p className="font-bold text-sm text-gray-200 truncate">{ch.name}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <form onSubmit={searchMovies} className="p-4 border-b border-gray-800">
                <div className="flex bg-black rounded p-2 border border-gray-700">
                  <input className="bg-transparent border-none outline-none text-white w-full text-xs" placeholder="Search Movies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <button type="submit"><FaSearch className="text-gray-400 hover:text-white" /></button>
                </div>
              </form>
              <div className="overflow-y-auto flex-1 p-2 grid grid-cols-2 gap-2">
                {movies.map(mov => (
                  <div key={mov.id} onClick={() => handleSwitchMovie(mov)} className="cursor-pointer group relative">
                    <img src={mov.poster_path ? IMG_BASE + mov.poster_path : 'https://via.placeholder.com/200x300'} className="w-full rounded" alt={mov.title} />
                    <div className="absolute bottom-0 inset-x-0 bg-black/80 p-1 truncate text-[10px] text-center hidden group-hover:block">{mov.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Player */}
        <main className="flex-1 bg-black flex flex-col relative w-full">
          {/* ✅ UPDATED: Reaction Overlay with Name Badges */}
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {reactions.map(r => (
              <div
                key={r.id}
                className="absolute bottom-20 flex flex-col items-center animate-float-up opacity-0"
                style={{ left: `${r.left}%`, animation: 'floatUp 2s ease-out forwards' }}
              >
                <div className="text-4xl">{r.emoji}</div>
                <div className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-bold text-gray-200 border border-gray-600 shadow-sm whitespace-nowrap">
                  {r.user}
                </div>
              </div>
            ))}
          </div>

          {currentMedia ? <VideoPlayer mediaType={currentMedia.type} src={currentMedia.src} roomId={roomId} hasRemote={hasRemote} /> : <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-4"><div className="p-6 rounded-full bg-gray-900"><FaTv size={40} /></div><p>Waiting for media or new remote holder...</p></div>}
        </main>

        {/* Right Chat */}
        <div className={`${rightPanelOpen ? 'w-full md:w-80' : 'w-0'} bg-[#181818] border-l border-gray-800 transition-all duration-300 overflow-hidden absolute md:relative right-0 h-full z-10`}>
          <Chat roomId={roomId} username={user.displayName} onClose={() => setRightPanelOpen(false)} initialMessages={chatHistory} />
        </div>

      </div>

      {/* Participants Modal */}
      {showParticipantModal && hasRemote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181818] w-full max-w-sm rounded-lg border border-gray-700 overflow-hidden shadow-2xl">
            <div className="p-4 bg-netflixRed text-white font-bold flex justify-between items-center">
              <span>Pass Remote Control</span>
              <button onClick={() => setShowParticipantModal(false)} className="hover:text-gray-300 transition">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto pr-2">
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-widest">Select a user to give control:</p>

              {participants.filter(p => p._id !== user.id).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-2">No other users here.</p>
                  <p className="text-xs text-gray-600">Ask a friend to join!</p>
                </div>
              ) : (
                participants.filter(p => p._id !== user.id).map(p => (
                  <button
                    key={p._id}
                    onClick={() => passRemote(p._id, p.displayName)}
                    className="w-full text-left p-3 hover:bg-gray-800 rounded flex items-center justify-between group border-b border-gray-800 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs">
                        {p.displayName[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-gray-200">{p.displayName}</span>
                    </div>
                    <span className="text-xs text-netflixRed opacity-0 group-hover:opacity-100 uppercase font-bold transition">Give</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Room Modal */}
      {showLeaveModal && (
        <Modal
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Leave Room"
          actionLabel="Yes, Leave"
          onAction={() => {
            socket.emit('leave-room', { roomId, userId: user.id || user._id, username: user.displayName });
            navigate('/dashboard');
          }}
        >
          <p className="text-gray-300">Are you sure you want to exit the party?</p>
          {hasRemote && <p className="text-netflixRed font-bold text-sm mt-3">⚠️ You hold the remote. Media will stop for everyone.</p>}
        </Modal>
      )}

    </div>
  );
};

export default Room;