'use client';

import React, { useState, useEffect } from 'react';
import { Search, PackagePlus, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Producto {
  id: string;
  nombre: string;
  categoria?: string | null;
  stock: number;
  stockMinimo: number;
  precioVenta: number | null;
  precioCosto: number | null;
  valorInventario: number | null;
  stockCritico: boolean;
}

interface Movimiento {
  id: string;
  tipo: 'ingreso' | 'venta' | 'ajuste';
  cantidad: number;
  stockResultante: number;
  motivo: string | null;
  createdAt: string;
  producto: { nombre: string };
}

interface Resumen {
  valorTotalInventario: number;
  productosStockCritico: number;
  totalProductos: number;
}

const TIPO_LABELS: Record<string, string> = {
  ingreso: 'Ingreso',
  venta: 'Venta',
  ajuste: 'Ajuste',
};

const TIPO_COLORS: Record<string, string> = {
  ingreso: 'bg-green-50 text-green-700 border border-green-200',
  venta: 'bg-blue-50 text-blue-700 border border-blue-200',
  ajuste: 'bg-orange-50 text-orange-700 border border-orange-200',
};

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<Resumen>({ valorTotalInventario: 0, productosStockCritico: 0, totalProductos: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [showIngreso, setShowIngreso] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    productoId: '',
    tipo: 'ingreso',
    cantidad: 1,
    motivo: '',
  });

  useEffect(() => {
    fetchInventario();
  }, []);

  const fetchInventario = async () => {
    try {
      const response = await fetch('/api/inventario');
      const data = await response.json();
      if (response.ok) {
        setProductos(data.productos);
        setMovimientos(data.movimientos);
        setResumen(data.resumen);
      } else {
        toast.error(data.error || 'Error al cargar el inventario');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar el inventario');
    }
  };

  const filteredProductos = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegistrarMovimiento = async () => {
    if (!nuevoMovimiento.productoId) {
      toast.error('Selecciona un producto');
      return;
    }

    if (!nuevoMovimiento.cantidad) {
      toast.error('Indica la cantidad');
      return;
    }

    if (nuevoMovimiento.tipo === 'ingreso' && nuevoMovimiento.cantidad <= 0) {
      toast.error('Un ingreso de stock debe ser una cantidad positiva. Usa "Ajuste" si necesitas restar stock.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoMovimiento)
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al registrar movimiento');
        setLoading(false);
        return;
      }

      toast.success('Movimiento de inventario registrado');
      setNuevoMovimiento({ productoId: '', tipo: 'ingreso', cantidad: 1, motivo: '' });
      setShowIngreso(false);
      fetchInventario();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Button
          onClick={() => setShowIngreso(true)}
          className="bg-[#0F6E56] hover:bg-[#0a5244] text-white w-full md:w-auto"
        >
          <PackagePlus size={16} className="mr-2" />
          Registrar ingreso de stock
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Valor total de inventario</p>
            <p className="text-2xl font-bold">S/ {resumen.valorTotalInventario.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#D85A30' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Productos en stock crítico</p>
            <p className="text-2xl font-bold">{resumen.productosStockCritico}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total productos</p>
            <p className="text-2xl font-bold">{resumen.totalProductos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de stock */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Producto</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Stock</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Stock mínimo</th>
                <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Estado</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredProductos.map((producto) => (
                <tr key={producto.id} className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6] transition-colors">
                  <td className="px-4 py-3 font-medium">{producto.nombre}</td>
                  <td className="px-4 py-3 text-right">{producto.stock}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{producto.stockMinimo}</td>
                  <td className="px-4 py-3 text-center">
                    {producto.stockCritico ? (
                      <Badge className="bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle size={12} className="mr-1" />
                        Crítico
                      </Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-700 border border-green-200">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    {producto.valorInventario != null ? `S/ ${producto.valorInventario.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              {filteredProductos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No hay productos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Historial de movimientos */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Movimientos recientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Producto</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Cantidad</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Stock resultante</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6]">
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(m.createdAt).toLocaleString('es-PE')}
                    </td>
                    <td className="px-4 py-3">{m.producto.nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={TIPO_COLORS[m.tipo]}>{TIPO_LABELS[m.tipo]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right">{m.stockResultante}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.motivo || '—'}</td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Aún no hay movimientos de inventario
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drawer: Registrar ingreso/ajuste */}
      <Drawer open={showIngreso} onOpenChange={setShowIngreso}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Registrar movimiento de inventario</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 py-4 space-y-6 max-h-[calc(100vh-150px)] overflow-y-auto">
            <div>
              <Label className="text-sm font-medium">Producto *</Label>
              <Select
                value={nuevoMovimiento.productoId}
                onValueChange={(v) => setNuevoMovimiento({ ...nuevoMovimiento, productoId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} (stock actual: {p.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo de movimiento *</Label>
              <Select
                value={nuevoMovimiento.tipo}
                onValueChange={(v) => setNuevoMovimiento({ ...nuevoMovimiento, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso (compra / reposición)</SelectItem>
                  <SelectItem value="ajuste">Ajuste (corrección de stock)</SelectItem>
                </SelectContent>
              </Select>
              {nuevoMovimiento.tipo === 'ajuste' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Usa un número negativo para restar stock (ej: mermas, productos dañados).
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Cantidad *</Label>
              <Input
                type="number"
                min={nuevoMovimiento.tipo === 'ingreso' ? 1 : undefined}
                value={nuevoMovimiento.cantidad}
                onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, cantidad: parseInt(e.target.value) || 0 })}
                className="bg-white border-[#d5d5d2]"
              />
              {nuevoMovimiento.tipo === 'ingreso' && nuevoMovimiento.cantidad < 0 && (
                <p className="text-xs text-red-600 mt-1">Un ingreso no puede ser negativo.</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Motivo (opcional)</Label>
              <Input
                placeholder="Ej: Compra a proveedor, merma, inventario inicial"
                value={nuevoMovimiento.motivo}
                onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, motivo: e.target.value })}
                className="bg-white border-[#d5d5d2]"
              />
            </div>

            <div className="flex gap-2 justify-end pb-4">
              <Button variant="outline" className="border-[#d5d5d2]" onClick={() => setShowIngreso(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegistrarMovimiento} disabled={loading} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {loading ? 'Guardando...' : 'Guardar movimiento'}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
