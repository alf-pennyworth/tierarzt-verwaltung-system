/**
 * AI Router - Transcription, Extraction, and SOAP Notes
 * 
 * POST /transcribe  - Audio transcription via AssemblyAI
 * POST /extract     - Medical data extraction via Gemini
 * POST /soap        - SOAP note generation via Gemini
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { customRateLimit } from '../middleware/rate-limit.js';

const app = new Hono();

// ============================================
// Schemas
// ============================================

const TranscribeRequestSchema = z.object({
  audio: z.string().optional(), // Base64-encoded audio
  audio_url: z.string().url().optional(), // URL to audio file
  language: z.string().length(2).default('de'),
  entity_detection: z.boolean().default(true),
}).refine(data => data.audio || data.audio_url, {
  message: 'Either audio (base64) or audio_url is required',
});

const EntitySchema = z.object({
  text: z.string(),
  entity_type: z.string(),
  start: z.number().int().optional(),
  end: z.number().int().optional(),
});

const TranscribeResponseSchema = z.object({
  id: z.string(),
  text: z.string(),
  entities: z.array(EntitySchema).optional(),
  confidence: z.number().optional(),
  duration_ms: z.number().optional(),
});

const ExtractRequestSchema = z.object({
  text: z.string().min(1, 'Transcript text is required').optional(),
  transcript: z.string().min(1, 'Transcript text is required').optional(),
  language: z.string().length(2).default('de'),
  context: z.record(z.any()).optional(),
}).refine(data => data.text || data.transcript, {
  message: 'Transcript text is required',
});

const ExtractedDataSchema = z.object({
  medikament: z.string().nullable().optional(),
  medikamentTyp: z.string().nullable().optional(),
  diagnose: z.string().nullable().optional(),
  medikamentMenge: z.string().nullable().optional(),
  dosage: z.string().nullable().optional(),
  soapNotes: z.string().nullable().optional(),
});

const ExtractResponseSchema = z.object({
  extracted: ExtractedDataSchema,
  raw_response: z.any().optional(),
  model: z.string().optional(),
});

const SoapRequestSchema = z.object({
  text: z.string().min(1, 'Transcript text is required').optional(),
  transcript: z.string().min(1, 'Transcript text is required').optional(),
  format: z.enum(['standard', 'detailed', 'brief']).default('standard'),
  language: z.enum(['de', 'en']).default('de'),
  patient_info: z.record(z.any()).optional(),
}).refine(data => data.text || data.transcript, {
  message: 'Transcript text is required',
});

const SoapResponseSchema = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  raw_soap: z.string().optional(),
  model: z.string().optional(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Check if API key has required scope
 */
function hasScope(c: any, requiredScope: string): boolean {
  const apiKey = c.get('apiKey');
  if (!apiKey || !apiKey.scopes) return false;
  return apiKey.scopes.includes(requiredScope);
}

/**
 * Return 403 Forbidden response
 */
function forbiddenResponse(c: any, requiredScope: string) {
  return c.json({
    error: {
      code: 'AUTHORIZATION_ERROR',
      message: `Insufficient permissions. Required scope: ${requiredScope}`,
    },
    requestId: c.get('requestId'),
    timestamp: new Date().toISOString(),
  }, 403);
}

/**
 * Get AssemblyAI API key from environment
 */
function getAssemblyApiKey(): string {
  const key = process.env.ASSEMBLY_AI_API_KEY || process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error('AssemblyAI API key not configured. Set ASSEMBLY_AI_API_KEY environment variable.');
  }
  return key;
}

/**
 * Get Gemini API key from environment
 */
function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key not configured. Set GEMINI_API_KEY environment variable.');
  }
  return key;
}

/**
 * Upload audio to AssemblyAI and get transcript with entity detection
 */
