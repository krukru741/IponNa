import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';

export const PinScreen: React.FC = () => {
  const { pin, setUnlocked, language } = useAppStore();
  const t = useTranslation(language);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleInput = (val: string) => {
    if (input.length < 4) {
      const newVal = input + val;
      setInput(newVal);
      if (newVal.length === 4) {
        if (newVal === pin) {
          setUnlocked(true);
        } else {
          setError(true);
          setTimeout(() => {
            setInput('');
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setInput(input.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 bg-emerald-50 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-emerald-100">
        <h1 className="text-3xl font-extrabold text-emerald-600 mb-2 tracking-tight">IponNa</h1>
        <p className="text-gray-500 mb-8 font-medium text-sm">{t('enterPin')}</p>
        
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-300 ${
                i < input.length 
                  ? error ? 'bg-red-500 scale-110' : 'bg-emerald-600 scale-110 shadow-sm' 
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-red-500 font-bold mb-4 text-sm animate-pulse">{t('wrongPin')}</p>}

        <div className="grid grid-cols-3 gap-y-4 gap-x-3 max-w-[240px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleInput(num.toString())}
              className="w-16 h-16 rounded-full bg-gray-50 text-2xl font-semibold text-gray-800 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 active:scale-95 transition-all shadow-sm mx-auto"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleInput('0')}
            className="w-16 h-16 rounded-full bg-gray-50 text-2xl font-semibold text-gray-800 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 active:scale-95 transition-all shadow-sm mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full bg-gray-50 text-xl font-semibold text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 active:bg-red-100 active:scale-95 transition-all shadow-sm mx-auto"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};
