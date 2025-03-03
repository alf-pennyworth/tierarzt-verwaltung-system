
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  console.log('Function invoked with method:', req.method)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error(`Method ${req.method} not allowed`)
    }

    console.log('Processing POST request')
    const contentType = req.headers.get('content-type')
    console.log('Content-Type:', contentType)

    const body = await req.json()
    console.log('Request body received')

    if (!body.audio) {
      throw new Error('No audio data provided')
    }

    // Check if API key is configured
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
        'Transfer-Encoding': 'chunked'
      },
      body: binaryAudio,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Upload failed:', errorText)
      throw new Error(`Failed to upload audio: ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const upload_url = uploadResult.upload_url
    console.log('Upload successful, URL:', upload_url)

    // Start transcription
    console.log('Starting transcription with entity detection enabled')
    const transcriptionConfig = {
      audio_url: upload_url,
      language_code: 'de',
      entity_detection: true
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
      const errorText = await transcriptResponse.text()
      console.error('Transcription request failed:', errorText)
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
        const errorText = await pollResponse.text()
        console.error('Polling failed:', errorText)
        throw new Error(`Failed to poll transcription status: ${errorText}`)
      }

      transcript = await pollResponse.json()
      console.log('Poll status:', transcript.status)
      
      // Log more details if completed
      if (transcript.status === 'completed') {
        console.log('Transcription completed successfully')
        console.log('Transcription text:', transcript.text)
        console.log('Entity detection results:', JSON.stringify(transcript.entities || []))
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
    return new Response(
      JSON.stringify({ 
        text: transcript.text,
        entities: transcript.entities || []
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Transcription error:', error)
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
