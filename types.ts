import { Type } from "@google/genai";

export interface CharacterVersion {
  versionNumber: number;
  imageUrl: string; // Base64
  createdAt: number;
  description: string; // "羽が生えて大きくなった"
  aiRecognitionText: string;
}

export interface CharacterSettings {
  species: string; // identity (e.g., Lion, Robot, Car)
  originalSpecies: string; // The first one set
  name: string;
  ability: string;
  favoriteFood: string;
  childName: string;
  personality: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Character {
  id: string;
  createdAt: number; // Birthday
  settings: CharacterSettings;
  versions: CharacterVersion[];
  currentVersionIndex: number; // 0-based index into versions
  isSetupComplete: boolean;
  conversationHistory: ChatMessage[];
}

export enum SetupStage {
  IDENTITY = 'IDENTITY', // Changed from SPECIES
  NAME = 'NAME',
  ABILITY = 'ABILITY',
  FOOD = 'FOOD',
  CHILD_NAME = 'CHILD_NAME',
  COMPLETE = 'COMPLETE'
}

// Schema for Gemini Structured Output during Setup
export const SETUP_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replyToChild: {
      type: Type.STRING,
      description: "子どもへの返答。短く（最大2文）、元気よく、ひらがな多めで。HTMLタグは使用禁止。改行は\\nを使用。",
    },
    extractedValue: {
      type: Type.STRING,
      description: "子どもの答えから抽出した具体的な値（例: 'ライオン', 'レオン', '走ること'）。不明な場合はnull。",
      nullable: true,
    },
    isSatisfied: {
      type: Type.BOOLEAN,
      description: "子どもが現在の質問に対して有効な答えを返した場合はtrue。",
    }
  },
  required: ["replyToChild", "isSatisfied"],
};

export interface SetupResponse {
  replyToChild: string;
  extractedValue: string | null;
  isSatisfied: boolean;
}