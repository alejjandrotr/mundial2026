import { createContext, useContext, useState, type ReactNode } from 'react';

type Phase = 'grupos' | '32avos' | '16avos' | '8vos' | '4tos' | 'semis' | 'final';

interface PhaseContextType {
  activePhase: Phase;
  setActivePhase: (phase: Phase) => void;
  availablePhases: { id: Phase; label: string }[];
}

const PhaseContext = createContext<PhaseContextType | undefined>(undefined);

export const PhaseProvider = ({ children }: { children: ReactNode }) => {
  const [activePhase, setActivePhase] = useState<Phase>('8vos'); // Empezamos en 8vos por defecto ahora

  const availablePhases: { id: Phase; label: string }[] = [
    { id: 'grupos', label: 'Fase de Grupos' },
    { id: '32avos', label: '16avos de Final' },
    { id: '16avos', label: 'Octavos de Final' },
    { id: '8vos', label: 'Cuartos de Final' },
    // Se irán añadiendo más conforme avancemos
  ];

  return (
    <PhaseContext.Provider value={{ activePhase, setActivePhase, availablePhases }}>
      {children}
    </PhaseContext.Provider>
  );
};

export const usePhase = () => {
  const context = useContext(PhaseContext);
  if (context === undefined) {
    throw new Error('usePhase debe usarse dentro de un PhaseProvider');
  }
  return context;
};
