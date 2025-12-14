'use client';

import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuthSync } from '@/hooks/useAuthSync';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/UI/ToastContainer';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  fullHeight?: boolean;
}

function LayoutContent({ children, hideFooter = false, fullHeight = false }: LayoutProps) {
  const { toasts, removeToast } = useToast();

  return (
    <div className={`min-h-screen flex flex-col ${fullHeight ? 'h-screen overflow-hidden' : ''}`}>
      <Navbar />
      <main className={`flex-1 pt-16 ${fullHeight ? 'overflow-hidden' : ''}`}>
        {children}
      </main>
      {!hideFooter && <Footer />}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default function Layout({ children, hideFooter = false, fullHeight = false }: LayoutProps) {
  // Sincroniza auth e wallet stores
  useAuthSync();

  return (
    <ToastProvider>
      <LayoutContent hideFooter={hideFooter} fullHeight={fullHeight}>
        {children}
      </LayoutContent>
    </ToastProvider>
  );
}

