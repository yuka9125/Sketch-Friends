import React, { createContext, useContext, useState, useEffect } from 'react';
import { Character, ChatMessage } from '../types';
import * as storage from '../services/storage';

interface CharacterContextType {
  characters: Character[];
  refreshCharacters: () => void;
  addCharacter: (char: Character) => void;
  updateCharacter: (char: Character) => void;
  removeCharacter: (id: string) => void;
}

const CharacterContext = createContext<CharacterContextType | undefined>(undefined);

export const CharacterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [characters, setCharacters] = useState<Character[]>([]);

  useEffect(() => {
    refreshCharacters();
  }, []);

  const refreshCharacters = () => {
    setCharacters(storage.getCharacters());
  };

  const addCharacter = (char: Character) => {
    storage.saveCharacter(char);
    refreshCharacters();
  };

  const updateCharacter = (char: Character) => {
    storage.saveCharacter(char);
    refreshCharacters();
  };

  const removeCharacter = (id: string) => {
    storage.deleteCharacter(id);
    refreshCharacters();
  };

  return (
    <CharacterContext.Provider value={{ characters, refreshCharacters, addCharacter, updateCharacter, removeCharacter }}>
      {children}
    </CharacterContext.Provider>
  );
};

export const useCharacterContext = () => {
  const context = useContext(CharacterContext);
  if (!context) throw new Error("useCharacterContext must be used within Provider");
  return context;
};
