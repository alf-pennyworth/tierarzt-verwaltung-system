
// Function to normalize text for comparison
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/strep/i, 'streptococcus')  // Handle common variations
    .replace(/kokken/i, 'coccus');
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
  
  // Find any matching entries from the database
  options.forEach(option => {
    const normalizedName = normalizeText(option.name);
    console.log(`Comparing normalized name "${normalizedName}" with text`);
    
    // Check both ways - if text contains name or name contains part of text
    if (normalizedText.includes(normalizedName) || 
        // Split text into words and check if any word matches
        normalizedText.split(/\s+/).some(word => 
          normalizedName.includes(word) && word.length > 3)) {
      console.log(`Found match with: ${option.name}`);
      
      const result: { id: string; name: string; amount?: string } = {
        id: option.id,
        name: option.name
      };

      if (extractAmount) {
        // Extract amount if present (more flexible pattern)
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mg|ml|g|tabletten)/i);
        if (amountMatch) {
          result.amount = amountMatch[1];
          console.log(`Found amount: ${amountMatch[1]}`);
        }
      }

      matches.push(result);
    }
  });

  console.log("Final matches:", matches);
  return matches.length > 0 ? matches[0] : null;
};
