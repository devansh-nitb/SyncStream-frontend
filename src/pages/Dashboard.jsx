import { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Modal from '../components/Modal';
import { FaPlus, FaTv, FaTrash, FaSignInAlt, FaExclamationTriangle } from 'react-icons/fa';
import bgImage from '../assets/hero.jpg';

const Dashboard = () => {
  const { user, logoutUser } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);

  // Modal States
  const [modalType, setModalType] = useState(null); // 'create' | 'join' | 'delete' | 'error'
  const [inputValue, setInputValue] = useState(''); // Used for Room Name or Room Code
  const [selectedRoomId, setSelectedRoomId] = useState(null); // Tracks which room to delete
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const ROOM_API = useMemo(() => axios.create({
    baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  }), []);

  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await ROOM_API.get('/rooms');
      setRooms(data);
    } catch (err) {
      console.error("Failed to fetch rooms");
    }
  }, [ROOM_API]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // --- Handlers ---

  const openModal = (type, roomId = null) => {
    setModalType(type);
    setInputValue('');
    setErrorMessage('');
    if (roomId) setSelectedRoomId(roomId);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedRoomId(null);
    setErrorMessage('');
  };

  const handleCreateRoom = async () => {
    if (!inputValue.trim()) return;
    try {
      const { data } = await ROOM_API.post('/rooms/create', { name: inputValue });
      navigate(`/room/${data.roomId}`);
    } catch (err) {
      setModalType('error');
      setErrorMessage("Failed to create room. Please try again.");
    }
  };

  const handleJoinRoom = async () => {
    if (!inputValue.trim()) return;

    try {
      // 1. Verify if room exists BEFORE navigating
      await ROOM_API.get(`/rooms/${inputValue}`);
      // 2. If successful, navigate
      navigate(`/room/${inputValue}`);
    } catch (err) {
      // 3. If 404 or error, stay on dashboard and show specific error modal
      setModalType('error');
      setErrorMessage(err.response?.status === 404
        ? "Room ID not found. Please check the code."
        : "Unable to join room. Please try again.");
    }
  };

  const confirmDeleteRoom = async () => {
    if (!selectedRoomId) return;

    try {
      await ROOM_API.delete(`/rooms/${selectedRoomId}`);
      fetchRooms(); // Refresh UI
      closeModal();
    } catch (err) {
      // Switch modal to error mode to show why it failed (e.g., users are present)
      setModalType('error');
      setErrorMessage(err.response?.data?.message || "Failed to delete room.");
    }
  };

  // --- Render Helpers ---

  const getModalContent = () => {
    switch (modalType) {
      case 'create':
        return {
          title: "Start a Party",
          action: "Create Room",
          handler: handleCreateRoom,
          body: (
            <>
              <p className="mb-4 text-sm text-gray-400">Give your room a catchy name.</p>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. Anime Night"
                className="w-full p-4 bg-[#333] rounded text-white border-none focus:ring-2 focus:ring-netflixRed outline-none font-bold"
                autoFocus
              />
            </>
          )
        };
      case 'join':
        return {
          title: "Join Party",
          action: "Join Room",
          handler: handleJoinRoom,
          body: (
            <>
              <p className="mb-4 text-sm text-gray-400">Enter the Room Code shared by your host.</p>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. ABCD-1234"
                className="w-full p-4 bg-[#333] rounded text-white border-none focus:ring-2 focus:ring-netflixRed outline-none font-bold tracking-widest uppercase"
                autoFocus
              />
            </>
          )
        };
      case 'delete':
        return {
          title: "Delete Room?",
          action: "Yes, Delete",
          handler: confirmDeleteRoom,
          body: (
            <div className="text-center">
              <FaExclamationTriangle className="text-netflixRed text-5xl mx-auto mb-4" />
              <p className="text-gray-300">
                Are you sure you want to delete this room? This action cannot be undone.
              </p>
            </div>
          )
        };
      case 'error':
        return {
          title: "Error",
          action: "Okay", // Just closes the modal
          handler: closeModal,
          body: (
            <div className="text-center">
              <p className="text-white font-bold text-lg mb-2">Oops!</p>
              <p className="text-red-400">{errorMessage}</p>
            </div>
          )
        };
      default:
        return null;
    }
  };

  const modalContent = getModalContent();

  return (
    <div className="min-h-screen relative font-body text-white overflow-x-hidden">

      {/* Background Image Overlay */}
      <div className="fixed inset-0 z-0">
        <img src={bgImage} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 p-8 md:p-12">
        {/* Navbar */}
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-netflixRed text-5xl font-heading tracking-wide cursor-pointer">
            SyncStream
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-gray-300 font-medium hidden md:block">Welcome, {user?.displayName}</span>
            <button onClick={logoutUser} className="px-4 py-2 text-sm font-bold bg-white/10 border border-white/30 rounded hover:bg-white hover:text-black transition">
              Sign Out
            </button>
          </div>
        </nav>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-6 mb-12">
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-3 bg-netflixRed text-white px-6 py-4 rounded shadow-xl hover:bg-red-700 hover:scale-105 transition duration-300">
            <FaPlus />
            <span className="text-lg font-bold uppercase tracking-wider">Create Room</span>
          </button>

          <button
            onClick={() => openModal('join')}
            className="flex items-center gap-3 bg-[#333] text-white px-6 py-4 rounded shadow-xl hover:bg-[#444] hover:scale-105 transition duration-300">
            <FaSignInAlt />
            <span className="text-lg font-bold uppercase tracking-wider">Join via Code</span>
          </button>
        </div>

        {/* Room Grid */}
        <h2 className="text-2xl font-heading mb-6 border-l-4 border-netflixRed pl-4">Live Now</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rooms.map(room => (
            <div key={room._id}
              onClick={() => navigate(`/room/${room.roomId}`)}
              className="bg-[#181818] rounded-md overflow-hidden hover:scale-105 transition duration-300 cursor-pointer group shadow-lg border border-transparent hover:border-gray-700 relative">

              {/* Host Delete Button - Only visible if current user is host */}
              {user.id === room.host._id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal('delete', room.roomId);
                  }}
                  className="absolute top-2 right-2 z-20 bg-black/50 p-2 rounded-full text-gray-400 hover:text-netflixRed hover:bg-black transition"
                  title="Delete Room">
                  <FaTrash size={14} />
                </button>
              )}

              <div className="h-40 bg-[#222] flex flex-col items-center justify-center">
                <FaTv className="text-4xl text-gray-600 group-hover:text-netflixRed transition duration-300" />
                <div className="mt-2 text-xs text-gray-500 bg-black/40 px-2 py-1 rounded">
                  Code: <span className="text-white font-mono">{room.roomId}</span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-1 truncate">{room.name}</h3>
                <div className="flex justify-between items-center text-xs text-gray-500 uppercase tracking-wider">
                  <span>Host: {room.host?.displayName}</span>
                  <span>👥 {room.participants.length}</span>
                </div>
              </div>
            </div>
          ))}

          {rooms.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 italic bg-black/20 rounded border border-white/10">
              No active parties. Create one to get started!
            </div>
          )}
        </div>

        {/* Unified Modal Handler */}
        {modalType && (
          <Modal
            isOpen={!!modalType}
            onClose={closeModal}
            title={modalContent.title}
            actionLabel={modalContent.action}
            onAction={modalContent.handler}
          >
            {modalContent.body}
          </Modal>
        )}
      </div>
    </div>
  );
};

export default Dashboard;