'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
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

type PeriodoDashboard = 'todo' | 'mes' | 'mesAnterior' | '7dias' | '30dias' | 'anio';

const PERIODO_LABELS: Record<PeriodoDashboard, string> = {
  todo: 'Todo el historial',
  mes: 'Este mes',
  mesAnterior: 'Mes anterior',
  '7dias': 'Últimos 7 días',
  '30dias': 'Últimos 30 días',
  anio: 'Este año',
};

const pad = (n: number) => String(n).padStart(2, '0');
const formatDateLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function calcularRango(periodo: PeriodoDashboard): { fechaInicio?: string; fechaFin?: string } {
  const hoy = new Date();
  switch (periodo) {
    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { fechaInicio: formatDateLocal(inicio), fechaFin: formatDateLocal(hoy) };
    }
    case 'mesAnterior': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      return { fechaInicio: formatDateLocal(inicio), fechaFin: formatDateLocal(fin) };
    }
    case '7dias': {
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - 6);
      return { fechaInicio: formatDateLocal(inicio), fechaFin: formatDateLocal(hoy) };
    }
    case '30dias': {
      const inicio = new Date(hoy);
      inicio.setDate(inicio.getDate() - 29);
      return { fechaInicio: formatDateLocal(inicio), fechaFin: formatDateLocal(hoy) };
    }
    case 'anio': {
      const inicio = new Date(hoy.getFullYear(), 0, 1);
      return { fechaInicio: formatDateLocal(inicio), fechaFin: formatDateLocal(hoy) };
    }
    default:
      return {};
  }
}

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

