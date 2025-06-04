
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicationUsage {
  medicationId: string;
  amount: number;
  patientId: string;
  treatmentId: string;
}

export const updateInventoryAfterUsage = async (usage: MedicationUsage) => {
  try {
    // Get current medication stock
    const { data: medication, error: fetchError } = await supabase
      .from('medikamente')
      .select('current_stock, name, minimum_stock')
      .eq('id', usage.medicationId)
      .single();

    if (fetchError) throw fetchError;

    if (!medication) {
      throw new Error('Medication not found');
    }

    const newStock = medication.current_stock - usage.amount;

    // Update medication stock
    const { error: updateError } = await supabase
      .from('medikamente')
      .update({ current_stock: newStock })
      .eq('id', usage.medicationId);

    if (updateError) throw updateError;

    // Create inventory transaction record
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        item_id: usage.medicationId,
        transaction_type: 'usage',
        quantity: -usage.amount,
        previous_stock: medication.current_stock,
        new_stock: newStock,
        notes: `Used for patient treatment - Treatment ID: ${usage.treatmentId}`,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        praxis_id: (await supabase.from('profiles').select('praxis_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single()).data?.praxis_id
      });

    if (transactionError) throw transactionError;

    return {
      success: true,
      newStock,
      lowStockWarning: newStock <= medication.minimum_stock,
      medicationName: medication.name
    };
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
};

export const createAutomaticReorder = async (medicationId: string) => {
  try {
    const { data: medication, error } = await supabase
      .from('medikamente')
      .select('name, minimum_stock, praxis_id')
      .eq('id', medicationId)
      .single();

    if (error) throw error;

    // Create automatic reorder (simplified - in real app you'd have supplier info)
    const { error: orderError } = await supabase
      .from('inventory_orders')
      .insert({
        praxis_id: medication.praxis_id,
        status: 'pending',
        notes: `Automatic reorder for ${medication.name} - Stock below minimum`,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (orderError) throw orderError;
  } catch (error) {
    console.error('Error creating automatic reorder:', error);
    throw error;
  }
};
