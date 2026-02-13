export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    model: 'gemini-3-pro-image-preview (Nano Banana)',
    apiConfigured: !!process.env.GEMINI_API_KEY
  });
}
