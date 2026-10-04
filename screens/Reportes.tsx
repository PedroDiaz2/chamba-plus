'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, Package, Users, Boxes } from 'lucide-react';
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
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CANAL_LABELS: Record<string, string> = {
  tienda_fisica: 'Tienda física',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  marketplace: 'Marketplace',
};

const PREFIJO_CANAL_PERSONALIZADO = 'otro:';

const REPORT_TYPES = [
  { id: 'ventas', name: 'Reporte de Ventas', icon: FileText, description: 'Detalle de todas las ventas' },
  { id: 'kpi', name: 'Reporte de KPIs', icon: BarChart3, description: 'Indicadores clave de rendimiento' },
  { id: 'productos', name: 'Productos y Servicios', icon: Package, description: 'Rendimiento por producto o servicio' },
  { id: 'clientes', name: 'Reporte de Clientes', icon: Users, description: 'Compras, gasto y recurrencia' },
  { id: 'inventario', name: 'Reporte de Inventario', icon: Boxes, description: 'Stock y valorización actual' },
];

const FORMATOS = [
  { id: 'csv', label: 'CSV' },
  { id: 'excel', label: 'Excel (.xlsx)' },
  { id: 'pdf', label: 'PDF' },
];

interface Columna { key: string; label: string; }
interface Seccion { titulo: string; columnas: Columna[]; filas: Record<string, string | number>[]; }
interface ReporteData {
  titulo: string;
  nombreArchivo: string;
  filtros: { fechaInicio: string; fechaFin: string; canal: string };
  secciones: Seccion[];
}

