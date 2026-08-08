// TypeScript Interfaces
export interface Negocio {
  id: string;
  nombre: string;
  logo: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  tipo: 'unidad' | 'peso' | 'volumen' | 'combo' | 'servicio_fijo' | 'servicio_tiempo';
  unidad: string;
  precioVenta: number;
  precioCosto?: number;
  margenPorcentaje: number;
  stockActual: number;
  stockMinimo: number;
  duracionEstandar?: number; // en minutos para servicios
  variantes?: { nombre: string; stock: number }[];
}

export interface DetalleVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  numero: number;
  fecha: Date;
  clienteId?: string;
  clienteNombre?: string;
  canal: 'Presencial' | 'WhatsApp' | 'Facebook' | 'TikTok' | 'Llamada';
  vendedor: string;
  detalles: DetalleVenta[];
  descuentoPorcentaje?: number;
  descuentoMonto?: number;
  metodoPago: 'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta';
  montoRecibido?: number;
  vuelto?: number;
  estado: 'Completada' | 'Anulada' | 'Devolucion';
  total: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  dni?: string;
  direccion?: string;
  canalPreferido: string;
  compras: number;
  ultimaCompra: Date;
  totalGastado: number;
  notas?: string;
}

export interface Canal {
  id: string;
  nombre: string;
  icono: string;
  activo: boolean;
  ventasEsteMes: number;
  totalEsteMes: number;
  descripcion: string;
  integrado?: boolean;
}

export interface NumeroAutorizado {
  nombre: string;
  telefono: string;
  rol: 'Admin' | 'Vendedor';
  estado: 'Activo' | 'Inactivo';
}

export interface Conversacion {
  id: string;
  vendedor: string;
  fecha: Date;
  mensajes: { texto: string; esBot: boolean; timestamp: Date }[];
}

// Mock Negocio
export const negocioDatos: Negocio = {
  id: '1',
  nombre: 'Mi Negocio MYPE',
  logo: '🏪',
};

// Mock Productos
export const productosMock: Producto[] = [
  {
    id: '1',
    codigo: 'POLO-001',
    nombre: 'Polo basico talla M',
    categoria: 'Ropa',
    tipo: 'unidad',
    unidad: 'unidad',
    precioVenta: 25,
    precioCosto: 12,
    margenPorcentaje: 52,
    stockActual: 45,
    stockMinimo: 10,
  },
  {
    id: '2',
    codigo: 'QUESO-001',
    nombre: 'Queso fresco',
    categoria: 'Alimentos',
    tipo: 'peso',
    unidad: 'kg',
    precioVenta: 18,
    precioCosto: 9,
    margenPorcentaje: 50,
    stockActual: 8.5,
    stockMinimo: 5,
  },
  {
    id: '3',
    codigo: 'ACEITE-001',
    nombre: 'Aceite de oliva',
    categoria: 'Alimentos',
    tipo: 'volumen',
    unidad: 'litro',
    precioVenta: 35,
    precioCosto: 18,
    margenPorcentaje: 49,
    stockActual: 12,
    stockMinimo: 5,
  },
  {
    id: '4',
    codigo: 'COMBO-001',
    nombre: 'Combo desayuno',
    categoria: 'Combos',
    tipo: 'combo',
    unidad: 'combo',
    precioVenta: 15,
    precioCosto: 7,
    margenPorcentaje: 53,
    stockActual: 25,
    stockMinimo: 5,
  },
  {
    id: '5',
    codigo: 'BARBER-001',
    nombre: 'Corte de cabello',
    categoria: 'Servicios',
    tipo: 'servicio_fijo',
    unidad: 'servicio',
    precioVenta: 25,
    margenPorcentaje: 100,
    stockActual: 999,
    stockMinimo: 0,
  },
  {
    id: '6',
    codigo: 'INGLES-001',
    nombre: 'Clase de ingles 1h',
    categoria: 'Servicios',
    tipo: 'servicio_tiempo',
    unidad: 'hora',
    precioVenta: 40,
    margenPorcentaje: 100,
    stockActual: 999,
    stockMinimo: 0,
    duracionEstandar: 60,
  },
  {
    id: '7',
    codigo: 'POLO-002',
    nombre: 'Polo talla S',
    categoria: 'Ropa',
    tipo: 'unidad',
    unidad: 'unidad',
    precioVenta: 25,
    precioCosto: 12,
    margenPorcentaje: 52,
    stockActual: 2,
    stockMinimo: 5,
  },
  {
    id: '8',
    codigo: 'CUAD-001',
    nombre: 'Cuaderno A4',
    categoria: 'Papeleria',
    tipo: 'unidad',
    unidad: 'unidad',
    precioVenta: 4,
    precioCosto: 2,
    margenPorcentaje: 50,
    stockActual: 0,
    stockMinimo: 10,
  },
];

