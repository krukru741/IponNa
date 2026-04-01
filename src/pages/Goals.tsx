import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { Target, Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const Goals: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const [formData, setFormData] = useState({
    category: 'Food',
    amount: '',
    month: currentMonth
  });

  const defaultExpenseCategories = ['Food', 'Transpo', 'Bills', 'Shopping', 'Payment', 'Others'];
  const currentCategories = [...defaultExpenseCategories, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)];

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch goals
    const qGoals = query(collection(db, 'goals'), where('userId', '==', auth.currentUser.uid), where('month', '==', currentMonth));
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'goals'));

    // Fetch transactions for current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const qTrans = query(
      collection(db, 'transactions'), 
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'expense'),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(d => d.data()));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    // Fetch custom categories
    const qCats = query(collection(db, 'categories'), where('userId', '==', auth.currentUser.uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCustomCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => {
      unsubGoals();
      unsubTrans();
      unsubCats();
    };
  }, [currentMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      if (editingGoal) {
        await updateDoc(doc(db, 'goals', editingGoal.id), {
          category: formData.category,
          amount: parseFloat(formData.amount),
          month: formData.month
        });
      } else {
        await addDoc(collection(db, 'goals'), {
          userId: auth.currentUser.uid,
          category: formData.category,
          amount: parseFloat(formData.amount),
          month: formData.month,
          createdAt: new Date().toISOString()
        });
      }
      setShowAdd(false);
      setEditingGoal(null);
      setFormData({ category: currentCategories[0] || 'Food', amount: '', month: currentMonth });
    } catch (error) {
      handleFirestoreError(error, editingGoal ? OperationType.UPDATE : OperationType.CREATE, 'goals');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'goals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
    }
  };

  const getSpentAmount = (category: string) => {
    return transactions
      .filter(tx => tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('goals')}</h1>
        <button 
          onClick={() => {
            setEditingGoal(null);
            setFormData({ category: currentCategories[0] || 'Food', amount: '', month: currentMonth });
            setShowAdd(!showAdd);
          }}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold text-gray-900">
              {editingGoal ? t('setGoal') : t('addCategory')}
            </h2>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('category')}</label>
              <select 
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all appearance-none text-sm"
              >
                {currentCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('monthlyGoal')}</label>
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
            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm mt-1 text-sm"
            >
              {t('save')}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {goals.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <Target size={28} className="mx-auto text-emerald-200 mb-2" />
            <p className="text-xs text-gray-500 font-medium">{t('noGoals')}</p>
          </div>
        ) : (
          goals.map((goal) => {
            const spent = getSpentAmount(goal.category);
            const percentage = Math.min((spent / goal.amount) * 100, 100);
            const isOverBudget = spent > goal.amount;
            const remaining = Math.max(goal.amount - spent, 0);

            return (
              <div key={goal.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{goal.category}</h3>
                    <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider font-bold">₱{goal.amount.toLocaleString()} {t('monthlyGoal')}</p>
                  </div>
                  <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                    <button 
                      onClick={() => {
                        setEditingGoal(goal);
                        setFormData({ category: goal.category, amount: goal.amount.toString(), month: goal.month });
                        setShowAdd(true);
                      }}
                      className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-md hover:bg-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(goal.id)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-1">
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="font-medium text-gray-700">₱{spent.toLocaleString()} {t('spent')}</span>
                    <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isOverBudget ? t('overBudget') : `₱${remaining.toLocaleString()} ${t('remaining')}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ease-out ${isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
                
                {isOverBudget && (
                  <div className="flex items-center gap-1.5 text-[9px] text-red-600 mt-2 bg-red-50 p-1.5 rounded-md border border-red-100">
                    <AlertCircle size={10} className="shrink-0" />
                    <span className="font-bold uppercase tracking-wider">Exceeded by ₱{(spent - goal.amount).toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
