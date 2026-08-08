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
import { toast } from 'sonner';

const CANAL_LABELS: Record<string, string> = {
  tienda_fisica: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  marketplace: 'Marketplace',
  otro: 'Otro',
};

const CANAL_COLORS: Record<string, string> = {
  tienda_fisica: '#0F6E56',
  whatsapp: '#D85A30',
  instagram: '#E1306C',
  facebook: '#1877F2',
  tiktok: '#000000',
  marketplace: '#FF6B00',
  otro: '#7F77DD',
};

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

  useEffect(() => {
    fetchDashboard(tipoItemFiltro);
  }, [tipoItemFiltro]);

  const fetchDashboard = async (tipoItem: string) => {
    try {
      const params = tipoItem !== 'todos' ? `?tipoItem=${tipoItem}` : '';
      const response = await fetch(`/api/dashboard${params}`);
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

  // Preparar datos para gráficos
  const participacionChartData = kpis.participacionPorCanal.map(p => ({
    name: CANAL_LABELS[p.canal] || p.canal,
    value: p.porcentaje,
    fill: CANAL_COLORS[p.canal] || '#7F77DD',
    monto: p.monto
  }));

  const ticketPromedioChartData = kpis.ticketPromedioPorCanal.map(t => ({
    canal: CANAL_LABELS[t.canal] || t.canal,
    ticket: t.ticketPromedio
  }));

  const productoTopChartData = kpis.productoTopPorCanal.map(p => ({
    canal: CANAL_LABELS[p.canal] || p.canal,
    producto: p.producto,
    cantidad: p.cantidad
  }));

  const topClientesChartData = kpis.clientes.topClientes.map(c => ({
    nombre: c.nombre,
    totalGastado: c.totalGastado
  }));

  const clientesNuevosVsRecurrentes = [
    { name: 'Nuevos (este periodo)', value: kpis.clientes.clientesNuevos, fill: '#1D9E75' },
    { name: 'Recurrentes', value: kpis.clientes.clientesRecurrentes, fill: '#7F77DD' },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Hola, {negocio.nombre}</h2>
        <p className="text-muted-foreground">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

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
                <Pie data={participacionChartData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}>
                  {participacionChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
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
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CANAL_COLORS[item.canal] || '#7F77DD' }}></div>
                  <span className="font-medium">{CANAL_LABELS[item.canal] || item.canal}</span>
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
              <h4 className="text-md font-semibold text-[#0F6E56] mb-4">Clientes nuevos vs. recurrentes</h4>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={clientesNuevosVsRecurrentes} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`}>
                    {clientesNuevosVsRecurrentes.map((entry, index) => (
                      <Cell key={`cell-cliente-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
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
