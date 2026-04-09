import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideFooter?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideFooter = false,
  onConfirm,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog */}
          <motion.div
            className={`relative z-10 mx-4 w-full ${sizeClass[size]} rounded-xl bg-white p-6 shadow-xl dark:bg-slate-navy dark:text-white`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <h2 id="modal-title" className="mb-4 font-heading text-lg font-semibold">{title}</h2>
            <div className="mb-6">{children}</div>
            {!hideFooter && (
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                {onConfirm && (
                  <Button variant={confirmVariant} onClick={onConfirm}>
                    {confirmText}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
