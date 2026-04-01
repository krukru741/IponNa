import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { Plus, HandCoins, CheckCircle2 } from 'lucide-react';

export const Loans: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [loans, setLoans] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'lent',
    person: '',
    amount: '',
    installmentsCount: '',
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'pending',
    installments: [] as { id: string, amount: number, dueDate: string, status: 'pending' | 'paid' }[]
  });

  const generateInstallments = () => {
    const count = parseInt(formData.installmentsCount);
    let totalAmount = parseFloat(formData.amount);
    if (isNaN(count) || count <= 0 || isNaN(totalAmount) || totalAmount <= 0) return;

    if (formData.type === 'lent') {
      totalAmount = totalAmount * 1.05;
    }

    const newInstallments = [];
    const installmentAmount = totalAmount / count;
    const startDate = new Date(formData.dueDate);

    for (let i = 0; i < count; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      newInstallments.push({
        id: Math.random().toString(36).substring(7),
        amount: Number(installmentAmount.toFixed(2)),
        dueDate: date.toISOString().slice(0, 10),
        status: 'pending' as const
      });
    }
    
    // Update the main amount field to reflect the new total with interest
    setFormData({ 
      ...formData, 
      amount: totalAmount.toFixed(2),
      installments: newInstallments 
    });
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'loans'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'loans');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Request notification permission if not granted
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!loans.length) return;

    // Check for upcoming installments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    loans.forEach(loan => {
      if (loan.status === 'paid') return;

      if (loan.installments && loan.installments.length > 0) {
        loan.installments.forEach((inst: any) => {
          if (inst.status === 'paid') return;

          const dueDate = new Date(inst.dueDate);
          dueDate.setHours(0, 0, 0, 0);

          const isToday = dueDate.getTime() === today.getTime();
          const isTomorrow = dueDate.getTime() === tomorrow.getTime();

          if (isToday || isTomorrow) {
            const notificationKey = `notified_${loan.id}_${inst.id}`;
            const hasNotified = localStorage.getItem(notificationKey);

            if (!hasNotified && 'Notification' in window && Notification.permission === 'granted') {
              const dayText = isToday ? 'today' : 'tomorrow';
              const title = `Installment Due ${isToday ? 'Today' : 'Tomorrow'}!`;
              
              let body = '';
              if (loan.type === 'lent') {
                body = `Reminder: ${loan.person} has an upcoming installment of ₱${inst.amount.toLocaleString()} due ${dayText}.`;
              } else {
                body = `Reminder: You have an upcoming installment of ₱${inst.amount.toLocaleString()} to ${loan.person} due ${dayText}.`;
              }
              
              new Notification(title, { body });
              localStorage.setItem(notificationKey, 'true');
            }
          }
        });
      } else {
        // Check main loan due date if no installments
        const dueDate = new Date(loan.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const isToday = dueDate.getTime() === today.getTime();
        const isTomorrow = dueDate.getTime() === tomorrow.getTime();

        if (isToday || isTomorrow) {
          const notificationKey = `notified_${loan.id}_main`;
          const hasNotified = localStorage.getItem(notificationKey);

          if (!hasNotified && 'Notification' in window && Notification.permission === 'granted') {
            const dayText = isToday ? 'today' : 'tomorrow';
            const title = `Loan Due ${isToday ? 'Today' : 'Tomorrow'}!`;
            
            let body = '';
            if (loan.type === 'lent') {
              body = `Reminder: ${loan.person} has a loan of ₱${loan.amount.toLocaleString()} due ${dayText}.`;
            } else {
              body = `Reminder: You have a loan of ₱${loan.amount.toLocaleString()} to ${loan.person} due ${dayText}.`;
            }
            
            new Notification(title, { body });
            localStorage.setItem(notificationKey, 'true');
          }
        }
      }
    });
  }, [loans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, 'loans'), {
        userId: auth.currentUser.uid,
        type: formData.type,
        person: formData.person,
        amount: parseFloat(formData.amount),
        installmentsCount: formData.installmentsCount ? parseInt(formData.installmentsCount) : null,
        installments: formData.installments,
        dueDate: new Date(formData.dueDate).toISOString(),
        status: formData.status,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({
        type: 'lent',
        person: '',
        amount: '',
        installmentsCount: '',
        dueDate: new Date().toISOString().slice(0, 10),
        status: 'pending',
        installments: []
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'loans');
    }
  };

  const markAsPaid = async (loanId: string, currentCreatedAt: string) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      const loan = loans.find(l => l.id === loanId);
      
      const updates: any = {
        status: 'paid',
        createdAt: currentCreatedAt
      };

      if (loan && loan.installments) {
        updates.installments = loan.installments.map((inst: any) => ({ ...inst, status: 'paid' }));
      }

      await updateDoc(loanRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `loans/${loanId}`);
    }
  };

  const markInstallmentAsPaid = async (loanId: string, installmentIndex: number, currentCreatedAt: string) => {
    try {
      const loan = loans.find(l => l.id === loanId);
      if (!loan || !loan.installments) return;

      const newInstallments = [...loan.installments];
      newInstallments[installmentIndex].status = 'paid';

      const allPaid = newInstallments.every(inst => inst.status === 'paid');

      const loanRef = doc(db, 'loans', loanId);
      await updateDoc(loanRef, {
        installments: newInstallments,
        status: allPaid ? 'paid' : loan.status,
        createdAt: currentCreatedAt
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `loans/${loanId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t('loans')}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-600 text-white p-2 rounded-full shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-base font-bold mb-3 text-gray-900">{t('addLoan')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('type')}</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none appearance-none transition-all text-sm"
                >
                  <option value="lent">{t('lent')} (Pina-utang)</option>
                  <option value="borrowed">{t('borrowed')} (Inutang)</option>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t('person')}</label>
              <input 
                type="text" 
                required
                value={formData.person}
                onChange={(e) => setFormData({...formData, person: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="Name of person"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Installments</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={formData.installmentsCount}
                    onChange={(e) => setFormData({...formData, installmentsCount: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="Optional"
                  />
                  <button 
                    type="button"
                    onClick={generateInstallments}
                    className="px-3 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {formData.installments.length > 0 && (
              <div className="space-y-2 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-900">Payment Schedule</h3>
                {formData.installments.map((inst, index) => (
                  <div key={inst.id} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-500 w-4">{index + 1}.</span>
                    <input 
                      type="number" 
                      value={inst.amount}
                      onChange={(e) => {
                        const newInst = [...formData.installments];
                        newInst[index].amount = parseFloat(e.target.value);
                        setFormData({...formData, installments: newInst});
                      }}
                      className="w-1/3 p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                    />
                    <input 
                      type="date" 
                      value={inst.dueDate}
                      onChange={(e) => {
                        const newInst = [...formData.installments];
                        newInst[index].dueDate = e.target.value;
                        setFormData({...formData, installments: newInst});
                      }}
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            )}

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
        {loans.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <HandCoins size={20} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-medium">{t('noLoans')}</p>
          </div>
        ) : (
          loans.map((loan) => {
            const paidAmount = loan.installments 
              ? loan.installments.filter((i: any) => i.status === 'paid').reduce((sum: number, i: any) => sum + i.amount, 0) 
              : (loan.status === 'paid' ? loan.amount : 0);
            const remainingBalance = Math.max(0, loan.amount - paidAmount);

            return (
            <div key={loan.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden ${loan.status === 'paid' ? 'opacity-75' : ''}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${loan.status === 'paid' ? 'bg-gray-300' : loan.type === 'lent' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className="flex justify-between items-start mb-2 pl-2">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{loan.person}</h3>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                    {loan.type === 'lent' ? t('lent') : t('borrowed')} • {t('dueDate')}: {format(new Date(loan.dueDate), 'MMM dd, yyyy')}
                    {loan.installmentsCount && ` • ${loan.installmentsCount} installments`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-base ${loan.status === 'paid' ? 'text-gray-500' : loan.type === 'lent' ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {loan.installments && loan.installments.length > 0 && loan.status !== 'paid' && (
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      of ₱{loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 pl-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${loan.status === 'paid' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                  {loan.status === 'paid' ? t('paid') : t('pending')}
                </span>
                
                {loan.status === 'pending' && (
                  <button 
                    onClick={() => markAsPaid(loan.id, loan.createdAt)}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md transition-colors"
                  >
                    <CheckCircle2 size={12} /> Mark as Paid
                  </button>
                )}
              </div>

              {loan.installments && loan.installments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 pl-2">
                  <p className="text-[10px] font-bold text-gray-700 mb-2">Payment Schedule</p>
                  <div className="space-y-1.5">
                    {loan.installments.map((inst: any, index: number) => (
                      <div key={inst.id || index} className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 w-4">{index + 1}.</span>
                          <span className="text-[10px] font-medium text-gray-700">{format(new Date(inst.dueDate), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-900">₱{inst.amount.toLocaleString()}</span>
                          {inst.status === 'paid' ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : (
                            <button 
                              onClick={() => markInstallmentAsPaid(loan.id, index, loan.createdAt)}
                              className="text-[9px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
