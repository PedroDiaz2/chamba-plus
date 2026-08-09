'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Producto {
  id: string;
  nombre: string;
  categoria?: string;
}

interface TendenciaData {
  periodo: string;
  cantidad: number;
  monto: number;
}

export default function TendenciasProducto() {
  const [periodo, setPeriodo] = useState('mes');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [data, setData] = useState<TendenciaData[]>([]);
  const [usarRangoPersonalizado, setUsarRangoPersonalizado] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    fetchProductos();
    seleccionarProductoTop();
  }, []);

  useEffect(() => {
    if (!productoSeleccionado) return;
    if (usarRangoPersonalizado && (!fechaInicio || !fechaFin)) return;
    fetchTendencias();
  }, [productoSeleccionado, periodo, usarRangoPersonalizado, fechaInicio, fechaFin]);

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      const data = await response.json();
      if (response.ok) {
        setProductos(data.productos);
      } else {
        toast.error(data.error || 'Error al cargar productos');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar productos');
    }
  };

  // Preselecciona el producto/servicio más vendido (por unidades) para que la
  // pantalla muestre datos útiles de inmediato, sin exigir que el usuario busque
  // uno manualmente.
  const seleccionarProductoTop = async () => {
    try {
      const response = await fetch('/api/ventas');
      const data = await response.json();
      if (!response.ok) return;

      const cantidadPorProducto: Record<string, number> = {};
      for (const venta of data.ventas || []) {
        const id = venta.producto?.id;
        if (!id) continue;
        cantidadPorProducto[id] = (cantidadPorProducto[id] || 0) + venta.cantidad;
      }

      const topEntry = Object.entries(cantidadPorProducto).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) {
        setProductoSeleccionado(topEntry[0]);
      }
    } catch (error) {
      // Silencioso: si falla, el usuario simplemente elige un producto manualmente.
    }
  };

  const fetchTendencias = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ productoId: productoSeleccionado });
      if (usarRangoPersonalizado && fechaInicio && fechaFin) {
        params.set('fechaInicio', fechaInicio);
        params.set('fechaFin', fechaFin);
      } else {
        params.set('periodo', periodo);
      }
      const response = await fetch(`/api/ventas/tendencias-producto?${params.toString()}`);
      const result = await response.json();
      if (response.ok) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Error al cargar las tendencias');
      }
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProductos = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const producto = productos.find((p) => p.id === productoSeleccionado);

  // Calcular estadísticas
  const totalCantidad = data.reduce((sum, d) => sum + d.cantidad, 0);
  const totalMonto = data.reduce((sum, d) => sum + d.monto, 0);
  const promedioCantidad = data.length > 0 ? totalCantidad / data.length : 0;
  const promedioMonto = data.length > 0 ? totalMonto / data.length : 0;
  const precioPromedio = totalCantidad > 0 ? totalMonto / totalCantidad : 0;

  // Calcular tendencia (comparar último periodo con anterior), evitando división por cero
  // cuando el periodo anterior no tuvo ventas (lo que antes mostraba "+Infinity%").
  const cantidadActual = data.length >= 1 ? data[data.length - 1].cantidad : 0;
  const cantidadAnterior = data.length >= 2 ? data[data.length - 2].cantidad : 0;
  const tendenciaEsNueva = data.length >= 2 && cantidadAnterior === 0 && cantidadActual > 0;
  const tendenciaSinDatos = data.length < 2 || (cantidadAnterior === 0 && cantidadActual === 0);
  const tendencia = !tendenciaEsNueva && cantidadAnterior > 0
    ? ((cantidadActual - cantidadAnterior) / cantidadAnterior) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Tendencias por producto</h2>
        <p className="text-muted-foreground">Analiza el comportamiento de ventas de tus productos en el tiempo</p>
      </div>

      {/* Filtros */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="producto">Producto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  id="producto"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 mb-2"
                />
              </div>
              <Select value={productoSeleccionado} onValueChange={setProductoSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProductos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.categoria && `(${p.categoria})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
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
            <div className="flex items-end">
              <Button onClick={fetchTendencias} disabled={!productoSeleccionado} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white w-full">
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end pt-4 mt-4 border-t border-[#e5e5e3]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rangoPersonalizadoTendencias"
                checked={usarRangoPersonalizado}
                onChange={(e) => setUsarRangoPersonalizado(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rangoPersonalizadoTendencias" className="cursor-pointer">Usar un rango de fechas específico</Label>
            </div>
            {usarRangoPersonalizado && (
              <>
                <div>
                  <Label htmlFor="fechaInicioTendencias">Desde</Label>
                  <input
                    id="fechaInicioTendencias"
                    type="date"
                    value={fechaInicio}
                    max={fechaFin || undefined}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaFinTendencias">Hasta</Label>
                  <input
                    id="fechaFinTendencias"
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

      {!productoSeleccionado ? (
        <Card className="bg-white">
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground">Selecciona un producto para ver sus tendencias</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estadísticas del producto */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Producto</p>
                <p className="text-lg font-bold">{producto?.nombre}</p>
                <p className="text-xs text-muted-foreground">{producto?.categoria}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Total vendido</p>
                <p className="text-2xl font-bold">{totalCantidad} unidades</p>
                <p className="text-xs text-muted-foreground">S/ {totalMonto.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4" style={{ borderLeftColor: '#D85A30' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Tendencia</p>
                {tendenciaSinDatos ? (
                  <p className="text-2xl font-bold text-muted-foreground">Sin datos</p>
                ) : tendenciaEsNueva ? (
                  <p className="text-2xl font-bold text-[#1D9E75]">Nuevo</p>
                ) : (
                  <p className="text-2xl font-bold">{tendencia >= 0 ? '+' : ''}{tendencia.toFixed(1)}%</p>
                )}
                <p className="text-xs text-muted-foreground">Último periodo vs. anterior</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-l-4" style={{ borderLeftColor: '#7F77DD' }}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Precio promedio</p>
                <p className="text-2xl font-bold">S/ {precioPromedio.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Por unidad</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de cantidad */}
          <Card className="bg-white border-t-4" style={{ borderTopColor: '#1D9E75' }}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Evolución de unidades vendidas</h3>
              <p className="text-sm text-muted-foreground mb-4">¿La demanda de este producto está creciendo?</p>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCantidad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0F6E56" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value} unidades`} />
                  <Area
                    type="monotone"
                    dataKey="cantidad"
                    stroke="#0F6E56"
                    fillOpacity={1}
                    fill="url(#colorCantidad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de monto */}
          <Card className="bg-white border-t-4" style={{ borderTopColor: '#D85A30' }}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Evolución de ingresos</h3>
              <p className="text-sm text-muted-foreground mb-4">¿Los ingresos de este producto están creciendo?</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                  <Line
                    type="monotone"
                    dataKey="monto"
                    stroke="#D85A30"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabla detallada */}
          <Card className="bg-white border-t-4" style={{ borderTopColor: '#EF9F27' }}>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Detalle por periodo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Periodo</th>
                      <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Unidades</th>
                      <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Ingresos</th>
                      <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Precio promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((d, idx) => (
                      <tr key={idx} className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6]">
                        <td className="px-4 py-3 font-medium">{d.periodo}</td>
                        <td className="px-4 py-3 text-right">{d.cantidad}</td>
                        <td className="px-4 py-3 text-right font-bold">S/ {d.monto.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">S/ {(d.cantidad > 0 ? d.monto / d.cantidad : 0).toFixed(2)}</td>
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