// Mock Ventas
export const ventasMock: Venta[] = [
  {
    id: '1',
    numero: 1001,
    fecha: new Date('2026-01-28 08:30'),
    clienteId: '1',
    clienteNombre: 'Juan Perez',
    canal: 'Presencial',
    vendedor: 'Maria',
    detalles: [
      { productoId: '1', nombre: 'Polo basico M', cantidad: 2, precioUnitario: 25, subtotal: 50 },
      { productoId: '8', nombre: 'Cuaderno A4', cantidad: 3, precioUnitario: 4, subtotal: 12 },
    ],
    descuentoPorcentaje: 10,
    descuentoMonto: 6.2,
    metodoPago: 'Efectivo',
    montoRecibido: 70,
    vuelto: 14.2,
    estado: 'Completada',
    total: 55.8,
  },

  {
    id: '3',
    numero: 1003,
    fecha: new Date('2026-01-28 10:45'),
    clienteId: '3',
    clienteNombre: 'Rosa Martinez',
    canal: 'Presencial',
    vendedor: 'Ana',
    detalles: [
      { productoId: '1', nombre: 'Polo basico M', cantidad: 1, precioUnitario: 25, subtotal: 25 },
      { productoId: '3', nombre: 'Aceite de oliva', cantidad: 1, precioUnitario: 35, subtotal: 35 },
    ],
    metodoPago: 'Tarjeta',
    estado: 'Completada',
    total: 60,
  },
  {
    id: '4',
    numero: 1004,
    fecha: new Date('2026-01-28 12:00'),
    clienteId: '4',
    clienteNombre: 'Carlos Quispe',
    canal: 'Facebook',
    vendedor: 'Maria',
    detalles: [
      { productoId: '4', nombre: 'Combo desayuno', cantidad: 5, precioUnitario: 15, subtotal: 75 },
    ],
    metodoPago: 'Plin',
    estado: 'Completada',
    total: 75,
  },
  {
    id: '5',
    numero: 1005,
    fecha: new Date('2026-01-28 14:30'),
    clienteId: '5',
    clienteNombre: 'Ana Torres',
    canal: 'Presencial',
    vendedor: 'Carlos',
    detalles: [
      { productoId: '5', nombre: 'Corte de cabello', cantidad: 1, precioUnitario: 25, subtotal: 25 },
    ],
    metodoPago: 'Efectivo',
    montoRecibido: 25,
    vuelto: 0,
    estado: 'Completada',
    total: 25,
  },
  {
    id: '7',
    numero: 1007,
    fecha: new Date('2026-01-28 16:15'),
    clienteId: '1',
    clienteNombre: 'Juan Perez',
    canal: 'Presencial',
    vendedor: 'Maria',
    detalles: [
      { productoId: '2', nombre: 'Queso fresco', cantidad: 1, precioUnitario: 18, subtotal: 18 },
    ],
    metodoPago: 'Efectivo',
    estado: 'Devolucion',
    total: -18,
  },
  {
    id: '8',
    numero: 1008,
    fecha: new Date('2026-01-28 17:30'),
    clienteId: '6',
    clienteNombre: 'Pedro Lopez',
    canal: 'TikTok',
    vendedor: 'Ana',
    detalles: [
      { productoId: '3', nombre: 'Aceite de oliva', cantidad: 2, precioUnitario: 35, subtotal: 70 },
    ],
    metodoPago: 'Tarjeta',
    estado: 'Completada',
    total: 70,
  },
  {
    id: '9',
    numero: 1009,
    fecha: new Date('2026-01-28 18:00'),
    clienteNombre: 'Cliente ocasional',
    canal: 'Presencial',
    vendedor: 'Carlos',
    detalles: [
      { productoId: '1', nombre: 'Polo basico M', cantidad: 2, precioUnitario: 25, subtotal: 50 },
      { productoId: '4', nombre: 'Combo desayuno', cantidad: 2, precioUnitario: 15, subtotal: 30 },
    ],
    metodoPago: 'Efectivo',
    montoRecibido: 100,
    vuelto: 20,
    estado: 'Completada',
    total: 80,
  },
  {
    id: '10',
    numero: 1010,
    fecha: new Date('2026-01-28 19:15'),
    clienteId: '7',
    clienteNombre: 'Sandra Gutierrez',
    canal: 'Llamada',
    vendedor: 'Maria',
    detalles: [
      { productoId: '6', nombre: 'Clase de ingles 1h', cantidad: 1, precioUnitario: 40, subtotal: 40 },
    ],
    metodoPago: 'Yape',
    estado: 'Completada',
    total: 40,
  },
];

