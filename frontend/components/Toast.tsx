'use client';

import { useEffect } from 'react';
import { Icon } from './Icon';

export type ToastVariant = 'success' | 'error' | 'info';

export function Toast({
  message,
  variant = 'success',
  onClose,
  duration = 4500,
}: {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onClose]);

  return (
    <div className={`toast toast-${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon">
        <Icon name={variant === 'success' ? 'check' : variant === 'error' ? 'shield' : 'message'} size={20} />
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" type="button" onClick={onClose} aria-label="Cerrar mensaje">
        ×
      </button>
    </div>
  );
}
