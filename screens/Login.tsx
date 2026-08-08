'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Share2, BarChart3, Boxes, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface LoginProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
}

export default function Login({ onLoginSuccess, onNavigateToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      toast.success('Sesión iniciada correctamente');
      onLoginSuccess();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Por ahora, escribe a soporte para restablecer tu contraseña.');
  };

  return (
    <div className="flex h-screen bg-[#F7F8F6]">
      {/* Left Panel */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 text-white overflow-hidden bg-gradient-to-br from-[#14806B] via-[#0F6E56] to-[#0B5344]">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Chamba+</h1>
          </div>
          <p className="text-white/70 text-lg">Business Intelligence para MYPEs multicanal</p>
        </div>

        <div className="relative space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Share2 size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Centraliza todos tus canales</h3>
              <p className="text-white/70 text-sm">Tienda física, WhatsApp, redes sociales y marketplaces en un solo lugar</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Boxes size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Inventario y clientes conectados</h3>
              <p className="text-white/70 text-sm">Cada venta actualiza tu stock y el historial de tus clientes automáticamente</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Decisiones basadas en datos</h3>
              <p className="text-white/70 text-sm">Panel de indicadores en tiempo real para tu negocio</p>
            </div>
          </div>
        </div>

        <p className="relative text-white/50 text-sm">© 2026 Chamba+. Todos los derechos reservados.</p>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F6E56]/10 flex items-center justify-center">
              <Sparkles size={16} className="text-[#0F6E56]" />
            </div>
            <span className="text-xl font-semibold text-[#0F6E56]">Chamba+</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenido de vuelta</h2>
            <p className="text-muted-foreground">Inicia sesión para revisar tu negocio</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-[#d5d5d2] rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-[#d5d5d2] rounded-xl h-11"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Recuérdame
              </Label>
            </div>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-[#0F6E56] hover:bg-[#0a5244] text-white rounded-xl h-11"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>

            <Button
              variant="link"
              className="w-full text-[#0F6E56] hover:text-[#0a5244]"
              onClick={handleForgotPassword}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </div>

          <div className="mt-8 pt-8 border-t border-[#e5e5e3] text-center">
            <p className="text-sm text-muted-foreground mb-4">
              ¿No tienes cuenta?{' '}
              <Button
                variant="link"
                className="p-0 h-auto text-[#0F6E56] hover:text-[#0a5244]"
                onClick={onNavigateToRegister}
              >
                Crear cuenta nueva
              </Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
