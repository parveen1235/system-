import React, { useState } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidInstallModal } from './AndroidInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'dashboard' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'navbar',
}) => {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  // If running in standalone mode (already installed), we can show "App Installed" or let user open info
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
            isInstalled
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          } ${className}`}
          title="Android Mobile App (PWA / APK)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{isInstalled ? 'App Active' : 'Android App'}</span>
        </button>

        <AndroidInstallModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  if (variant === 'dashboard') {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition shadow-xs cursor-pointer ${
            isInstalled
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-transparent'
          } ${className}`}
          title="Install as Android App (मोबाइल ऐप इनस्टॉल करें)"
        >
          <Smartphone className="w-4 h-4 text-emerald-200" />
          <div className="text-left">
            <div className="text-xs font-bold leading-none flex items-center gap-1">
              <span>Android App</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-white text-emerald-900 font-black">
                {isInstalled ? 'Installed' : 'PWA / APK'}
              </span>
            </div>
            <div className="text-[10px] text-emerald-100 leading-none mt-0.5">
              {isInstalled ? 'रनिंग ऑन डिवाइस' : 'मोबाइल में इनस्टॉल करें'}
            </div>
          </div>
        </button>

        <AndroidInstallModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
    );
  }

  // Default navbar variant
  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
          isInstalled
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
        } ${className}`}
        title="Open Android App Installation Guide & APK Options"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {isInstalled ? 'Android App Installed' : 'Android App (मोबाइल ऐप)'}
        </span>
        <span className="sm:hidden">App</span>
        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-white text-emerald-900">
          {isInstalled ? 'Active' : 'PWA'}
        </span>
      </button>

      <AndroidInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};
