'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Upload } from 'lucide-react';
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

const CANAL_LABELS: Record<string, string> = {
  tienda_fisica: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  marketplace: 'Marketplace',
  otro: 'Otro',
};

interface Cliente {
  id: string;
  codigo: string;
  nombre: string;
  telefono: string | null;
  dni: string | null;
  direccion: string | null;
  canalPreferido: string | null;
  notas: string | null;
  compras: number;
  totalGastado: number;
  ultimaCompra: string | null;
  esRecurrente: boolean;
}

const FORM_VACIO = {
  codigo: '',
  nombre: '',
  telefono: '',
  dni: '',
  direccion: '',
  canalPreferido: '',
  notas: '',
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [canalesHabilitados, setCanalesHabilitados] = useState<string[]>(Object.keys(CANAL_LABELS));
  const [canalLabels, setCanalLabels] = useState<Record<string, string>>(CANAL_LABELS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showImportarMasivo, setShowImportarMasivo] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const [formCliente, setFormCliente] = useState(FORM_VACIO);

  useEffect(() => {
    fetchClientes();
    fetchNegocio();
  }, []);

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

  const handleNuevoCliente = () => {
    setEditingCliente(null);
    setFormCliente(FORM_VACIO);
    setShowForm(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormCliente({
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      dni: cliente.dni || '',
      direccion: cliente.direccion || '',
      canalPreferido: cliente.canalPreferido || '',
      notas: cliente.notas || '',
    });
    setShowForm(true);
  };

  const handleGuardarCliente = async () => {
    if (!formCliente.nombre) {
      toast.error('El nombre del cliente es requerido');
      return;
    }

    setLoading(true);
    try {
      const esEdicion = !!editingCliente;
      const url = esEdicion ? `/api/clientes/${editingCliente!.id}` : '/api/clientes';
      const response = await fetch(url, {
        method: esEdicion ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al guardar cliente');
        setLoading(false);
        return;
      }

      toast.success(esEdicion ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      setFormCliente(FORM_VACIO);
      setEditingCliente(null);
      setShowForm(false);
      fetchClientes();
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarCliente = async () => {
    if (!clienteAEliminar) return;

    setEliminando(true);
    try {
      const response = await fetch(`/api/clientes/${clienteAEliminar.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'No se pudo eliminar el cliente');
        setEliminando(false);
        return;
      }

      toast.success(`"${clienteAEliminar.nombre}" eliminado correctamente`);
      setClienteAEliminar(null);
      fetchClientes();
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

      const response = await fetch('/api/clientes/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientes: filas })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al importar clientes');
        setImportLoading(false);
        return;
      }

      fetchClientes();
      setCsvFile(null);

      if (data.erroresCount > 0) {
        setImportErrors(data.errores);
        toast.warning(`Se importaron ${data.creados} de ${data.totalProcesado}. ${data.erroresCount} fila(s) con errores, revisa el detalle abajo.`);
      } else {
        toast.success(`Se importaron ${data.creados} clientes correctamente`);
        setShowImportarMasivo(false);
      }
    } catch (error) {
      toast.error('Error al procesar el archivo CSV');
    } finally {
      setImportLoading(false);
    }
  };

  const filteredClientes = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefono || '').includes(searchTerm)
  );

  const totalClientes = clientes.length;
  const clientesRecurrentes = clientes.filter((c) => c.esRecurrente).length;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={handleNuevoCliente} className="bg-primary hover:bg-primary/90 flex-1 md:flex-none">
            <Plus size={16} className="mr-2" />
            Nuevo cliente
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
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total clientes</p>
            <p className="text-2xl font-bold">{totalClientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Clientes recurrentes</p>
            <p className="text-2xl font-bold">{clientesRecurrentes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Código</th>
                <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold">Telefono</th>
                <th className="px-4 py-3 text-left font-semibold">Canal preferido</th>
                <th className="px-4 py-3 text-center font-semibold">Compras</th>
                <th className="px-4 py-3 text-left font-semibold">Ultima compra</th>
                <th className="px-4 py-3 text-right font-semibold">Total gastado</th>
                <th className="px-4 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{cliente.codigo}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {cliente.nombre}
                      {cliente.esRecurrente && (
                        <Badge variant="secondary" className="text-xs">Recurrente</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cliente.telefono || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cliente.canalPreferido ? (canalLabels[cliente.canalPreferido] || cliente.canalPreferido) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{cliente.compras}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {cliente.ultimaCompra
                      ? new Date(cliente.ultimaCompra).toLocaleString('es-PE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Sin compras'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    S/ {cliente.totalGastado.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditarCliente(cliente)}>
                        <Pencil size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={cliente.compras > 0}
                        title={cliente.compras > 0 ? 'No se puede eliminar: tiene ventas asociadas' : 'Eliminar cliente'}
                        onClick={() => setClienteAEliminar(cliente)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No hay clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialog: Nuevo / Editar Cliente */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCliente ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Código (opcional)</label>
              <Input
                placeholder="Se genera automáticamente si lo dejas vacío"
                value={formCliente.codigo}
                onChange={(e) => setFormCliente({ ...formCliente, codigo: e.target.value })}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre completo</label>
              <Input
                placeholder="Ej: Juan Perez"
                value={formCliente.nombre}
                onChange={(e) => setFormCliente({ ...formCliente, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Telefono (opcional)</label>
              <Input
                placeholder="999 888 777"
                value={formCliente.telefono}
                onChange={(e) => setFormCliente({ ...formCliente, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">DNI (opcional)</label>
              <Input
                placeholder="12345678"
                value={formCliente.dni}
                onChange={(e) => setFormCliente({ ...formCliente, dni: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Direccion (opcional)</label>
              <Input
                placeholder="Calle Principal 123"
                value={formCliente.direccion}
                onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Canal de preferencia</label>
              <Select
                value={formCliente.canalPreferido}
                onValueChange={(v) => setFormCliente({ ...formCliente, canalPreferido: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {canalesHabilitados.map((value) => (
                    <SelectItem key={value} value={value}>{canalLabels[value] || value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Notas (opcional)</label>
              <textarea
                placeholder="Agregar notas sobre el cliente"
                value={formCliente.notas}
                onChange={(e) => setFormCliente({ ...formCliente, notas: e.target.value })}
                className="w-full p-2 border border-border rounded-lg text-sm"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarCliente} disabled={loading} className="bg-primary hover:bg-primary/90">
                {loading ? 'Guardando...' : editingCliente ? 'Guardar cambios' : 'Guardar cliente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={!!clienteAEliminar} onOpenChange={(open) => !open && setClienteAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a "{clienteAEliminar?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Solo es posible eliminar clientes sin ventas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleEliminarCliente(); }}
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
            <DialogTitle>Importar clientes</DialogTitle>
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
                  id="csv-upload-clientes"
                />
                <label htmlFor="csv-upload-clientes" className="cursor-pointer">
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
                  const template = `codigo,nombre,telefono,dni,direccion,canalPreferido,notas
,Maria Quispe,999888777,12345678,Jr. Principal 123,tienda_fisica,
,Juan Perez,999111222,,,whatsapp,Cliente frecuente`;
                  const blob = new Blob([template], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'plantilla_clientes.csv';
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
                <li>nombre: requerido, no debe repetirse</li>
                <li>telefono, dni, direccion, notas: opcionales</li>
                <li>canalPreferido: tienda_fisica, whatsapp, instagram, facebook, tiktok, marketplace, otro (opcional)</li>
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
