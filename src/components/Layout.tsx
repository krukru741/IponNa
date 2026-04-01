import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { motion } from 'framer-motion';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20 selection:bg-emerald-100 selection:text-emerald-900">
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-md mx-auto px-4 py-4"
      >
        <Outlet />
      </motion.main>
      <Navigation />
    </div>
  );
};
