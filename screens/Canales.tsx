'use client';

import React, { useState, useEffect } from 'react';
import { Store, MessageCircle, Instagram, Facebook, Video, ShoppingBag, MoreHorizontal, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CANAL_INFO: Record<string, { label: string; descripcion: string; icono: React.ReactNode }> = {
  tienda_fisica: { label: 'Tienda física', descripcion: 'Ventas presenciales en tu local', icono: <Store size={24} /> },
  whatsapp: { label: 'WhatsApp', descripcion: 'Pedidos recibidos por WhatsApp', icono: <MessageCircle size={24} /> },
  instagram: { label: 'Instagram', descripcion: 'Ventas por Instagram', icono: <Instagram size={24} /> },
  facebook: { label: 'Facebook', descripcion: 'Ventas por Facebook / Marketplace', icono: <Facebook size={24} /> },
  tiktok: { label: 'TikTok', descripcion: 'Ventas por TikTok Shop', icono: <Video size={24} /> },
  marketplace: { label: 'Marketplace', descripcion: 'Otras plataformas de venta online', icono: <ShoppingBag size={24} /> },
  otro: { label: 'Otro', descripcion: 'Cualquier otro canal de venta', icono: <MoreHorizontal size={24} /> },
};

const TODOS_LOS_CANALES = Object.keys(CANAL_INFO);

interface Venta {
  canal: string;
  monto: number;
}

export default function Canales() {
  const [canalesActivos, setCanalesActivos] = useState<string[]>([]);
  const [otroCanalNombre, setOtroCanalNombre] = useState('');
  const [otroCanalDescripcion, setOtroCanalDescripcion] = useState('');
  const [statsPorCanal, setStatsPorCanal] = useState<Record<string, { cantidad: number; monto: number }>>({});
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [showOtroForm, setShowOtroForm] = useState(false);
  const [otroForm, setOtroForm] = useState({ nombre: '', descripcion: '' });
  const [guardandoOtro, setGuardandoOtro] = useState(false);

  useEffect(() => {
    fetchNegocio();
    fetchStats();
  }, []);

  const fetchNegocio = async () => {
    try {
      const response = await fetch('/api/negocio');
      const data = await response.json();
      if (response.ok) {
        setCanalesActivos(data.negocio.canales);
        setOtroCanalNombre(data.negocio.otroCanalNombre || '');
        setOtroCanalDescripcion(data.negocio.otroCanalDescripcion || '');
      } else {
        toast.error(data.error || 'Error al cargar los canales del negocio');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar los canales');
    } finally {
      setCargando(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ventas');
      const data = await response.json();
      if (response.ok) {
        const stats: Record<string, { cantidad: number; monto: number }> = {};
        (data.ventas as Venta[]).forEach((v) => {
          if (!stats[v.canal]) stats[v.canal] = { cantidad: 0, monto: 0 };
          stats[v.canal].cantidad += 1;
          stats[v.canal].monto += v.monto;
        });
        setStatsPorCanal(stats);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de ventas:', error);
    }
  };

  const guardarCanales = async (nuevosCanales: string[], extra?: { otroCanalNombre?: string; otroCanalDescripcion?: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/negocio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canales: nuevosCanales, ...extra })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al actualizar canales');
        return false;
      }

      setCanalesActivos(data.negocio.canales);
      setOtroCanalNombre(data.negocio.otroCanalNombre || '');
      setOtroCanalDescripcion(data.negocio.otroCanalDescripcion || '');
      return true;
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (canal: string, activo: boolean) => {
    if (!activo && canalesActivos.length === 1) {
      toast.error('Debes tener al menos un canal de venta habilitado');
      return;
    }

    if (canal === 'otro' && activo && !otroCanalNombre) {
      setOtroForm({ nombre: '', descripcion: '' });
      setShowOtroForm(true);
      return;
    }

    const nuevosCanales = activo
      ? [...canalesActivos, canal]
      : canalesActivos.filter((c) => c !== canal);

    const ok = await guardarCanales(nuevosCanales);
    if (ok) {
      toast.success(activo ? `${CANAL_INFO[canal].label} habilitado` : `${CANAL_INFO[canal].label} deshabilitado`);
    }
  };

  const handleGuardarOtro = async () => {
    if (!otroForm.nombre.trim() || !otroForm.descripcion.trim()) {
      toast.error('El nombre y la descripción son obligatorios para habilitar "Otro"');
      return;
    }

    setGuardandoOtro(true);
    const nuevosCanales = canalesActivos.includes('otro') ? canalesActivos : [...canalesActivos, 'otro'];
    const ok = await guardarCanales(nuevosCanales, {
      otroCanalNombre: otroForm.nombre.trim(),
      otroCanalDescripcion: otroForm.descripcion.trim()
    });
    setGuardandoOtro(false);

    if (ok) {
      toast.success('Canal "Otro" habilitado');
      setShowOtroForm(false);
    }
  };

  const handleEditarOtro = () => {
    setOtroForm({ nombre: otroCanalNombre, descripcion: otroCanalDescripcion });
    setShowOtroForm(true);
  };

  if (cargando) {
    return <div className="text-center py-12 text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Canales de venta</h2>
        <p className="text-muted-foreground">
          Habilita o deshabilita los canales por donde recibes pedidos. Solo los canales habilitados aparecerán al registrar ventas y clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TODOS_LOS_CANALES.map((canal) => {
          const activo = canalesActivos.includes(canal);
          const stats = statsPorCanal[canal] || { cantidad: 0, monto: 0 };
          const info = CANAL_INFO[canal];
          const esOtro = canal === 'otro';
          const titulo = esOtro && otroCanalNombre ? otroCanalNombre : info.label;
          const descripcion = esOtro && otroCanalDescripcion ? otroCanalDescripcion : info.descripcion;
          return (
            <Card key={canal} className={!activo ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{info.icono}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{titulo}</h4>
                        {esOtro && otroCanalNombre && (
                          <span className="text-xs text-muted-foreground">(Otro)</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{descripcion}</p>
                    </div>
                  </div>
                  <Switch
                    checked={activo}
                    disabled={loading}
                    onCheckedChange={(checked) => handleToggle(canal, checked)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stats.cantidad} ventas registradas</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">S/ {stats.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                    {esOtro && activo && (
                      <Button variant="ghost" size="sm" onClick={handleEditarOtro} title="Editar nombre y descripción">
                        <Pencil size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal: nombre y descripción del canal "Otro" */}
      <Dialog open={showOtroForm} onOpenChange={(open) => !guardandoOtro && setShowOtroForm(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar canal "Otro"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Indica un nombre y una breve descripción para identificar este canal de venta adicional.
            </p>
            <div>
              <Label className="text-sm font-medium">Nombre del canal *</Label>
              <Input
                placeholder="Ej: Ferias itinerantes"
                value={otroForm.nombre}
                onChange={(e) => setOtroForm({ ...otroForm, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Descripción *</Label>
              <Input
                placeholder="Ej: Venta en ferias dominicales del distrito"
                value={otroForm.descripcion}
                onChange={(e) => setOtroForm({ ...otroForm, descripcion: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowOtroForm(false)} disabled={guardandoOtro}>Cancelar</Button>
              <Button onClick={handleGuardarOtro} disabled={guardandoOtro} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {guardandoOtro ? 'Guardando...' : 'Guardar y habilitar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
