/**
 * AI Router - Transcription, Extraction, SOAP
 * 
 * POST /transcribe - Audio transcription via AssemblyAI
 * POST /extract - Medical data extraction via Gemini
 * POST /soap - SOAP note generation via Gemini
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ApiError } from '../middleware/error-handler.js';
import { requireScope } from '../middleware/auth.js';

const app = new Hono();

// ============================================
// Schemas
// ============================================

const TranscribeSchema = z.object({
  audio_url: z.string().url().optional(),
  audio_base64: z.string().optional(),
  language_code: z.string().default('de'),
  speaker_diarization: z.boolean().default(false),
}).refine(data => data.audio_url || data.audio_base64, {
  message: 'Either audio_url or audio_base64 is required',
});

const ExtractSchema = z.object({
  transcript: z.string().min(1),
  context: z.object({
    patient_name: z.string().optional(),
    species: z.string().optional(),
    date: z.string().optional(),
  }).optional(),
});

const SoapSchema = z.object({
  transcript: z.string().min(1),
  patient_info: z.object({
    name: z.string().optional(),
    species: z.string().optional(),
    breed: z.string().optional(),
    age: z.string().optional(),
  }).optional(),
  language: z.enum(['de', 'en']).default('de'),
});

// ============================================
// AssemblyAI Transcription
// ============================================

app.post('/transcribe',
  requireScope('transcribe'),
  zValidator('json', TranscribeSchema),
  async (c) => {
    const body = c.req.valid('json');
    const requestId = c.get('requestId');
    
    // AssemblyAI API key from env
    const assemblyaiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!assemblyaiKey) {
      throw ApiError.internal('AssemblyAI API key not configured');
    }
    
    try {
      let audioUrl = body.audio_url;
      
      // If base64 provided, upload to temporary storage first
      if (body.audio_base64 && !audioUrl) {
        // For now, we require audio_url - base64 upload would need storage
        throw ApiError.badRequest('audio_url required (base64 upload not yet implemented)');
      }
      
      // Submit transcription job to AssemblyAI
      const submitResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'Authorization': assemblyaiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: body.language_code,
          speaker_diarization: body.speaker_diaration,
          entity_detection: true,
          auto_chapters: false,
          summarization: false,
        }),
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.text();
        console.error('[AssemblyAI] Submit failed:', error);
        throw ApiError.internal('Failed to submit transcription job');
      }
      
      const submitData = await submitResponse.json();
      const transcriptId = submitData.id;
      
      // Poll for completion
      let transcript;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (attempts < maxAttempts) {
        const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': assemblyaiKey,
          },
        });
        
        if (!pollResponse.ok) {
          throw ApiError.internal('Failed to poll transcription status');
        }
        
        const pollData = await pollResponse.json();
        
        if (pollData.status === 'completed') {
          transcript = pollData;
          break;
        }
        
        if (pollData.status === 'error') {
          throw ApiError.internal(`Transcription failed: ${pollData.error}`);
        }
        
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      }
      
      if (!transcript) {
        throw ApiError.internal('Transcription timed out');
      }
      
      // Extract entities for medical context
      const entities = transcript.entities || [];
      const medicalEntities = entities.filter(e => 
        e.entity_type === 'medical_condition' ||
        e.entity_type === 'medication' ||
        e.entity_type === 'dosage' ||
        e.entity_type === 'anatomy'
      );
      
      return c.json({
        success: true,
        transcript: {
          id: transcriptId,
          text: transcript.text,
          confidence: transcript.confidence,
          words: transcript.words?.slice(0, 100) || [], // Limit words for response size
          entities: medicalEntities,
          speakers: transcript.speakers,
        },
        requestId,
      });
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[Transcribe] Error:', error);
      throw ApiError.internal('Transcription failed');
    }
  }
);

// ============================================
// Medical Data Extraction (Gemini)
// ============================================

app.post('/extract',
  requireScope('read'),
  zValidator('json', ExtractSchema),
  async (c) => {
    const body = c.req.valid('json');
    const requestId = c.get('requestId');
    
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!geminiKey) {
      throw ApiError.internal('Gemini API key not configured');
    }
    
    const contextInfo = body.context 
      ? `\n\nKontext:\n- Patient: ${body.context.patient_name || 'Unbekannt'}\n- Tierart: ${body.context.species || 'Unbekannt'}\n- Datum: ${body.context.date || 'Unbekannt'}`
      : '';
    
    const prompt = `Du bist ein veterinärmedizinischer Assistent. Extrahiere strukturierte Daten aus dem folgenden Transkript eines Tierarztbesuchs.${contextInfo}

Transkript:
"""
${body.transcript}
"""

Extrahiere und formatiere als JSON mit folgenden Feldern:
- medikamente: Array von {name, dosierung, anwendung, dauer}
- diagnosen: Array von Verdachts- oder Bestätigungsdiagnosen
- symptome: Array der genannten Symptome
- untersuchungen: Array der durchgeführten Untersuchungen
- empfehlungen: Array der Nachsorge-Empfehlungen
- notizen: Wichtige zusätzliche Notizen

Antworte nur mit gültigem JSON, kein anderes Text.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[Gemini] API error:', error);
        throw ApiError.internal('Gemini API request failed');
      }
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response
      let extracted;
      try {
        // Remove markdown code blocks if present
        const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        extracted = JSON.parse(jsonStr);
      } catch {
        // If parsing fails, return raw text
        extracted = { raw: text };
      }
      
      return c.json({
        success: true,
        extraction: extracted,
        requestId,
      });
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[Extract] Error:', error);
      throw ApiError.internal('Medical extraction failed');
    }
  }
);

// ============================================
// SOAP Note Generation (Gemini)
// ============================================

app.post('/soap',
  requireScope('read'),
  zValidator('json', SoapSchema),
  async (c) => {
    const body = c.req.valid('json');
    const requestId = c.get('requestId');
    
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!geminiKey) {
      throw ApiError.internal('Gemini API key not configured');
    }
    
    const patientInfo = body.patient_info
      ? `\n\nPatienteninfo:\n- Name: ${body.patient_info.name || 'Unbekannt'}\n- Tierart: ${body.patient_info.species || 'Unbekannt'}\n- Rasse: ${body.patient_info.breed || 'Unbekannt'}\n- Alter: ${body.patient_info.age || 'Unbekannt'}`
      : '';
    
    const langPrompt = body.language === 'de'
      ? 'Schreibe die SOAP-Notiz auf Deutsch.'
      : 'Write the SOAP note in English.';
    
    const prompt = `Du bist ein erfahrener Tierarzt. Erstelle eine professionelle SOAP-Notiz aus dem folgenden Transkript eines Tierarztbesuchs.${patientInfo}

${langPrompt}

Transkript:
"""
${body.transcript}
"""

Formatiere die Antwort als:

**S - Subjektiv:**
[Anamnese, Beschwerden des Besitzers, Vorgeschichte]

**O - Objektiv:**
[Klinische Untersuchungsbefunde, Vitalwerte, beobachtete Symptome]

**A - Assessment:**
[Diagnosen, Verdachtsdiagnosen, differentialdiagnostische Überlegungen]

**P - Plan:**
[Therapieplan, Medikamente, Nachsorge, Kontrolltermine]`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('[Gemini] API error:', error);
        throw ApiError.internal('Gemini API request failed');
      }
      
      const data = await response.json();
      const soapNote = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return c.json({
        success: true,
        soap: soapNote,
        language: body.language,
        requestId,
      });
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('[SOAP] Error:', error);
      throw ApiError.internal('SOAP generation failed');
    }
  }
);

export default app;