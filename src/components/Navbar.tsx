import { motion } from 'framer-motion';
import { Activity, Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              GlucoSense AI
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            {profile && (
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {profile.role}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {profile && (
              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="md:hidden border-t border-gray-200 dark:border-gray-700"
        >
          <div className="px-4 py-4 space-y-3">
            {profile && (
              <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {profile.role}
                </p>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-5 h-5" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-5 h-5" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            {profile && (
              <button
                onClick={signOut}
                className="w-full flex items-center space-x-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
