import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 text-amber-300 border border-amber-500/30 px-4 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
      <span>حالت آفلاین — اطلاعات کش‌شده PWA در حال نمایش است</span>
    </div>
  );
};

export default OfflineIndicator;
