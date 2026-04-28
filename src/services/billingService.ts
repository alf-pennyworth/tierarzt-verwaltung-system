import { supabase } from '@/integrations/supabase/client';

export interface BillingInvoice {
  id: string;
  praxis_id: string;
  invoice_number: string;
  patient_id: string | null;
  besitzer_id: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingItem {
  id: string;
  invoice_id: string;
  position_code: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  factor: number;
  total_price: number;
  treatment_id: string | null;
}

export interface CreateInvoiceInput {
  patient_id?: string;
  besitzer_id?: string;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  items: {
    position_code?: string;
    description: string;
    quantity: number;
    unit_price: number;
    factor?: number;
  }[];
}

/**
 * Get invoices for a practice
 */
export async function getInvoices(
  praxisId: string,
  filters?: {
    status?: string;
    patientId?: string;
    besitzerId?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  let query = supabase
    .from('billing_invoices')
    .select(`
      *,
      patient:patient_id (id, name, species),
      besitzer:besitzer_id (id, name, email),
      items:billing_items(*)
    `)
    .eq('praxis_id', praxisId)
    .order('invoice_date', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.patientId) {
    query = query.eq('patient_id', filters.patientId);
  }
  if (filters?.besitzerId) {
    query = query.eq('besitzer_id', filters.besitzerId);
  }
  if (filters?.startDate) {
    query = query.gte('invoice_date', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('invoice_date', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as BillingInvoice[];
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string) {
  const { data, error } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      patient:patient_id (id, name, species),
      besitzer:besitzer_id (id, name, email, strasse, plz, stadt),
      items:billing_items(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) throw error;
  return data as BillingInvoice;
}

/**
 * Create invoice
 */
export async function createInvoice(
  praxisId: string,
  userId: string,
  input: CreateInvoiceInput
): Promise<BillingInvoice> {
  // Generate invoice number
  const now = new Date();
  const year = now.getFullYear();
  const { data: count } = await supabase
    .from('billing_invoices')
    .select('id', { count: 'exact' })
    .eq('praxis_id', praxisId)
    .gte('created_at', `${year}-01-01`);

  const invoiceNumber = `RE-${year}-${String((count?.length || 0) + 1).padStart(4, '0')}`;

  // Calculate totals
  const subtotal = input.items.reduce((sum, item) => {
    const factor = item.factor || 1.0;
    return sum + (item.unit_price * item.quantity * factor);
  }, 0);

  const vatRate = 0; // Veterinary services = 0% VAT in Germany
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('billing_invoices')
    .insert({
      praxis_id: praxisId,
      created_by: userId,
      invoice_number: invoiceNumber,
      patient_id: input.patient_id || null,
      besitzer_id: input.besitzer_id || null,
      status: 'draft',
      invoice_date: input.invoice_date || now.toISOString().split('T')[0],
      due_date: input.due_date || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total_amount: total,
      notes: input.notes
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  const items = input.items.map(item => ({
    invoice_id: invoice.id,
    position_code: item.position_code || null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    factor: item.factor || 1.0,
    total_price: item.unit_price * item.quantity * (item.factor || 1.0)
  }));

  const { error: itemsError } = await supabase
    .from('billing_items')
    .insert(items);

  if (itemsError) throw itemsError;

  return invoice;
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
  paymentInfo?: { method?: string; reference?: string }
) {
  const updates: any = { status };
  
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
    if (paymentInfo?.method) updates.payment_method = paymentInfo.method;
    if (paymentInfo?.reference) updates.payment_reference = paymentInfo.reference;
  }

  const { data, error } = await supabase
    .from('billing_invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(praxisId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: invoices, error } = await supabase
    .from('billing_invoices')
    .select('status, total_amount')
    .eq('praxis_id', praxisId)
    .gte('invoice_date', startOfMonth.split('T')[0]);

  if (error) throw error;

  return {
    totalCount: invoices?.length || 0,
    totalAmount: invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
    paid: invoices?.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
    outstanding: invoices?.filter(i => ['draft', 'sent', 'overdue'].includes(i.status))
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
  };
}

/**
 * Delete invoice (only draft)
 */
export async function deleteInvoice(invoiceId: string) {
  // First delete items
  await supabase
    .from('billing_items')
    .delete()
    .eq('invoice_id', invoiceId);

  // Then delete invoice
  const { error } = await supabase
    .from('billing_invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('status', 'draft'); // Only delete drafts

  if (error) throw error;
}
