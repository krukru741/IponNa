import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAppStore } from './store';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Auth } from './components/Auth';
import { PinScreen } from './components/PinScreen';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Paluwagan } from './pages/Paluwagan';
import { Loans } from './pages/Loans';
import { Bills } from './pages/Bills';
import { Settings } from './pages/Settings';
import { Goals } from './pages/Goals';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { pin, isUnlocked } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              name: currentUser.displayName || 'User',
              email: currentUser.email || '',
              language: 'en',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error creating user document:', error);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (pin && !isUnlocked) {
    return <PinScreen />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="paluwagan" element={<Paluwagan />} />
            <Route path="loans" element={<Loans />} />
            <Route path="bills" element={<Bills />} />
            <Route path="goals" element={<Goals />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
