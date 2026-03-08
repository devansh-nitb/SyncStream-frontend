import { useState } from 'react';
import API from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import bgImage from '../assets/hero.jpg'; // Importing local image
import Modal from '../components/Modal';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ displayName: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  
  // Modal State
  const [modal, setModal] = useState({ open: false, title: '', message: '' });
  
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const showError = (title, message) => setModal({ open: true, title, message });
  const closeModal = () => setModal({ ...modal, open: false });

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await API.post('/register', formData);
      setStep(2);
    } catch (error) {
      showError('Registration Failed', error.response?.data?.message || 'Something went wrong.');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      await API.post('/verify', { email: formData.email, otp });
      navigate('/login');
    } catch (error) {
      showError('Verification Failed', 'The code you entered is invalid or expired.');
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={bgImage} alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 md:bg-black/50 bg-gradient-to-t from-black via-transparent to-black" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-black/75 p-12 md:p-16 rounded-lg backdrop-blur-sm border border-white/10 shadow-2xl">
        <h2 className="text-4xl font-heading font-bold mb-8 text-white">
          {step === 1 ? 'Sign Up' : 'Enter Code'}
        </h2>
        
        {step === 1 ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <input name="displayName" type="text" placeholder="Username" onChange={handleChange} 
                   className="w-full p-4 bg-[#333] rounded text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-gray-500 outline-none transition" required />
            <input name="email" type="email" placeholder="Email Address" onChange={handleChange} 
                   className="w-full p-4 bg-[#333] rounded text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-gray-500 outline-none transition" required />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} 
                   className="w-full p-4 bg-[#333] rounded text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-gray-500 outline-none transition" required />
            <button type="submit" className="w-full py-3 mt-4 bg-netflixRed text-white font-bold rounded hover:bg-red-700 transition duration-200">
              Get Started
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <p className="text-gray-300 text-sm">We sent a code to {formData.email}</p>
            <input type="text" placeholder="XXXXXX" value={otp} onChange={(e) => setOtp(e.target.value)} 
                   className="w-full p-4 bg-[#333] rounded text-white text-center text-2xl tracking-[0.5em] font-bold border-none focus:ring-2 focus:ring-gray-500 outline-none" />
            <button type="submit" className="w-full py-3 mt-4 bg-netflixRed text-white font-bold rounded hover:bg-red-700 transition">
              Verify
            </button>
          </form>
        )}

        <div className="mt-8 text-gray-400 text-sm">
          Already have an account? <Link to="/login" className="text-white hover:underline">Sign in now</Link>.
        </div>
      </div>

      {/* Error Modal */}
      <Modal 
        isOpen={modal.open} 
        onClose={closeModal} 
        title={modal.title}>
        {modal.message}
      </Modal>
    </div>
  );
};

export default Register;