async function transcribeWithAssemblyAI(
  audioData: string | undefined,
  audioUrl: string | undefined,
  language: string,
  entityDetection: boolean
): Promise<{ text: string; entities: any[]; id: string }> {
  const apiKey = getAssemblyApiKey();
  let uploadUrl: string;

  // Upload audio if base64 provided, otherwise use URL
  if (audioData) {
    // Handle data URI prefix
    const base64Data = audioData.includes(',') ? audioData.split(',')[1] : audioData;
    const binaryAudio = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    console.log('Uploading audio to AssemblyAI, size:', binaryAudio.length, 'bytes');

    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryAudio,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`AssemblyAI upload failed: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    uploadUrl = uploadResult.upload_url;
  } else if (audioUrl) {
    uploadUrl = audioUrl;
  } else {
    throw new Error('No audio data or URL provided');
  }

  // Start transcription
  const transcriptConfig: any = {
    audio_url: uploadUrl,
    language_code: language,
  };

  if (entityDetection) {
    transcriptConfig.entity_detection = true;
  }

  console.log('Starting AssemblyAI transcription');

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transcriptConfig),
  });

  if (!transcriptResponse.ok) {
    const errorText = await transcriptResponse.text();
    throw new Error(`AssemblyAI transcription request failed: ${errorText}`);
  }

  const transcriptResult = await transcriptResponse.json();
  const transcriptId = transcriptResult.id;

  // Poll for completion
  let transcript: any;
  let attempts = 0;
  const maxAttempts = 60; // 60 seconds max

  while (attempts < maxAttempts) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { 'Authorization': apiKey },
    });

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text();
      throw new Error(`AssemblyAI polling failed: ${errorText}`);
    }

    transcript = await pollResponse.json();

    if (transcript.status === 'completed') {
      console.log('Transcription completed:', transcriptId);
      return {
        id: transcriptId,
        text: transcript.text || '',
        entities: transcript.entities || [],
      };
    } else if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }
  }

  throw new Error('Transcription timed out after 60 seconds');
}

/**
 * Call Gemini API for medical data extraction
 */
async function extractWithGemini(text: string, language: string): Promise<any> {
  const apiKey = getGeminiApiKey();

  const prompt = `Extract the following medical details from the German veterinary transcript.

Return a JSON object with exactly these keys:
- medikament: medication name mentioned (string or null)
- medikamentTyp: medication type like "Antibiotikum", "Schmerzmittel", etc. (string or null)
- diagnose: diagnosis name - first check "Standart Diagnoseschlüssel" by Prof. Staufenbiel, then ICD system (return name, not code) (string or null)
- medikamentMenge: medication amount with unit like "500 mg" or "2 ml" (string or null)
- dosage: dosage instructions (string or null)
- soapNotes: brief SOAP note in German covering Subjective, Objective, Assessment, Plan (string or null)

Transcript text:
${text}

Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return JSON.parse(responseText);
  } catch {
    // If parsing fails, return raw text
    return { raw: responseText };
  }
}

/**
 * Generate SOAP notes via Gemini
 */
