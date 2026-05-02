# Watsonx.ai API Integration Guide

## Overview
This project integrates IBM watsonx.ai API for AI-powered text generation using the Granite model. The integration includes a React frontend service and an Express backend server to handle API calls securely.

## Architecture

```
React App (Port 3000)
    ↓
Express Backend (Port 5000)
    ↓
IBM IAM Authentication
    ↓
Watsonx.ai API
```

## Files Created

### Backend
- **`server.js`** - Express server that proxies requests to IBM watsonx.ai API
  - Handles IBM IAM authentication
  - Caches access tokens
  - Provides `/api/watsonx/generate` endpoint
  - Includes health check endpoint

### Frontend
- **`src/services/watsonxService.js`** - React service for calling the backend
  - `generateText(prompt, options)` - Main function to generate text
  - `checkServerHealth()` - Verify backend is running

### Configuration
- **`.env`** - Environment variables (git-ignored)
  - `REACT_APP_WATSONX_API_KEY` - IBM Cloud API key
  - `REACT_APP_WATSONX_PROJECT_ID` - Watsonx.ai project ID
  - `REACT_APP_WATSONX_REGION_URL` - Region URL
  - `REACT_APP_WATSONX_MODEL_ID` - Model ID (Granite)

- **`.env.example`** - Template for team setup
- **`.gitignore`** - Updated to exclude .env files

### Integration
- **`src/App.jsx`** - Modified to test watsonx.ai on mount
  - Imports `generateText` from watsonxService
  - Calls API with test prompt on component mount
  - Logs response to console

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

Dependencies installed:
- `express` - Backend server
- `cors` - CORS handling
- `dotenv` - Environment variables
- `node-fetch@2` - HTTP requests (Node.js)

### 2. Configure Environment Variables
The `.env` file is already created with your credentials. For new team members:
```bash
cp .env.example .env
# Edit .env and add your credentials
```

### 3. Start the Backend Server
```bash
npm run server
```

The server will start on `http://localhost:5000`

### 4. Start the React App
In a separate terminal:
```bash
npm start
```

The app will start on `http://localhost:3000`

## API Usage

### Generate Text
```javascript
import { generateText } from './services/watsonxService';

const response = await generateText('Your prompt here', {
  maxNewTokens: 200,
  temperature: 0.7,
  // ... other options
});

console.log(response); // AI-generated text
```

### Options
- `decodingMethod` - 'greedy' (default) or 'sample'
- `maxNewTokens` - Maximum tokens to generate (default: 200)
- `minNewTokens` - Minimum tokens (default: 1)
- `temperature` - Sampling temperature (0.0-2.0)
- `topP` - Top-p sampling
- `topK` - Top-k sampling
- `repetitionPenalty` - Penalty for repetition (default: 1.0)
- `stopSequences` - Array of stop sequences

## Testing

### Test on App Load
The app automatically tests the integration when it loads:
1. Open browser console (F12 or Cmd+Option+I)
2. Look for:
   - 🧪 Testing watsonx.ai integration...
   - Sending request to backend server...
   - ✓ Text generated successfully
   - ✅ Watsonx.ai Response: [AI response]

### Manual Test
```bash
# Test backend health
curl http://localhost:5000/api/health

# Test text generation
curl -X POST http://localhost:5000/api/watsonx/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Say hello in one sentence"}'
```

## Troubleshooting

### Backend Server Not Running
**Error:** "Cannot connect to backend server"
**Solution:** Start the backend server with `npm run server`

### CORS Errors
**Error:** "Preflight response is not successful"
**Solution:** 
- Ensure backend server is running
- Check that React app is on port 3000
- Restart both servers

### Authentication Errors
**Error:** "IAM authentication failed"
**Solution:**
- Verify API key in `.env` file
- Check that all environment variables are set
- Ensure `.env` file is in project root

### Port Already in Use
**Error:** "Something is already running on port 5000"
**Solution:**
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Restart server
npm run server
```

## API Endpoints

### Backend Server (Port 5000)

#### POST /api/watsonx/generate
Generate text using watsonx.ai

**Request:**
```json
{
  "prompt": "Your prompt here",
  "options": {
    "maxNewTokens": 200,
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "success": true,
  "text": "Generated text here",
  "model": "ibm/granite-13b-chat-v2"
}
```

#### GET /api/health
Check server health and configuration

**Response:**
```json
{
  "status": "ok",
  "message": "Watsonx.ai proxy server is running",
  "config": {
    "hasApiKey": true,
    "hasProjectId": true,
    "regionUrl": "https://us-south.ml.cloud.ibm.com",
    "modelId": "ibm/granite-13b-chat-v2"
  }
}
```

## Security Notes

✅ API credentials stored in `.env` (git-ignored)
✅ `.env.example` provided for team setup
✅ Backend server handles authentication
✅ CORS configured for localhost:3000
✅ Access tokens cached to minimize IAM calls

## Production Deployment

For production:
1. Use environment variables on your hosting platform
2. Update CORS origin to your production domain
3. Use HTTPS for all API calls
4. Consider rate limiting
5. Add request logging and monitoring

## Support

For issues or questions:
- Check the troubleshooting section
- Review server logs in the terminal
- Check browser console for errors
- Verify all environment variables are set

---

**Made with Bob** 🤖