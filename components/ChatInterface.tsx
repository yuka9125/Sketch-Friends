import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Send, Volume2, VolumeX, Home, XCircle } from 'lucide-react';
import { useCharacterContext } from '../contexts/CharacterContext';
import { generateChatResponse } from '../services/geminiService';
import { useSpeech } from '../hooks/useSpeech';
import { ChatMessage } from '../types';

export const ChatInterface: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { characters, updateCharacter } = useCharacterContext();
  const character = characters.find(c => c.id === id);
  
  const { speak, listen, isListening, isSpeaking, stopSpeaking } = useSpeech();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_TURNS = 3; // Limit conversation to 3 turns

  // Reset session state when ID changes (switching characters)
  useEffect(() => {
    setTurnCount(0);
    setIsSessionEnded(false);
    setInput('');
    setIsLoading(false);
    stopSpeaking();
  }, [id]);

  // Load messages and greet
  useEffect(() => {
    if (character) {
      setMessages(character.conversationHistory || []);
      
      // Only greet if history is empty (new character) and not currently handling a session end
      if ((!character.conversationHistory || character.conversationHistory.length === 0) && !isSessionEnded && !isLoading) {
         // Small delay to allow component to mount
         const timer = setTimeout(() => {
             const greeting = `こんにちは ${character.settings.childName}ちゃん！ あそぼう！`;
             speak(greeting);
         }, 500);
         return () => clearTimeout(timer);
      }
    }
  }, [character, id, isSessionEnded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!character) return <div>Loading...</div>;
  const currentVer = character.versions[character.currentVersionIndex];
  const otherCharacters = characters.filter(c => c.id !== id);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // Determine if this is the last turn
    const nextTurnCount = turnCount + 1;
    const isEnding = nextTurnCount >= MAX_TURNS;
    setTurnCount(nextTurnCount);

    // Generate AI response
    const responseText = await generateChatResponse(character, text, isEnding);
    
    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: Date.now()
    };

    const updatedHistory = [...newHistory, aiMsg];
    setMessages(updatedHistory);
    
    // Persist
    updateCharacter({
      ...character,
      conversationHistory: updatedHistory
    });

    setIsLoading(false);
    speak(responseText);

    if (isEnding) {
      setIsSessionEnded(true);
    }
  };

  const handleMic = async () => {
    stopSpeaking();
    try {
      const text = await listen();
      handleSend(text);
    } catch (e) {}
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-yellow-50 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Link to={`/character/${id}`} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div className="flex flex-col">
            <h2 className="font-bold text-lg text-gray-800 leading-tight">{character.settings.name}</h2>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-500 animate-ping' : 'bg-gray-300'}`}></span>
              <span className="text-xs text-gray-500">{isSpeaking ? 'はなしてる...' : 'きいてるよ'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={stopSpeaking} className="p-2 text-gray-500 hover:text-orange-500">
            {isSpeaking ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <button onClick={() => navigate('/')} className="bg-red-100 hover:bg-red-200 text-red-500 px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 transition">
             <XCircle size={16} /> おわる
          </button>
        </div>
      </div>

      {/* Character Area */}
      <div className="flex-1 bg-yellow-50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className={`relative w-64 h-64 transition-transform duration-300 ${isSpeaking ? 'animate-talk scale-105' : 'animate-float'}`}>
           <img src={currentVer.imageUrl} className="w-full h-full object-contain drop-shadow-2xl" />
        </div>
        
        {/* Status Indicator Overlay */}
        {isSessionEnded && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-sm animate-in fade-in p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden">
              
              {/* Greeting */}
              <div className="p-6 pb-2 w-full">
                <span className="text-4xl block mb-2">👋</span>
                <h3 className="text-2xl font-black text-orange-500 mb-1">またあそぼうね！</h3>
                <p className="text-gray-500 text-sm mb-4">つぎは だれと あそぶ？</p>
              </div>

              {/* Character List */}
              {otherCharacters.length > 0 && (
                <div className="w-full bg-orange-50 p-4 mb-2 overflow-x-auto">
                  <div className="flex gap-3 justify-center">
                    {otherCharacters.slice(0, 3).map(other => (
                      <Link key={other.id} to={`/chat/${other.id}`} className="flex flex-col items-center group">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-orange-200 overflow-hidden shadow-sm group-active:scale-95 transition">
                          <img src={other.versions[other.currentVersionIndex].imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 mt-1 truncate w-16">{other.settings.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="p-4 w-full space-y-3">
                 <button 
                  onClick={() => navigate('/')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Home size={24} />
                  みんなをみる
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="h-1/3 bg-white border-t border-gray-100 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm font-medium whitespace-pre-wrap leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-orange-500 text-white rounded-tr-none' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-gray-400 text-xs text-center animate-pulse">かんがえ中...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-100 pb-6">
          <div className={`flex gap-2 items-center transition-opacity duration-500 ${isSessionEnded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={handleMic}
                disabled={isListening}
                className={`p-3 rounded-full transition ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} shadow-md`}
              >
                <Mic size={24} />
              </button>
              <input 
                className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                placeholder="なにかはなしてね..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              />
              <button 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="bg-orange-500 text-white p-3 rounded-full shadow-md disabled:opacity-50 active:scale-95 transition"
              >
                <Send size={24} />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};