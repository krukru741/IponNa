import { create } from 'zustand';

interface AppState {
  language: 'en' | 'tl';
  setLanguage: (lang: 'en' | 'tl') => void;
  pin: string | null;
  setPin: (pin: string | null) => void;
  isUnlocked: boolean;
  setUnlocked: (unlocked: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  pin: localStorage.getItem('iponna_pin'),
  setPin: (pin) => {
    if (pin) {
      localStorage.setItem('iponna_pin', pin);
    } else {
      localStorage.removeItem('iponna_pin');
    }
    set({ pin });
  },
  isUnlocked: !localStorage.getItem('iponna_pin'),
  setUnlocked: (unlocked) => set({ isUnlocked: unlocked }),
}));
