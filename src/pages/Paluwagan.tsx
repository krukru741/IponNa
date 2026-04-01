import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { Plus, Users, CheckCircle2, ArrowDownCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export const Paluwagan: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [groups, setGroups] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contributionAmount: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    myTurnDate: new Date().toISOString().slice(0, 10),
    membersCount: '',
    organizer: '',
    notes: '',
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

    const qTx = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubscribe();
      unsubscribeTx();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const contribution = parseFloat(formData.contributionAmount);
    const members = parseInt(formData.membersCount) || 1;
    const totalCycles = members;
    const total = contribution * members;

    try {
      await addDoc(collection(db, 'paluwagan'), {
        userId: auth.currentUser.uid,
        name: formData.name,
        totalAmount: total,
        contributionAmount: contribution,
        totalCycles: totalCycles,
        paidCycles: 0,
        frequency: formData.frequency,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        myTurnDate: new Date(formData.myTurnDate).toISOString(),
        membersCount: members,
        organizer: formData.organizer,
        notes: formData.notes,
        status: formData.status,
        hasReceivedPayout: false,
        createdAt: new Date().toISOString()
      });
      setShowAdd(false);
      setFormData({
        name: '',
        contributionAmount: '',
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        myTurnDate: new Date().toISOString().slice(0, 10),
        membersCount: '',
        organizer: '',
        notes: '',
        status: 'active'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'paluwagan');
    }
  };

  const handlePayContribution = async (group: any) => {
    if (!auth.currentUser) return;
    try {
      const groupRef = doc(db, 'paluwagan', group.id);
      const newPaidCycles = (group.paidCycles || 0) + 1;
      
      await updateDoc(groupRef, {
        paidCycles: newPaidCycles,
        status: newPaidCycles >= (group.totalCycles || 1) ? 'completed' : 'active',
        createdAt: group.createdAt // required by rules
      });

      // Auto-create an expense transaction
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        paluwaganId: group.id,
        name: `${group.name} Contribution`,
        amount: group.contributionAmount,
        type: 'expense',
        category: 'Others',
        date: new Date().toISOString(),
        note: `Cycle ${newPaidCycles} of ${group.totalCycles || '?'}`,
        isRecurring: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `paluwagan/${group.id}`);
    }
  };

  const handleReceivePayout = async (group: any) => {
    if (!auth.currentUser) return;
    try {
      const groupRef = doc(db, 'paluwagan', group.id);
      
      await updateDoc(groupRef, {
        hasReceivedPayout: true,
        createdAt: group.createdAt // required by rules
      });

      // Auto-create an income transaction
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        paluwaganId: group.id,
        name: `${group.name} Payout`,
        amount: group.totalAmount,
        type: 'income',
        category: 'Others',
        date: new Date().toISOString(),
        note: 'Paluwagan Payout Received',
        isRecurring: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `paluwagan/${group.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'paluwagan', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `paluwagan/${id}`);
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
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">My Contribution</label>
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
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Members Count</label>
                <input 
                  type="number" 
                  required
                  value={formData.membersCount}
                  onChange={(e) => setFormData({...formData, membersCount: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="e.g. 10"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">End Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organizer</label>
              <input 
                type="text" 
                value={formData.organizer}
                onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="e.g. Jane Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes</label>
              <textarea 
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                placeholder="Any rules or details..."
                rows={2}
              />
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
          groups.map((group) => {
            const totalCycles = group.totalCycles || 1;
            const paidCycles = group.paidCycles || 0;
            const progress = Math.min((paidCycles / totalCycles) * 100, 100);
            
            return (
              <div 
                key={group.id} 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
                      <Users size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{group.name}</h3>
                      <p className="text-[10px] text-gray-500 capitalize font-medium">{group.frequency} • {group.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cycle {paidCycles} of {totalCycles}</p>
                    </div>
                    {expandedGroupId === group.id ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(group.id);
                      }}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-3">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-3">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">My Contribution</p>
                    <p className="font-bold text-gray-900 text-sm">₱{group.contributionAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Payout</p>
                    <p className="font-bold text-emerald-600 text-sm">₱{group.totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2 pt-1.5 border-t border-gray-200/60 mt-0.5 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Start Date</p>
                      <p className="font-bold text-xs text-gray-900">{group.startDate ? format(new Date(group.startDate), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">End Date</p>
                      <p className="font-bold text-xs text-gray-900">{group.endDate ? format(new Date(group.endDate), 'MMM dd, yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="col-span-2 pt-1.5 border-t border-gray-200/60 mt-0.5 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{t('myTurn')}</p>
                      <p className="font-bold text-xs text-gray-900">{format(new Date(group.myTurnDate), 'MMM dd, yyyy')}</p>
                    </div>
                    {group.membersCount && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Members</p>
                        <p className="font-bold text-xs text-gray-900">{group.membersCount} people</p>
                      </div>
                    )}
                  </div>
                  {group.organizer && (
                    <div className="col-span-2 pt-1.5 border-t border-gray-200/60 mt-0.5">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Organizer</p>
                      <p className="font-bold text-xs text-gray-900">{group.organizer}</p>
                    </div>
                  )}
                  {group.notes && (
                    <div className="col-span-2 pt-1.5 border-t border-gray-200/60 mt-0.5">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Notes</p>
                      <p className="text-xs text-gray-600">{group.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {paidCycles < totalCycles && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePayContribution(group);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <CheckCircle2 size={14} className="text-emerald-500" /> Pay Contribution
                    </button>
                  )}
                  
                  {!group.hasReceivedPayout && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReceivePayout(group);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <ArrowDownCircle size={14} /> Receive Payout
                    </button>
                  )}
                </div>

                {expandedGroupId === group.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Contribution History</h4>
                    {(() => {
                      const history = transactions.filter(tx => 
                        tx.paluwaganId === group.id || 
                        (tx.name === `${group.name} Contribution` && tx.type === 'expense')
                      );
                      
                      if (history.length === 0) {
                        return <p className="text-xs text-gray-400 italic">No contributions paid yet.</p>;
                      }
                      
                      return (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {history.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                              <div>
                                <p className="text-xs font-bold text-gray-900">{tx.note || 'Contribution'}</p>
                                <p className="text-[10px] text-gray-500">{format(new Date(tx.date), 'MMM dd, yyyy h:mm a')}</p>
                              </div>
                              <p className="text-xs font-bold text-gray-900">₱{tx.amount.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
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
