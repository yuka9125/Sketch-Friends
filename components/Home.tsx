import React from 'react';
import { Link } from 'react-router-dom';
import { useCharacterContext } from '../contexts/CharacterContext';
import { PlusCircle, MessageCircle } from 'lucide-react';

export const Home: React.FC = () => {
  const { characters } = useCharacterContext();

  return (
    <div className="flex-1 flex flex-col bg-yellow-50 p-4 h-full overflow-y-auto">
      <header className="flex justify-between items-center mb-6 mt-2">
        <h1 className="text-3xl font-black text-orange-500 tracking-tight">おえかき ともだち</h1>
      </header>

      {characters.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80">
          <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-orange-200">
            <span className="text-6xl">🎨</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">まだ ともだちが いないよ！</h2>
          <p className="text-gray-500 mb-8">えをかいて、ともだちを つくろう</p>
          <Link to="/create" className="bg-orange-500 hover:bg-orange-600 text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg transform transition active:scale-95 flex items-center gap-2">
            <PlusCircle size={28} />
            ともだちをつくる
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-20">
            {characters.map((char) => {
              const currentVer = char.versions[char.currentVersionIndex];
              return (
                <Link key={char.id} to={`/character/${char.id}`} className="bg-white rounded-2xl p-3 shadow-lg border-2 border-orange-100 hover:border-orange-300 transition relative overflow-hidden group">
                  <div className="aspect-square bg-gray-100 rounded-xl mb-3 overflow-hidden relative">
                    <img src={currentVer.imageUrl} alt={char.settings.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 right-0 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-tl-lg">
                      Lv. {char.versions.length}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 truncate">{char.settings.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{char.settings.species}</p>
                </Link>
              );
            })}
          </div>
          
          <div className="fixed bottom-6 right-6">
            <Link to="/create" className="bg-green-500 hover:bg-green-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transform transition hover:scale-110 active:scale-95">
              <PlusCircle size={32} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
};