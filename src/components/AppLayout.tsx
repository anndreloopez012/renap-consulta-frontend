import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { Search, ClipboardList, User, LogOut, Menu, X, Shield, Upload, LayoutDashboard, Building2, Settings2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_NAV = [
  { label: 'Búsqueda', path: '/search', icon: Search },
  { label: 'Mis Consultas', path: '/logs', icon: ClipboardList },
  { label: 'Mi Perfil', path: '/profile', icon: User },
];

const ADMIN_NAV = [
  { label: 'Importar CSV', path: '/import', icon: Upload },
  { label: 'Dashboard Mi Empresa', path: '/admin/my-company', icon: Building2 },
];

const SUPER_ADMIN_NAV = [
  { label: 'Dashboard Global', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Gestión', path: '/admin/management', icon: Settings2 },
];

export function AppLayout() {
  const { user, jwt, clearAuth, setAuth } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role?.type === 'admin' || user?.role?.type === 'super_admin';
  const isSuperAdmin = user?.role?.type === 'super_admin';
  const navItems = [
    ...BASE_NAV,
    ...(isAdmin ? ADMIN_NAV : []),
    ...(isSuperAdmin ? SUPER_ADMIN_NAV : []),
  ];

  useEffect(() => {
    if (jwt && !user) {
      api.get('/api/users/me?populate=role').then((res) => {
        setAuth(jwt, res.data);
      }).catch(() => {
        clearAuth();
        navigate('/login');
      });
    }
  }, [jwt, user, setAuth, clearAuth, navigate]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="h-16 border-b border-border/50 glass-strong flex items-center px-4 lg:px-6 gap-4 shrink-0 z-30 sticky top-0">
        <button className="lg:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link to="/search" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <span className="font-extrabold text-lg tracking-tight gradient-text hidden sm:block">RENAP</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-border/50 hover:ring-primary/50 transition-all duration-300">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 glass-strong border-border/50">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1.5 py-1">
                  <span className="font-bold text-base">{user?.username}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                  <div className="flex gap-1.5 mt-1">
                    {user?.role && <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">{user.role.name}</Badge>}
                    {user?.company && <Badge variant="outline" className="text-xs border-border/50">{user.company}</Badge>}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4 text-muted-foreground" /> Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/30" />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex w-60 flex-col border-r border-border/30 bg-sidebar shrink-0">
          <nav className="flex-1 py-6 px-3 space-y-1.5">
            <div className="px-3 mb-4">
              <p className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">Navegación</p>
            </div>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    active
                      ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5'
                      : 'text-sidebar-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={`h-4 w-4 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border/20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Sidebar - mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-40">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-md"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-72 h-full bg-sidebar border-r border-border/30 flex flex-col shadow-2xl"
              >
                <div className="p-4 border-b border-border/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-extrabold text-lg gradient-text">RENAP</span>
                  </div>
                </div>
                <nav className="flex-1 py-4 px-3 space-y-1.5">
                  {navItems.map((item, i) => {
                    const active = location.pathname === item.path;
                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-sidebar-foreground hover:bg-muted/50 hover:text-foreground'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
                <div className="p-3 border-t border-border/20">
                  <button
                    onClick={() => { setSidebarOpen(false); handleLogout(); }}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden border-t border-border/30 glass-strong flex justify-around py-2 shrink-0">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-4 text-xs font-medium transition-all ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-2 w-8 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
