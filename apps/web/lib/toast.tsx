'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { ReactNode } from 'react';

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3500,
        }}
      />
    </>
  );
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (type === 'success') sonnerToast.success(message);
  else if (type === 'error') sonnerToast.error(message);
  else sonnerToast.info(message);
}

export function useToast() {
  return { toast: showToast };
}
