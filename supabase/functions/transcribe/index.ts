
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.2.1/mod.ts"
import { rateLimiter, getUserIdFromRequest, rateLimitResponse } from "../_shared/rate-limiter.ts"
import { corsHeaders, handleCors } from "../_shared/cors.ts"

// Rate limiter: 10 requests per minute per user
const limiter = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10
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
    console.log('Received request to transcribe audio')
    
    // Validate request body
    let body
    try {
      body = await req.json()
    } catch (error) {
      throw new Error('Invalid JSON in request body')
    }

    if (!body.audio) {
      throw new Error('No audio data provided')
    }

    // Get AssemblyAI API key
    const apiKey = Deno.env.get('ASSEMBLY_AI_API_KEY')
    if (!apiKey) {
      throw new Error('AssemblyAI API key not configured')
    }
    console.log('API key is configured and available')

    // Convert base64 to binary
    console.log('Converting audio data')
    const audioData = body.audio.split(',')[1] || body.audio
    const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
    console.log('Audio data converted, length:', binaryAudio.length)
    
    // Create upload URL
    console.log('Uploading to AssemblyAI')
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: binaryAudio,
    })

    if (!uploadResponse.ok) {
      console.error('Upload error status:', uploadResponse.status)
      const errorText = await uploadResponse.text()
      console.error('Upload error response:', errorText)
      throw new Error(`Failed to upload audio: ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const upload_url = uploadResult.upload_url
    console.log('Upload successful, URL:', upload_url)

    // Start transcription with medical-optimized settings
    // Using Universal-3 Pro with Medical Mode for clinical-grade accuracy
    // Medical Mode supports German and improves drug/procedure/condition recognition
    console.log('Starting transcription with Medical Mode enabled')
    
    // Veterinary key terms for German practice
    const veterinaryKeyterms = [
      // Antibiotics (TAMG-relevant)
      'Amoxicillin', 'Clavulansäure', 'Enrofloxacin', 'Doxycyclin', 'Marbofloxacin',
      'Cefovecin', 'Amoxicillin-Clavulanat', 'Antibiotikum', 'Verschreibung',
      // Vaccines
      'Impfung', 'Impfstoff', 'Tollwut', 'Staupe', 'Parvovirose', 'Leptospirose',
      'Leptospira', 'Bordetella', 'Canicola', 'Icterohaemorrhagiae',
      // Common conditions
      'Untersuchung', 'Anamnese', 'Diagnose', 'Prognose', 'Therapie',
      'Symptom', 'Befund', 'Röntgen', 'Ultraschall', 'Blutbild',
      // Medications
      'Verschreibung', 'Rezept', 'Dosierung', 'Verabreichung', 'Narkose',
      'Prämedikation', 'Analgetikum', 'Metamizol', 'Meloxicam', 'Carprofen',
      // Procedures
      'Wundbehandlung', 'Naht', 'Verband', 'Zahnreinigung', 'Kastration',
      'Sterilisation', 'Operation', 'Eingriff',
      // Practice terms
      'Patientenakte', 'Krankenakte', 'Tierarzt', 'Tierärztin', 'Praxis',
      'Klinik', 'Behandlung', 'Nachuntersuchung',
      // Animal species
      'Hund', 'Katze', 'Kaninchen', 'Meerschweinchen', 'Pferd', 'Vogel',
      'Reptil', 'Nagetier', 'Heimtier'
    ]
    
    const transcriptionConfig = {
      audio_url: upload_url,
      // Use Universal-3 Pro for best accuracy
      speech_model: 'universal-3-pro',
      // German language
      language_code: 'de',
      // Medical Mode - clinical-grade accuracy for medical terminology
      // Supports German, improves drug names, procedures, conditions, dosages
      domain: 'medical-v1',
      // Entity detection for structured data extraction
      entity_detection: true,
      // Speaker diarization - distinguish vet from client
      speaker_labels: true,
      // Key terms prompting for veterinary-specific vocabulary
      keyterms_prompt: veterinaryKeyterms,
      // Auto-punctuation and formatting
      punctuate: true,
      format_text: true,
      // Sentiment analysis for emotion detection
      sentiment_analysis: true
    }
    console.log('Transcription config:', JSON.stringify(transcriptionConfig))
    
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transcriptionConfig),
    })

    if (!transcriptResponse.ok) {
      console.error('Transcription request error status:', transcriptResponse.status)
      const errorText = await transcriptResponse.text()
      throw new Error(`Failed to start transcription: ${errorText}`)
    }

    const transcriptResult = await transcriptResponse.json()
    const transcriptId = transcriptResult.id
    console.log('Transcription started with ID:', transcriptId)

    // Poll for completion
    let transcript
    let attempts = 0
    const maxAttempts = 30 // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      attempts++
      console.log(`Polling transcription status (attempt ${attempts})`)
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': apiKey,
        },
      })

      if (!pollResponse.ok) {
        console.error('Polling error status:', pollResponse.status)
        const errorText = await pollResponse.text()
        throw new Error(`Failed to poll transcription: ${errorText}`)
      }

      transcript = await pollResponse.json()
      console.log('Poll status:', transcript.status)
      
      // Log more details if completed
      if (transcript.status === 'completed') {
        console.log('Transcription completed successfully')
        console.log('Transcription text:', transcript.text)
        
        if (transcript.entities && transcript.entities.length > 0) {
          console.log('Entity detection results:', JSON.stringify(transcript.entities))
          // Log drug entities specifically for debugging
          const drugs = transcript.entities.filter(entity => entity.entity_type === 'drug');
          console.log('Detected drug entities:', JSON.stringify(drugs))
        } else {
          console.log('No entities detected in the transcription')
        }
        break
      } else if (transcript.status === 'error') {
        console.error('Transcription error:', transcript.error)
        throw new Error('Transcription failed: ' + transcript.error)
      }

      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (attempts >= maxAttempts) {
      throw new Error('Transcription timed out after multiple polling attempts')
    }

    console.log('Returning transcription results to client')
    
    // Return comprehensive transcription results
    const responseData = {
      text: transcript.text,
      // Speaker diarization - who said what
      utterances: transcript.utterances || [],
      // Entity detection - drugs, conditions, procedures
      entities: transcript.entities || [],
      // Sentiment analysis
      sentiment: transcript.sentiment_analysis_results || [],
      // Metadata
      id: transcriptId,
      audio_duration: transcript.audio_duration,
      language: transcript.language_code || 'de',
      confidence: transcript.confidence,
      // Medical Mode applied?
      medical_mode: transcript.domain === 'medical-v1',
      // Speaker count
      speaker_count: transcript.speaker_count || 0
    }
    
    console.log('Response includes:', {
      hasUtterances: responseData.utterances.length > 0,
      hasEntities: responseData.entities.length > 0,
      hasSentiment: responseData.sentiment.length > 0,
      speakerCount: responseData.speaker_count
    })
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders(req),
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': remaining.toString()
        } 
      }
    )
  } catch (error) {
    console.error('Error in transcribe function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders(req),
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
