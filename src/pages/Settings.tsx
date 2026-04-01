import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, logout, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { LogOut, Shield, Globe, User, Tags, Trash2, Plus } from 'lucide-react';

export const Settings: React.FC = () => {
  const { language, setLanguage, pin, setPin } = useAppStore();
  const t = useTranslation(language);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'categories'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));
    return () => unsubscribe();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newCatName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        userId: auth.currentUser.uid,
        name: newCatName.trim(),
        type: newCatType,
        createdAt: new Date().toISOString()
      });
      setNewCatName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 4) {
      setPin(newPin);
      setShowPinSetup(false);
      setNewPin('');
    } else {
      alert('PIN must be 4 digits');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 px-1">{t('settings')}</h1>
      
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center overflow-hidden border border-emerald-100">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{auth.currentUser?.displayName || 'User'}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{auth.currentUser?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe size={14} /> {t('language')}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${language === 'en' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('tl')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all ${language === 'tl' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                Tagalog
              </button>
            </div>
          </div>

          <div className="pt-1">
            <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Shield size={14} /> {t('pinSecurity')}
            </h3>
            
            {pin ? (
              <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="font-medium text-sm text-gray-700">PIN is active</span>
                <button 
                  onClick={() => setPin(null)}
                  className="text-red-600 font-medium text-xs hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t('removePin')}
                </button>
              </div>
            ) : showPinSetup ? (
              <form onSubmit={handleSetPin} className="flex gap-2">
                <input 
                  type="password" 
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit PIN"
                  className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-center tracking-[0.5em] font-bold transition-all text-sm"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white px-5 rounded-xl font-medium hover:bg-emerald-700 shadow-sm transition-colors text-sm"
                >
                  Save
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setShowPinSetup(true)}
                className="w-full py-3 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 border border-gray-100 transition-colors"
              >
                {t('setPin')}
              </button>
            )}
          </div>

          <div className="pt-1">
            <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Tags size={14} /> {t('manageCategories')}
            </h3>
            
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
              <select 
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
                className="p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none w-24 transition-all text-sm"
              >
                <option value="expense">{t('expense')}</option>
                <option value="income">{t('income')}</option>
              </select>
              <input 
                type="text" 
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t('categoryName')}
                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <button 
                type="submit"
                disabled={!newCatName.trim()}
                className="bg-emerald-600 text-white px-4 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="font-medium text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-3 bg-gray-50 rounded-xl border border-gray-100">No custom categories yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-red-600 font-bold rounded-2xl hover:bg-red-50 border border-red-100 shadow-sm transition-colors text-sm"
      >
        <LogOut size={18} />
        {t('logout')}
      </button>
    </div>
  );
};
