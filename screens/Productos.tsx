'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, Pencil, Trash2, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

type TipoProducto = 'producto' | 'servicio';
type UnidadMedida = 'unidad' | 'kilogramo' | 'gramo' | 'litro' | 'mililitro' | 'metro' | 'hora' | 'sesion' | 'paquete' | 'docena' | 'otro';

const UNIDAD_LABELS: Record<UnidadMedida, string> = {
  unidad: 'Unidad',
  kilogramo: 'Kilogramo (kg)',
  gramo: 'Gramo (g)',
  litro: 'Litro (L)',
  mililitro: 'Mililitro (mL)',
  metro: 'Metro (m)',
  hora: 'Hora',
  sesion: 'Sesión',
  paquete: 'Paquete',
  docena: 'Docena',
  otro: 'Otro',
};

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  tipo: TipoProducto;
  unidad: UnidadMedida;
  stock: number;
  stockMinimo: number;
  precioVenta: number | null;
  precioCosto: number | null;
}

const FORM_VACIO = {
  codigo: '',
  nombre: '',
  categoria: '',
  tipo: 'producto' as TipoProducto,
  unidad: 'unidad' as UnidadMedida,
  stock: '0',
  stockMinimo: '0',
  precioVenta: '',
  precioCosto: '',
};

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [productoAEliminar, setProductoAEliminar] = useState<Producto | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showImportarMasivo, setShowImportarMasivo] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [formProducto, setFormProducto] = useState(FORM_VACIO);

  useEffect(() => {
    fetchProductos();
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

  const filteredProducts = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNuevoProducto = () => {
    setEditingProducto(null);
    setFormProducto(FORM_VACIO);
    setShowForm(true);
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditingProducto(producto);
    setFormProducto({
      codigo: producto.codigo,
      nombre: producto.nombre,
      categoria: producto.categoria || '',
      tipo: producto.tipo,
      unidad: producto.unidad,
      stock: String(producto.stock),
      stockMinimo: String(producto.stockMinimo),
      precioVenta: producto.precioVenta != null ? String(producto.precioVenta) : '',
      precioCosto: producto.precioCosto != null ? String(producto.precioCosto) : '',
    });
    setShowForm(true);
  };

  const handleGuardarProducto = async () => {
    if (!formProducto.nombre.trim()) {
      toast.error('El nombre del producto es requerido');
      return;
    }

    const esServicio = formProducto.tipo === 'servicio';

    if (!esServicio && formProducto.stock !== '' && Number(formProducto.stock) < 0) {
      toast.error('El stock inicial no puede ser negativo');
      return;
    }
    if (!esServicio && formProducto.stockMinimo !== '' && Number(formProducto.stockMinimo) < 0) {
      toast.error('El stock mínimo no puede ser negativo');
      return;
    }
    if (formProducto.precioVenta !== '' && Number(formProducto.precioVenta) < 0) {
      toast.error('El precio de venta no puede ser negativo');
      return;
    }
    if (formProducto.precioCosto !== '' && Number(formProducto.precioCosto) < 0) {
      toast.error('El precio de costo no puede ser negativo');
      return;
    }

    setLoading(true);
    try {
      const esEdicion = !!editingProducto;
      const url = esEdicion ? `/api/productos/${editingProducto!.id}` : '/api/productos';
      const payload: any = {
        nombre: formProducto.nombre,
        categoria: formProducto.categoria,
        ...(formProducto.codigo.trim() && { codigo: formProducto.codigo.trim() }),
        unidad: formProducto.unidad,
        stockMinimo: esServicio ? 0 : parseInt(formProducto.stockMinimo) || 0,
        precioVenta: formProducto.precioVenta ? parseFloat(formProducto.precioVenta) : null,
        precioCosto: formProducto.precioCosto ? parseFloat(formProducto.precioCosto) : null,
      };
      if (!esEdicion) {
        payload.tipo = formProducto.tipo;
        payload.stock = esServicio ? 0 : parseInt(formProducto.stock) || 0;
      }

      const response = await fetch(url, {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar producto');
        setLoading(false);
        return;
      }

      toast.success(esEdicion ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
      setFormProducto(FORM_VACIO);
      setEditingProducto(null);
      setShowForm(false);
      fetchProductos();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarProducto = async () => {
    if (!productoAEliminar) return;

    setEliminando(true);
    try {
      const response = await fetch(`/api/productos/${productoAEliminar.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'No se pudo eliminar el registro');
        setEliminando(false);
        return;
      }

      toast.success(`"${productoAEliminar.nombre}" eliminado correctamente`);
      setProductoAEliminar(null);
      fetchProductos();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setEliminando(false);
    }
  };

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
    setImportErrors([]);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        toast.error('El archivo CSV está vacío o no tiene datos');
        setImportLoading(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const filas = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim());
        const fila: any = {};
        headers.forEach((header, idx) => { fila[header] = values[idx] || ''; });
        filas.push(fila);
      }

      const response = await fetch('/api/productos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos: filas })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al importar productos');
        setImportLoading(false);
        return;
      }

      fetchProductos();
      setCsvFile(null);

      if (data.erroresCount > 0) {
        setImportErrors(data.errores);
        toast.warning(`Se importaron ${data.creados} de ${data.totalProcesado}. ${data.erroresCount} fila(s) con errores, revisa el detalle abajo.`);
      } else {
        toast.success(`Se importaron ${data.creados} productos/servicios correctamente`);
        setShowImportarMasivo(false);
      }
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
        <div className="flex-1 flex gap-2 w-full">
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
        <div className="flex gap-2 w-full md:w-auto">
          <Button
            onClick={handleNuevoProducto}
            className="bg-[#0F6E56] hover:bg-[#0a5244] text-white flex-1 md:flex-none"
          >
            <Plus size={16} className="mr-2" />
            Nuevo producto
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Productos</p>
            <p className="text-3xl font-bold">{productos.filter(p => p.tipo === 'producto').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#7F77DD' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Servicios</p>
            <p className="text-3xl font-bold">{productos.filter(p => p.tipo === 'servicio').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Con categoría</p>
            <p className="text-3xl font-bold">{productos.filter(p => p.categoria).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4" style={{ borderLeftColor: '#B91C1C' }}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">En stock crítico</p>
            <p className="text-3xl font-bold">{productos.filter(p => p.tipo === 'producto' && p.stock <= p.stockMinimo).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F0FAF6] border-b border-[#e5e5e3]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Código</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Nombre</th>
                <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Categoría</th>
                <th className="px-4 py-3 text-left font-semibold text-[#0F6E56]">Unidad</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Stock</th>
                <th className="px-4 py-3 text-right font-semibold text-[#0F6E56]">Precio venta</th>
                <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-[#0F6E56]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((producto) => (
                <tr
                  key={producto.id}
                  className="border-b border-[#e5e5e3] hover:bg-[#F7F8F6] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{producto.codigo}</td>
                  <td className="px-4 py-3 font-medium">{producto.nombre}</td>
                  <td className="px-4 py-3 text-center">
                    {producto.tipo === 'servicio' ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200">Servicio</Badge>
                    ) : (
                      <Badge variant="secondary">Producto</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{producto.categoria || 'Sin categoría'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{UNIDAD_LABELS[producto.unidad]}</td>
                  <td className="px-4 py-3 text-right">{producto.tipo === 'servicio' ? '—' : producto.stock}</td>
                  <td className="px-4 py-3 text-right">
                    {producto.precioVenta != null ? `S/ ${producto.precioVenta.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {producto.tipo === 'servicio' ? (
                      <span className="text-muted-foreground text-xs">No aplica</span>
                    ) : producto.stock <= producto.stockMinimo ? (
                      <Badge className="bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle size={12} className="mr-1" />
                        Crítico
                      </Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-700 border border-green-200">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditarProducto(producto)}>
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setProductoAEliminar(producto)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No hay productos ni servicios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer: Nuevo / Editar Producto */}
      <Drawer open={showForm} onOpenChange={setShowForm}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingProducto ? 'Editar producto' : 'Nuevo producto'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-6 py-4 space-y-6 max-h-[calc(100vh-150px)] overflow-y-auto">
            <div>
              <Label htmlFor="codigo" className="text-sm font-medium">Código (opcional)</Label>
              <Input
                id="codigo"
                placeholder="Se genera automáticamente si lo dejas vacío"
                value={formProducto.codigo}
                onChange={(e) => setFormProducto({ ...formProducto, codigo: e.target.value })}
                className="bg-white border-[#d5d5d2] font-mono"
              />
            </div>

            <div>
              <Label htmlFor="nombre" className="text-sm font-medium">Nombre del producto *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Polo básico"
                value={formProducto.nombre}
                onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
                className="bg-white border-[#d5d5d2]"
              />
            </div>

            <div>
              <Label htmlFor="categoria" className="text-sm font-medium">Categoría (opcional)</Label>
              <Input
                id="categoria"
                placeholder="Ej: Ropa"
                value={formProducto.categoria}
                onChange={(e) => setFormProducto({ ...formProducto, categoria: e.target.value })}
                className="bg-white border-[#d5d5d2]"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Tipo *</Label>
              {editingProducto ? (
                <div className="mt-1">
                  <Badge variant={formProducto.tipo === 'servicio' ? 'default' : 'secondary'}>
                    {formProducto.tipo === 'servicio' ? 'Servicio' : 'Producto'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">El tipo no se puede cambiar luego de creado.</p>
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={formProducto.tipo === 'producto' ? 'default' : 'outline'}
                    className={formProducto.tipo === 'producto' ? 'bg-[#0F6E56] hover:bg-[#0a5244] text-white flex-1' : 'flex-1 border-[#d5d5d2]'}
                    onClick={() => setFormProducto({ ...formProducto, tipo: 'producto' })}
                  >
                    Producto (con stock)
                  </Button>
                  <Button
                    type="button"
                    variant={formProducto.tipo === 'servicio' ? 'default' : 'outline'}
                    className={formProducto.tipo === 'servicio' ? 'bg-[#0F6E56] hover:bg-[#0a5244] text-white flex-1' : 'flex-1 border-[#d5d5d2]'}
                    onClick={() => setFormProducto({ ...formProducto, tipo: 'servicio' })}
                  >
                    Servicio (sin stock)
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Unidad de medida</Label>
              <Select value={formProducto.unidad} onValueChange={(v) => setFormProducto({ ...formProducto, unidad: v as UnidadMedida })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIDAD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Ej: ropa por unidad, queso por kilogramo, un servicio por hora o sesión.
              </p>
            </div>

            {formProducto.tipo === 'producto' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock" className="text-sm font-medium">
                    {editingProducto ? 'Stock actual' : 'Stock inicial'}
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formProducto.stock}
                    disabled={!!editingProducto}
                    onChange={(e) => setFormProducto({ ...formProducto, stock: e.target.value })}
                    className="bg-white border-[#d5d5d2] disabled:opacity-60"
                  />
                  {editingProducto && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Para cambiar el stock, usa Inventario → Registrar ingreso de stock.
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="stockMinimo" className="text-sm font-medium">Stock mínimo</Label>
                  <Input
                    id="stockMinimo"
                    type="number"
                    min="0"
                    value={formProducto.stockMinimo}
                    onChange={(e) => setFormProducto({ ...formProducto, stockMinimo: e.target.value })}
                    className="bg-white border-[#d5d5d2]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="precioVenta" className="text-sm font-medium">Precio de venta (opcional)</Label>
                <Input
                  id="precioVenta"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="S/"
                  value={formProducto.precioVenta}
                  onChange={(e) => setFormProducto({ ...formProducto, precioVenta: e.target.value })}
                  className="bg-white border-[#d5d5d2]"
                />
              </div>
              <div>
                <Label htmlFor="precioCosto" className="text-sm font-medium">Precio de costo (opcional)</Label>
                <Input
                  id="precioCosto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="S/"
                  value={formProducto.precioCosto}
                  onChange={(e) => setFormProducto({ ...formProducto, precioCosto: e.target.value })}
                  className="bg-white border-[#d5d5d2]"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pb-4">
              <Button
                variant="outline"
                className="border-[#d5d5d2]"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleGuardarProducto} disabled={loading} className="bg-[#0F6E56] hover:bg-[#0a5244] text-white">
                {loading ? 'Guardando...' : editingProducto ? 'Guardar cambios' : 'Guardar producto'}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!productoAEliminar} onOpenChange={(open) => !open && setProductoAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{productoAEliminar?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si tiene ventas registradas, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEliminarProducto(); }}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Importar Masivo Dialog */}
      <Dialog open={showImportarMasivo} onOpenChange={(open) => { setShowImportarMasivo(open); if (!open) { setCsvFile(null); setImportErrors([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar productos y servicios</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Archivo CSV</label>
              <div className="border-2 border-dashed border-[#1D9E75] rounded-lg p-8 text-center hover:bg-[#F0FAF6] transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload-productos"
                />
                <label htmlFor="csv-upload-productos" className="cursor-pointer">
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

            <div className="bg-[#F0FAF6] border border-[#1D9E75] rounded-lg p-4">
              <p className="text-sm font-medium text-[#0F6E56] mb-2">¿No sabes el formato?</p>
              <Button
                variant="link"
                className="p-0 h-auto text-[#0F6E56] hover:text-[#0a5244]"
                onClick={() => {
                  const template = `codigo,nombre,tipo,categoria,unidad,stock,stockMinimo,precioVenta,precioCosto
,Polo básico,producto,Ropa,unidad,20,5,35.00,18.00
,Queso fresco,producto,Alimentos,kilogramo,10,2,15.00,9.00
,Corte de cabello,servicio,Servicios,hora,,,20.00,5.00`;
                  const blob = new Blob([template], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'plantilla_productos.csv';
                  a.click();
                }}
              >
                Descargar plantilla CSV
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Columnas:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>codigo: opcional, se genera automáticamente si se deja vacío</li>
                <li>nombre: requerido</li>
                <li>tipo: "producto" o "servicio" (por defecto "producto")</li>
                <li>categoria: opcional</li>
                <li>unidad: unidad, kilogramo, gramo, litro, mililitro, metro, hora, sesion, paquete, docena, otro</li>
                <li>stock / stockMinimo: solo para productos, números enteros ≥ 0</li>
                <li>precioVenta / precioCosto: opcionales, números ≥ 0</li>
              </ul>
            </div>

            {importErrors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600">
                  {importErrors.length} fila(s) no se pudieron importar:
                </p>
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg bg-red-50 p-3 space-y-1">
                  {importErrors.map((err, idx) => (
                    <p key={idx} className="text-xs text-red-700">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                className="border-[#d5d5d2]"
                onClick={() => { setShowImportarMasivo(false); setCsvFile(null); setImportErrors([]); }}
              >
                {importErrors.length > 0 ? 'Cerrar' : 'Cancelar'}
              </Button>
              <Button
                onClick={handleImportCSV}
                disabled={!csvFile || importLoading}
                className="bg-[#0F6E56] hover:bg-[#0a5244] text-white"
              >
                {importLoading ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
