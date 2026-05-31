export type SupplierMethod = 'web' | 'whatsapp' | 'email' | 'manual';

export type Supplier = {
  id: string;
  name: string;
  method: SupplierMethod;
  url: string;
  phone: string;
  email: string;
  notes: string;
};

// Edita esta lista para añadir o cambiar proveedores
export const PARTS_SUPPLIERS: Supplier[] = [
  {
    id: 'recambios-general',
    name: 'Recambios general',
    method: 'web',
    url: '',
    phone: '',
    email: '',
    notes: 'Abrir web o copiar pedido.'
  },
  {
    id: 'neumaticos',
    name: 'Neumáticos',
    method: 'whatsapp',
    url: '',
    phone: '',
    email: '',
    notes: 'Enviar medidas y eje.'
  },
  {
    id: 'chapa-pintura',
    name: 'Chapa / Pintura',
    method: 'manual',
    url: '',
    phone: '',
    email: '',
    notes: 'Consultar disponibilidad manualmente.'
  }
];
