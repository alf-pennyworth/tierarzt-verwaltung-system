
// Function to normalize text for comparison
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[-\s]+/g, '') // Remove hyphens and whitespace
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
};

// Function to escape special characters in regex
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Function to find matches based on database entries
export const findDatabaseMatches = (
  text: string,
  options: { id: string; name: string }[],
  extractAmount: boolean = false
) => {
  const matches: { id: string; name: string; amount?: string }[] = [];
  
  options.forEach(option => {
    // Create regex from database entry
    const escapedName = escapeRegExp(option.name);
    let regex: RegExp;
    
    if (extractAmount) {
      // For medications, look for amounts
      regex = new RegExp(`${escapedName}\\s*(?:von|mit)?\\s*(\\d+(?:[.,]\\d+)?\\s*(?:mg|ml|g|tabletten))?`, 'gi');
    } else {
      // For diagnoses, just look for the term
      regex = new RegExp(`${escapedName}`, 'gi');
    }

    const match = text.match(regex);
    if (match) {
      const result: { id: string; name: string; amount?: string } = {
        id: option.id,
        name: option.name
      };

      if (extractAmount) {
        // Try to find amount near the medication name
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
