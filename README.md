# Disaster Response Coordination Platform

A real-time disaster response coordination system built with the MERN stack, featuring geospatial queries, AI-powered location extraction, and social media monitoring.

## 🚀 Features

- **Disaster Management**: CRUD operations for disaster records with location tracking
- **Real-time Updates**: WebSocket integration for live updates
- **AI Integration**: Google Gemini API for location extraction and image verification
- **Geospatial Queries**: Find nearby resources and analyze affected areas
- **Social Media Monitoring**: Track disaster-related social media updates
- **Official Updates**: Aggregate updates from relief organizations

## 🛠 Tech Stack

- **Frontend**: React, Chakra UI, Socket.IO Client
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: Supabase (PostgreSQL)
- **AI/ML**: Google Gemini API
- **Geocoding**: OpenCage API
- **Real-time**: WebSocket (Socket.IO)

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key
- OpenCage API key

## 🔧 Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/disaster-response-coordination.git
   cd disaster-response-coordination
   ```

2. Set up environment variables:

   Backend (.env):
   ```env
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   GEMINI_API_KEY=your_gemini_api_key
   OPENCAGE_API_KEY=your_opencage_api_key
   ```

   Frontend (.env):
   ```env
   VITE_BACKEND_URL=http://localhost:3001
   ```

3. Install dependencies:
   ```bash
   # Backend setup
   cd backend
   npm install

   # Frontend setup
   cd ../frontend
   npm install
   ```

4. Initialize database:
   - Create a new Supabase project
   - Run the SQL scripts in `backend/src/database/schema.sql`

## 🚀 Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at `http://localhost:5173`

## 📚 API Documentation

### Disasters API

#### GET /api/disasters
Get all disasters
- Query Parameters:
  - `tag` (optional): Filter by tag
  - `status` (optional): Filter by status

#### POST /api/disasters
Create a new disaster
- Body:
  ```json
  {
    "title": "string",
    "description": "string",
    "tags": ["string"],
    "owner_id": "string"
  }
  ```

#### GET /api/disasters/:id
Get a specific disaster

#### PUT /api/disasters/:id
Update a disaster
- Body: Same as POST

#### DELETE /api/disasters/:id
Delete a disaster

### Reports API

#### GET /api/disasters/:id/reports
Get reports for a disaster

#### POST /api/disasters/:id/reports
Create a new report
- Body:
  ```json
  {
    "content": "string",
    "image_url": "string",
    "user_id": "string"
  }
  ```

### Resources API

#### GET /api/disasters/:id/resources
Get nearby resources
- Query Parameters:
  - `radius`: Search radius in meters
  - `lat`: Latitude
  - `lon`: Longitude

### Social Media API

#### GET /api/disasters/:id/social-media
Get social media updates
- Query Parameters:
  - `keywords`: Array of keywords to filter by
  - `timeframe`: Time window (e.g., "24h")

### Image Verification API

#### POST /api/disasters/:id/verify-image
Verify image authenticity
- Body:
  ```json
  {
    "image_url": "string"
  }
  ```

## 🧪 Testing

Run the test suite:
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📡 WebSocket Events

- `disaster_updated`: Emitted when a disaster is created/updated/deleted
- `social_media_updated`: Emitted when new social media data is available
- `report_created`: Emitted when a new report is submitted
- `resources_updated`: Emitted when resource data changes

## 🔒 Security

- Rate limiting implemented for all API endpoints
- Input validation and sanitization
- Error handling and logging
- Mock authentication (TODO: Implement real authentication)

## 📈 Performance Optimization

- Supabase caching for API responses
- Geospatial indexes for location queries
- Structured logging
- Rate limiting and error handling

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details 