function sanitizarNombreHoja(nombre: string) {
  return nombre.replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Hoja1';
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

function exportarCSV(reporte: ReporteData) {
  let csv = `${reporte.titulo}\n`;
  csv += `Canal: ${reporte.filtros.canal} | Desde: ${reporte.filtros.fechaInicio} | Hasta: ${reporte.filtros.fechaFin}\n\n`;

  reporte.secciones.forEach((seccion) => {
    if (reporte.secciones.length > 1) csv += `=== ${seccion.titulo} ===\n`;
    csv += seccion.columnas.map((c) => c.label).join(',') + '\n';
    seccion.filas.forEach((fila) => {
      csv += seccion.columnas.map((c) => `"${String(fila[c.key] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
    });
    csv += '\n';
  });

  descargarBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${reporte.nombreArchivo}.csv`);
}

function exportarExcel(reporte: ReporteData) {
  const workbook = XLSX.utils.book_new();

  reporte.secciones.forEach((seccion) => {
    const aoa = [
      seccion.columnas.map((c) => c.label),
      ...seccion.filas.map((fila) => seccion.columnas.map((c) => fila[c.key] ?? '')),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, sheet, sanitizarNombreHoja(seccion.titulo));
  });

  XLSX.writeFile(workbook, `${reporte.nombreArchivo}.xlsx`);
}

function exportarPDF(reporte: ReporteData) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(reporte.titulo, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Canal: ${reporte.filtros.canal}   Desde: ${reporte.filtros.fechaInicio}   Hasta: ${reporte.filtros.fechaFin}`,
    14,
    22
  );

  let cursorY = 28;
  reporte.secciones.forEach((seccion) => {
    if (reporte.secciones.length > 1) {
      doc.setFontSize(11);
      doc.setTextColor(15, 110, 86);
      doc.text(seccion.titulo, 14, cursorY);
      cursorY += 4;
    }
    autoTable(doc, {
      startY: cursorY,
      head: [seccion.columnas.map((c) => c.label)],
      body: seccion.filas.map((fila) => seccion.columnas.map((c) => String(fila[c.key] ?? ''))),
      headStyles: { fillColor: [15, 110, 86] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  });

  doc.save(`${reporte.nombreArchivo}.pdf`);
}

export default function Reportes() {
  const [tipoReporte, setTipoReporte] = useState('ventas');
  const [formato, setFormato] = useState('csv');
  const [canal, setCanal] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [canalLabelsExtra, setCanalLabelsExtra] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/canales-personalizados')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.canalesPersonalizados) return;
        const labels: Record<string, string> = {};
        (data.canalesPersonalizados as { id: string; nombre: string; activo: boolean }[])
          .filter((cp) => cp.activo)
          .forEach((cp) => { labels[`${PREFIJO_CANAL_PERSONALIZADO}${cp.id}`] = cp.nombre; });
        setCanalLabelsExtra(labels);
      })
      .catch(() => {});
  }, []);

  const canalLabels = { ...CANAL_LABELS, ...canalLabelsExtra };
  const CANAL_OPTIONS = Object.entries(canalLabels).map(([id, label]) => ({ id, label }));

  const handleExportar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reportes/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoReporte,
          canal: canal === 'todos' ? null : canal,
          fechaInicio: fechaInicio || null,
          fechaFin: fechaFin || null,
        })
      });

      const data: ReporteData & { error?: string } = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Error al generar reporte');
        return;
      }

      if (!data.secciones.some((s) => s.filas.length > 0)) {
        toast.warning('No hay datos para exportar con los filtros seleccionados');
        return;
      }

      if (formato === 'csv') exportarCSV(data);
      else if (formato === 'excel') exportarExcel(data);
      else exportarPDF(data);

      toast.success('Reporte exportado correctamente');
    } catch (error) {
      toast.error('Error de conexión. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const reporteSeleccionado = REPORT_TYPES.find(r => r.id === tipoReporte);
  const Icon = reporteSeleccionado?.icon || FileText;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Exportar Reportes</h2>
        <p className="text-muted-foreground">Genera y descarga reportes en CSV, Excel o PDF</p>
      </div>

      {/* Selección de tipo de reporte */}
      <Card className="bg-white">
        <CardContent className="pt-6">
          <Label className="text-sm font-medium mb-4 block">Tipo de reporte</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {REPORT_TYPES.map((reporte) => {
              const ReportIcon = reporte.icon;
              return (
                <button
                  key={reporte.id}
                  onClick={() => setTipoReporte(reporte.id)}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    tipoReporte === reporte.id
                      ? 'border-[#0F6E56] bg-[#F0FAF6]'
                      : 'border-[#e5e5e3] hover:border-[#0F6E56] hover:bg-[#F7F8F6]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <ReportIcon size={20} className={tipoReporte === reporte.id ? 'text-[#0F6E56]' : 'text-muted-foreground'} />
                    <span className="font-medium text-sm">{reporte.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{reporte.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="bg-white border-t-4" style={{ borderTopColor: '#1D9E75' }}>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-[#0F6E56] mb-4">Configurar filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="canal">Canal (opcional)</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger id="canal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los canales</SelectItem>
                  {CANAL_OPTIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fechaInicio">Fecha inicio (opcional)</Label>
              <input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                max={fechaFin || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white"
              />
            </div>

            <div>
              <Label htmlFor="fechaFin">Fecha fin (opcional)</Label>
              <input
                id="fechaFin"
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-[#d5d5d2] rounded-md bg-white"
              />
            </div>

            <div>
              <Label htmlFor="formato">Formato de exportación</Label>
              <Select value={formato} onValueChange={setFormato}>
                <SelectTrigger id="formato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del reporte */}
      <Card className="bg-[#F0FAF6] border border-[#1D9E75]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-[#0F6E56]">
              <Icon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#0F6E56] mb-1">{reporteSeleccionado?.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{reporteSeleccionado?.description}</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Formato:</strong> {FORMATOS.find((f) => f.id === formato)?.label}</p>
                <p><strong>Canal:</strong> {canal === 'todos' ? 'Todos' : canalLabels[canal]}</p>
                <p><strong>Rango de fechas:</strong> {fechaInicio && fechaFin ? `${fechaInicio} a ${fechaFin}` : 'Todo el historial'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de exportación */}
      <Button
        onClick={handleExportar}
        disabled={loading}
        className="bg-[#0F6E56] hover:bg-[#0a5244] text-white w-full md:w-auto"
      >
        <Download size={18} className="mr-2" />
        {loading ? 'Generando reporte...' : `Exportar a ${FORMATOS.find((f) => f.id === formato)?.label}`}
      </Button>

      {/* Información adicional */}
      <Card className="bg-white border-l-4" style={{ borderLeftColor: '#EF9F27' }}>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Información sobre los reportes</h3>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li><strong>Ventas:</strong> detalle de cada venta con fecha, canal, producto/servicio, cantidad, monto y cliente.</li>
            <li><strong>KPIs:</strong> resumen de ventas, ventas por canal y productos/servicios más vendidos.</li>
            <li><strong>Productos y Servicios:</strong> cantidad vendida y monto total por ítem del catálogo.</li>
            <li><strong>Clientes:</strong> compras, última compra y total gastado por cliente.</li>
            <li><strong>Inventario:</strong> stock actual, stock mínimo, estado y valorización (solo ítems de tipo producto).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
