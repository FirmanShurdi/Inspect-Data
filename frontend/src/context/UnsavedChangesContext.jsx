import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UnsavedChangesModal from '../component/modal/UnsavedChangesModal';

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isBlocked, setIsBlocked] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: 'Perubahan Belum Disimpan!',
    message: 'Apakah Anda ingin melanjutkan edit, menyimpan data, atau membatalkan edit untuk berpindah halaman?',
  });

  const [isOpen, setIsOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // References to callbacks and state to avoid stale closures in event listeners
  const isBlockedRef = useRef(false);
  const onSaveRef = useRef(null);
  const onDiscardRef = useRef(null);

  // Synchronize isBlocked state to ref
  useEffect(() => {
    isBlockedRef.current = isBlocked;
  }, [isBlocked]);

  const setProtection = useCallback(({ isBlocked: blocked, onSave = null, onDiscard = null, title, message }) => {
    const isNowBlocked = Boolean(blocked);
    setIsBlocked(isNowBlocked);
    isBlockedRef.current = isNowBlocked;

    if (onSave !== undefined) onSaveRef.current = onSave;
    if (onDiscard !== undefined) onDiscardRef.current = onDiscard;

    if (title || message) {
      setModalConfig((prev) => ({
        title: title || prev.title,
        message: message || prev.message,
      }));
    }
  }, []);

  const clearProtection = useCallback(() => {
    setIsBlocked(false);
    isBlockedRef.current = false;
    onSaveRef.current = null;
    onDiscardRef.current = null;
  }, []);

  // 1. Browser Tab Close / Refresh Interceptor
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isBlockedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. Global Document Click Interceptor (captures Sidebar, Header, Back links)
  useEffect(() => {
    const handleCaptureClick = (e) => {
      if (!isBlockedRef.current) return;

      const anchor = e.target.closest('a[href], [data-nav-path], button[data-nav-path]');
      if (!anchor) return;

      let targetPath = anchor.getAttribute('data-nav-path') || anchor.getAttribute('href');
      if (!targetPath && anchor.tagName === 'A' && anchor.pathname) {
        targetPath = anchor.pathname;
      }

      if (
        !targetPath ||
        targetPath.startsWith('#') ||
        targetPath.startsWith('javascript:') ||
        targetPath === window.location.pathname ||
        targetPath === location.pathname
      ) {
        return;
      }

      // Intercept the navigation!
      e.preventDefault();
      e.stopPropagation();

      setPendingPath(targetPath);
      setIsOpen(true);
    };

    document.addEventListener('click', handleCaptureClick, true);
    return () => document.removeEventListener('click', handleCaptureClick, true);
  }, [location.pathname]);

  // 3. Browser Back / Forward Button Interceptor
  useEffect(() => {
    const handlePopState = () => {
      if (isBlockedRef.current) {
        window.history.pushState(null, '', window.location.href);
        setPendingPath('GO_BACK');
        setIsOpen(true);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Modal Actions
  const handleStay = () => {
    setIsOpen(false);
    setPendingPath(null);
  };

  const handleDiscardAndLeave = () => {
    if (onDiscardRef.current) {
      try {
        onDiscardRef.current();
      } catch (err) {
        console.error('onDiscard error:', err);
      }
    }
    clearProtection();
    setIsOpen(false);

    if (pendingPath === 'GO_BACK') {
      navigate(-1);
    } else if (pendingPath) {
      navigate(pendingPath);
    }
  };

  const handleSaveAndLeave = async () => {
    if (!onSaveRef.current) {
      handleDiscardAndLeave();
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSaveRef.current();
      if (success !== false) {
        clearProtection();
        setIsOpen(false);
        if (pendingPath === 'GO_BACK') {
          navigate(-1);
        } else if (pendingPath) {
          navigate(pendingPath);
        }
      }
    } catch (err) {
      console.error('Save and leave error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Programmatic manual navigation trigger with confirmation check
  const confirmNavigation = useCallback((target) => {
    if (isBlockedRef.current) {
      setPendingPath(target);
      setIsOpen(true);
      return false;
    }
    navigate(target);
    return true;
  }, [navigate]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        isBlocked,
        setProtection,
        clearProtection,
        confirmNavigation,
      }}
    >
      {children}
      <UnsavedChangesModal
        isOpen={isOpen}
        onClose={handleStay}
        onLeaveWithoutSaving={handleDiscardAndLeave}
        onSaveAndLeave={onSaveRef.current ? handleSaveAndLeave : null}
        isSaving={isSaving}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges({ isBlocked, onSave, onDiscard, title, message } = {}) {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
  }

  const { setProtection, clearProtection, confirmNavigation } = context;

  const onSaveRef = useRef(onSave);
  const onDiscardRef = useRef(onDiscard);
  useEffect(() => {
    onSaveRef.current = onSave;
    onDiscardRef.current = onDiscard;
  });

  useEffect(() => {
    if (isBlocked !== undefined) {
      setProtection({
        isBlocked,
        onSave: () => (onSaveRef.current ? onSaveRef.current() : true),
        onDiscard: () => (onDiscardRef.current ? onDiscardRef.current() : true),
        title,
        message,
      });
    }
  }, [isBlocked, title, message, setProtection]);

  useEffect(() => {
    return () => {
      clearProtection();
    };
  }, [clearProtection]);

  return {
    confirmNavigation,
    clearProtection,
  };
}
