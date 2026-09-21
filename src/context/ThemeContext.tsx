import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'classic-green';

export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  isGreen: boolean;
  isColourUI: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleOldGreenUI: () => void;
  toggleColourUI: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  isLight: false,
  isGreen: false,
  isColourUI: false,
  toggleTheme: () => {},
  cycleTheme: () => {},
  setTheme: () => {},
  toggleOldGreenUI: () => {},
  toggleColourUI: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('ninimo_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'classic-green') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('ninimo_theme', theme);
    } catch {}

    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.remove('dark', 'classic-green', 'colour-ui');
      root.classList.add('light');
      body.style.backgroundColor = '#f8fafc';
      body.style.backgroundImage = 'none';
      body.style.color = '#0f172a';
    } else if (theme === 'classic-green') {
      root.classList.remove('light');
      root.classList.add('dark', 'classic-green', 'colour-ui');
      body.style.backgroundColor = '#080d14';
      body.style.backgroundImage = 'none';
      body.style.backgroundAttachment = 'initial';
      body.style.color = '#f1f5f9';
    } else {
      root.classList.remove('light', 'classic-green', 'colour-ui');
      root.classList.add('dark');
      body.style.backgroundColor = '#09090b';
      body.style.backgroundImage = 'none';
      body.style.backgroundAttachment = 'initial';
      body.style.color = '#f4f4f5';
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'classic-green';
      return 'dark';
    });
  };

  const toggleColourUI = () => {
    setThemeState((prev) => (prev === 'classic-green' ? 'dark' : 'classic-green'));
  };

  const toggleOldGreenUI = toggleColourUI;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const isDark = theme !== 'light';
  const isLight = theme === 'light';
  const isGreen = theme === 'classic-green';
  const isColourUI = theme === 'classic-green';

  return (
    <ThemeContext.Provider value={{ theme, isDark, isLight, isGreen, isColourUI, toggleTheme, cycleTheme, setTheme, toggleOldGreenUI, toggleColourUI }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
