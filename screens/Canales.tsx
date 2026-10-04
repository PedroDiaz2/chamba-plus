'use client';

import React, { useState, useEffect } from 'react';
import { Store, MessageCircle, Instagram, Facebook, Video, ShoppingBag, MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CANAL_INFO: Record<string, { label: string; descripcion: string; icono: React.ReactNode }> = {
  tienda_fisica: { label: 'Tienda física', descripcion: 'Ventas presenciales en tu local', icono: <Store size={24} /> },
  whatsapp: { label: 'WhatsApp', descripcion: 'Pedidos recibidos por WhatsApp', icono: <MessageCircle size={24} /> },
  instagram: { label: 'Instagram', descripcion: 'Ventas por Instagram', icono: <Instagram size={24} /> },
  facebook: { label: 'Facebook', descripcion: 'Ventas por Facebook / Marketplace', icono: <Facebook size={24} /> },
  tiktok: { label: 'TikTok', descripcion: 'Ventas por TikTok Shop', icono: <Video size={24} /> },
  marketplace: { label: 'Marketplace', descripcion: 'Otras plataformas de venta online', icono: <ShoppingBag size={24} /> },
};

const CANALES_FIJOS = Object.keys(CANAL_INFO);

interface Venta {
  canal: string;
  canalPersonalizadoId?: string | null;
  monto: number;
}

interface CanalPersonalizado {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export default function Canales() {
  const [canalesActivos, setCanalesActivos] = useState<string[]>([]);
  const [canalesPersonalizados, setCanalesPersonalizados] = useState<CanalPersonalizado[]>([]);
  const [statsPorCanal, setStatsPorCanal] = useState<Record<string, { cantidad: number; monto: number }>>({});
  const [statsPorCanalPersonalizado, setStatsPorCanalPersonalizado] = useState<Record<string, { cantidad: number; monto: number }>>({});
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [aEliminar, setAEliminar] = useState<CanalPersonalizado | null>(null);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    fetchNegocio();
    fetchCanalesPersonalizados();
    fetchStats();
  }, []);

  const fetchNegocio = async () => {
    try {
      const response = await fetch('/api/negocio');
      const data = await response.json();
      if (response.ok) {
        setCanalesActivos(data.negocio.canales);
      } else {
        toast.error(data.error || 'Error al cargar los canales del negocio');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar los canales');
    } finally {
      setCargando(false);
    }
  };

  const fetchCanalesPersonalizados = async () => {
    try {
      const response = await fetch('/api/canales-personalizados');
      const data = await response.json();
      if (response.ok) {
        setCanalesPersonalizados(data.canalesPersonalizados);
      }
    } catch (error) {
      console.error('Error al cargar canales personalizados:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ventas');
      const data = await response.json();
      if (response.ok) {
        const stats: Record<string, { cantidad: number; monto: number }> = {};
        const statsPersonalizados: Record<string, { cantidad: number; monto: number }> = {};
        (data.ventas as Venta[]).forEach((v) => {
          if (v.canal === 'otro' && v.canalPersonalizadoId) {
            if (!statsPersonalizados[v.canalPersonalizadoId]) statsPersonalizados[v.canalPersonalizadoId] = { cantidad: 0, monto: 0 };
            statsPersonalizados[v.canalPersonalizadoId].cantidad += 1;
            statsPersonalizados[v.canalPersonalizadoId].monto += v.monto;
          } else {
            if (!stats[v.canal]) stats[v.canal] = { cantidad: 0, monto: 0 };
            stats[v.canal].cantidad += 1;
            stats[v.canal].monto += v.monto;
          }
        });
        setStatsPorCanal(stats);
        setStatsPorCanalPersonalizado(statsPersonalizados);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas de ventas:', error);
    }
  };

  const handleToggleFijo = async (canal: string, activo: boolean) => {
    if (!activo && canalesActivos.length === 1 && canalesPersonalizados.filter((c) => c.activo).length === 0) {
      toast.error('Debes tener al menos un canal de venta habilitado (fijo o personalizado)');
      return;
    }

    const nuevosCanales = activo
      ? [...canalesActivos, canal]
      : canalesActivos.filter((c) => c !== canal);

    setLoading(true);
    try {
      const response = await fetch('/api/negocio', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canales: nuevosCanales })
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Error al actualizar canales');
        return;
      }
      setCanalesActivos(data.negocio.canales);
      toast.success(activo ? `${CANAL_INFO[canal].label} habilitado` : `${CANAL_INFO[canal].label} deshabilitado`);
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevoForm = () => {
    setEditandoId(null);
    setForm({ nombre: '', descripcion: '' });
    setShowForm(true);
  };

  const abrirEditarForm = (cp: CanalPersonalizado) => {
    setEditandoId(cp.id);
    setForm({ nombre: cp.nombre, descripcion: cp.descripcion });
    setShowForm(true);
  };

  const handleGuardarForm = async () => {
    if (!form.nombre.trim() || !form.descripcion.trim()) {
      toast.error('El nombre y la descripción son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const url = editandoId ? `/api/canales-personalizados/${editandoId}` : '/api/canales-personalizados';
      const method = editandoId ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion.trim() })
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar el canal personalizado');
        return;
      }

      toast.success(editandoId ? 'Canal personalizado actualizado' : 'Canal personalizado creado');
      setShowForm(false);
      fetchCanalesPersonalizados();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleActivo = async (cp: CanalPersonalizado, activo: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/canales-personalizados/${cp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo })
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Error al actualizar el canal');
        return;
      }
      toast.success(activo ? `${cp.nombre} habilitado` : `${cp.nombre} deshabilitado`);
      fetchCanalesPersonalizados();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const response = await fetch(`/api/canales-personalizados/${aEliminar.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'No se pudo eliminar el canal personalizado');
        return;
      }
      toast.success('Canal personalizado eliminado');
      setAEliminar(null);
      fetchCanalesPersonalizados();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setEliminando(false);
    }
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
        {CANALES_FIJOS.map((canal) => {
          const activo = canalesActivos.includes(canal);
          const stats = statsPorCanal[canal] || { cantidad: 0, monto: 0 };
          const info = CANAL_INFO[canal];
          return (
            <Card key={canal} className={!activo ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{info.icono}</div>
                    <div>
                      <h4 className="font-semibold">{info.label}</h4>
                      <p className="text-sm text-muted-foreground">{info.descripcion}</p>
                    </div>
                  </div>
                  <Switch
                    checked={activo}
                    disabled={loading}
                    onCheckedChange={(checked) => handleToggleFijo(canal, checked)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stats.cantidad} ventas registradas</span>
                  <span className="font-bold">S/ {stats.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Canales personalizados */}
      <div className="pt-4 border-t border-[#e5e5e3]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Canales personalizados</h3>
            <p className="text-sm text-muted-foreground">
              Agrega todos los canales adicionales que necesites (ej. Rappi, Ferias), cada uno con su propio nombre.
              Se tratan como canales independientes en tus indicadores, igual que WhatsApp o Instagram.
            </p>
          </div>
          <Button onClick={abrirNuevoForm} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white shrink-0">
            <Plus size={16} className="mr-2" />
            Agregar canal personalizado
          </Button>
        </div>

        {canalesPersonalizados.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-8">
              Aún no tienes canales personalizados. Agrega uno si vendes por algún medio que no está en la lista de arriba.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {canalesPersonalizados.map((cp) => {
              const stats = statsPorCanalPersonalizado[cp.id] || { cantidad: 0, monto: 0 };
              return (
                <Card key={cp.id} className={!cp.activo ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground"><MoreHorizontal size={24} /></div>
                        <div>
                          <h4 className="font-semibold">{cp.nombre}</h4>
                          <p className="text-sm text-muted-foreground">{cp.descripcion}</p>
                        </div>
                      </div>
                      <Switch
                        checked={cp.activo}
                        disabled={loading}
                        onCheckedChange={(checked) => handleToggleActivo(cp, checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stats.cantidad} ventas registradas</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold">S/ {stats.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                        <Button variant="ghost" size="sm" onClick={() => abrirEditarForm(cp)} title="Editar nombre y descripción">
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setAEliminar(cp)} title="Eliminar">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: crear/editar canal personalizado */}
      <Dialog open={showForm} onOpenChange={(open) => !guardando && setShowForm(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar canal personalizado' : 'Nuevo canal personalizado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Indica un nombre y una breve descripción para identificar este canal de venta adicional.
            </p>
            <div>
              <Label className="text-sm font-medium">Nombre del canal *</Label>
              <Input
                placeholder="Ej: Rappi"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Descripción *</Label>
              <Input
                placeholder="Ej: Pedidos recibidos por la app de delivery Rappi"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={guardando}>Cancelar</Button>
              <Button onClick={handleGuardarForm} disabled={guardando} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear canal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!aEliminar} onOpenChange={(open) => !open && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{aEliminar?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si tiene ventas o clientes asociados, no se podrá eliminar (puedes desactivarlo en su lugar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEliminar(); }}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
