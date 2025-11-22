import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, RefreshCw, Mic, Send, X } from 'lucide-react';
import { useCharacterContext } from '../contexts/CharacterContext';
import { analyzeDrawing, generateSetupResponse, generateEvolution } from '../services/geminiService';
import { resizeImage } from '../services/storage';
import { Character, SetupStage, SetupResponse } from '../types';
import { useSpeech } from '../hooks/useSpeech';
import toast from 'react-hot-toast';

interface Props {
  mode: 'new' | 'evolve';
}

export const CreateCharacter: React.FC<Props> = ({ mode }) => {
  const navigate = useNavigate();
  const { id: existingId } = useParams();
  const { addCharacter, updateCharacter, characters } = useCharacterContext();
  const { speak, listen, isListening, stopSpeaking } = useSpeech();

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Flow State
  const [step, setStep] = useState<'camera' | 'analyzing' | 'setup' | 'complete'>('camera');
  const [setupStage, setSetupStage] = useState<SetupStage>(SetupStage.IDENTITY);
  
  // Data State
  const [tempSettings, setTempSettings] = useState<any>({});
  const [conversation, setConversation] = useState<{role: 'model' | 'user', text: string}[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Camera Logic ---
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.onloadedmetadata = () => setIsCameraReady(true);
      }
    } catch (err) {
      console.error("Camera error", err);
      toast.error("カメラがつかえません");
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(base64);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  // --- Processing Logic ---

  const startAnalysis = async () => {
    if (!capturedImage) return;
    setStep('analyzing');

    if (mode === 'evolve' && existingId) {
      // Evolution Flow
      const existingChar = characters.find(c => c.id === existingId);
      if (!existingChar) return;

      const result = await generateEvolution(existingChar, capturedImage);
      const resized = await resizeImage(capturedImage);
      
      const updatedChar: Character = {
        ...existingChar,
        currentVersionIndex: existingChar.versions.length,
        conversationHistory: [
          ...existingChar.conversationHistory, 
          { id: Date.now().toString(), role: 'model', text: result.reaction, timestamp: Date.now() }
        ],
        versions: [
          ...existingChar.versions,
          {
            versionNumber: existingChar.versions.length + 1,
            imageUrl: resized,
            createdAt: Date.now(),
            description: result.description,
            aiRecognitionText: result.description
          }
        ]
      };
      
      updateCharacter(updatedChar);
      speak(result.reaction);
      navigate(`/character/${existingId}`);

    } else {
      // New Character Flow
      const desc = await analyzeDrawing(capturedImage);
      setTempSettings({ originalSpecies: desc }); // Temporary holder
      setStep('setup');
      // Initial Trigger
      handleSetupInteraction(""); 
    }
  };

  // --- Setup Conversation Logic ---

  const handleSetupInteraction = async (input: string) => {
    setIsProcessing(true);
    try {
      // Add user message to UI immediately if it exists
      if (input) {
        setConversation(prev => [...prev, { role: 'user', text: input }]);
      }

      const response: SetupResponse = await generateSetupResponse(
        setupStage,
        capturedImage!,
        input,
        tempSettings
      );

      // Add model response to UI
      setConversation(prev => [...prev, { role: 'model', text: response.replyToChild }]);
      speak(response.replyToChild);

      // Process logic
      if (response.isSatisfied && response.extractedValue) {
        const newSettings = { ...tempSettings };
        
        // Update settings based on current stage
        switch (setupStage) {
          case SetupStage.IDENTITY:
            newSettings.species = response.extractedValue;
            setSetupStage(SetupStage.NAME);
            break;
          case SetupStage.NAME:
            newSettings.name = response.extractedValue;
            setSetupStage(SetupStage.ABILITY);
            break;
          case SetupStage.ABILITY:
            newSettings.ability = response.extractedValue;
            setSetupStage(SetupStage.FOOD);
            break;
          case SetupStage.FOOD:
            newSettings.favoriteFood = response.extractedValue;
            setSetupStage(SetupStage.CHILD_NAME);
            break;
          case SetupStage.CHILD_NAME:
            newSettings.childName = response.extractedValue;
            setSetupStage(SetupStage.COMPLETE);
            finishSetup(newSettings);
            return; // Don't loop again here, finishSetup handles it
        }
        setTempSettings(newSettings);
        
        // Trigger next question automatically after a small delay
        setTimeout(() => handleSetupInteraction(""), 1000);
      }
    } catch (err) {
      console.error(err);
      toast.error("あれ？よくきこえなかったよ。");
    } finally {
      setIsProcessing(false);
      setUserInput('');
    }
  };

  const finishSetup = async (finalSettings: any) => {
    const resized = await resizeImage(capturedImage!);
    const newChar: Character = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      isSetupComplete: true,
      currentVersionIndex: 0,
      conversationHistory: [],
      settings: {
        ...finalSettings,
        personality: 'Friendly'
      },
      versions: [{
        versionNumber: 1,
        imageUrl: resized,
        createdAt: Date.now(),
        description: "たんじょう",
        aiRecognitionText: finalSettings.originalSpecies
      }]
    };

    addCharacter(newChar);
    setStep('complete');
    setTimeout(() => navigate(`/character/${newChar.id}`), 2000);
  };

  const handleVoiceInput = async () => {
    try {
      stopSpeaking();
      const text = await listen();
      setUserInput(text);
      handleSetupInteraction(text);
    } catch (e) {
      // Error handled in hook
    }
  };

  // --- Renders ---

  if (step === 'camera') {
    return (
      <div className="h-screen flex flex-col bg-black relative">
        <div className="flex-1 relative overflow-hidden">
          {!capturedImage ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Overlay Guide */}
          {!capturedImage && (
            <div className="absolute inset-0 border-4 border-white/30 rounded-lg m-4 pointer-events-none flex items-center justify-center">
              <p className="text-white/70 font-bold text-xl bg-black/20 p-2 rounded">
                {mode === 'new' ? 'ともだちを かこう！' : 'しんか させよう！'}
              </p>
            </div>
          )}
        </div>

        <div className="h-32 bg-black/80 flex items-center justify-around px-6">
          {!capturedImage ? (
            <button 
              onClick={captureImage}
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition"
            />
          ) : (
            <>
              <button onClick={retake} className="text-white flex flex-col items-center">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-1">
                  <RefreshCw size={24} />
                </div>
                <span className="text-xs">とりなおす</span>
              </button>
              <button onClick={startAnalysis} className="text-white flex flex-col items-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-1 animate-pulse">
                  <Check size={32} />
                </div>
                <span className="text-xs font-bold">OK!</span>
              </button>
            </>
          )}
        </div>
        
        <button onClick={() => navigate('/')} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full">
          <X />
        </button>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-yellow-50 p-8 text-center">
        <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce">
          <span className="text-6xl">🥚</span>
        </div>
        <h2 className="text-2xl font-bold text-orange-600 mb-2">
          {mode === 'new' ? 'うまれるよ...' : 'しんか中...'}
        </h2>
        <p className="text-gray-500">まほうを かけているよ！</p>
      </div>
    );
  }

  if (step === 'setup') {
    const lastMsg = conversation[conversation.length - 1];
    
    return (
      <div className="h-screen flex flex-col bg-yellow-50 relative">
        {/* EXIT BUTTON */}
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-4 right-4 z-50 bg-white/80 hover:bg-red-100 text-red-500 px-3 py-2 rounded-full font-bold shadow-sm text-sm flex items-center gap-1 backdrop-blur-sm transition"
        >
          <X size={18} /> おわる
        </button>

        <div className="flex-1 p-4 overflow-y-auto flex flex-col items-center justify-center">
          <div className="w-48 h-48 rounded-2xl border-4 border-orange-200 shadow-xl overflow-hidden mb-6 relative animate-float">
            <img src={capturedImage!} className="w-full h-full object-cover" />
          </div>
          
          {/* Chat Bubble */}
          {lastMsg && lastMsg.role === 'model' && (
            <div className="bg-white p-6 rounded-3xl shadow-lg max-w-xs text-center relative border-2 border-orange-100">
              <p className="text-xl font-medium text-gray-800 leading-relaxed whitespace-pre-wrap">
                {lastMsg.text}
              </p>
              <div className="absolute w-4 h-4 bg-white border-b-2 border-r-2 border-orange-100 transform rotate-45 -top-2 left-1/2 -translate-x-1/2 bg-white"></div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-t-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <input 
              type="text" 
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="こたえをかいてね..."
              className="flex-1 bg-gray-100 border-0 rounded-full px-6 py-4 text-lg focus:ring-2 focus:ring-orange-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleSetupInteraction(userInput)}
            />
            {userInput ? (
              <button 
                onClick={() => handleSetupInteraction(userInput)}
                disabled={isProcessing}
                className="bg-orange-500 text-white p-4 rounded-full shadow-lg active:scale-95 transition"
              >
                <Send size={24} />
              </button>
            ) : (
              <button 
                onClick={handleVoiceInput}
                disabled={isProcessing || isListening}
                className={`p-4 rounded-full shadow-lg active:scale-95 transition ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} text-white`}
              >
                <Mic size={24} />
              </button>
            )}
          </div>
          <p className="text-center text-gray-400 text-xs mt-2">
            {isListening ? "きいてるよ..." : "マイクをおして はなしてね"}
          </p>
        </div>
      </div>
    );
  }

  return null;
};