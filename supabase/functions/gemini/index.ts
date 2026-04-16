
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.2.1/mod.ts"
import { rateLimiter, getUserIdFromRequest, rateLimitResponse } from "../_shared/rate-limiter.ts"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

// Rate limiter: 20 requests per minute per user (higher for LLM)
const limiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20
})

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Rate limiting
  const userId = getUserIdFromRequest(req) || 'anonymous'
  const { allowed, remaining, resetAt } = await limiter.check(userId)
  
  if (!allowed) {
    return rateLimitResponse(remaining, resetAt)
  }

  try {
    console.log('Received request to Gemini LLM')
    
    // Validate request body
    let body
    try {
      body = await req.json()
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }

    if (!body.text) {
      throw new Error('No text data provided')
    }

    // Get Gemini API key
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('Gemini API key not configured')
    }
    console.log('API key is configured and available')

    // Prepare the prompt for Gemini
    const prompt = `
Extract the following details from the text:
- medikament: the medication name mentioned.
- medikamentTyp: based on the medication name, determine its type (for example, if the medikament is "amoxicillin", output "Antibiotikum").
- diagnose: extract the diagnosis name. First, check if any part of the text matches a diagnosis from the "Standart Diagnoseschlüssel" by Prof. Staufenbiel; if not, then check for a match in the ICD system (but return the diagnosis name, not the code); if still nothing is found, assume a plausible diagnosis.
- medikamentMenge: extract the medication amount with its unit (for example, "500 mg" or "2 ml").
- soapNotes: generate a concise SOAP note based on the text. The note should briefly cover Subjective, Objective, Assessment, and Plan. The SOAP notes need to be in German.

Return the result strictly as a JSON object with exactly these keys. For example:
{
  "medikament": "Amoxicillin",
  "medikamentTyp": "Antibiotikum",
  "diagnose": "Atemwegsinfektion",
  "medikamentMenge": "500 mg",
  "soapNotes": "Subjective: ... Objective: ... Assessment: ... Plan: ..."
}

Text: ${body.text}
    `;

    console.log('Calling Gemini API with prompt')
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error status:', response.status);
      console.error('Gemini API error response:', errorText);
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);

    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { 
          ...corsHeaders(req),
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString()
        } 
      }
    );
  } catch (error) {
    console.error('Error in Gemini function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders(req),
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
