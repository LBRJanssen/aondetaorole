'use client';

import { ReactNode } from 'react';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/UI/ToastContainer';

// Componente interno que usa o contexto do Toast
function ToastWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onClose={removeToast} />;
}

// Provider principal que envolve toda a aplicação
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastWrapper />
    </ToastProvider>
  );
}