// Mock Clientes
export const clientesMock: Cliente[] = [
  {
    id: '1',
    nombre: 'Juan Perez',
    telefono: '+51 999 111 222',
    dni: '12345678',
    direccion: 'Jr. Principal 123, Lima',
    canalPreferido: 'Presencial',
    compras: 5,
    ultimaCompra: new Date('2026-01-28 16:15'),
    totalGastado: 175,
  },
  {
    id: '2',
    nombre: 'Maria Garcia',
    telefono: '+51 998 222 333',
    dni: '12345679',
    canalPreferido: 'WhatsApp',
    compras: 8,
    ultimaCompra: new Date('2026-01-28 09:15'),
    totalGastado: 250,
  },
  {
    id: '3',
    nombre: 'Rosa Martinez',
    telefono: '+51 997 333 444',
    canalPreferido: 'Presencial',
    compras: 3,
    ultimaCompra: new Date('2026-01-28 10:45'),
    totalGastado: 140,
  },
  {
    id: '4',
    nombre: 'Carlos Quispe',
    telefono: '+51 996 444 555',
    dni: '12345681',
    canalPreferido: 'Facebook',
    compras: 12,
    ultimaCompra: new Date('2026-01-28 12:00'),
    totalGastado: 450,
  },
  {
    id: '5',
    nombre: 'Ana Torres',
    telefono: '+51 995 555 666',
    canalPreferido: 'Presencial',
    compras: 6,
    ultimaCompra: new Date('2026-01-28 14:30'),
    totalGastado: 210,
  },
  {
    id: '6',
    nombre: 'Pedro Lopez',
    telefono: '+51 994 666 777',
    canalPreferido: 'TikTok',
    compras: 2,
    ultimaCompra: new Date('2026-01-28 17:30'),
    totalGastado: 100,
  },
  {
    id: '7',
    nombre: 'Sandra Gutierrez',
    telefono: '+51 993 777 888',
    dni: '12345687',
    canalPreferido: 'Llamada',
    compras: 4,
    ultimaCompra: new Date('2026-01-28 19:15'),
    totalGastado: 160,
  },
];

