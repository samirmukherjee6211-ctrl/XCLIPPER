import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Google AI Studio Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('WARNING: GEMINI_API_KEY environment variable not set');
}

const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    console.log('Generating image with prompt:', prompt);

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

    console.log('Image generated successfully with Nano Banana');

    res.json({
      success: true,
      image: `data:${mimeType};base64,${imageBase64}`
    });

  } catch (error) {
    console.error('Error generating image:', error.message);
    console.error('Error details:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    model: 'gemini-3-pro-image-preview (Nano Banana)',
    apiConfigured: !!GEMINI_API_KEY
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Using Gemini 3 Pro Image Preview (Nano Banana)`);
  console.log(`API Key configured: ${!!GEMINI_API_KEY}`);
});
