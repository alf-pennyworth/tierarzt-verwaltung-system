
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

const findDatabaseMatches = (
  text: string,
  options: { id: string; name: string; medication_type?: { name: string } },
  extractAmount: boolean = false
) => {
  const normalizedText = normalizeText(text);
  const matches: { id: string; name: string; medication_type?: { name: string }; amount?: string; unit?: string }[] = [];
  
  console.log("Normalized input text:", normalizedText);
  console.log("Available options:", options);
  
  options.forEach(option => {
    const normalizedName = normalizeText(option.name);
    console.log(`Comparing with database entry: ${option.name} (normalized: ${normalizedName})`);
    
    if (normalizedText.includes(normalizedName)) {
      console.log(`Found match: ${option.name}`);
      
      const result: { id: string; name: string; medication_type?: { name: string }; amount?: string; unit?: string } = {
        id: option.id,
        name: option.name,
        medication_type: option.medication_type
      };

      if (extractAmount) {
        const amountMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|g|tabletten|kapseln|stück)/i);
        if (amountMatch) {
          result.amount = amountMatch[1];
          result.unit = amountMatch[2].toLowerCase();
          console.log(`Found amount: ${amountMatch[1]} ${amountMatch[2]}`);
        }
      }

      matches.push(result);
    }
  });

  console.log("All matches found:", matches);
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

    const diagnosisMatches = findDatabaseMatches(transcription, 
      (diagnoseData || []).map(d => ({ id: d.id, name: d.diagnose }))
    )
    
    const medicationMatches = findDatabaseMatches(transcription, 
      medikamentData || [],
      true
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
