'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import Dashboard from '@/screens/Dashboard';
import Productos from '@/screens/Productos';
import Inventario from '@/screens/Inventario';
import Ventas from '@/screens/Ventas';
import Clientes from '@/screens/Clientes';
import Canales from '@/screens/Canales';
import ComparacionCanales from '@/screens/ComparacionCanales';
import TendenciasProducto from '@/screens/TendenciasProducto';
import Reportes from '@/screens/Reportes';
import Alertas from '@/screens/Alertas';
import Login from '@/screens/Login';
import Register from '@/screens/Register';
import { Skeleton } from '@/components/ui/skeleton';

type AuthScreen = 'login' | 'register';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  // Simulate loading with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user is already authenticated (simulated)
      const authenticated = localStorage.getItem('auth_token') !== null;
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('auth_token', 'mock-token');
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const handleRegisterSuccess = () => {
    localStorage.setItem('auth_token', 'mock-token');
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsAuthenticated(false);
    setAuthScreen('login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'productos':
        return <Productos />;
      case 'inventario':
        return <Inventario />;
      case 'ventas':
        return <Ventas />;
      case 'clientes':
        return <Clientes />;
      case 'comparacion':
        return <ComparacionCanales />;
      case 'tendencias':
        return <TendenciasProducto />;
      case 'reportes':
        return <Reportes />;
      case 'alertas':
        return <Alertas />;
      case 'config':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Configuracion</h2>
            <p className="text-muted-foreground">Pantalla en construccion</p>
          </div>
        );
      case 'canales':
        return <Canales />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#F7F8F6]">
        <div className="w-60 border-r border-[#e5e5e3] p-6 bg-[#0F6E56]">
          <Skeleton className="h-8 w-20 mb-8 bg-[#0a5244]" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-[#0a5244]" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="border-b border-[#e5e5e3] p-4 h-16 flex items-center justify-between bg-white">
            <Skeleton className="h-8 w-40 bg-[#e5e5e3]" />
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full bg-[#e5e5e3]" />
              <Skeleton className="h-8 w-24 bg-[#e5e5e3]" />
            </div>
          </div>
          <div className="flex-1 p-8 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authScreen === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setAuthScreen('register')}
        />
      );
    } else {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onNavigateToLogin={() => setAuthScreen('login')}
        />
      );
    }
  }

  return (
    <Layout 
      currentScreen={currentScreen} 
      onNavigate={setCurrentScreen}
      onLogout={handleLogout}
    >
      {renderScreen()}
    </Layout>
  );
}
