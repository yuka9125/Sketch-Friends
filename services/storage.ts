import { Character } from "../types";

const STORAGE_KEY = 'sketch_friends_data';

export const getCharacters = (): Character[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load characters", e);
    return [];
  }
};

export const getCharacterById = (id: string): Character | undefined => {
  const chars = getCharacters();
  return chars.find(c => c.id === id);
};

export const saveCharacter = (character: Character): void => {
  const chars = getCharacters();
  const index = chars.findIndex(c => c.id === character.id);
  
  if (index >= 0) {
    chars[index] = character;
  } else {
    chars.push(character);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
  } catch (e) {
    console.error("Storage full or error", e);
    alert("保存容量がいっぱいです！古いお友達を消してください。");
  }
};

export const deleteCharacter = (id: string): void => {
  const chars = getCharacters().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
};

// Helper to resize image to save space in LocalStorage
export const resizeImage = (base64Str: string, maxWidth = 512): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      if (scale >= 1) {
        resolve(base64Str);
        return;
      }
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};