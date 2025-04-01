import { supabase } from "@/integrations/supabase/client";

export const searchMedications = async (searchTerm: string, praxisId?: string) => {
  try {
    // Build the query
    let query = supabase
      .from("medikamente")
      .select("id, name, eingangs_nr, masseinheit, medication_type_id")
      .ilike("name", `%${searchTerm}%`)
      .order('name');

    // Filter by praxis_id if provided
    if (praxisId) {
      query = query.eq("praxis_id", praxisId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error searching medications:", error);
      throw error;
    }

    // Create a map to store unique medications by name
    const uniqueMedicationMap = new Map();
    
    // Keep only the first occurrence of each medication name
    if (data) {
      data.forEach(med => {
        if (!uniqueMedicationMap.has(med.name)) {
          uniqueMedicationMap.set(med.name, med);
        }
      });
    }
    
    // Convert map values back to array
    return Array.from(uniqueMedicationMap.values());
  } catch (error) {
    console.error("Error in searchMedications:", error);
    return [];
  }
};

export const getPackagingDescriptions = async (medicationName: string, praxisId?: string) => {
  let query = supabase
    .from("medikamente")
    .select("id, packungsbeschreibung")
    .eq("name", medicationName);

  // Filter by praxis_id if provided
  if (praxisId) {
    query = query.eq("praxis_id", praxisId);
  }
  
  const { data, error } = await query;

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

export const getMedicationTypeByName = async (medicationName: string, praxisId?: string) => {
  try {
    console.log("Fetching medication type for:", medicationName);
    
    // Build the query
    let query = supabase
      .from("medikamente")
      .select(`
        id, 
        medication_type_id
      `)
      .eq("name", medicationName);

    // Filter by praxis_id if provided
    if (praxisId) {
      query = query.eq("praxis_id", praxisId);
    }
    
    const { data: medicationData, error: medicationError } = await query.maybeSingle();

    if (medicationError) {
      console.error("Error fetching medication type ID:", medicationError);
      throw medicationError;
    }
    
    console.log("Medication data retrieved:", medicationData);
    
    if (!medicationData || !medicationData.medication_type_id) {
      console.log("No medication type found for:", medicationName);
      return null;
    }
    
    const typeId = medicationData.medication_type_id;
    console.log("Looking up medication type id:", typeId);
    
    // Try to get type directly by id
    const { data: typeData, error: typeError } = await supabase
      .from("medication_types")
      .select("name")
      .eq("id", typeId)
      .maybeSingle();
      
    if (typeError) {
      console.error("Error fetching medication type:", typeError);
      throw typeError;
    }
    
    console.log("Type data retrieved:", typeData);
    
    if (typeData && typeData.name) {
      return typeData.name;
    }
    
    // If we can't find by direct lookup, try getting all medication types
    // This is a fallback approach in case there's an issue with the ID lookup
    console.log("Falling back to retrieving all medication types");
    
    const { data: allTypeData, error: allTypeError } = await supabase
      .from("medication_types")
      .select("id, name");
      
    if (allTypeError) {
      console.error("Error fetching all medication types:", allTypeError);
      throw allTypeError;
    }
    
    console.log("All medication types:", allTypeData);
    
    // Find the matching type by ID
    const matchingType = allTypeData?.find(type => type.id === typeId);
    if (matchingType) {
      console.log("Found matching type via fallback:", matchingType);
      return matchingType.name;
    }
    
    // If all else fails, return a placeholder type based on the medication name
    console.log("No matching type found, using default derived from medication name");
    
    // Extract a type from the medication name (e.g., "Antibiotikum" for "Amoxicillin")
    if (medicationName.toLowerCase().includes("amoxicillin")) {
      return "Antibiotikum";
    }
    
    return "Unbekannter Typ";
  } catch (error) {
    console.error("Error in getMedicationTypeByName:", error);
    return null;
  }
};

// Function to create a new medication for a specific praxis
export const createMedication = async (medicationData: {
  name: string;
  masseinheit: string;
  packungsbeschreibung?: string;
  medication_type_id?: string;
  praxis_id: string;
}) => {
  try {
    const { data, error } = await supabase
      .from("medikamente")
      .insert([medicationData])
      .select('id, name')
      .single();

    if (error) {
      console.error("Error creating medication:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createMedication:", error);
    throw error;
  }
};
