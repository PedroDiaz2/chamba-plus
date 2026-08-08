import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TipoProducto } from '@prisma/client';
import { parsearFechaLocal } from '@/lib/fechas';

interface Columna {
  key: string;
  label: string;
}

interface Seccion {
  titulo: string;
  columnas: Columna[];
  filas: Record<string, string | number>[];
}

export async function POST(request: NextRequest) {
  try {
    const negocioId = request.cookies.get('negocioId')?.value;

    if (!negocioId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tipo, fechaInicio, fechaFin, canal } = body;

    if (!['ventas', 'kpi', 'productos', 'clientes', 'inventario'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de reporte inválido' },
        { status: 400 }
      );
    }

    const where: any = { negocioId };
    if (canal) where.canal = canal;
    if (fechaInicio && fechaFin) {
      where.fechaVenta = {
        gte: parsearFechaLocal(fechaInicio),
        lte: parsearFechaLocal(fechaFin)
      };
    }

    let titulo = '';
    let nombreArchivo = '';
    let secciones: Seccion[] = [];

    if (tipo === 'ventas') {
      titulo = 'Reporte de Ventas';
      nombreArchivo = 'reporte_ventas';
      const ventas = await prisma.venta.findMany({
        where,
        include: { producto: true },
        orderBy: { fechaVenta: 'desc' }
      });

      secciones = [{
        titulo,
        columnas: [
          { key: 'fecha', label: 'Fecha' },
          { key: 'canal', label: 'Canal' },
          { key: 'item', label: 'Producto / Servicio' },
          { key: 'cantidad', label: 'Cantidad' },
          { key: 'monto', label: 'Monto' },
          { key: 'cliente', label: 'Cliente' }
        ],
        filas: ventas.map((v) => ({
          fecha: v.fechaVenta.toLocaleDateString('es-PE'),
          canal: v.canal,
          item: v.producto.nombre,
          cantidad: v.cantidad,
          monto: Number(v.monto.toFixed(2)),
          cliente: v.cliente || 'Ocasional'
        }))
      }];
    } else if (tipo === 'kpi') {
      titulo = 'Reporte de KPIs';
      nombreArchivo = 'reporte_kpis';
      const ventas = await prisma.venta.findMany({ where, include: { producto: true } });

      const totalVentas = ventas.reduce((sum, v) => sum + v.monto, 0);
      const cantidadVentas = ventas.length;
      const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

      const ventasPorCanal = ventas.reduce((acc, v) => {
        acc[v.canal] = (acc[v.canal] || 0) + v.monto;
        return acc;
      }, {} as Record<string, number>);

      const productosTop = ventas.reduce((acc, v) => {
        acc[v.producto.nombre] = (acc[v.producto.nombre] || 0) + v.cantidad;
        return acc;
      }, {} as Record<string, number>);

      secciones = [
        {
          titulo: 'Resumen',
          columnas: [{ key: 'indicador', label: 'Indicador' }, { key: 'valor', label: 'Valor' }],
          filas: [
            { indicador: 'Total ventas', valor: Number(totalVentas.toFixed(2)) },
            { indicador: 'Cantidad de ventas', valor: cantidadVentas },
            { indicador: 'Ticket promedio', valor: Number(ticketPromedio.toFixed(2)) }
          ]
        },
        {
          titulo: 'Ventas por canal',
          columnas: [{ key: 'canal', label: 'Canal' }, { key: 'monto', label: 'Monto' }],
          filas: Object.entries(ventasPorCanal).map(([canal, monto]) => ({ canal, monto: Number(monto.toFixed(2)) }))
        },
        {
          titulo: 'Productos / servicios top',
          columnas: [{ key: 'item', label: 'Producto / Servicio' }, { key: 'cantidad', label: 'Cantidad' }],
          filas: Object.entries(productosTop)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([item, cantidad]) => ({ item, cantidad }))
        }
      ];
    } else if (tipo === 'productos') {
      titulo = 'Reporte de Productos y Servicios';
      nombreArchivo = 'reporte_productos';
      const productos = await prisma.producto.findMany({
        where: { negocioId },
        include: { ventas: { where, select: { cantidad: true, monto: true } } }
      });

      secciones = [{
        titulo,
        columnas: [
          { key: 'nombre', label: 'Nombre' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'categoria', label: 'Categoría' },
          { key: 'cantidadVendida', label: 'Cantidad vendida' },
          { key: 'montoTotal', label: 'Monto total' }
        ],
        filas: productos.map((p) => ({
          nombre: p.nombre,
          tipo: p.tipo === 'servicio' ? 'Servicio' : 'Producto',
          categoria: p.categoria || 'Sin categoría',
          cantidadVendida: p.ventas.reduce((sum, v) => sum + v.cantidad, 0),
          montoTotal: Number(p.ventas.reduce((sum, v) => sum + v.monto, 0).toFixed(2))
        }))
      }];
    } else if (tipo === 'clientes') {
      titulo = 'Reporte de Clientes';
      nombreArchivo = 'reporte_clientes';
      const clientes = await prisma.cliente.findMany({
        where: { negocioId },
        include: { ventas: { where, select: { monto: true, fechaVenta: true } } }
      });

      secciones = [{
        titulo,
        columnas: [
          { key: 'nombre', label: 'Nombre' },
          { key: 'telefono', label: 'Teléfono' },
          { key: 'canalPreferido', label: 'Canal preferido' },
          { key: 'compras', label: 'Compras' },
          { key: 'ultimaCompra', label: 'Última compra' },
          { key: 'totalGastado', label: 'Total gastado' }
        ],
        filas: clientes.map((c) => {
          const ultima = c.ventas.reduce<Date | null>((max, v) => (!max || v.fechaVenta > max ? v.fechaVenta : max), null);
          return {
            nombre: c.nombre,
            telefono: c.telefono || '—',
            canalPreferido: c.canalPreferido || '—',
            compras: c.ventas.length,
            ultimaCompra: ultima ? ultima.toLocaleDateString('es-PE') : 'Sin compras',
            totalGastado: Number(c.ventas.reduce((sum, v) => sum + v.monto, 0).toFixed(2))
          };
        })
      }];
    } else if (tipo === 'inventario') {
      titulo = 'Reporte de Inventario';
      nombreArchivo = 'reporte_inventario';
      const productos = await prisma.producto.findMany({
        where: { negocioId, tipo: TipoProducto.producto },
        orderBy: { nombre: 'asc' }
      });

      secciones = [{
        titulo,
        columnas: [
          { key: 'nombre', label: 'Producto' },
          { key: 'unidad', label: 'Unidad' },
          { key: 'stock', label: 'Stock' },
          { key: 'stockMinimo', label: 'Stock mínimo' },
          { key: 'estado', label: 'Estado' },
          { key: 'valorInventario', label: 'Valor de inventario' }
        ],
        filas: productos.map((p) => ({
          nombre: p.nombre,
          unidad: p.unidad,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          estado: p.stock <= p.stockMinimo ? 'Crítico' : 'OK',
          valorInventario: Number((p.precioCosto != null ? p.stock * p.precioCosto : 0).toFixed(2))
        }))
      }];
    }

    return NextResponse.json({
      titulo,
      nombreArchivo: `${nombreArchivo}_${new Date().toISOString().split('T')[0]}`,
      filtros: {
        fechaInicio: fechaInicio || 'Inicio',
        fechaFin: fechaFin || 'Actualidad',
        canal: canal || 'Todos'
      },
      secciones
    }, { status: 200 });
  } catch (error) {
    console.error('Error al generar reporte:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}
