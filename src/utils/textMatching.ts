
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

// Function to find the best matching text from an array of options
export const findBestMatch = (text: string, options: { id: string; name: string }[]): string | null => {
  const normalizedText = normalizeText(text);
  
  // First try exact match after normalization
  const exactMatch = options.find(option => 
    normalizeText(option.name) === normalizedText
  );
  if (exactMatch) return exactMatch.id;

  // Then try contains match
  const containsMatch = options.find(option =>
    normalizeText(option.name).includes(normalizedText) ||
    normalizedText.includes(normalizeText(option.name))
  );
  if (containsMatch) return containsMatch.id;

  return null;
};
