'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X, Check, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Alerta {
  id: string;
  tipo: string;
  mensaje: string;
  leida: boolean;
  metadata: any;
  createdAt: string;
}

const ALERTA_ICONS: Record<string, any> = {
  crecimiento_canal: TrendingUp,
  decimiento_canal: TrendingDown,
  alerta_stock: AlertTriangle,
  alerta_ventas: AlertTriangle,
};

const ALERTA_COLORS: Record<string, string> = {
  crecimiento_canal: '#1D9E75',
  decimiento_canal: '#D85A30',
  alerta_stock: '#EF9F27',
  alerta_ventas: '#7F77DD',
};

const ALERTA_LABELS: Record<string, string> = {
  crecimiento_canal: 'Crecimiento de canal',
  decimiento_canal: 'Decaimiento de canal',
  alerta_stock: 'Alerta de stock',
  alerta_ventas: 'Alerta de ventas',
};

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'no_leidas'>('todas');

  useEffect(() => {
    fetchAlertas();
  }, []);

  const fetchAlertas = async () => {
    try {
      const response = await fetch('/api/alertas');
      const data = await response.json();
      if (response.ok) {
        setAlertas(data.alertas);
      } else {
        toast.error(data.error || 'Error al cargar las alertas');
      }
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (alertaId: string) => {
    try {
      const response = await fetch('/api/alertas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertaId, leida: true })
      });
      const data = await response.json();

      if (response.ok) {
        setAlertas(alertas.map(a => a.id === alertaId ? { ...a, leida: true } : a));
        toast.success('Alerta marcada como leída');
      } else {
        toast.error(data.error || 'No se pudo marcar la alerta');
      }
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    }
  };

  const marcarTodasComoLeidas = async () => {
    try {
      const noLeidas = alertas.filter(a => !a.leida);
      const respuestas = await Promise.all(
        noLeidas.map(a =>
          fetch('/api/alertas', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertaId: a.id, leida: true })
          })
        )
      );

      if (respuestas.some((r) => !r.ok)) {
        toast.warning('Algunas alertas no se pudieron actualizar. Vuelve a intentarlo.');
      } else {
        toast.success('Todas las alertas marcadas como leídas');
      }
      setAlertas(alertas.map(a => ({ ...a, leida: true })));
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    }
  };

  const alertasFiltradas = alertas.filter(a =>
    filtro === 'todas' ? true : !a.leida
  );

  const noLeidasCount = alertas.filter(a => !a.leida).length;

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Alertas y Notificaciones</h2>
          <p className="text-muted-foreground">
            {noLeidasCount > 0 ? `${noLeidasCount} alerta${noLeidasCount > 1 ? 's' : ''} sin leer` : 'Todas las alertas leídas'}
          </p>
        </div>
        {noLeidasCount > 0 && (
          <Button
            onClick={marcarTodasComoLeidas}
            className="bg-[#0F6E56] hover:bg-[#0a5244] text-white"
          >
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filtro === 'todas' ? 'default' : 'outline'}
              onClick={() => setFiltro('todas')}
              className={filtro === 'todas' ? 'bg-[#0F6E56] hover:bg-[#0a5244]' : 'border-[#d5d5d2]'}
            >
              Todas ({alertas.length})
            </Button>
            <Button
              variant={filtro === 'no_leidas' ? 'default' : 'outline'}
              onClick={() => setFiltro('no_leidas')}
              className={filtro === 'no_leidas' ? 'bg-[#0F6E56] hover:bg-[#0a5244]' : 'border-[#d5d5d2]'}
            >
              No leídas ({noLeidasCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      <div className="space-y-4">
        {alertasFiltradas.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="pt-12 pb-12 text-center">
              <Bell size={48} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filtro === 'todas' ? 'No hay alertas' : 'No hay alertas sin leer'}
              </p>
            </CardContent>
          </Card>
        ) : (
          alertasFiltradas.map((alerta) => {
            const Icon = ALERTA_ICONS[alerta.tipo] || Bell;
            const color = ALERTA_COLORS[alerta.tipo] || '#7F77DD';
            const label = ALERTA_LABELS[alerta.tipo] || alerta.tipo;

            return (
              <Card
                key={alerta.id}
                className={`bg-white border-l-4 ${!alerta.leida ? 'border-l-4' : ''}`}
                style={!alerta.leida ? { borderLeftColor: color } : {}}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-full"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          style={{ borderColor: color, color }}
                        >
                          {label}
                        </Badge>
                        {!alerta.leida && (
                          <Badge className="bg-[#0F6E56] text-white">Nueva</Badge>
                        )}
                      </div>
                      <p className="text-sm mb-2">{alerta.mensaje}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alerta.createdAt).toLocaleString('es-PE')}
                      </p>
                    </div>
                    {!alerta.leida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => marcarComoLeida(alerta.id)}
                        className="text-[#0F6E56] hover:bg-[#F0FAF6]"
                      >
                        <Check size={16} className="mr-1" />
                        Marcar como leída
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Información sobre alertas automáticas */}
      <Card className="bg-[#F0FAF6] border border-[#1D9E75]">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-[#0F6E56] mb-2">¿Cómo funcionan las alertas?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Por ahora, el sistema genera alertas automáticamente cuando el stock de un producto cruza su umbral de stock mínimo, ya sea por una venta, un ajuste o un ingreso de inventario.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li><strong>Alerta de stock:</strong> Cuando el stock de un producto queda en o por debajo de su stock mínimo configurado</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
