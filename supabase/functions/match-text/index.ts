
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const normalizeText = (text: string): string => {
  return text.toLowerCase().trim();
};

// Function to find medication matches in text
const findMedicationMatches = (
  text: string,
  medications: any[]
) => {
  const normalizedText = normalizeText(text);
  const matches: { id: string; name: string; medication_type?: { name: string }; amount?: string; unit?: string }[] = [];
  
  console.log("Normalized input text:", normalizedText);
  
  // First check for common medication abbreviations/nicknames
  const medicationAbbreviations: Record<string, string[]> = {
    "amoxi": ["amoxicillin", "amoxibactin"],
    "pen": ["penicillin"],
    "cef": ["ceftiofur", "cefalexin"],
    // Add more abbreviations as needed
  };
  
  // Process abbreviations first
  for (const [abbr, fullNames] of Object.entries(medicationAbbreviations)) {
    if (normalizedText.includes(abbr)) {
      console.log(`Found abbreviation: ${abbr}`);
      
      // Find matching medications for this abbreviation
      const matchingMeds = medications.filter(med => 
        fullNames.some(name => normalizeText(med.name).includes(name)) ||
        normalizeText(med.name).includes(abbr)
      );
      
      if (matchingMeds.length > 0) {
        console.log(`Found ${matchingMeds.length} medications matching abbreviation ${abbr}`);
        
        // Get the amount if available
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|tabletten|kapseln|stück)/i);
        const matchingMed = matchingMeds[0]; // Take the first match
        
        const result = {
          id: matchingMed.id,
          name: matchingMed.name,
          medication_type: matchingMed.medication_type
        };
        
        if (amountMatch) {
          console.log(`Found amount: ${amountMatch[1]} ${amountMatch[2]}`);
          result.amount = amountMatch[1];
          result.unit = amountMatch[2].toLowerCase();
        }
        
        matches.push(result);
        break; // Only use the first matching abbreviation
      }
    }
  }
  
  // If no matches from abbreviations, try exact matches from the database
  if (matches.length === 0) {
    console.log("No matches from abbreviations, trying database entries directly");
    
    medications.forEach(med => {
      const normalizedName = normalizeText(med.name);
      
      if (normalizedText.includes(normalizedName)) {
        console.log(`Found direct match: ${med.name}`);
        
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|tabletten|kapseln|stück)/i);
        const result = {
          id: med.id,
          name: med.name,
          medication_type: med.medication_type
        };
        
        if (amountMatch) {
          console.log(`Found amount: ${amountMatch[1]} ${amountMatch[2]}`);
          result.amount = amountMatch[1];
          result.unit = amountMatch[2].toLowerCase();
        }
        
        matches.push(result);
      }
    });
  }
  
  console.log("All medication matches found:", matches);
  return matches;
};

// Function to find diagnosis matches in text
const findDiagnoseMatches = (
  text: string,
  diagnoses: { id: string; diagnose: string }[]
) => {
  const normalizedText = normalizeText(text);
  const matches: { id: string; name: string }[] = [];
  
  console.log("Normalized diagnosis input text:", normalizedText);
  
  diagnoses.forEach(diag => {
    const normalizedDiagnose = normalizeText(diag.diagnose);
    
    if (normalizedText.includes(normalizedDiagnose)) {
      console.log(`Found diagnosis match: ${diag.diagnose}`);
      matches.push({
        id: diag.id,
        name: diag.diagnose
      });
    }
  });
  
  console.log("All diagnosis matches found:", matches);
  return matches;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    const body = await req.json()
    const { transcription } = body

    if (!transcription) {
      throw new Error('No transcription text provided')
    }

    console.log('Processing transcription:', transcription)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: diagnoseData, error: diagnoseError } = await supabase
      .from('diagnose')
      .select('id, diagnose')
      .is('deleted_at', null)

    if (diagnoseError) throw diagnoseError

    const { data: medikamentData, error: medikamentError } = await supabase
      .from('medikamente')
      .select(`
        id,
        name,
        medication_type:medication_type_id (
          name
        )
      `)
      .is('deleted_at', null)

    if (medikamentError) throw medikamentError

    console.log('Loaded diagnoses:', diagnoseData)
    console.log('Loaded medications:', medikamentData)

    const diagnosisMatches = findDiagnoseMatches(transcription, 
      (diagnoseData || [])
    )
    
    const medicationMatches = findMedicationMatches(transcription, 
      medikamentData || []
    )

    console.log("Found diagnoses:", diagnosisMatches)
    console.log("Found medications:", medicationMatches)

    return new Response(
      JSON.stringify({
        diagnoses: diagnosisMatches,
        medications: medicationMatches
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        type: error.constructor.name
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
