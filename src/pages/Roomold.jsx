import { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import axios from 'axios';
import { socket } from '../services/socket';
import AuthContext from '../context/AuthContext';
import { FaTv, FaFilm, FaSearch } from 'react-icons/fa';

// const TMDB_API_KEY = process.env.REACT_APP_TMDB_KEY; 
const TMDB_API_KEY = "61cc64956d456a17e2d25dd3ee925e08";
console.log("DEBUG: My API Key is:", TMDB_API_KEY);
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w200";

const Room = () => {
  const { roomId } = useParams();
  const { user } = useContext(AuthContext);

  // State
  const [activeTab, setActiveTab] = useState('tv'); // 'tv' or 'movies'
  const [currentMedia, setCurrentMedia] = useState(null); // { type: 'tv'|'movie', src: url, info: obj }
  
  // Data State
  const [channels, setChannels] = useState([]);
  const [movies, setMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Initial Load & Listeners
  useEffect(() => {
    // Load Channels
    axios.get('http://localhost:5000/api/channels').then(res => setChannels(res.data));
    
    // Load Popular Movies initially
    fetchMovies('/movie/popular');

    // Socket Connect
    socket.connect();
    socket.emit('join-room', { roomId, userId: user?.id, username: user?.displayName });

    // Listen for media changes from other users
    socket.on('media-change', (media) => {
      console.log("Remote Media Change:", media);
      setCurrentMedia(media);
    });

    return () => {
      socket.off('media-change');
      socket.disconnect();
    };
  }, [roomId, user]);

  // 2. Movie Fetch Logic
  const fetchMovies = async (endpoint) => {
    try {
      const { data } = await axios.get(`${TMDB_BASE}${endpoint}`, {
        params: { api_key: TMDB_API_KEY }
      });
      setMovies(data.results);
    } catch (err) {
      console.error("TMDB Error", err);
    }
  };

  const searchMovies = async (e) => {
    e.preventDefault();
    if(!searchQuery) return;
    fetchMovies(`/search/movie?query=${searchQuery}`);
  };

  // 3. Selection Handlers
  const handleSwitchChannel = (channel) => {
    const newMedia = {
      type: 'tv',
      src: channel.streamUrl,
      info: { title: channel.name, category: channel.category }
    };
    setCurrentMedia(newMedia);
    socket.emit('media-change', { roomId, media: newMedia });
  };

  // ... inside Room.jsx ...

  const handleSwitchMovie = (movie) => {
    // ✅ SUPEREMBED (Stable, 1 popup)
    const src = `https://multiembed.mov/?video_id=${movie.id}&tmdb=1`;

    const newMedia = { 
      type: 'movie', 
      src: src, 
      info: { title: movie.title, poster: movie.poster_path } 
    };
    setCurrentMedia(newMedia);
    socket.emit('media-change', { roomId, media: newMedia });
  };

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden font-body">
      {/* Header */}
      <header className="h-16 bg-netflixDark border-b border-gray-800 flex items-center px-6 justify-between z-10">
         <h1 className="text-netflixRed text-3xl font-heading tracking-wider">SyncStream</h1>
         <div className="flex bg-gray-800 rounded-md overflow-hidden">
             <button 
                onClick={() => setActiveTab('tv')}
                className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'tv' ? 'bg-netflixRed text-white' : 'text-gray-400 hover:text-white'}`}>
                <FaTv /> TV
             </button>
             <button 
                onClick={() => setActiveTab('movies')}
                className={`px-4 py-2 flex items-center gap-2 ${activeTab === 'movies' ? 'bg-netflixRed text-white' : 'text-gray-400 hover:text-white'}`}>
                <FaFilm /> Movies
             </button>
         </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Dynamic Content based on Tab) */}
        <aside className="w-80 bg-netflixDark border-r border-gray-800 flex flex-col">
            
            {/* TV TAB CONTENT */}
            {activeTab === 'tv' && (
              <div className="overflow-y-auto flex-1">
                <h3 className="p-4 text-gray-400 font-bold text-xs uppercase tracking-widest sticky top-0 bg-netflixDark">Live Channels</h3>
                <ul>
                    {channels.map(ch => (
                        <li key={ch._id} 
                            onClick={() => handleSwitchChannel(ch)}
                            className={`p-4 cursor-pointer flex items-center gap-3 hover:bg-gray-800 transition border-l-4 ${currentMedia?.info?.title === ch.name ? 'border-netflixRed bg-gray-800' : 'border-transparent'}`}>
                            <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-xs">TV</div>
                            <div>
                                <p className="font-bold text-sm text-gray-200">{ch.name}</p>
                                <p className="text-xs text-gray-500">{ch.category}</p>
                            </div>
                        </li>
                    ))}
                </ul>
              </div>
            )}

            {/* MOVIES TAB CONTENT */}
            {activeTab === 'movies' && (
              <div className="flex flex-col h-full">
                {/* Search Bar */}
                <form onSubmit={searchMovies} className="p-4 border-b border-gray-800">
                    <div className="flex bg-black rounded p-2 border border-gray-700">
                        <input 
                            className="bg-transparent border-none outline-none text-white w-full text-sm" 
                            placeholder="Search Movies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="text-gray-400 hover:text-white"><FaSearch/></button>
                    </div>
                </form>

                {/* Movie Grid (Mini) */}
                <div className="overflow-y-auto flex-1 p-2 grid grid-cols-2 gap-2">
                    {movies.map(mov => (
                        <div key={mov.id} onClick={() => handleSwitchMovie(mov)} className="cursor-pointer group relative">
                            <img src={mov.poster_path ? IMG_BASE + mov.poster_path : 'https://via.placeholder.com/200x300'} 
                                 alt={mov.title} 
                                 className="w-full rounded hover:opacity-80 transition" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 truncate text-xs text-center text-white hidden group-hover:block">
                                {mov.title}
                            </div>
                        </div>
                    ))}
                </div>
              </div>
            )}
        </aside>

        {/* Main Player */}
        <main className="flex-1 bg-black flex flex-col relative">
            {currentMedia ? (
                <VideoPlayer 
                    mediaType={currentMedia.type} 
                    src={currentMedia.src} 
                    roomId={roomId} 
                />
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-4">
                    <FaFilm size={48} />
                    <p>Select a Channel or Movie to start streaming</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default Room;