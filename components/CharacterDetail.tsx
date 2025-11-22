import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCharacterContext } from '../contexts/CharacterContext';
import { ArrowLeft, MessageCircle, Zap, History, Trash2 } from 'lucide-react';
import * as storage from '../services/storage';

export const CharacterDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { characters, removeCharacter } = useCharacterContext();
  
  const character = characters.find(c => c.id === id);

  if (!character) return <div>キャラクターがみつかりません</div>;

  const currentVersion = character.versions[character.currentVersionIndex];

  const handleDelete = () => {
    if (confirm("ほんとうに さよならする？")) {
      removeCharacter(character.id);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      {/* Header Image */}
      <div className="relative h-80 w-full">
        <img src={currentVersion.imageUrl} className="w-full h-full object-cover" alt="Character" />
        <div className="absolute inset-0 bg-gradient-to-t from-yellow-50 to-transparent"></div>
        <Link to="/" className="absolute top-4 left-4 bg-white/80 p-2 rounded-full shadow-lg">
          <ArrowLeft size={24} className="text-gray-700" />
        </Link>
        <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-4xl font-black text-gray-800 mb-1">{character.settings.name}</h1>
            <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
              {character.settings.species}
            </span>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="flex-1 px-6 py-4 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-xs text-blue-400 uppercase font-bold mb-1">とくいなこと</p>
                    <p className="text-lg font-bold text-gray-800 leading-tight">{character.settings.ability}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl">
                    <p className="text-xs text-green-400 uppercase font-bold mb-1">すきなたべもの</p>
                    <p className="text-lg font-bold text-gray-800 leading-tight">{character.settings.favoriteFood}</p>
                </div>
            </div>

            <div className="flex gap-3">
                <Link to={`/chat/${character.id}`} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition">
                    <MessageCircle size={24} />
                    おはなし
                </Link>
                <Link to={`/evolve/${character.id}`} className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition">
                    <Zap size={24} />
                    しんか
                </Link>
            </div>
        </div>

        {/* History */}
        <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <History size={20} />
                しんかの きろく
            </h3>
            <div className="space-y-4">
                {[...character.versions].reverse().map((ver) => (
                    <div key={ver.versionNumber} className="bg-white p-3 rounded-2xl shadow-sm flex gap-4 items-center">
                        <img src={ver.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                        <div>
                            <p className="font-bold text-gray-800">バージョン {ver.versionNumber}</p>
                            <p className="text-sm text-gray-500">{new Date(ver.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-orange-500">{ver.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        <button onClick={handleDelete} className="w-full py-4 text-red-400 text-sm font-bold flex items-center justify-center gap-2 mb-8">
            <Trash2 size={16} />
            さようならする
        </button>
      </div>
    </div>
  );
};