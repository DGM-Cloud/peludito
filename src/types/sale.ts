export type PaymentMethod = "efectivo" | "yape" | "plin" | "tarjeta";

export type VoucherType = "boleta" | "factura" | "ninguno";

export type SaleItemType = "servicio" | "producto";

export type SaleItem = {
  id: string;
  type: SaleItemType;
  referenceId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type Sale = {
  id: string;
  date: string;
  time: string;
  clientId: string;
  patientId?: string;
  clinicId: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  voucherType: VoucherType;
  voucherNumber?: string;
  documentNumber?: string;
  businessName?: string;
  notes?: string;
  appointmentId?: string;
};

export type CreateSaleInput = Omit<Sale, "id" | "voucherNumber">;
