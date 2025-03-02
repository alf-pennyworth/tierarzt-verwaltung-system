
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request")
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    console.log("Starting transcription process")
    const { audio } = await req.json()

    if (!audio) {
      console.error("No audio data provided")
      throw new Error('No audio data provided')
    }

    // Strip the 'data:audio/webm;base64,' prefix if present
    const base64Data = audio.includes(',') ? audio.split(',')[1] : audio

    // Create transcription using AssemblyAI API
    const assemblyApiKey = Deno.env.get('ASSEMBLY_AI_API_KEY')
    
    if (!assemblyApiKey) {
      console.error("ASSEMBLY_AI_API_KEY environment variable not set")
      throw new Error('ASSEMBLY_AI_API_KEY environment variable not set')
    }

    console.log("Uploading audio to AssemblyAI")
    // First, upload the audio file
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': assemblyApiKey,
        'Content-Type': 'application/json',
      },
      body: base64Data,
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      console.error('Upload error:', errorData)
      throw new Error(`Failed to upload audio: ${errorData.error || 'Unknown error'}`)
    }

    const uploadData = await uploadResponse.json()
    const uploadUrl = uploadData.upload_url

    console.log('Audio uploaded successfully. URL:', uploadUrl)

    // Then, send the transcription request with entity detection enabled
    console.log("Requesting transcription with entity detection")
    const transcriptionResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': assemblyApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        language_code: 'de',
        entity_detection: true // Enable entity detection
      }),
    })

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.json()
      console.error('Transcription request error:', errorData)
      throw new Error(`Failed to request transcription: ${errorData.error || 'Unknown error'}`)
    }

    const transcriptionData = await transcriptionResponse.json()
    const transcriptId = transcriptionData.id

    console.log('Transcription requested. ID:', transcriptId)

    // Poll for the transcription result
    let result
    let isCompleted = false
    let pollingAttempts = 0
    const maxPollingAttempts = 30 // Maximum polling attempts (30 seconds)
    
    while (!isCompleted && pollingAttempts < maxPollingAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for 1 second
      pollingAttempts++
      
      console.log(`Polling attempt ${pollingAttempts}/${maxPollingAttempts}`)
      const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': assemblyApiKey,
        },
      })
      
      if (!pollingResponse.ok) {
        const errorData = await pollingResponse.json()
        console.error('Polling error:', errorData)
        throw new Error(`Failed to poll for transcription: ${errorData.error || 'Unknown error'}`)
      }
      
      result = await pollingResponse.json()
      isCompleted = ['completed', 'error'].includes(result.status)
      
      console.log('Polling status:', result.status)
    }
    
    if (pollingAttempts >= maxPollingAttempts) {
      console.error('Transcription timed out after maximum polling attempts')
      throw new Error('Transcription timed out. Please try again with a shorter audio clip.')
    }
    
    if (result.status === 'error') {
      console.error('Transcription error:', result)
      throw new Error(`Transcription failed: ${result.error || 'Unknown error'}`)
    }

    console.log('Transcription completed successfully')
    console.log('Detected entities:', result.entities || [])

    // Construct response with transcription text and entities
    const response = {
      text: result.text,
      entities: result.entities || []
    }

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error in transcription function:', error)
    
    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred',
      stack: error.stack,
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  }
})
