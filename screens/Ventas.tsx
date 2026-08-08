'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Upload, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  tipo: 'producto' | 'servicio';
  stock: number;
  precioVenta: number | null;
}

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
}

interface Venta {
  id: string;
  canal: string;
  cantidad: number;
  monto: number;
  fechaVenta: string;
  cliente?: string | null;
  clienteId?: string | null;
  producto: Producto;
}

const CANAL_LABELS: Record<string, string> = {
  tienda_fisica: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  marketplace: 'Marketplace',
  otro: 'Otro',
};

const CLIENTE_NUEVO = '__nuevo__';
const CLIENTE_OCASIONAL = '__ocasional__';

const NUEVA_VENTA_VACIA = {
  canal: '',
  productoId: '',
  cantidad: 1,
  precioUnitario: '',
  descuento: '0',
  fechaVenta: new Date().toISOString().split('T')[0],
  clienteSeleccion: CLIENTE_OCASIONAL,
};

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [canalesHabilitados, setCanalesHabilitados] = useState<string[]>(Object.keys(CANAL_LABELS));
  const [canalLabels, setCanalLabels] = useState<Record<string, string>>(CANAL_LABELS);
  const [showRegistrarVenta, setShowRegistrarVenta] = useState(false);
  const [showImportarMasivo, setShowImportarMasivo] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [nuevoVenta, setNuevoVenta] = useState(NUEVA_VENTA_VACIA);

  // Modal de creación rápida de cliente desde el formulario de venta
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({ nombre: '', telefono: '' });
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  // Edición / eliminación de ventas existentes
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [formEdicion, setFormEdicion] = useState({ canal: '', monto: '', fechaVenta: '', clienteSeleccion: CLIENTE_OCASIONAL });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [ventaAEliminar, setVentaAEliminar] = useState<Venta | null>(null);
  const [eliminandoVenta, setEliminandoVenta] = useState(false);

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    fetchClientes();
    fetchNegocio();
  }, []);

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

  const fetchVentas = async () => {
    try {
      const response = await fetch('/api/ventas');
      const data = await response.json();
      if (response.ok) {
        setVentas(data.ventas);
      } else {
        toast.error(data.error || 'Error al cargar ventas');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar ventas');
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      const data = await response.json();
      if (response.ok) {
        setClientes(data.clientes);
      } else {
        toast.error(data.error || 'Error al cargar clientes');
      }
    } catch (error) {
      toast.error('Error de conexión al cargar clientes');
    }
  };

  const fetchNegocio = async () => {
    try {
      const response = await fetch('/api/negocio');
      const data = await response.json();
      if (response.ok && data.negocio?.canales?.length) {
        setCanalesHabilitados(data.negocio.canales);
        if (data.negocio.otroCanalNombre) {
          setCanalLabels((prev) => ({ ...prev, otro: data.negocio.otroCanalNombre }));
        }
      }
    } catch (error) {
      console.error('Error al cargar negocio:', error);
    }
  };

  const totalVentasHoy = ventas.reduce((sum, v) => sum + v.monto, 0);
  const cantidadVentasHoy = ventas.length;
  const ticketPromedio = cantidadVentasHoy > 0 ? totalVentasHoy / cantidadVentasHoy : 0;
  const ventasWhatsappHoy = ventas.filter((v) => v.canal === 'whatsapp').length;

  const productoSeleccionado = productos.find((p) => p.id === nuevoVenta.productoId) || null;
  const montoCalculado = Math.max(
    0,
    (parseFloat(nuevoVenta.precioUnitario) || 0) * (nuevoVenta.cantidad || 0) - (parseFloat(nuevoVenta.descuento) || 0)
  );

  const handleSeleccionarProducto = (productoId: string) => {
    const producto = productos.find((p) => p.id === productoId);
    setNuevoVenta({
      ...nuevoVenta,
      productoId,
      precioUnitario: producto?.precioVenta != null ? String(producto.precioVenta) : nuevoVenta.precioUnitario,
    });
  };

  const handleSeleccionarCliente = (valor: string) => {
    if (valor === CLIENTE_NUEVO) {
      setNuevoClienteForm({ nombre: '', telefono: '' });
      setShowNuevoCliente(true);
      return;
    }
    setNuevoVenta({ ...nuevoVenta, clienteSeleccion: valor });
  };

  const handleGuardarNuevoCliente = async () => {
    if (!nuevoClienteForm.nombre.trim()) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    setGuardandoCliente(true);
    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoClienteForm)
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al crear cliente');
        setGuardandoCliente(false);
        return;
      }

      toast.success('Cliente creado correctamente');
      setClientes((prev) => [...prev, { id: data.cliente.id, codigo: data.cliente.codigo, nombre: data.cliente.nombre }]);
      setNuevoVenta((prev) => ({ ...prev, clienteSeleccion: data.cliente.id }));
      setShowNuevoCliente(false);
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGuardandoCliente(false);
    }
  };

  const handleRegistrarVenta = async () => {
    if (!nuevoVenta.canal || !nuevoVenta.productoId || !nuevoVenta.cantidad || !nuevoVenta.fechaVenta) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (nuevoVenta.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    if (parseFloat(nuevoVenta.descuento) < 0) {
      toast.error('El descuento no puede ser negativo');
      return;
    }

    if (montoCalculado <= 0) {
      toast.error('El monto total debe ser mayor a 0. Revisa el precio unitario y el descuento.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        canal: nuevoVenta.canal,
        productoId: nuevoVenta.productoId,
        cantidad: nuevoVenta.cantidad,
        monto: Number(montoCalculado.toFixed(2)),
        fechaVenta: nuevoVenta.fechaVenta,
      };
      if (nuevoVenta.clienteSeleccion !== CLIENTE_OCASIONAL) {
        payload.clienteId = nuevoVenta.clienteSeleccion;
      }

      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al registrar venta');
        setLoading(false);
        return;
      }

      if (data.avisoStock) {
        toast.warning('Venta registrada, pero el stock del producto quedó en negativo. Actualiza tu inventario.');
      } else {
        toast.success('Venta registrada correctamente');
      }
      setNuevoVenta(NUEVA_VENTA_VACIA);
      setShowRegistrarVenta(false);
      fetchVentas();
      fetchClientes();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirEdicion = (venta: Venta) => {
    setEditingVenta(venta);
    setFormEdicion({
      canal: venta.canal,
      monto: String(venta.monto),
      fechaVenta: venta.fechaVenta.split('T')[0],
      clienteSeleccion: venta.clienteId || CLIENTE_OCASIONAL,
    });
  };

  const handleGuardarEdicion = async () => {
    if (!editingVenta) return;

    if (!formEdicion.canal || !formEdicion.fechaVenta) {
      toast.error('Completa el canal y la fecha');
      return;
    }

    if (!formEdicion.monto || Number(formEdicion.monto) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setGuardandoEdicion(true);
    try {
      const payload: any = {
        canal: formEdicion.canal,
        monto: Number(formEdicion.monto),
        fechaVenta: formEdicion.fechaVenta,
        clienteId: formEdicion.clienteSeleccion === CLIENTE_OCASIONAL ? null : formEdicion.clienteSeleccion,
      };

      const response = await fetch(`/api/ventas/${editingVenta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al actualizar la venta');
        setGuardandoEdicion(false);
        return;
      }

      toast.success('Venta actualizada correctamente');
      setEditingVenta(null);
      fetchVentas();
      fetchClientes();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarVenta = async () => {
    if (!ventaAEliminar) return;

    setEliminandoVenta(true);
    try {
      const response = await fetch(`/api/ventas/${ventaAEliminar.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'No se pudo eliminar la venta');
        setEliminandoVenta(false);
        return;
      }

      toast.success('Venta eliminada. El stock fue restituido.');
      setVentaAEliminar(null);
      fetchVentas();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setEliminandoVenta(false);
    }
  };

  const filteredVentas = ventas.filter((v) =>
    v.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
    } else {
      toast.error('Por favor selecciona un archivo CSV');
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    setImportLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('El archivo CSV está vacío o no tiene datos');
        setImportLoading(false);
        return;
      }

      // Parsear CSV (asumiendo primera fila como cabecera)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const ventasCSV = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const venta: any = {};

        headers.forEach((header, idx) => {
          venta[header] = values[idx] || '';
        });

        ventasCSV.push(venta);
      }

      const response = await fetch('/api/ventas/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ventas: ventasCSV })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al importar ventas');
        setImportLoading(false);
        return;
      }

      if (data.erroresCount > 0) {
        toast.warning(`Importación completada con ${data.erroresCount} errores. Revisa el detalle.`);
      } else {
        toast.success(`Se importaron ${data.ventasCreadas} ventas correctamente`);
      }

      setCsvFile(null);
      setShowImportarMasivo(false);
      fetchVentas();
    } catch (error) {
      toast.error('Error al procesar el archivo CSV');
    } finally {
      setImportLoading(false);
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
              placeholder="Buscar por cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={() => setShowRegistrarVenta(true)}
            className="bg-[#0F6E56] hover:bg-[#0a5244] text-white flex-1 md:flex-none"
          >
            <Plus size={16} className="mr-2" />
            Registrar venta
          </Button>
          <Button
            onClick={() => setShowImportarMasivo(true)}
            variant="outline"
            className="border-[#0F6E56] text-[#0F6E56] hover:bg-[#F0FAF6]"
          >
            <Upload size={16} className="mr-2" />
            Importar masivo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total vendido hoy', value: `S/ ${totalVentasHoy.toFixed(2)}`, color: '#1D9E75' },
          { label: 'Numero de ventas hoy', value: cantidadVentasHoy, color: '#EF9F27' },
          { label: 'Ticket promedio', value: `S/ ${ticketPromedio.toFixed(2)}`, color: '#D85A30' },
          { label: 'Ventas por WhatsApp hoy', value: ventasWhatsappHoy, color: '#7F77DD' },
        ].map((stat, idx) => (
          <Card key={idx} className="bg-white border-l-4" style={{ borderLeftColor: stat.color }}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Producto</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Canal</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Cantidad</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Monto</th>
                <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredVentas.map((venta) => (
                <tr
                  key={venta.id}
                  className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6] transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(venta.fechaVenta).toLocaleDateString('es-PE')}
                  </td>
                  <td className="px-4 py-3">{venta.cliente || 'Ocasional'}</td>
                  <td className="px-4 py-3">{venta.producto.nombre}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {canalLabels[venta.canal] || venta.canal}
                  </td>
                  <td className="px-4 py-3 text-right">{venta.cantidad}</td>
                  <td className="px-4 py-3 text-right font-bold">S/ {venta.monto.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleAbrirEdicion(venta)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setVentaAEliminar(venta)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVentas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay ventas registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Registrar Venta Drawer */}
      <Drawer open={showRegistrarVenta} onOpenChange={setShowRegistrarVenta}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Registrar nueva venta</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 py-4 space-y-6 max-h-[calc(100vh-150px)] overflow-y-auto">
            {/* Canal */}
            <div>
              <Label htmlFor="canal" className="text-sm font-medium">Canal de venta *</Label>
              <Select value={nuevoVenta.canal} onValueChange={(v) => setNuevoVenta({ ...nuevoVenta, canal: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {canalesHabilitados.map((canal) => (
                    <SelectItem key={canal} value={canal}>
                      {canalLabels[canal] || canal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Producto */}
            <div>
              <Label htmlFor="producto" className="text-sm font-medium">Producto o servicio *</Label>
              <Select value={nuevoVenta.productoId} onValueChange={handleSeleccionarProducto}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto o servicio" />
                </SelectTrigger>
                <SelectContent>
                  {productos.length === 0 ? (
                    <SelectItem value="" disabled>No hay productos ni servicios registrados</SelectItem>
                  ) : (
                    productos.map((producto) => (
                      <SelectItem key={producto.id} value={producto.id}>
                        [{producto.codigo}] {producto.nombre} {producto.tipo === 'servicio' ? '(Servicio)' : `(stock: ${producto.stock})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {productos.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Primero registra productos o servicios en la sección Productos
                </p>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <Label htmlFor="cantidad" className="text-sm font-medium">Cantidad *</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={nuevoVenta.cantidad}
                onChange={(e) => setNuevoVenta({ ...nuevoVenta, cantidad: parseInt(e.target.value) || 1 })}
                className="bg-white border-[#d5d5d2]"
              />
              {productoSeleccionado && productoSeleccionado.tipo === 'producto' && nuevoVenta.cantidad > productoSeleccionado.stock && (
                <p className="text-xs text-amber-600 mt-1">
                  Stock disponible: {productoSeleccionado.stock}. Esta venta dejará el stock en negativo.
                </p>
              )}
            </div>

            {/* Precio unitario + descuento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="precioUnitario" className="text-sm font-medium">Precio unitario (S/) *</Label>
                <Input
                  id="precioUnitario"
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevoVenta.precioUnitario}
                  onChange={(e) => setNuevoVenta({ ...nuevoVenta, precioUnitario: e.target.value })}
                  className="bg-white border-[#d5d5d2]"
                />
                {productoSeleccionado?.precioVenta == null && (
                  <p className="text-xs text-muted-foreground mt-1">Este producto no tiene precio de venta guardado.</p>
                )}
              </div>
              <div>
                <Label htmlFor="descuento" className="text-sm font-medium">Descuento (S/, opcional)</Label>
                <Input
                  id="descuento"
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuevoVenta.descuento}
                  onChange={(e) => setNuevoVenta({ ...nuevoVenta, descuento: e.target.value })}
                  className="bg-white border-[#d5d5d2]"
                />
              </div>
            </div>

            {/* Monto calculado */}
            <div className="rounded-lg bg-[#F0FAF6] border border-[#1D9E75]/30 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-[#0F6E56]">Monto total</span>
              <span className="text-xl font-bold text-[#0F6E56]">S/ {montoCalculado.toFixed(2)}</span>
            </div>

            {/* Fecha de venta */}
            <div>
              <Label htmlFor="fechaVenta" className="text-sm font-medium">Fecha de venta *</Label>
              <Input
                id="fechaVenta"
                type="date"
                value={nuevoVenta.fechaVenta}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNuevoVenta({ ...nuevoVenta, fechaVenta: e.target.value })}
                className="bg-white border-[#d5d5d2]"
              />
            </div>

            {/* Cliente (opcional) */}
            <div>
              <Label htmlFor="cliente" className="text-sm font-medium">Cliente (opcional)</Label>
              <Select
                value={nuevoVenta.clienteSeleccion}
                onValueChange={handleSeleccionarCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLIENTE_OCASIONAL}>Cliente ocasional (sin registrar)</SelectItem>
                  <SelectItem value={CLIENTE_NUEVO}>+ Nuevo cliente</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      [{cliente.codigo}] {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Elegir un cliente existente permite medir su recurrencia y gasto total.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pb-4">
              <Button variant="outline" className="border-[#d5d5d2]" onClick={() => setShowRegistrarVenta(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegistrarVenta} disabled={loading} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {loading ? 'Registrando...' : 'Registrar venta'}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Modal: Nuevo cliente rápido */}
      <Dialog open={showNuevoCliente} onOpenChange={(open) => { setShowNuevoCliente(open); if (!open) setNuevoVenta((prev) => ({ ...prev, clienteSeleccion: prev.clienteSeleccion === CLIENTE_NUEVO ? CLIENTE_OCASIONAL : prev.clienteSeleccion })); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Nombre completo *</Label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={nuevoClienteForm.nombre}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Teléfono (opcional)</Label>
              <Input
                placeholder="999 888 777"
                value={nuevoClienteForm.telefono}
                onChange={(e) => setNuevoClienteForm({ ...nuevoClienteForm, telefono: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes completar más datos del cliente (DNI, dirección, notas) luego desde la sección Clientes.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowNuevoCliente(false)}>Cancelar</Button>
              <Button onClick={handleGuardarNuevoCliente} disabled={guardandoCliente} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {guardandoCliente ? 'Guardando...' : 'Guardar cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar venta */}
      <Dialog open={!!editingVenta} onOpenChange={(open) => !open && setEditingVenta(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Producto: <strong>{editingVenta?.producto.nombre}</strong> · Cantidad: <strong>{editingVenta?.cantidad}</strong>.
              Para cambiar el producto o la cantidad, elimina esta venta y regístrala nuevamente.
            </p>
            <div>
              <Label className="text-sm font-medium">Canal de venta *</Label>
              <Select value={formEdicion.canal} onValueChange={(v) => setFormEdicion({ ...formEdicion, canal: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {canalesHabilitados.map((canal) => (
                    <SelectItem key={canal} value={canal}>{canalLabels[canal] || canal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Monto total (S/) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formEdicion.monto}
                onChange={(e) => setFormEdicion({ ...formEdicion, monto: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha de venta *</Label>
              <Input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={formEdicion.fechaVenta}
                onChange={(e) => setFormEdicion({ ...formEdicion, fechaVenta: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Cliente</Label>
              <Select value={formEdicion.clienteSeleccion} onValueChange={(v) => setFormEdicion({ ...formEdicion, clienteSeleccion: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLIENTE_OCASIONAL}>Cliente ocasional (sin registrar)</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>[{cliente.codigo}] {cliente.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditingVenta(null)}>Cancelar</Button>
              <Button onClick={handleGuardarEdicion} disabled={guardandoEdicion} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {guardandoEdicion ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación de venta */}
      <AlertDialog open={!!ventaAEliminar} onOpenChange={(open) => !open && setVentaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la venta de "{ventaAEliminar?.producto.nombre}" por S/ {ventaAEliminar?.monto.toFixed(2)}.
              {ventaAEliminar?.producto.tipo === 'producto' && ' El stock vendido será restituido automáticamente.'}
              {' '}Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoVenta}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEliminarVenta(); }}
              disabled={eliminandoVenta}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminandoVenta ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Importar Masivo Dialog */}
      <Dialog open={showImportarMasivo} onOpenChange={setShowImportarMasivo}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar ventas históricas</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Archivo CSV</label>
              <div className="border-2 border-dashed border-[#1D9E75] rounded-lg p-8 text-center hover:bg-[#F0FAF6] transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload size={32} className="mx-auto mb-2 text-[#1D9E75]" />
                  <p className="font-medium text-foreground">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                  <p className="text-sm text-muted-foreground">Archivos soportados: CSV</p>
                  {csvFile && (
                    <p className="text-sm text-[#0F6E56] mt-2 font-medium">
                      Archivo seleccionado: {csvFile.name}
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Template Download */}
            <div className="bg-[#F0FAF6] border border-[#1D9E75] rounded-lg p-4">
              <p className="text-sm font-medium text-[#0F6E56] mb-2">¿No sabes el formato?</p>
              <Button
                variant="link"
                className="p-0 h-auto text-[#0F6E56] hover:text-[#0a5244]"
                onClick={() => {
                  const template = `canal,producto,cantidad,monto,fecha_venta,cliente
tienda_fisica,Polo básico,2,50.00,2026-01-28,Maria Quispe
whatsapp,Queso fresco,1,12.50,2026-01-27,Juan Pérez`;
                  const blob = new Blob([template], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'plantilla_ventas.csv';
                  a.click();
                }}
              >
                Descargar plantilla CSV
              </Button>
            </div>

            {/* Validation Rules */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Columnas requeridas:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>canal: tienda_fisica, whatsapp, instagram, facebook, tiktok, marketplace, otro</li>
                <li>producto: nombre exacto del producto (debe existir en tu catálogo)</li>
                <li>cantidad: número entero mayor a 0</li>
                <li>monto: número decimal mayor a 0</li>
                <li>fecha_venta: formato YYYY-MM-DD (ej. 2026-01-28)</li>
                <li>cliente: nombre del cliente (opcional)</li>
              </ul>
            </div>

            {/* Preview Table */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Vista previa (primeras 2 filas de ejemplo)</p>
              <div className="border border-[#e5e5e3] rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
                    <tr>
                      <th className="px-3 py-2 text-left">Canal</th>
                      <th className="px-3 py-2 text-left">Producto</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-left">Cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6]">
                      <td className="px-3 py-2">tienda_fisica</td>
                      <td className="px-3 py-2">Polo básico</td>
                      <td className="px-3 py-2 text-right">2</td>
                      <td className="px-3 py-2 text-right">50.00</td>
                      <td className="px-3 py-2">2026-01-28</td>
                      <td className="px-3 py-2">Maria Quispe</td>
                    </tr>
                    <tr className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6]">
                      <td className="px-3 py-2">whatsapp</td>
                      <td className="px-3 py-2">Queso fresco</td>
                      <td className="px-3 py-2 text-right">1</td>
                      <td className="px-3 py-2 text-right">12.50</td>
                      <td className="px-3 py-2">2026-01-27</td>
                      <td className="px-3 py-2">Juan Pérez</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="border-[#d5d5d2]"
                onClick={() => {
                  setShowImportarMasivo(false);
                  setCsvFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportCSV}
                disabled={!csvFile || importLoading}
                className="bg-[#0F6E56] hover:bg-[#0a5244] text-white"
              >
                {importLoading ? 'Importando...' : 'Importar ventas'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
