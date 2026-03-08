import { useState, useContext } from 'react';
import API from '../services/api';
import AuthContext from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import bgImage from '../assets/hero.jpg';
import Modal from '../components/Modal';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { loginUser } = useContext(AuthContext);
  const [modal, setModal] = useState({ open: false, title: '', message: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/login', formData);
      loginUser(res.data.token, res.data.user);
    } catch (error) {
      setModal({
        open: true,
        title: 'Login Failed',
        message: error.response?.data?.message || 'Invalid email or password.'
      });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-body">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src={bgImage} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 md:bg-black/50 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-black/75 p-12 md:p-16 rounded-lg backdrop-blur-sm border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-heading font-bold mb-8 text-white">Sign In</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            onChange={handleChange}
            className="w-full p-4 bg-[#333] rounded text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-gray-500 outline-none transition"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full p-4 bg-[#333] rounded text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-gray-500 outline-none transition"
            required
          />
          <button
            type="submit"
            className="w-full py-3 mt-4 bg-netflixRed text-white font-bold rounded hover:bg-red-700 transition duration-200">
            Sign In
          </button>
        </form>

        <div className="mt-8 text-gray-400 text-sm">
          New to SyncStream? <Link to="/register" className="text-white hover:underline">Sign up now</Link>.
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        title={modal.title}>
        {modal.message}
      </Modal>
    </div>
  );
};

export default Login;