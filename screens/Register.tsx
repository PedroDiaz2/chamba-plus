'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

type RegistrationStep = 'personal' | 'business' | 'confirmation';

export default function Register({ onRegisterSuccess, onNavigateToLogin }: RegisterProps) {
  const [step, setStep] = useState<RegistrationStep>('personal');
  const [loading, setLoading] = useState(false);

  // Personal data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Business data
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [canales, setCanales] = useState<string[]>([]);

  const handlePersonalNext = () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setStep('business');
  };

  const handleBusinessNext = () => {
    if (!businessName || !businessType || !phone) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    if (canales.length === 0) {
      toast.error('Por favor selecciona al menos un canal de venta');
      return;
    }
    setStep('confirmation');
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          businessName,
          businessType,
          phone,
          canales
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al crear la cuenta');
        setLoading(false);
        return;
      }

      toast.success('Cuenta creada exitosamente');
      onRegisterSuccess();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'business') {
      setStep('personal');
    } else if (step === 'confirmation') {
      setStep('business');
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F8F6]">
      {/* Left Panel */}
      <div className="hidden md:flex md:w-1/2 bg-[#0F6E56] flex-col justify-center items-center p-12 text-white">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Chamba+</h1>
          <p className="text-[#c7e5dd] text-xl mb-12">Crea tu cuenta y comienza a crecer</p>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-sm font-bold">
                1
              </div>
              <span className={step === 'personal' ? 'font-semibold text-white' : 'text-[#c7e5dd]'}>
                Datos personales
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-sm font-bold">
                2
              </div>
              <span className={step === 'business' ? 'font-semibold text-white' : 'text-[#c7e5dd]'}>
                Datos del negocio
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className={step === 'confirmation' ? 'font-semibold text-white' : 'text-[#c7e5dd]'}>
                Confirmación
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {step === 'personal' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Datos personales</h2>
                <p className="text-muted-foreground">Cuéntanos sobre ti</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      placeholder="Juan"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-white border-[#d5d5d2]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      placeholder="Pérez"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-white border-[#d5d5d2]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white border-[#d5d5d2]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-[#d5d5d2]"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white border-[#d5d5d2]"
                  />
                </div>

                <Button
                  onClick={handlePersonalNext}
                  className="w-full bg-[#0F6E56] hover:bg-[#0a5244] text-white"
                >
                  Siguiente
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-[#e5e5e3] text-center">
                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-[#0F6E56] hover:text-[#0a5244]"
                    onClick={onNavigateToLogin}
                  >
                    Inicia sesión
                  </Button>
                </p>
              </div>
            </>
          )}

          {step === 'business' && (
            <>
              <div className="mb-8 flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="text-[#0F6E56] hover:text-[#0a5244]"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Datos del negocio</h2>
                  <p className="text-muted-foreground text-sm">Información de tu empresa</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nombre del negocio</Label>
                  <Input
                    id="businessName"
                    placeholder="Mi Negocio SRL"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-white border-[#d5d5d2]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de negocio</Label>
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6E56]"
                  >
                    <option value="">Selecciona un tipo</option>
                    <option value="retail">Retail / Tienda</option>
                    <option value="wholesale">Mayorista</option>
                    <option value="food">Alimentos / Restaurante</option>
                    <option value="services">Servicios</option>
                    <option value="manufacturing">Manufactura</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="+51 999 999 999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-white border-[#d5d5d2]"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Canales de venta que utilizas</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'tienda_fisica', label: 'Tienda física' },
                      { id: 'whatsapp', label: 'WhatsApp' },
                      { id: 'instagram', label: 'Instagram' },
                      { id: 'facebook', label: 'Facebook' },
                      { id: 'tiktok', label: 'TikTok' },
                      { id: 'marketplace', label: 'Marketplace' },
                    ].map((canal) => (
                      <div key={canal.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={canal.id}
                          checked={canales.includes(canal.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCanales([...canales, canal.id]);
                            } else {
                              setCanales(canales.filter((c) => c !== canal.id));
                            }
                          }}
                        />
                        <Label htmlFor={canal.id} className="text-sm cursor-pointer">
                          {canal.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1 border-[#d5d5d2] text-[#0F6E56]"
                  >
                    Atrás
                  </Button>
                  <Button
                    onClick={handleBusinessNext}
                    className="flex-1 bg-[#0F6E56] hover:bg-[#0a5244] text-white"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'confirmation' && (
            <>
              <div className="mb-8 flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="text-[#0F6E56] hover:text-[#0a5244]"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Confirmación</h2>
                  <p className="text-muted-foreground text-sm">Verifica tus datos</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#F7F8F6] rounded-lg p-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre completo</p>
                    <p className="font-semibold text-foreground">
                      {firstName} {lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Correo electrónico</p>
                    <p className="font-semibold text-foreground">{email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre del negocio</p>
                    <p className="font-semibold text-foreground">{businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de negocio</p>
                    <p className="font-semibold text-foreground">{businessType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-semibold text-foreground">{phone}</p>
                  </div>
                </div>

                <Button
                  onClick={handleRegisterSubmit}
                  disabled={loading}
                  className="w-full bg-[#0F6E56] hover:bg-[#0a5244] text-white"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="w-full border-[#d5d5d2] text-[#0F6E56]"
                >
                  Atrás
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
