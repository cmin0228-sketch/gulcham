import React, { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onClear: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClear }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClear();
    }, 2800);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-ink-900/90 text-white text-xs font-semibold shadow-lg backdrop-blur flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <span>{message}</span>
    </div>
  );
};
