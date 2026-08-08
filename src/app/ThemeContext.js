import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const themes = {
  light: {
    background: '#ffffff',
    text: '#000000',
    cardBackground: '#E1E1E1',
    borderColor: 'rgba(0, 0, 0, 0.61)',
    inputBackground: '#E1E1E1',
  },
  dark: {
    background: '#1a1a1a',
    text: '#ffffff',
    cardBackground: '#2d2d2d',
    borderColor: 'rgba(255, 255, 255, 0.61)',
    inputBackground: '#2d2d2d',
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme !== null) {
          setIsDarkMode(JSON.parse(savedTheme));
        }
      } catch (error) {
        console.error('Erro ao carregar preferência do tema:', error);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('themePreference', JSON.stringify(newTheme));
    } catch (error) {
      console.error('Erro ao salvar preferência do tema:', error);
    }
  };

  const theme = isDarkMode ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}; 