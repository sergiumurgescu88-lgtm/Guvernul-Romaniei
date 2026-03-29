import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { LogOut, User, Building2, LayoutDashboard, Home as HomeIcon, Menu } from 'lucide-react';
import { RealMinisterSubmissionModal } from './RealMinisterSubmissionModal';

export function Layout() {
  const { user, profile, login, logout } = useAuth();
  const location = useLocation();
  const [isRealModalOpen, setIsRealModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setIsRealModalOpen(true);
    window.addEventListener('open-real-minister-modal', handleOpenModal);
    return () => window.removeEventListener('open-real-minister-modal', handleOpenModal);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 pb-20 md:pb-0">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
                govro<span className="text-blue-600">.online</span>
              </Link>
            </div>
            
            <nav className="hidden md:flex space-x-6 items-center">
              <Link to="/" className={`text-sm font-medium flex items-center gap-1 ${isActive('/') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                <HomeIcon className="h-4 w-4" /> Forum Public
              </Link>
              {profile?.role === 'citizen' && (
                <Link to="/citizen" className={`text-sm font-medium flex items-center gap-1 ${isActive('/citizen') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                  <LayoutDashboard className="h-4 w-4" /> Statusul meu
                </Link>
              )}
              {(profile?.role === 'minister' || profile?.role === 'admin') && (
                <Link to="/minister" className={`text-sm font-medium flex items-center gap-1 ${isActive('/minister') ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`}>
                  <LayoutDashboard className="h-4 w-4" /> Panou Minister
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                onClick={() => window.dispatchEvent(new CustomEvent('open-real-minister-modal'))}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-9 rounded-full"
              >
                <span className="hidden sm:inline">Trimite către Ministru REAL</span>
                <span className="sm:hidden">Trimite Oficial</span>
              </Button>

              {user ? (
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium">{profile?.name || user.displayName}</span>
                    <span className="text-xs text-slate-500 capitalize">{profile?.role || 'Autentificat'}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Ieșire
                  </Button>
                </div>
              ) : (
                <Button onClick={() => login()} className="hidden sm:flex gap-2 bg-blue-600 hover:bg-blue-700 text-sm px-4">
                  <User className="h-4 w-4" />
                  <span>Autentificare (Google)</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 sm:py-12 text-center hidden md:block">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">
            Ecosistem de guvernanță digitală open-source. Inspirat de modelul estonian.
          </p>
          <p className="text-xs mt-2">© {new Date().getFullYear()} govro.online. Proiect SSociety.</p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-50 px-2 pb-safe">
        <Link to="/" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/') ? 'text-blue-600' : 'text-slate-500'}`}>
          <HomeIcon className="h-5 w-5" />
          <span className="text-[10px] font-medium">Forum</span>
        </Link>
        
        {profile?.role === 'citizen' && (
          <Link to="/citizen" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/citizen') ? 'text-blue-600' : 'text-slate-500'}`}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Status</span>
          </Link>
        )}
        
        {(profile?.role === 'minister' || profile?.role === 'admin') && (
          <Link to="/minister" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/minister') ? 'text-blue-600' : 'text-slate-500'}`}>
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Panou</span>
          </Link>
        )}
        
        {user && (
          <button onClick={() => logout()} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Ieșire</span>
          </button>
        )}
        
        {!user && (
          <button onClick={() => login()} className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500">
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium">Login</span>
          </button>
        )}
      </div>

      <RealMinisterSubmissionModal isOpen={isRealModalOpen} onClose={() => setIsRealModalOpen(false)} />
    </div>
  );
}
