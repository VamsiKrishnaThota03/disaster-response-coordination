# Disaster Response Coordination Platform

A MERN stack application for coordinating disaster response efforts, featuring real-time updates, location-based services, and AI-powered analysis.

## Features

- Real-time disaster tracking and reporting
- Location extraction using Google Gemini AI
- Geocoding with OpenStreetMap
- Social media monitoring (mock implementation)
- Geospatial resource mapping with Supabase
- Image verification using Google Gemini AI
- Real-time updates via WebSocket

## Prerequisites

- Node.js (v18 or later)
- npm
- Supabase account
- Google Gemini API key

## Setup

1. Clone the repository:
```bash
git clone [repository-url]
cd disaster-response-platform
```

2. Set up the backend:
```bash
cd backend
npm install
cp .env.example .env
```

3. Configure environment variables in `.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3001
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
```

5. Set up the Supabase database:
- Create a new Supabase project
- Enable the PostGIS extension
- Run the SQL commands from `backend/src/database/schema.sql`

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## API Endpoints

### Disasters
- `POST /disasters` - Create a new disaster
- `GET /disasters` - List all disasters
- `GET /disasters?tag=flood` - Filter disasters by tag

### Social Media
- `GET /disasters/:id/social-media` - Get social media updates for a disaster

### Resources
- `GET /disasters/:id/resources` - Get nearby resources for a disaster

### Reports
- `POST /disasters/:id/reports` - Create a new report
- `POST /disasters/:id/verify-image` - Verify an image for authenticity

## Technologies Used

- Backend:
  - Node.js
  - Express.js
  - Socket.IO
  - Google Gemini AI
  - Supabase (PostgreSQL + PostGIS)

- Frontend:
  - React
  - Chakra UI
  - Socket.IO Client
  - Axios

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 