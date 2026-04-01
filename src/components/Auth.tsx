import React, { useState } from 'react';
import { loginWithGoogle, loginWithFacebook, signUpWithEmail, loginWithEmail } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { Wallet, Mail, Lock } from 'lucide-react';

export const Auth: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border border-emerald-100">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Wallet size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">IponNa</h1>
        <p className="text-gray-500 mb-8 font-medium text-sm">{t('tagline')}</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium mb-5 border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 text-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium text-gray-900 text-sm"
            />
          </div>
          <button 
            type="submit"
            className="w-full py-3 bg-emerald-600 text-white font-bold text-base rounded-xl hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
          >
            {isSignUp ? t('signUp') : t('login')}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-emerald-600 text-xs font-bold hover:text-emerald-700 transition-colors mb-6"
        >
          {isSignUp ? t('haveAccount') : t('noAccount')}
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-500 font-medium">{t('orContinueWith')}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 transition-all text-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {t('loginWithGoogle')}
          </button>

          <button
            type="button"
            onClick={loginWithFacebook}
            className="w-full flex items-center justify-center gap-2 bg-[#1877F2] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#166FE5] shadow-sm transition-all text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className="w-5 h-5 fill-current"><path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
            {t('loginWithFacebook')}
          </button>
        </div>
      </div>
    </div>
  );
};
