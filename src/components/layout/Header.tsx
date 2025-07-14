import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { useSession, signOut, signIn } from '~/lib/auth-client';
import { MicrophoneIcon } from '~/components/ui/Icons';

interface HeaderProps {
  showLanguageSelector?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showLanguageSelector = true }) => {
  const { data } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  return (
    <header className="bg-white dark:bg-gray-950 sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center text-primary">
              <MicrophoneIcon className="w-6 h-6" />
              <span className="hidden sm:inline font-medium ml-2">BakBak</span>
            </Link>
            
            {/* Language selector - visible on all screens but gets more space on larger screens */}
            {showLanguageSelector && (
              <div className="relative ml-6">
                <div className="flex items-center">
                  <select 
                    id="language-select"
                    className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1.5 px-3 pr-8 rounded-md text-sm text-gray-900 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Mandarin</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* User account section - responsive */}
            <div>
              {data ? (
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-sm font-medium">{data.user?.name?.split(' ')[0]}</span>
                  <button 
                    onClick={() => signOut()} 
                    className="py-1.5 px-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => signIn.social({ provider: "google" })} 
                  className="py-1.5 px-4 bg-primary hover:bg-secondary text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
            
            {/* Mobile menu button - only visible on small screens */}
            <button 
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2">
          <div className="container">
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/dashboard" 
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                to="/record" 
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Record
              </Link>
              <Link 
                to="/transcribe" 
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Transcribe
              </Link>
              <Link 
                to="/notes" 
                className="py-2 px-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                Notes
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};