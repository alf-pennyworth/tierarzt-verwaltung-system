
// Function to normalize text for comparison
export const normalizeText = (text: string): string => {
  return text.toLowerCase().trim();
};

// Function to find matches based on database entries
export const findDatabaseMatches = (
  text: string,
  options: { id: string; name: string }[],
  extractAmount: boolean = false
) => {
  const normalizedText = normalizeText(text);
  const matches: { id: string; name: string; amount?: string }[] = [];
  
  console.log("Normalized input text:", normalizedText);
  console.log("Available options:", options);
  
  // Find all matching entries from the database
  options.forEach(option => {
    const normalizedName = normalizeText(option.name);
    console.log(`Comparing with database entry: ${option.name} (normalized: ${normalizedName})`);
    
    if (normalizedText.includes(normalizedName)) {
      console.log(`Found match: ${option.name}`);
      
      const result: { id: string; name: string; amount?: string } = {
        id: option.id,
        name: option.name
      };

      if (extractAmount) {
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mg|ml|g|tabletten)/i);
        if (amountMatch) {
          result.amount = amountMatch[1];
          console.log(`Found amount: ${amountMatch[1]}`);
        }
      }

      matches.push(result);
    }
  });

  console.log("All matches found:", matches);
  return matches;
};
