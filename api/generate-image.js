import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Hardcoded API key for direct access
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBsIr5zDH2UbCfiajQ4Hv8--rFT_wnDgV8';

    console.log('Generating image with prompt:', prompt);

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Enhanced prompt for YouTube thumbnails
    const enhancedPrompt = `Create a high-quality, professional YouTube thumbnail image. ${prompt}. Make it vibrant, eye-catching, and optimized for YouTube with clear visual hierarchy, bold composition, and engaging elements that drive clicks.`;

    // Use Gemini 3 Pro Image Preview (Nano Banana)
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        generationConfig: {
          responseModalities: ['image']
        }
      }
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No image generated');
    }

    // Extract image data from response
    const candidate = response.candidates[0];
    const imagePart = candidate.content.parts.find(part => part.inlineData);
    
    if (!imagePart || !imagePart.inlineData) {
      throw new Error('No image data in response');
    }

    const imageBase64 = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    console.log('Image generated successfully');

    res.status(200).json({
      success: true,
      image: `data:${mimeType};base64,${imageBase64}`
    });

  } catch (error) {
    console.error('Error generating image:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
      stack: error.stack
    });
  }
}
