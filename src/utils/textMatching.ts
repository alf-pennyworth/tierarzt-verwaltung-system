
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

// Helper function to convert German number words to digits
const convertGermanNumbersToDigits = (text: string): string | null => {
  const germanNumbers: { [key: string]: number } = {
    'null': 0, 'ein': 1, 'eins': 1, 'zwei': 2, 'drei': 3, 'vier': 4,
    'fünf': 5, 'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9,
    'zehn': 10, 'elf': 11, 'zwölf': 12, 'dreizehn': 13, 'vierzehn': 14,
    'fünfzehn': 15, 'sechzehn': 16, 'siebzehn': 17, 'achtzehn': 18,
    'neunzehn': 19, 'zwanzig': 20, 'dreißig': 30, 'vierzig': 40,
    'fünfzig': 50, 'sechzig': 60, 'siebzig': 70, 'achtzig': 80,
    'neunzig': 90
  };

  // Match number words pattern
  const match = text.match(/(?:\b(?:ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig)(?:\s+und\s+(?:ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig))?\b)/i);

  if (!match) return null;

  const numberWords = match[0].toLowerCase().split(/\s+und\s+/);
  if (numberWords.length === 2) {
    // Handle compound numbers like "sechs und dreißig"
    return String(germanNumbers[numberWords[0]] + germanNumbers[numberWords[1]] || 0);
  } else {
    return String(germanNumbers[numberWords[0]] || 0);
  }
};

// Function to find matches based on database entries
export const findDatabaseMatches = (
  text: string,
  options: { id: string; name: string }[],
  extractAmount: boolean = false
) => {
  const matches: { id: string; name: string; amount?: string }[] = [];
  
  options.forEach(option => {
    // Normalize both the text and the option name
    const normalizedText = normalizeText(text);
    const normalizedName = normalizeText(option.name);
    
    // Check if normalized name exists in normalized text
    if (normalizedText.includes(normalizedName)) {
      const result: { id: string; name: string; amount?: string } = {
        id: option.id,
        name: option.name
      };

      if (extractAmount) {
        // First try to find numeric amount
        const numericMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mg|ml|g|tabletten)/i);
        if (numericMatch) {
          result.amount = numericMatch[1];
        } else {
          // Try to find written number amount
          const numberWords = text.match(/([a-zäöüß\s]+(?:\s+und\s+[a-zäöüß\s]+)?)\s*(?:mg|ml|g|tabletten)/i);
          if (numberWords) {
            const amount = convertGermanNumbersToDigits(numberWords[1]);
            if (amount) {
              result.amount = amount;
            }
          }
        }
      }

      matches.push(result);
    }
  });

  return matches.length > 0 ? matches[0] : null;
};
