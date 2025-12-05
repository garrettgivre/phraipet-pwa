import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  hueRotation: number;
  setHueRotation: (hue: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [hueRotation, setHueRotation] = useState<number>(() => {
    const saved = localStorage.getItem('theme_hue');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('theme_hue', hueRotation.toString());
    document.documentElement.style.setProperty('--theme-hue-rotate', `${hueRotation}deg`);
  }, [hueRotation]);

  return (
    <ThemeContext.Provider value={{ hueRotation, setHueRotation }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

