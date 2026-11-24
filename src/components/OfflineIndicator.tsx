import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-amber-400 animate-in fade-in slide-in-from-bottom-2">
      <WifiOff className="w-4 h-4 text-amber-200 animate-pulse" />
      <span>ऑफलाइन मोड सक्रिय (Offline Mode Active) — लोकल डेटा और कैश्ड ड्रॉइंग उपयोग हो रही हैं।</span>
    </div>
  );
};
