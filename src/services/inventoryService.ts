
// Inventory Items (using medikamente table)
export const getInventoryItems = async ({ queryKey }: { queryKey: string[] }) => {
  const [_, praxisId] = queryKey;
  
  console.log("Fetching inventory items for praxis:", praxisId);
  
  const query = supabase
    .from("medikamente")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  
  // Filter by praxis_id if provided
  if (praxisId) {
    query.eq("praxis_id", praxisId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching inventory items:", error);
    throw error;
  }
  
  console.log(`Fetched ${data?.length || 0} inventory items`);
  return data as MedikamentItem[];
};
