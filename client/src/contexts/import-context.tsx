import React, { createContext, useContext, useState, useCallback } from 'react';

interface ImportContextType {
  isImporting: boolean;
  importProgress: number;
  setImporting: (importing: boolean) => void;
  setImportProgress: (progress: number) => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: { children: React.ReactNode }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgressState] = useState(0);

  const setImporting = useCallback((importing: boolean) => {
    setIsImporting(importing);
    if (!importing) {
      setImportProgressState(0);
    }
  }, []);

  const setImportProgress = useCallback((progress: number) => {
    setImportProgressState(progress);
  }, []);

  return (
    <ImportContext.Provider value={{ 
      isImporting, 
      importProgress,
      setImporting, 
      setImportProgress 
    }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
}

// Hook for safe navigation - shows warning if import in progress
export function useNavigationGuard() {
  const { isImporting, importProgress } = useImport();

  const canNavigate = useCallback(() => {
    return !isImporting;
  }, [isImporting]);

  const getWarningMessage = useCallback(() => {
    return `Import in progress (${importProgress.toFixed(0)}%). Leaving this page will cancel the import.`;
  }, [importProgress]);

  return { canNavigate, getWarningMessage, isImporting, importProgress };
}
