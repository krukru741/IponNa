import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { Plus, Receipt, CheckCircle2 } from 'lucide-react';

export const Bills: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [bills, setBills] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    isRecurring: false,
    isPaid: false
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'bills'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('dueDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bills');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'bills'), {
        userId: auth.currentUser.uid,
        name: formData.name,
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate).toISOString(),
        isRecurring: formData.isRecurring,
        isPaid: formData.isPaid,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({
        name: '',
        amount: '',
        dueDate: new Date().toISOString().slice(0, 10),
        isRecurring: false,
        isPaid: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bills');
    }
  };

  const markAsPaid = async (billId: string, currentCreatedAt: string) => {
    try {
      const billRef = doc(db, 'bills', billId);
      await updateDoc(billRef, {
        isPaid: true,
        createdAt: currentCreatedAt // required by rules
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bills/${billId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('bills')}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-bold mb-3 text-gray-900">{t('addBill')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('name')}</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. Meralco, Maynilad, Internet"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('amount')}</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('dueDate')}</label>
                <input 
                  type="date" 
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <input 
                type="checkbox" 
                id="recurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
              />
              <label htmlFor="recurring" className="text-xs font-semibold text-gray-700 cursor-pointer">{t('recurring')}</label>
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
        {bills.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Receipt size={20} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('noBills')}</p>
          </div>
        ) : (
          bills.map((bill) => {
            const isOverdue = new Date(bill.dueDate) < new Date() && !bill.isPaid;
            
            return (
              <div key={bill.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden ${bill.isPaid ? 'opacity-75' : ''}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${bill.isPaid ? 'bg-gray-300' : isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                
                <div className="flex justify-between items-start mb-2 pl-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`${bill.isPaid ? 'bg-gray-50 text-gray-400 border border-gray-100' : 'bg-blue-50 text-blue-600 border border-blue-100'} p-2 rounded-xl`}>
                      <Receipt size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{bill.name}</h3>
                      <p className={`text-[10px] font-medium mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                        {t('dueDate')}: {format(new Date(bill.dueDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-base ${bill.isPaid ? 'text-gray-400' : 'text-gray-900'}`}>
                    ₱{bill.amount.toLocaleString()}
                  </p>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 pl-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${bill.isPaid ? 'bg-gray-100 text-gray-500' : isOverdue ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                      {bill.isPaid ? t('paid') : t('pending')}
                    </span>
                    {bill.isRecurring && <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-md">{t('recurring')}</span>}
                  </div>
                  
                  {!bill.isPaid && (
                    <button 
                      onClick={() => markAsPaid(bill.id, bill.createdAt)}
                      className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <CheckCircle2 size={12} /> Mark as Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
