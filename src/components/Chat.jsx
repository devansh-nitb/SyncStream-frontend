import { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';

const REACTIONS = ['😂', '😮', '❤️', '😡', '👏', '🔥'];

const Chat = ({ roomId, username, onClose, initialMessages = [] }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialMessages.length > 0) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat-message', handleMessage);

    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat-message', handleMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    socket.emit('chat-message', { roomId, message: input, username });
    setMessages((prev) => [...prev, { type: 'user', username, text: input, isMe: true }]);
    setInput('');
  };

  // ✅ UPDATED: Send username with reaction
  const sendReaction = (emoji) => {
    // 1. Send to server
    socket.emit('send-reaction', { roomId, emoji, username });
    
    // 2. Local animation (Pass object with emoji AND username)
    window.dispatchEvent(new CustomEvent('local-reaction', { 
      detail: { emoji, username } 
    }));
  };

  const checkIsMe = (msg) => {
    if (msg.isMe) return true;
    if (!msg.username || !username) return false;
    return msg.username.toLowerCase() === username.toLowerCase();
  };

  return (
    <div className="flex flex-col h-full bg-[#181818] border-l border-gray-800 w-full md:w-80">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-netflixDark">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-xl text-gray-200 tracking-wider">Live Chat</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <button onClick={onClose} className="md:hidden text-gray-400"><FaTimes /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isMe = checkIsMe(msg);
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {msg.type === 'system' ? (
                 <div className="w-full text-center text-xs text-gray-500 my-2 italic">{msg.text}</div>
              ) : (
                <>
                  {!isMe && <span className="text-[10px] text-gray-400 mb-1 ml-1">{msg.username}</span>}
                  <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm break-words shadow-md ${
                    isMe ? 'bg-netflixRed text-white rounded-br-none' : 'bg-[#333] text-gray-200 rounded-bl-none border border-gray-700'
                  }`}>
                    {msg.text}
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Reactions */}
      <div className="bg-netflixDark border-t border-gray-800">
        <div className="px-2 py-3 flex justify-around border-b border-gray-800">
          {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)} className="text-xl hover:scale-125 transition transform">{emoji}</button>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-3 bg-black flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#333] text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-netflixRed"
          />
          <button type="submit" className="text-netflixRed p-2 hover:bg-gray-800 rounded transition"><FaPaperPlane /></button>
        </form>
      </div>
    </div>
  );
};

export default Chat;