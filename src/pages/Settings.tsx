import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { auth, db, logout, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { LogOut, Shield, Globe, User, Tags, Trash2, Plus, Download, Bell, ChevronRight, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { language, setLanguage, pin, setPin } = useAppStore();
  const t = useTranslation(language);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('expense');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'categories'), where('userId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));
    
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

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

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  const handleExportData = async () => {
    if (!auth.currentUser) return;
    setIsExporting(true);
    try {
      const collectionsToExport = ['transactions', 'goals', 'loans', 'paluwagan', 'bills', 'categories'];
      const exportData: Record<string, any[]> = {};

      for (const colName of collectionsToExport) {
        const q = query(collection(db, colName), where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        exportData[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `iponna_export_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 px-1">{t('settings')}</h1>
      
      {/* Profile Section */}
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 flex items-center gap-4">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-100">
          {auth.currentUser?.photoURL ? (
            <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={32} />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{auth.currentUser?.displayName || 'User'}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{auth.currentUser?.email}</p>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={14} /> Preferences
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('language')}</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${language === 'en' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                English
              </button>
              <button 
                onClick={() => setLanguage('tl')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${language === 'tl' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
              >
                Tagalog
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Push Notifications</label>
                <p className="text-[10px] text-gray-500 mt-0.5">Get reminders for bills and loans</p>
              </div>
              {notificationsEnabled ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 size={14} /> Enabled
                </span>
              ) : (
                <button 
                  onClick={handleEnableNotifications}
                  className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={14} /> Security
          </h3>
        </div>
        <div className="p-5">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700">{t('pinSecurity')}</label>
              <p className="text-[10px] text-gray-500 mt-0.5">Require a 4-digit PIN to open the app</p>
            </div>
            
            {pin ? (
              <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <span className="font-medium text-sm text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  PIN is active
                </span>
                <button 
                  onClick={() => setPin(null)}
                  className="text-red-600 font-medium text-xs hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {t('removePin')}
                </button>
              </div>
            ) : showPinSetup ? (
              <form onSubmit={handleSetPin} className="flex gap-2 mt-2">
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
                  disabled={newPin.length !== 4}
                  className="bg-emerald-600 text-white px-5 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors text-sm"
                >
                  Save
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setShowPinSetup(true)}
                className="w-full py-3 bg-gray-50 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 border border-gray-100 transition-colors mt-2"
              >
                {t('setPin')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Tags size={14} /> {t('manageCategories')}
          </h3>
        </div>
        <div className="p-5">
          <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
            <select 
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value)}
              className="p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none w-24 transition-all text-sm font-medium text-gray-700"
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
              <p className="text-xs text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-gray-100 border-dashed">No custom categories yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Download size={14} /> Data Management
          </h3>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Export Data</label>
              <p className="text-[10px] text-gray-500 mt-0.5">Download all your records as JSON</p>
            </div>
            <button 
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <Download size={14} /> {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white text-red-600 font-bold rounded-2xl hover:bg-red-50 border border-red-100 shadow-sm transition-colors text-sm mt-4"
      >
        <LogOut size={18} />
        {t('logout')}
      </button>
    </div>
  );
};
