
// Function to normalize text for comparison
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim();
};

// Function to find matches based on database entries
export const findDatabaseMatches = (
  text: string,
  options: { id: string; name: string }[],
  extractAmount: boolean = false
) => {
  const normalizedText = normalizeText(text);
  const matches: { id: string; name: string; amount?: string }[] = [];
  
  // Find any matching entries from the database
  options.forEach(option => {
    const normalizedName = normalizeText(option.name);
    
    if (normalizedText.includes(normalizedName)) {
      const result: { id: string; name: string; amount?: string } = {
        id: option.id,
        name: option.name
      };

      if (extractAmount) {
        // Extract amount if present (only look for numeric values)
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mg|ml|g|tabletten)/i);
        if (amountMatch) {
          result.amount = amountMatch[1];
        }
      }

      matches.push(result);
    }
  });

  return matches.length > 0 ? matches[0] : null;
};