interface DashboardData {
  negocio: { nombre: string };
  kpis: {
    participacionPorCanal: { canal: string; porcentaje: number; monto: number }[];
    variacionPorCanal: { canal: string; variacion: number; montoActual: number; montoAnterior: number }[];
    productoTopPorCanal: { canal: string; producto: string; cantidad: number; monto: number }[];
    ticketPromedioPorCanal: { canal: string; ticketPromedio: number }[];
    frecuenciaCompraPorCanal: { canal: string; frecuencia: number }[];
    variacionPeriodos: { periodoActual: string; periodoAnterior: string; variacion: number }[];
    inventario: {
      valorTotalInventario: number;
      rotacionInventario: number;
      productosStockCritico: { id: string; nombre: string; stock: number; stockMinimo: number }[];
      productosSinMovimiento: { id: string; nombre: string }[];
    };
    clientes: {
      totalClientes: number;
      clientesNuevos: number;
      clientesRecurrentes: number;
      tasaRecompra: number;
      ticketPromedioCliente: number;
      topClientes: { nombre: string; totalGastado: number; compras: number }[];
      clientesPorCanalPreferido: { canal: string; cantidad: number }[];
    };
    margenPorCanal: { canal: string; margen: number; monto: number; costo: number }[];
  };
  resumenHoy: {
    totalVentasHoy: number;
    cantidadVentasHoy: number;
    variacionHoy: number;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipoItemFiltro, setTipoItemFiltro] = useState<'todos' | 'producto' | 'servicio'>('todos');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoDashboard>('todo');
  const [usarRangoPersonalizado, setUsarRangoPersonalizado] = useState(false);
  const [fechaInicioPersonalizada, setFechaInicioPersonalizada] = useState('');
  const [fechaFinPersonalizada, setFechaFinPersonalizada] = useState('');
  const [canalLabelsExtra, setCanalLabelsExtra] = useState<Record<string, string>>({});
  const [canalColorsExtra, setCanalColorsExtra] = useState<Record<string, string>>({});

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
    if (usarRangoPersonalizado && (!fechaInicioPersonalizada || !fechaFinPersonalizada)) return;
    fetchDashboard();
  }, [tipoItemFiltro, periodoFiltro, usarRangoPersonalizado, fechaInicioPersonalizada, fechaFinPersonalizada]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tipoItemFiltro !== 'todos') params.set('tipoItem', tipoItemFiltro);

      if (usarRangoPersonalizado) {
        if (fechaInicioPersonalizada && fechaFinPersonalizada) {
          params.set('fechaInicio', fechaInicioPersonalizada);
          params.set('fechaFin', fechaFinPersonalizada);
        }
      } else if (periodoFiltro !== 'todo') {
        const rango = calcularRango(periodoFiltro);
        if (rango.fechaInicio) params.set('fechaInicio', rango.fechaInicio);
        if (rango.fechaFin) params.set('fechaFin', rango.fechaFin);
      }

      const qs = params.toString();
      const response = await fetch(`/api/dashboard${qs ? `?${qs}` : ''}`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
      } else {
        toast.error(result.error || 'Error al cargar el dashboard');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-screen">No hay datos disponibles</div>;
  }

  const { negocio, kpis, resumenHoy } = data;
  const canalLabels = { ...CANAL_LABELS, ...canalLabelsExtra };
  const canalColors = { ...CANAL_COLORS, ...canalColorsExtra };

  // Preparar datos para gráficos
  const participacionChartData = kpis.participacionPorCanal.map(p => ({
    name: canalLabels[p.canal] || p.canal,
    value: p.porcentaje,
    fill: canalColors[p.canal] || '#7F77DD',
    monto: p.monto
  }));

  const ticketPromedioChartData = kpis.ticketPromedioPorCanal.map(t => ({
    canal: canalLabels[t.canal] || t.canal,
    ticket: t.ticketPromedio
  }));

  const productoTopChartData = kpis.productoTopPorCanal.map(p => ({
    canal: canalLabels[p.canal] || p.canal,
    producto: p.producto,
    cantidad: p.cantidad
  }));

  const topClientesChartData = kpis.clientes.topClientes.map(c => ({
    nombre: c.nombre,
    totalGastado: c.totalGastado
  }));

  const clientesNuevosVsRecurrentes = [
    { name: 'Nuevos en este periodo', value: kpis.clientes.clientesNuevos, fill: '#1D9E75' },
    { name: 'Recurrentes (historial total)', value: kpis.clientes.clientesRecurrentes, fill: '#7F77DD' },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Hola, {negocio.nombre}</h2>
        <p className="text-muted-foreground">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Filtro de periodo */}
      <Card className="bg-white">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="periodoDashboard">Periodo</Label>
              <Select
                value={periodoFiltro}
                onValueChange={(v) => { setPeriodoFiltro(v as PeriodoDashboard); setUsarRangoPersonalizado(false); }}
                disabled={usarRangoPersonalizado}
              >
                <SelectTrigger id="periodoDashboard">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIODO_LABELS) as PeriodoDashboard[]).map((p) => (
                    <SelectItem key={p} value={p}>{PERIODO_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end pt-2 border-t border-[#e5e5e3]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rangoPersonalizadoDashboard"
                checked={usarRangoPersonalizado}
                onChange={(e) => setUsarRangoPersonalizado(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="rangoPersonalizadoDashboard" className="cursor-pointer">Usar un rango de fechas específico</Label>
            </div>
            {usarRangoPersonalizado && (
              <>
                <div>
                  <Label htmlFor="fechaInicioDashboard">Desde</Label>
                  <input
                    id="fechaInicioDashboard"
                    type="date"
                    value={fechaInicioPersonalizada}
                    max={fechaFinPersonalizada || undefined}
                    onChange={(e) => setFechaInicioPersonalizada(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaFinDashboard">Hasta</Label>
                  <input
                    id="fechaFinDashboard"
                    type="date"
                    value={fechaFinPersonalizada}
                    min={fechaInicioPersonalizada || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFechaFinPersonalizada(e.target.value)}
                    className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary - Resumen de hoy */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Ventas hoy</p>
            <p className="text-2xl font-bold mb-2">S/ {resumenHoy.totalVentasHoy.toFixed(2)}</p>
            <div className="flex items-center gap-2">
              <Badge className={resumenHoy.variacionHoy >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}>
                {resumenHoy.variacionHoy >= 0 ? '+' : ''}{resumenHoy.variacionHoy.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs ayer</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Ventas hoy (cantidad)</p>
            <p className="text-2xl font-bold">{resumenHoy.cantidadVentasHoy}</p>
            <p className="text-xs text-muted-foreground mt-2">Transacciones registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#D85A30' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Variación periodo</p>
            <p className="text-2xl font-bold mb-2">
              {kpis.variacionPeriodos[0]?.variacion >= 0 ? '+' : ''}{kpis.variacionPeriodos[0]?.variacion.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">{kpis.variacionPeriodos[0]?.periodoActual} vs {kpis.variacionPeriodos[0]?.periodoAnterior}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#7F77DD' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Canales activos</p>
            <p className="text-2xl font-bold">{kpis.participacionPorCanal.length}</p>
            <p className="text-xs text-muted-foreground mt-2">Con ventas registradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Participación por canal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-t-4" style={{ borderTopColor: '#1D9E75' }}>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Participación de ventas por canal</h3>
            <p className="text-sm text-muted-foreground mb-4">¿En qué canal debo enfocar esfuerzo o inversión?</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={participacionChartData} dataKey="value" cx="38%" cy="50%" outerRadius={95} labelLine={false}>
                  {participacionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white border-t-4" style={{ borderTopColor: '#D85A30' }}>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Ticket promedio por canal</h3>
            <p className="text-sm text-muted-foreground mb-4">¿Qué canal trae compras de mayor valor?</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketPromedioChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="canal" fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                <Bar dataKey="ticket" fill="#D85A30" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Producto top por canal */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#EF9F27' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0F6E56]">Producto / servicio top por canal</h3>
              <p className="text-sm text-muted-foreground">¿Qué debo promocionar y en qué canal?</p>
            </div>
            <Select value={tipoItemFiltro} onValueChange={(v) => setTipoItemFiltro(v as typeof tipoItemFiltro)}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Productos y servicios</SelectItem>
                <SelectItem value="producto">Solo productos</SelectItem>
                <SelectItem value="servicio">Solo servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {productoTopChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No hay datos para este filtro</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productoTopChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="producto" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#EF9F27" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Variación por canal */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#7F77DD' }}>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Variación de ventas por canal</h3>
          <p className="text-sm text-muted-foreground mb-4">¿Qué canal está creciendo o decayendo?</p>
          <div className="space-y-3">
            {kpis.variacionPorCanal.map((item) => (
              <div key={item.canal} className="flex items-center justify-between p-3 bg-[#F7F8F6] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: canalColors[item.canal] || '#7F77DD' }}></div>
                  <span className="font-medium">{canalLabels[item.canal] || item.canal}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Actual: S/ {item.montoActual.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Anterior: S/ {item.montoAnterior.toFixed(2)}</p>
                  </div>
                  <Badge className={item.variacion >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}>
                    {item.variacion >= 0 ? '+' : ''}{item.variacion.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventario */}
      <div>
        <h3 className="text-xl font-bold mb-4">Inventario</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Valor total de inventario</p>
              <p className="text-2xl font-bold">S/ {kpis.inventario.valorTotalInventario.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#D85A30' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Productos en stock crítico</p>
              <p className="text-2xl font-bold">{kpis.inventario.productosStockCritico.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Rotación de inventario</p>
              <p className="text-2xl font-bold">{kpis.inventario.rotacionInventario.toFixed(2)}x</p>
              <p className="text-xs text-muted-foreground mt-2">Unidades vendidas / stock promedio</p>
            </CardContent>
          </Card>
        </div>

        {kpis.inventario.productosStockCritico.length > 0 && (
          <Card className="bg-white border-t-4" style={{ borderTopColor: '#D85A30' }}>
            <CardContent className="pt-6">
              <h4 className="text-md font-semibold text-[#0F6E56] mb-4">Productos que necesitan reposición</h4>
              <div className="space-y-2">
                {kpis.inventario.productosStockCritico.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#F7F8F6] rounded-lg">
                    <span className="font-medium">{p.nombre}</span>
                    <Badge className="bg-red-50 text-red-700 border border-red-200">
                      {p.stock} / mínimo {p.stockMinimo}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Clientes */}
      <div>
        <h3 className="text-xl font-bold mb-4">Clientes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Total de clientes</p>
              <p className="text-2xl font-bold">{kpis.clientes.totalClientes}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Nuevos este periodo</p>
              <p className="text-2xl font-bold">{kpis.clientes.clientesNuevos}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#D85A30' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Tasa de recompra</p>
              <p className="text-2xl font-bold">{kpis.clientes.tasaRecompra.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4" style={{ borderLeftColor: '#7F77DD' }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Ticket promedio por cliente</p>
              <p className="text-2xl font-bold">S/ {kpis.clientes.ticketPromedioCliente.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-t-4" style={{ borderTopColor: '#1D9E75' }}>
            <CardContent className="pt-6">
              <h4 className="text-md font-semibold text-[#0F6E56] mb-1">Clientes nuevos vs. recurrentes</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Dos miradas distintas, no partes de un mismo total: "nuevos" mide cuándo se registraron; "recurrentes" mide cuántas veces te compraron en todo su historial. Un mismo cliente puede contarse en ambas, o en ninguna.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={clientesNuevosVsRecurrentes} dataKey="value" cx="38%" cy="50%" outerRadius={80} labelLine={false}>
                    {clientesNuevosVsRecurrentes.map((entry, index) => (
                      <Cell key={`cell-cliente-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white border-t-4" style={{ borderTopColor: '#D85A30' }}>
            <CardContent className="pt-6">
              <h4 className="text-md font-semibold text-[#0F6E56] mb-4">Top clientes por gasto</h4>
              {topClientesChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Aún no hay clientes con compras registradas</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topClientesChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="nombre" width={100} fontSize={12} />
                    <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                    <Bar dataKey="totalGastado" fill="#D85A30" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
