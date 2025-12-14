'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'default';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-400',
          button: 'bg-red-500 hover:bg-red-600 text-white',
          border: 'border-red-500/50',
        };
      case 'warning':
        return {
          icon: 'text-yellow-400',
          button: 'bg-yellow-500 hover:bg-yellow-600 text-white',
          border: 'border-yellow-500/50',
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          button: 'bg-blue-500 hover:bg-blue-600 text-white',
          border: 'border-blue-500/50',
        };
      case 'default':
        return {
          icon: 'text-gray-400',
          button: 'bg-gray-500 hover:bg-gray-600 text-white',
          border: 'border-gray-500/50',
        };
      default:
        return {
          icon: 'text-red-400',
          button: 'bg-red-500 hover:bg-red-600 text-white',
          border: 'border-red-500/50',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay com blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative z-[10000] bg-dark-800 rounded-lg border border-dark-600 shadow-xl max-w-md w-full animate-scale-in">
        {/* Header */}
        <div className={`flex items-center gap-3 p-4 border-b ${styles.border}`}>
          <AlertTriangle size={24} className={styles.icon} />
          <h3 className="font-display font-bold text-lg text-white flex-1">{title}</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-300 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-dark-600">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${styles.button} rounded-lg transition-colors font-medium`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

