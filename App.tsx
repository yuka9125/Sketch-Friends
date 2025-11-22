import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './components/Home';
import { CreateCharacter } from './components/CreateCharacter';
import { CharacterDetail } from './components/CharacterDetail';
import { ChatInterface } from './components/ChatInterface';
import { Toaster } from './components/Toaster';
import { CharacterProvider } from './contexts/CharacterContext';

const hasApiKey = !!process.env.API_KEY;

const App: React.FC = () => {
  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">設定エラー</h1>
        <p className="text-gray-700">APIキーが見つかりません。<code>process.env.API_KEY</code> を設定してください。</p>
      </div>
    );
  }

  return (
    <CharacterProvider>
      <HashRouter>
        <div className="min-h-screen w-full max-w-md mx-auto bg-white shadow-2xl overflow-hidden flex flex-col relative font-sans">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateCharacter mode="new" />} />
            <Route path="/evolve/:id" element={<CreateCharacter mode="evolve" />} />
            <Route path="/character/:id" element={<CharacterDetail />} />
            <Route path="/chat/:id" element={<ChatInterface />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </div>
      </HashRouter>
    </CharacterProvider>
  );
};

export default App;