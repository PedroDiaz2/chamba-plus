'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Megaphone,
  Bell,
  Menu,
  X,
  ChevronDown,
  Boxes,
  BarChart3,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PerfilDrawer from './PerfilDrawer';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

export default function Layout({ children, currentScreen, onNavigate, onLogout }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [negocioNombre, setNegocioNombre] = useState('');
  const [hayAlertasNoLeidas, setHayAlertasNoLeidas] = useState(false);

  useEffect(() => {
    fetch('/api/negocio')
      .then((res) => res.json())
      .then((data) => {
        if (data?.negocio?.nombre) setNegocioNombre(data.negocio.nombre);
      })
      .catch(() => {});
  }, []);

  // Se revisa cada vez que cambia de pantalla para que, al volver de "Alertas"
  // después de marcarlas como leídas, el punto rojo desaparezca de inmediato.
  useEffect(() => {
    fetch('/api/alertas')
      .then((res) => res.json())
      .then((data) => {
        const alertas = data?.alertas || [];
        setHayAlertasNoLeidas(alertas.some((a: { leida: boolean }) => !a.leida));
      })
      .catch(() => {});
  }, [currentScreen]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'productos', label: 'Productos y Servicios', icon: Package },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'canales', label: 'Canales de venta', icon: Megaphone },
    { id: 'comparacion', label: 'Comparación de canales', icon: BarChart3 },
    { id: 'tendencias', label: 'Tendencias de producto', icon: TrendingUp },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'alertas', label: 'Alertas', icon: Bell },
  ];

  const getScreenTitle = (): string => {
    const item = navigationItems.find((nav) => nav.id === currentScreen);
    return item ? item.label : 'Dashboard';
  };

  const iniciales = negocioNombre
    ? negocioNombre.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : 'M';

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 lg:w-60 bg-gradient-to-b from-[#14806B] to-[#0B5344] flex flex-col transform transition-transform duration-300 shadow-xl lg:shadow-none ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">Chamba+</span>
          </div>
          <button className="lg:hidden text-white/80 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-3">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${
                      isActive
                        ? 'bg-white text-[#0F6E56] shadow-sm'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <Icon size={18} className="flex-shrink-0 text-inherit" />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section - Business info */}
        <div className="p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#0F6E56] font-semibold text-sm flex-shrink-0">
              {iniciales}
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-white text-sm">{negocioNombre || 'Mi negocio'}</p>
              <p className="text-white/60 text-xs">Cuenta activa</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-[#e5e5e3] px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden flex-shrink-0"
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-lg md:text-2xl font-bold truncate">{getScreenTitle()}</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('alertas')}>
              <Bell size={20} />
              {hayAlertasNoLeidas && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </Button>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 bg-[#0F6E56] rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {iniciales}
                </div>
                <span className="hidden sm:inline text-sm truncate max-w-[140px]">{negocioNombre || 'Mi negocio'}</span>
                <ChevronDown size={16} />
              </Button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e5e5e3] rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={() => {
                      setPerfilOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[#F7F8F6]"
                  >
                    Mi Perfil
                  </button>
                  <div className="border-t border-[#e5e5e3] my-2"></div>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[#F7F8F6] text-red-600"
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </div>

      {/* Perfil Drawer */}
      <PerfilDrawer
        isOpen={perfilOpen}
        onClose={() => setPerfilOpen(false)}
        onLogout={() => {
          // TODO: Handle logout
          console.log('Logout clicked');
        }}
      />
    </div>
  );
}
