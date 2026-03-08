import { useEffect } from 'react';
import { IoClose } from 'react-icons/io5';

const Modal = ({ isOpen, onClose, title, children, actionLabel, onAction }) => {
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-[#181818] w-full max-w-md p-6 rounded-md shadow-2xl transform transition-all scale-100 border border-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-heading text-white tracking-wider">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <IoClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="mb-8 text-gray-300 font-body">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded font-bold text-gray-400 hover:bg-gray-800 transition text-sm uppercase tracking-wide">
            Cancel
          </button>
          {actionLabel && (
            <button 
              onClick={onAction}
              className="flex-1 px-4 py-3 rounded bg-netflixRed text-white font-bold hover:bg-red-700 transition text-sm uppercase tracking-wide shadow-lg">
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;