async function generateSoapNotes(text: string, format: string, language: string): Promise<{
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}> {
  const apiKey = getGeminiApiKey();

  const formatInstructions: Record<string, string> = {
    brief: 'Keep each section to 1-2 sentences.',
    standard: 'Provide clear, concise sections.',
    detailed: 'Provide comprehensive, detailed sections.',
  };

  const prompt = `Generate a ${format} SOAP note in ${language === 'de' ? 'German' : language} for this veterinary transcript.

${formatInstructions[format] || formatInstructions.standard}

Transcript:
${text}

Return a JSON object with exactly these keys:
- subjective: Patient history, owner observations, symptoms reported
- objective: Clinical findings, examination results, vital signs
- assessment: Diagnosis, clinical reasoning, severity assessment
- plan: Treatment plan, medications, follow-up, owner instructions

Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    const parsed = JSON.parse(responseText);
    return {
      subjective: parsed.subjective || '',
      objective: parsed.objective || '',
      assessment: parsed.assessment || '',
      plan: parsed.plan || '',
    };
  } catch {
    return {
      subjective: '',
      objective: '',
      assessment: '',
      plan: responseText,
    };
  }
}

// ============================================
// Routes
// ============================================

/**
 * POST /transcribe
 * 
 * Transcribe audio via AssemblyAI with entity detection
 * Rate limit: 10 requests per minute
 */
app.post(
  '/transcribe',
  customRateLimit(10, 60000),
  zValidator('json', TranscribeRequestSchema),
  async (c) => {
    // Scope check
    if (!hasScope(c, 'transcribe')) {
      return forbiddenResponse(c, 'transcribe');
    }
    
    const input = c.req.valid('json');
    const requestId = c.get('requestId');

    try {
      console.log(`[${requestId}] Starting transcription request`);

      const result = await transcribeWithAssemblyAI(
        input.audio,
        input.audio_url,
        input.language,
        input.entity_detection
      );

      console.log(`[${requestId}] Transcription completed:`, result.id);

      return c.json({
        id: result.id,
        text: result.text,
        entities: result.entities,
      });

    } catch (error: any) {
      console.error(`[${requestId}] Transcription error:`, error.message);

      // Handle specific error types
      if (error.message.includes('API key')) {
        return c.json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Transcription service not configured',
          },
          requestId,
          timestamp: new Date().toISOString(),
        }, 503);
      }

      if (error.message.includes('timed out')) {
        return c.json({
          error: {
            code: 'TIMEOUT',
            message: 'Transcription took too long. Try again with a shorter audio file.',
          },
          requestId,
          timestamp: new Date().toISOString(),
        }, 504);
      }

      return c.json({
        error: {
          code: 'TRANSCRIPTION_ERROR',
          message: error.message,
        },
        requestId,
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

/**
 * POST /extract
 * 
 * Extract structured medical data from transcript via Gemini
 * Rate limit: 20 requests per minute
 */
app.post(
  '/extract',
  customRateLimit(20, 60000),
  zValidator('json', ExtractRequestSchema),
  async (c) => {
    // Scope check
    if (!hasScope(c, 'read')) {
      return forbiddenResponse(c, 'read');
    }
    
    const input = c.req.valid('json');
    const text = input.text || input.transcript || '';
    const requestId = c.get('requestId');

    try {
      console.log(`[${requestId}] Starting extraction request`);

      const extracted = await extractWithGemini(text, input.language);

      console.log(`[${requestId}] Extraction completed`);

      return c.json({
        extracted: {
          medikament: extracted.medikament || null,
          medikamentTyp: extracted.medikamentTyp || null,
          diagnose: extracted.diagnose || null,
          medikamentMenge: extracted.medikamentMenge || null,
          dosage: extracted.dosage || null,
          soapNotes: extracted.soapNotes || null,
        },
        model: 'gemini-2.0-flash',
      });

    } catch (error: any) {
      console.error(`[${requestId}] Extraction error:`, error.message);

      if (error.message.includes('API key')) {
        return c.json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI extraction service not configured',
          },
          requestId,
          timestamp: new Date().toISOString(),
        }, 503);
      }

      return c.json({
        error: {
          code: 'EXTRACTION_ERROR',
          message: error.message,
        },
        requestId,
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

/**
 * POST /soap
 * 
 * Generate SOAP notes from transcript via Gemini
 * Rate limit: 20 requests per minute
 */
app.post(
  '/soap',
  customRateLimit(20, 60000),
  zValidator('json', SoapRequestSchema),
  async (c) => {
    // Scope check
    if (!hasScope(c, 'read')) {
      return forbiddenResponse(c, 'read');
    }
    
    const input = c.req.valid('json');
    const text = input.text || input.transcript || '';
    const requestId = c.get('requestId');

    try {
      console.log(`[${requestId}] Starting SOAP generation`);

      const soap = await generateSoapNotes(text, input.format, input.language);

      console.log(`[${requestId}] SOAP generation completed`);

      return c.json({
        soap,
        model: 'gemini-2.0-flash',
      });

    } catch (error: any) {
      console.error(`[${requestId}] SOAP generation error:`, error.message);

      if (error.message.includes('API key')) {
        return c.json({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'AI service not configured',
          },
          requestId,
          timestamp: new Date().toISOString(),
        }, 503);
      }

      return c.json({
        error: {
          code: 'SOAP_GENERATION_ERROR',
          message: error.message,
        },
        requestId,
        timestamp: new Date().toISOString(),
      }, 500);
    }
  }
);

export default app;