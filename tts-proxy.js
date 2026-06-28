// tts-proxy.js - Netlify Function for Kyrgyz TTS using Edge TTS
const { WebSocket } = require('ws');

exports.handler = async (event, context) => {
  const text = event.queryStringParameters?.text || '';
  
  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No text provided' })
    };
  }

  try {
    // Use Edge TTS via WebSocket on the server side
    const result = await synthesizeKyrgyzSpeech(text);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600'
      },
      body: result.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('TTS Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'TTS service unavailable' })
    };
  }
};

// Server-side WebSocket to Edge TTS
function synthesizeKyrgyzSpeech(text) {
  return new Promise((resolve, reject) => {
    const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
    const ws = new WebSocket(wsUrl);
    
    const audioChunks = [];
    
    ws.on('open', () => {
      // Send speech config
      ws.send(`X-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`);
      
      // Send SSML
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ky-KG'><voice name='Microsoft Server Speech Text to Speech Voice (ky-KG, AigulNeural)'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</voice></speak>`;
      ws.send(`X-RequestId:${createUUID()}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    
    ws.on('message', (data) => {
      if (typeof data === 'string') {
        if (data.includes('Path:turn.end')) {
          ws.close();
        }
      } else {
        audioChunks.push(data);
      }
    });
    
    ws.on('error', reject);
    ws.on('close', () => {
      if (audioChunks.length > 0) {
        const buffer = Buffer.concat(audioChunks);
        resolve(buffer);
      } else {
        reject(new Error('No audio data received'));
      }
    });
  });
}

function createUUID() {
  return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}