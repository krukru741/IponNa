import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { Plus, Users } from 'lucide-react';

export const Paluwagan: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [groups, setGroups] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    contributionAmount: '',
    frequency: 'monthly',
    myTurnDate: new Date().toISOString().slice(0, 10),
    status: 'active'
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'paluwagan'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paluwagan');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'paluwagan'), {
        userId: auth.currentUser.uid,
        name: formData.name,
        totalAmount: parseFloat(formData.totalAmount),
        contributionAmount: parseFloat(formData.contributionAmount),
        frequency: formData.frequency,
        myTurnDate: new Date(formData.myTurnDate).toISOString(),
        status: formData.status,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({
        name: '',
        totalAmount: '',
        contributionAmount: '',
        frequency: 'monthly',
        myTurnDate: new Date().toISOString().slice(0, 10),
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'paluwagan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('paluwagan')}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-bold mb-3 text-gray-900">{t('addPaluwagan')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('name')}</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. Office Paluwagan"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('totalAmount')}</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('contribution')}</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.contributionAmount}
                  onChange={(e) => setFormData({...formData, contributionAmount: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('frequency')}</label>
                <select 
                  value={formData.frequency}
                  onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all text-sm"
                >
                  <option value="daily">{t('daily')}</option>
                  <option value="weekly">{t('weekly')}</option>
                  <option value="bi-weekly">{t('biweekly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('myTurn')}</label>
                <input 
                  type="date" 
                  required
                  value={formData.myTurnDate}
                  onChange={(e) => setFormData({...formData, myTurnDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button 
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-gray-100 border border-gray-100 transition-colors text-sm"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors text-sm"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('noPaluwagan')}</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
                  <p className="text-[10px] text-gray-500 capitalize font-medium">{group.frequency} • {group.status}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('totalAmount')}</p>
                  <p className="font-bold text-emerald-600 text-sm">₱{group.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('contribution')}</p>
                  <p className="font-bold text-gray-900 text-sm">₱{group.contributionAmount.toLocaleString()}</p>
                </div>
                <div className="col-span-2 pt-1.5 border-t border-gray-200/60 mt-0.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('myTurn')}</p>
                  <p className="font-bold text-xs text-gray-900">{format(new Date(group.myTurnDate), 'MMMM dd, yyyy')}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