// Mock Canales
export const canalesMock: Canal[] = [
  {
    id: '1',
    nombre: 'Presencial',
    icono: 'Store',
    activo: true,
    ventasEsteMes: 145,
    totalEsteMes: 8200,
    descripcion: 'Ventas en tu tienda física',
  },
  {
    id: '2',
    nombre: 'WhatsApp chatbot',
    icono: 'MessageCircle',
    activo: true,
    ventasEsteMes: 89,
    totalEsteMes: 3400,
    descripcion: 'Recibe pedidos automáticos por WhatsApp',
    integrado: true,
  },
  {
    id: '3',
    nombre: 'Facebook',
    icono: 'Globe',
    activo: true,
    ventasEsteMes: 34,
    totalEsteMes: 1200,
    descripcion: 'Conecta con clientes en Facebook',
  },
  {
    id: '4',
    nombre: 'TikTok Shop',
    icono: 'Video',
    activo: false,
    ventasEsteMes: 0,
    totalEsteMes: 0,
    descripcion: 'Vende a través de TikTok',
  },
  {
    id: '5',
    nombre: 'Llamada telefonica',
    icono: 'Phone',
    activo: true,
    ventasEsteMes: 12,
    totalEsteMes: 890,
    descripcion: 'Pedidos por teléfono',
  },
  {
    id: '6',
    nombre: 'Instagram',
    icono: 'Camera',
    activo: false,
    ventasEsteMes: 0,
    totalEsteMes: 0,
    descripcion: 'Vende a través de Instagram',
  },
];

// Mock Numeros Autorizados
export const numerosAutorizados: NumeroAutorizado[] = [
  { nombre: 'Maria Garcia', telefono: '+51 999 888 777', rol: 'Admin', estado: 'Activo' },
  { nombre: 'Carlos Quispe', telefono: '+51 987 654 321', rol: 'Vendedor', estado: 'Activo' },
  { nombre: 'Ana Torres', telefono: '+51 976 543 210', rol: 'Vendedor', estado: 'Activo' },
];

// Mock Conversaciones
export const conversacionesMock: Conversacion[] = [
  {
    id: '1',
    vendedor: 'Ana',
    fecha: new Date('2026-01-28 15:00'),
    mensajes: [
      { texto: 'Buenos dias, quisiera 3 polos', esBot: false, timestamp: new Date('2026-01-28 15:00') },
      { texto: 'Tenemos polos en talla S, M y L. ¿Cuál deseas?', esBot: true, timestamp: new Date('2026-01-28 15:01') },
      { texto: 'Dame 3 talla M y 2 cuadernos', esBot: false, timestamp: new Date('2026-01-28 15:02') },
      { texto: 'Perfecto, total S/ 92. ¿Método de pago?', esBot: true, timestamp: new Date('2026-01-28 15:03') },
      { texto: 'Transferencia bancaria', esBot: false, timestamp: new Date('2026-01-28 15:04') },
      { texto: 'Venta registrada exitosamente', esBot: true, timestamp: new Date('2026-01-28 15:05') },
    ],
  },
  {
    id: '2',
    vendedor: 'Carlos',
    fecha: new Date('2026-01-28 14:30'),
    mensajes: [
      { texto: 'Hola, necesito 0.5 kg de queso', esBot: false, timestamp: new Date('2026-01-28 14:30') },
      { texto: 'Tenemos queso fresco a S/18 por kg. ¿Queso fresco?', esBot: true, timestamp: new Date('2026-01-28 14:31') },
      { texto: 'Si, perfecto', esBot: false, timestamp: new Date('2026-01-28 14:32') },
      { texto: 'Total S/ 9. ¿Efectivo o Yape?', esBot: true, timestamp: new Date('2026-01-28 14:33') },
      { texto: 'Yape', esBot: false, timestamp: new Date('2026-01-28 14:34') },
    ],
  },
  {
    id: '3',
    vendedor: 'Maria',
    fecha: new Date('2026-01-28 20:00'),
    mensajes: [
      { texto: 'Resumen del día: 34 ventas, S/ 1,240 vendido', esBot: false, timestamp: new Date('2026-01-28 20:00') },
      { texto: 'Vendedor con mayor venta: Maria - S/ 400', esBot: true, timestamp: new Date('2026-01-28 20:01') },
      { texto: 'Canal principal: Presencial - 45%', esBot: true, timestamp: new Date('2026-01-28 20:02') },
    ],
  },
];
