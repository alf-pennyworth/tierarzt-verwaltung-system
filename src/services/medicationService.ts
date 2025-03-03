
import { supabase } from "@/integrations/supabase/client";

export const searchMedications = async (searchTerm: string) => {
  // Get distinct medication names that match the search term
  const { data, error } = await supabase
    .from("medikamente")
    .select("id, name, eingangs_nr, masseinheit, medication_type_id")
    .ilike("name", `%${searchTerm}%`)
    .order('name');

  if (error) {
    console.error("Error searching medications:", error);
    throw error;
  }

  // Create a map to store unique medications by name
  const uniqueMedicationMap = new Map();
  
  // Keep only the first occurrence of each medication name
  data.forEach(med => {
    if (!uniqueMedicationMap.has(med.name)) {
      uniqueMedicationMap.set(med.name, med);
    }
  });
  
  // Convert map values back to array
  return Array.from(uniqueMedicationMap.values());
};

export const getPackagingDescriptions = async (medicationName: string) => {
  const { data, error } = await supabase
    .from("medikamente")
    .select("id, packungsbeschreibung")
    .eq("name", medicationName);

  if (error) {
    console.error("Error fetching packaging descriptions:", error);
    throw error;
  }

  // Return an array of objects with id and packungsbeschreibung
  return data.map(item => ({
    id: item.id,
    description: item.packungsbeschreibung || 'Keine Beschreibung'
  }));
};

export const getMedicationTypeByName = async (medicationName: string) => {
  try {
    // First get the medication to find its type_id
    const { data: medicationData, error: medicationError } = await supabase
      .from("medikamente")
      .select("medication_type_id")
      .eq("name", medicationName)
      .maybeSingle();

    if (medicationError) {
      console.error("Error fetching medication type ID:", medicationError);
      throw medicationError;
    }
    
    if (!medicationData || !medicationData.medication_type_id) {
      console.log("No medication type found for:", medicationName);
      return null;
    }
    
    // Then get the type name using the type_id
    const { data: typeData, error: typeError } = await supabase
      .from("medication_types")
      .select("name")
      .eq("id", medicationData.medication_type_id)
      .maybeSingle();
      
    if (typeError) {
      console.error("Error fetching medication type:", typeError);
      throw typeError;
    }
    
    return typeData?.name || null;
  } catch (error) {
    console.error("Error in getMedicationTypeByName:", error);
    return null;
  }
};
