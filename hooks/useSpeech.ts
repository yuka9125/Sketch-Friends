import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Setup Synthesis
      synthesisRef.current = window.speechSynthesis;

      // Setup Recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ja-JP'; // Japanese
        
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthesisRef.current) return;

    // Cancel current speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    
    // Try to find a friendly Japanese voice
    const voices = synthesisRef.current.getVoices();
    // Prioritize Google Japanese or generic Japanese voices
    const friendlyVoice = voices.find(v => v.lang === 'ja-JP' && (v.name.includes('Google') || v.name.includes('Kyoko') || v.name.includes('O-Ren'))) || voices.find(v => v.lang === 'ja-JP');
    
    if (friendlyVoice) utterance.voice = friendlyVoice;
    
    utterance.pitch = 1.2; // Higher pitch for character
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesisRef.current.speak(utterance);
  }, []);

  const listen = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!recognitionRef.current) {
        alert("お使いのブラウザは音声認識に対応していません。");
        reject("Not supported");
        return;
      }

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        reject(event.error);
      };

      recognitionRef.current.start();
    });
  }, []);

  const stopSpeaking = () => {
    if (synthesisRef.current) synthesisRef.current.cancel();
    setIsSpeaking(false);
  };

  return { speak, listen, isListening, isSpeaking, stopSpeaking };
};