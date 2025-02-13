
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  try {
    const { audio } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audio.split(',')[1]), c => c.charCodeAt(0))
    
    // Create upload URL
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLY_AI_API_KEY') || '',
        'Content-Type': 'application/octet-stream',
      },
      body: binaryAudio,
    })

    if (!uploadResponse.ok) {
      console.error('Upload failed:', await uploadResponse.text())
      throw new Error('Failed to upload audio')
    }

    const { upload_url } = await uploadResponse.json()
    console.log('Upload successful, URL:', upload_url)

    // Start transcription
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': Deno.env.get('ASSEMBLY_AI_API_KEY') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'de',
      }),
    })

    if (!transcriptResponse.ok) {
      console.error('Transcription request failed:', await transcriptResponse.text())
      throw new Error('Failed to start transcription')
    }

    const { id: transcriptId } = await transcriptResponse.json()
    console.log('Transcription started with ID:', transcriptId)

    // Poll for completion
    let transcript
    while (true) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'Authorization': Deno.env.get('ASSEMBLY_AI_API_KEY') || '',
        },
      })

      if (!pollResponse.ok) {
        console.error('Polling failed:', await pollResponse.text())
        throw new Error('Failed to poll transcription status')
      }

      transcript = await pollResponse.json()
      console.log('Poll status:', transcript.status)
      
      if (transcript.status === 'completed' || transcript.status === 'error') {
        break
      }

      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (transcript.status === 'error') {
      throw new Error('Transcription failed: ' + transcript.error)
    }

    return new Response(
      JSON.stringify({ text: transcript.text }),
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
        details: error.stack
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
