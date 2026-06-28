// tts-proxy.js - Netlify Function for Kyrgyz TTS
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const text = event.queryStringParameters?.text || '';
  
  if (!text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No text provided' })
    };
  }

  try {
    // Use Microsoft Edge TTS via HTTP (public endpoint)
    const encodedText = encodeURIComponent(text);
    
    // Alternative: Use a free TTS service
    // VoiceRSS free tier (350 requests/day)
    // Or use Google Translate TTS
    
    // For Kyrgyz, we'll use a workaround with Google Translate's TTS
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodedText}&tl=ky`;
    
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`TTS request failed: ${response.status}`);
    }
    
    const audioBuffer = await response.buffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      },
      body: audioBuffer.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('TTS Error:', error);
    
    // Fallback: Return a helpful message
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'TTS service temporarily unavailable',
        suggestion: '柯尔克孜语朗读服务暂时不可用，请稍后再试'
      })
    };
  }
};