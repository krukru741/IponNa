import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Target, ChevronRight, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);
  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const qAll = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      let inc = 0;
      let exp = 0;
      let currentMonthInc = 0;
      let currentMonthExp = 0;
      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const allTx: any[] = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        allTx.push({ id: doc.id, ...data });
        if (data.type === 'income') inc += data.amount;
        if (data.type === 'expense') exp += data.amount;
        
        if (data.date.startsWith(currentMonthStr)) {
          if (data.type === 'income') currentMonthInc += data.amount;
          if (data.type === 'expense') currentMonthExp += data.amount;
        }
      });
      
      setIncome(inc);
      setExpense(exp);
      setBalance(inc - exp);
      setCurrentMonthIncome(currentMonthInc);
      setCurrentMonthExpense(currentMonthExp);
      
      // Sort in memory to avoid needing a composite index in Firestore
      allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTx);
      
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const currentMonth = format(new Date(), 'yyyy-MM');
    const qGoals = query(
      collection(db, 'goals'),
      where('userId', '==', auth.currentUser.uid),
      where('month', '==', currentMonth)
    );
    const unsubGoals = onSnapshot(qGoals, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'goals'));

    return () => {
      unsubscribe();
      unsubGoals();
    };
  }, []);

  const getSpentAmount = (category: string) => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    return transactions
      .filter(tx => tx.type === 'expense' && tx.category === category && tx.date.startsWith(currentMonth))
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-16 h-16 bg-teal-400 opacity-20 rounded-full blur-lg"></div>
        
        <div className="relative z-10">
          <p className="text-emerald-100 text-[10px] font-medium tracking-wide uppercase mb-1">{t('totalBalance')}</p>
          <h1 className={`text-2xl font-bold tracking-tight mb-5 ${balance < 0 ? 'text-red-400' : ''}`}>
            {balance < 0 ? '-' : ''}₱{Math.abs(balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </h1>
        </div>
        
        <div className="flex justify-between bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/10 relative z-10">
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-emerald-400/20 p-1.5 rounded-full">
              <ArrowDownCircle size={16} className="text-emerald-100" />
            </div>
            <div>
              <p className="text-[8px] text-emerald-100 uppercase tracking-wider font-medium">{t('income')}</p>
              <p className="font-semibold text-xs">₱{income.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2 flex-1 pl-2">
            <div className="bg-red-400/20 p-1.5 rounded-full">
              <ArrowUpCircle size={16} className="text-red-100" />
            </div>
            <div>
              <p className="text-[8px] text-emerald-100 uppercase tracking-wider font-medium">{t('expense')}</p>
              <p className="font-semibold text-xs">₱{expense.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-1.5">
          <BarChart2 size={16} className="text-emerald-600" />
          {t('currentMonthOverview') || 'Current Month Overview'}
        </h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: t('income'), amount: currentMonthIncome, fill: '#10b981' },
              { name: t('expense'), amount: currentMonthExpense, fill: '#ef4444' }
            ]} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(value) => `₱${value}`} />
              <Tooltip 
                cursor={{ fill: '#f9fafb' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Amount']}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {
                  [
                    { name: t('income'), amount: currentMonthIncome, fill: '#10b981' },
                    { name: t('expense'), amount: currentMonthExpense, fill: '#ef4444' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2 px-1">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Target size={16} className="text-emerald-600" />
            {t('goals')}
          </h2>
          <Link to="/goals" className="text-[10px] text-emerald-600 font-medium flex items-center hover:text-emerald-700 transition-colors">
            {t('manageGoals')} <ChevronRight size={12} />
          </Link>
        </div>
        
        {goals.length === 0 ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <Target size={20} className="mx-auto text-emerald-200 mb-2" />
            <p className="text-[10px] text-gray-500 mb-2">{t('noGoals')}</p>
            <Link to="/goals" className="text-emerald-600 font-medium text-[10px] bg-emerald-50 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-lg inline-block">
              {t('setGoal')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {goals.slice(0, 2).map((goal) => {
              const spent = getSpentAmount(goal.category);
              const percentage = Math.min((spent / goal.amount) * 100, 100);
              const isOverBudget = spent > goal.amount;

              return (
                <div key={goal.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-xs text-gray-900">{goal.category}</span>
                    <span className={`text-[10px] font-medium ${isOverBudget ? 'text-red-500' : 'text-gray-500'}`}>
                      ₱{spent.toLocaleString()} / ₱{goal.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ease-out ${isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-2 px-1">{t('recentTransactions')}</h2>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
            <p className="text-[10px] text-gray-500">{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {tx.type === 'income' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-gray-900">{tx.name || tx.category}</p>
                    <p className="text-[9px] text-gray-500 mt-0.5">{tx.category} • {format(new Date(tx.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <p className={`font-bold text-xs tracking-tight ${tx.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}₱{tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
