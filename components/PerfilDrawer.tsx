'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, Building2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PerfilDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const RUBRO_LABELS: Record<string, string> = {
  retail: 'Retail / Tienda',
  wholesale: 'Mayorista',
  food: 'Alimentos / Restaurante',
  services: 'Servicios',
  manufacturing: 'Manufactura',
  other: 'Otro',
};

export default function PerfilDrawer({ isOpen, onClose, onLogout }: PerfilDrawerProps) {
  const [activeTab, setActiveTab] = useState('negocio');
  const [showPassword, setShowPassword] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const [negocioData, setNegocioData] = useState({
    nombre: '',
    rubro: '',
    telefono: '',
    email: '',
  });

  const [securityData, setSecurityData] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmar: '',
  });

  useEffect(() => {
    if (isOpen) fetchNegocio();
  }, [isOpen]);

  const fetchNegocio = async () => {
    setCargando(true);
    try {
      const response = await fetch('/api/negocio');
      const data = await response.json();
      if (response.ok) {
        setNegocioData({
          nombre: data.negocio.nombre || '',
          rubro: data.negocio.rubro || '',
          telefono: data.negocio.telefono || '',
          email: data.negocio.email || '',
        });
      }
    } catch (error) {
      console.error('Error al cargar el perfil:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarNegocio = async () => {
    if (!negocioData.nombre.trim() || !negocioData.telefono.trim()) {
      toast.error('El nombre y el teléfono del negocio son requeridos');
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch('/api/negocio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: negocioData.nombre, telefono: negocioData.telefono })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar los cambios');
        return;
      }

      toast.success('Datos del negocio actualizados');
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarPassword = async () => {
    if (!securityData.passwordActual || !securityData.passwordNueva) {
      toast.error('Completa la contraseña actual y la nueva');
      return;
    }
    if (securityData.passwordNueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (securityData.passwordNueva !== securityData.passwordConfirmar) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    setCambiandoPassword(true);
    try {
      const response = await fetch('/api/negocio/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordActual: securityData.passwordActual,
          passwordNueva: securityData.passwordNueva,
        })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al cambiar la contraseña');
        return;
      }

      toast.success('Contraseña actualizada correctamente');
      setSecurityData({ passwordActual: '', passwordNueva: '', passwordConfirmar: '' });
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setCambiandoPassword(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-[#e5e5e3] shadow-lg flex flex-col">
        {/* Header */}
        <div className="border-b border-[#e5e5e3] p-6 flex items-center justify-between bg-[#F0FAF6]">
          <h2 className="text-xl font-bold text-[#0F6E56]">Mi Perfil</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-[#0F6E56]">
            <X size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#e5e5e3] px-6 flex gap-1 pt-4">
          <button
            onClick={() => setActiveTab('negocio')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'negocio'
                ? 'border-[#0F6E56] text-[#0F6E56]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Mi negocio
          </button>
          <button
            onClick={() => setActiveTab('seguridad')}
            className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'seguridad'
                ? 'border-[#0F6E56] text-[#0F6E56]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Seguridad
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cargando ? (
            <p className="text-sm text-muted-foreground text-center py-12">Cargando...</p>
          ) : (
            <>
              {/* Negocio Tab */}
              {activeTab === 'negocio' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Building2 size={16} />
                      Nombre del negocio
                    </label>
                    <Input
                      value={negocioData.nombre}
                      onChange={(e) => setNegocioData({ ...negocioData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rubro</label>
                    <Input value={RUBRO_LABELS[negocioData.rubro] || negocioData.rubro} disabled className="bg-muted" />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Phone size={16} />
                      Teléfono
                    </label>
                    <Input
                      value={negocioData.telefono}
                      onChange={(e) => setNegocioData({ ...negocioData, telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Mail size={16} />
                      Correo electrónico (usuario de acceso)
                    </label>
                    <Input value={negocioData.email} disabled className="bg-muted" />
                  </div>
                  <Button onClick={handleGuardarNegocio} disabled={guardando} className="w-full bg-[#0F6E56] hover:bg-[#0a5244] text-white mt-6">
                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'seguridad' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Lock size={16} />
                      Contraseña actual
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={securityData.passwordActual}
                        onChange={(e) => setSecurityData({ ...securityData, passwordActual: e.target.value })}
                      />
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        type="button"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Lock size={16} />
                      Contraseña nueva
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={securityData.passwordNueva}
                      onChange={(e) => setSecurityData({ ...securityData, passwordNueva: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Lock size={16} />
                      Confirmar contraseña nueva
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={securityData.passwordConfirmar}
                      onChange={(e) => setSecurityData({ ...securityData, passwordConfirmar: e.target.value })}
                    />
                  </div>
                  <div className="bg-[#F0FAF6] border border-[#1D9E75] rounded-lg p-3 text-xs text-[#0a5244]">
                    <strong>Requisito:</strong> mínimo 8 caracteres.
                  </div>
                  <Button onClick={handleCambiarPassword} disabled={cambiandoPassword} className="w-full bg-[#0F6E56] hover:bg-[#0a5244] text-white mt-6">
                    {cambiandoPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#e5e5e3] p-6 space-y-2">
          <Button
            variant="outline"
            className="w-full border-[#d5d5d2] text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Chamba+
          </p>
        </div>
      </div>
    </div>
  );
}
