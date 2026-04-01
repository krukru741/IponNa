import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store';
import { useTranslation } from '../i18n';
import { Home, ListOrdered, Users, Receipt, Settings, HandCoins } from 'lucide-react';

export const Navigation: React.FC = () => {
  const { language } = useAppStore();
  const t = useTranslation(language);

  const navItems = [
    { to: '/', icon: Home, label: t('dashboard') },
    { to: '/transactions', icon: ListOrdered, label: t('transactions') },
    { to: '/paluwagan', icon: Users, label: t('paluwagan') },
    { to: '/loans', icon: HandCoins, label: t('loans') },
    { to: '/bills', icon: Receipt, label: t('bills') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 pb-safe z-50">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all duration-200 ${
                isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
