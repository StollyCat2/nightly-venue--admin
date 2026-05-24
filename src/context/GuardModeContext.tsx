import React, { createContext, useContext, useState } from 'react';

interface GuardModeContextType {
  isGuardMode: boolean;
  enterGuardMode: () => void;
  exitGuardMode: () => void;
}

const GuardModeContext = createContext<GuardModeContextType>({
  isGuardMode: false,
  enterGuardMode: () => {},
  exitGuardMode: () => {},
});

export function GuardModeProvider({ children }: { children: React.ReactNode }) {
  const [isGuardMode, setIsGuardMode] = useState(false);

  return (
    <GuardModeContext.Provider
      value={{
        isGuardMode,
        enterGuardMode: () => setIsGuardMode(true),
        exitGuardMode: () => setIsGuardMode(false),
      }}
    >
      {children}
    </GuardModeContext.Provider>
  );
}

export function useGuardMode() {
  return useContext(GuardModeContext);
}
