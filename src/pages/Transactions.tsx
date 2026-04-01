import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { Plus, MessageSquareText, CheckSquare, Square, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export const Transactions: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [smsError, setSmsError] = useState('');
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: new Date().toISOString().slice(0, 16),
    note: '',
    isRecurring: false
  });

  const defaultExpenseCategories = ['Food', 'Transpo', 'Bills', 'Shopping', 'Payment', 'Others'];
  const defaultIncomeCategories = ['Salary', 'Business', 'Transfer In', 'Others'];

  const currentCategories = formData.type === 'expense'
    ? [...defaultExpenseCategories, ...customCategories.filter(c => c.type === 'expense').map(c => c.name)]
    : [...defaultIncomeCategories, ...customCategories.filter(c => c.type === 'income').map(c => c.name)];

  useEffect(() => {
    if (!currentCategories.includes(formData.category)) {
      setFormData(prev => ({ ...prev, category: currentCategories[0] || '' }));
    }
  }, [formData.type, customCategories]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qCats = query(collection(db, 'categories'), where('userId', '==', auth.currentUser.uid));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCustomCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    return () => unsubCats();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, []);

  const handleSmsParse = () => {
    setSmsError('');
    
    // Amount extraction
    const amountMatch = smsText.match(/(?:PHP|Php|P|₱)\s*\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
    
    const lowerSms = smsText.toLowerCase();
    // Determine if income or expense
    const isIncome = lowerSms.includes('received') || lowerSms.includes('remitted') || lowerSms.includes('transferred to your account');
    
    let extractedName = isIncome ? 'Received Money' : 'Payment';
    
    // Extract name based on common patterns
    // 1. "at MERCHANT NAME on" (BPI, Metrobank)
    // 2. "to MERCHANT NAME on" (GCash, Maya)
    // 3. "from SENDER NAME on" (BPI, Metrobank, GCash)
    
    const atMatch = smsText.match(/at\s+([A-Za-z0-9\s\-\*\.&]+?)\s+(?:on|using|with)/i);
    const toMatch = smsText.match(/(?:paid|sent).*?to\s+([A-Za-z0-9\s\-\*\.&]+?)(?:\s+(?:on|using|with|ref)|\.|$)/i);
    const fromMatch = smsText.match(/(?:received|transferred).*?from\s+([A-Za-z0-9\s\-\*\.&]+?)(?:\s+(?:on|using|with|ref)|\.|$)/i);
    
    if (isIncome && fromMatch) {
      extractedName = fromMatch[1].trim();
    } else if (!isIncome && atMatch) {
      extractedName = atMatch[1].trim();
    } else if (!isIncome && toMatch) {
      extractedName = toMatch[1].trim();
    } else {
      // Fallback to the old regex if the new ones don't match
      const fallbackMatch = smsText.match(/(?:to|from)\s+([A-Za-z0-9\s\-\*]+?)(?:\s+(?:on|of|with|at|ref|date)|$|\.)/i);
      if (fallbackMatch) {
        extractedName = fallbackMatch[1].trim();
      }
    }
    
    // Clean up extracted name (remove trailing punctuation or common words)
    extractedName = extractedName.replace(/(?:using|with|ref|date).*$/i, '').trim();
    
    if (amount > 0) {
      setFormData({
        ...formData,
        name: extractedName,
        amount: amount.toString(),
        type: isIncome ? 'income' : 'expense',
        note: 'Auto-detected from SMS',
        category: isIncome ? 'Transfer In' : 'Payment'
      });
      setSmsText('');
      setShowAdd(true);
    } else {
      setSmsError('Could not detect amount. Please check the SMS format.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        name: formData.name || formData.category, // Fallback to category if empty
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category || 'Uncategorized',
        date: new Date(formData.date).toISOString(),
        note: formData.note,
        isRecurring: formData.isRecurring,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({
        name: '',
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().slice(0, 16),
        note: '',
        isRecurring: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(txId => txId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!auth.currentUser || selectedIds.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'transactions', id));
      });
      await batch.commit();
      
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('transactions')}</h1>
        <div className="flex gap-2">
          {transactions.length > 0 && (
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds([]);
              }}
              className="text-emerald-600 font-bold px-4 py-2 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-sm"
            >
              {isSelectionMode ? t('cancel') : t('select')}
            </button>
          )}
          {!isSelectionMode && (
            <button 
              onClick={() => setShowAdd(!showAdd)}
              className="bg-emerald-600 text-white p-2 rounded-full shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-5 text-gray-900">{t('addTransaction')}</h2>
          
          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2">
              <MessageSquareText size={16} className="text-emerald-600" /> {t('smsAutoDetect')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={smsText}
                onChange={(e) => {
                  setSmsText(e.target.value);
                  setSmsError('');
                }}
                placeholder={t('smsPlaceholder')}
                className="flex-1 text-sm p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm"
              />
              <button 
                type="button"
                onClick={handleSmsParse}
                className="bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 shadow-sm transition-colors"
              >
                {t('detect')}
              </button>
            </div>
            {smsError && <p className="text-red-500 text-[10px] mt-2 font-medium">{smsError}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('name')}</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. Jollibee, Salary, Electric Bill"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('type')}</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all text-sm"
                >
                  <option value="expense">{t('expense')}</option>
                  <option value="income">{t('income')}</option>
                </select>
              </div>
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
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('category')}</label>
              <select 
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all text-sm"
              >
                {currentCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('date')}</label>
              <input 
                type="datetime-local" 
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <input 
                type="checkbox" 
                id="recurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
              />
              <label htmlFor="recurring" className="text-xs font-semibold text-gray-700 cursor-pointer">{t('recurring')}</label>
            </div>

            <div className="flex gap-2 pt-3">
              <button 
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 bg-gray-50 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 border border-gray-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <p className="text-gray-500 text-sm font-medium">{t('noTransactions')}</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div 
              key={tx.id} 
              className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition-all ${isSelectionMode ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md' : 'hover:shadow-md'}`}
              onClick={() => {
                if (isSelectionMode) {
                  handleToggleSelect(tx.id);
                }
              }}
            >
              <div className="flex items-center gap-3">
                {isSelectionMode && (
                  <div className="text-emerald-600 transition-transform">
                    {selectedIds.includes(tx.id) ? <CheckSquare size={20} className="scale-110" /> : <Square size={20} className="text-gray-300" />}
                  </div>
                )}
                <div className={`p-3 rounded-xl ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {tx.type === 'income' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{tx.name || tx.category}</h3>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">{tx.category} • {format(new Date(tx.date), 'MMM dd, yyyy h:mm a')}</p>
                  {tx.isRecurring && <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg mt-1.5 inline-block">{t('recurring')}</span>}
                </div>
              </div>
              <p className={`font-bold text-base tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      {isSelectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-40">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-full shadow-xl text-sm font-bold flex items-center gap-2 hover:bg-red-700 hover:scale-105 transition-all"
          >
            <Trash2 size={18} />
            {t('deleteSelected')} ({selectedIds.length})
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('confirmDeleteTitle')}</h3>
            <p className="text-gray-600 text-sm mb-6 font-medium">
              {t('confirmDeleteTx').replace('{count}', selectedIds.length.toString())}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-50 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 border border-gray-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-sm transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
