'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const CANAL_LABELS: Record<string, string> = {
  tienda_fisica: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  marketplace: 'Marketplace',
};

const CANAL_COLORS: Record<string, string> = {
  tienda_fisica: '#0F6E56',
  whatsapp: '#D85A30',
  instagram: '#E1306C',
  facebook: '#1877F2',
  tiktok: '#000000',
  marketplace: '#FF6B00',
};

// Paleta de respaldo para canales personalizados (ej. "Rappi", "Ferias"), que se
// tratan como canales independientes igual que los fijos de arriba.
const PALETA_CANAL_PERSONALIZADO = ['#7F77DD', '#2BB673', '#E07A5F', '#3D5A80', '#F2B705', '#9B5DE5'];
const PREFIJO_CANAL_PERSONALIZADO = 'otro:';

interface ComparacionData {
  periodo: string;
  [key: string]: string | number;
}

export default function ComparacionCanales() {
  const [periodo, setPeriodo] = useState('mes');
  const [metrica, setMetrica] = useState('monto');
  const [usarRangoPersonalizado, setUsarRangoPersonalizado] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ComparacionData[]>([]);
  const [canales, setCanales] = useState<string[]>([]);
  const [canalLabelsExtra, setCanalLabelsExtra] = useState<Record<string, string>>({});
  const [canalColorsExtra, setCanalColorsExtra] = useState<Record<string, string>>({});
  const canalLabels = { ...CANAL_LABELS, ...canalLabelsExtra };
  const canalColors = { ...CANAL_COLORS, ...canalColorsExtra };

  useEffect(() => {
    fetch('/api/canales-personalizados')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.canalesPersonalizados) return;
        const labels: Record<string, string> = {};
        const colors: Record<string, string> = {};
        (data.canalesPersonalizados as { id: string; nombre: string }[]).forEach((cp, idx) => {
          labels[`${PREFIJO_CANAL_PERSONALIZADO}${cp.id}`] = cp.nombre;
          colors[`${PREFIJO_CANAL_PERSONALIZADO}${cp.id}`] = PALETA_CANAL_PERSONALIZADO[idx % PALETA_CANAL_PERSONALIZADO.length];
        });
        setCanalLabelsExtra(labels);
        setCanalColorsExtra(colors);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (usarRangoPersonalizado && (!fechaInicio || !fechaFin)) return;
    fetchData();
  }, [periodo, metrica, usarRangoPersonalizado, fechaInicio, fechaFin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ metrica });
      if (usarRangoPersonalizado && fechaInicio && fechaFin) {
        params.set('fechaInicio', fechaInicio);
        params.set('fechaFin', fechaFin);
      } else {
        params.set('periodo', periodo);
      }
      const response = await fetch(`/api/ventas/comparacion-canales?${params.toString()}`);
      const result = await response.json();
      if (response.ok) {
        setData(result.data);
        setCanales(result.canales);
      } else {
        toast.error(result.error || 'Error al cargar la comparación de canales');
      }
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatValor = (value: number) => (metrica === 'cantidad' ? `${value}` : `S/ ${value.toFixed(2)}`);

  // Resumen por canal (total/promedio/máximo/mínimo), reutilizado por la tabla y por
  // el destacado del canal con mejor rendimiento del periodo.
  const resumenPorCanal = canales.map((canal) => {
    const valores = data.map((d) => d[canal] as number);
    const total = valores.reduce((sum, v) => sum + v, 0);
    // Promedio y mínimo se calculan solo sobre periodos con actividad real,
    // para no diluirlos con periodos en cero anteriores al inicio del canal.
    const valoresActivos = valores.filter((v) => v > 0);
    const promedio = valoresActivos.length > 0 ? total / valoresActivos.length : 0;
    const maximo = valores.length > 0 ? Math.max(...valores) : 0;
    const minimo = valoresActivos.length > 0 ? Math.min(...valoresActivos) : 0;
    return { canal, total, promedio, maximo, minimo };
  });

  const canalTop = resumenPorCanal.length > 0
    ? resumenPorCanal.reduce((mejor, actual) => (actual.total > mejor.total ? actual : mejor), resumenPorCanal[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Comparación por canal</h2>
        <p className="text-muted-foreground">Analiza el rendimiento de tus canales de venta en el tiempo</p>
      </div>

      {/* Filtros */}
      <Card className="bg-white">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="periodo">Periodo</Label>
              <Select value={periodo} onValueChange={(v) => { setPeriodo(v); setUsarRangoPersonalizado(false); }} disabled={usarRangoPersonalizado}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Último mes (semanal)</SelectItem>
                  <SelectItem value="trimestre">Último trimestre (mensual)</SelectItem>
                  <SelectItem value="anio">Último año (mensual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="metrica">Métrica</Label>
              <Select value={metrica} onValueChange={setMetrica}>
                <SelectTrigger id="metrica">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monto">Monto de ventas (S/)</SelectItem>
                  <SelectItem value="cantidad">Cantidad de ventas</SelectItem>
                  <SelectItem value="ticket">Ticket promedio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end pt-2 border-t border-[#e5e5e3]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rangoPersonalizado"
                checked={usarRangoPersonalizado}
                onChange={(e) => setUsarRangoPersonalizado(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rangoPersonalizado" className="cursor-pointer">Usar un rango de fechas específico</Label>
            </div>
            {usarRangoPersonalizado && (
              <>
                <div>
                  <Label htmlFor="fechaInicioComp">Desde</Label>
                  <input
                    id="fechaInicioComp"
                    type="date"
                    value={fechaInicio}
                    max={fechaFin || undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaFinComp">Hasta</Label>
                  <input
                    id="fechaFinComp"
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {canales.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground">Aún no hay ventas registradas en este periodo</p>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* Canal con mejor rendimiento */}
      {canalTop && canalTop.total > 0 && (
        <Card className="bg-[#F0FAF6] border border-[#1D9E75]">
          <CardContent className="pt-6 flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: canalColors[canalTop.canal] || '#7F77DD' }}
            >
              🏆
            </div>
            <div>
              <p className="text-sm text-[#0F6E56] font-medium">Canal con mejor rendimiento en este periodo</p>
              <p className="text-xl font-bold">{canalLabels[canalTop.canal] || canalTop.canal} — {formatValor(canalTop.total)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico comparativo */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#1D9E75' }}>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Evolución de ventas por canal</h3>
          <p className="text-sm text-muted-foreground mb-4">¿Qué canal está creciendo más rápido?</p>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatValor(value)} />
              <Legend />
              {canales.map((canal) => (
                <Line
                  key={canal}
                  type="monotone"
                  dataKey={canal}
                  stroke={canalColors[canal]}
                  name={canalLabels[canal] || canal}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de barras comparativo */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#D85A30' }}>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Comparación total por canal</h3>
          <p className="text-sm text-muted-foreground mb-4">¿Qué canal genera más ingresos en total?</p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatValor(value)} />
              <Legend />
              {canales.map((canal) => (
                <Bar
                  key={canal}
                  dataKey={canal}
                  fill={canalColors[canal]}
                  name={canalLabels[canal] || canal}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla resumen */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#EF9F27' }}>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Resumen por canal</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Canal</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Promedio</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Máximo</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {resumenPorCanal.map(({ canal, total, promedio, maximo, minimo }) => (
                  <tr key={canal} className={`border-b border-[#e5e5e3] hover:bg-[#F7F8F6] ${canalTop?.canal === canal && total > 0 ? 'bg-[#F0FAF6]' : ''}`}>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: canalColors[canal] }}></div>
                      <span className="font-medium">{canalLabels[canal] || canal}</span>
                      {canalTop?.canal === canal && total > 0 && (
                        <Badge className="bg-[#1D9E75] text-white border-0">🏆 Top</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatValor(total)}</td>
                    <td className="px-4 py-3 text-right">{formatValor(promedio)}</td>
                    <td className="px-4 py-3 text-right">{formatValor(maximo)}</td>
                    <td className="px-4 py-3 text-right">{formatValor(minimo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
