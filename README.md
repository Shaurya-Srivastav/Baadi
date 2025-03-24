# Remote Patient Video Monitoring - Baadi

A web-based platform designed to provide continuous, real-time monitoring of elderly patients in their own homes. This system uses live video feeds and machine learning to detect potential dangers or abnormal behaviors, sending immediate notifications to caregivers.

## Features

- Secure user authentication via Firebase
- Real-time video streaming from patient's environment
- ML-powered motion analysis for fall and danger detection
- Instant push notifications for critical events
- Responsive web interface accessible from any device

## Tech Stack

- **Frontend**: React.js, Material-UI
- **Backend**: Firebase (Authentication, Firestore, Cloud Messaging)
- **ML**: TensorFlow.js for in-browser motion detection and analysis
- **Video Streaming**: WebRTC for real-time video

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Firebase account

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```
5. Start the development server:
   ```
   npm start
   ```

## Usage

1. Register for an account or log in
2. Set up a webcam in the patient's room (ensure proper placement and lighting)
3. Access the dashboard to view the live stream
4. Configure alert thresholds and notification preferences
5. Receive instant alerts on your mobile device when potential dangers are detected

## Project Structure

- `public/`: Static assets
- `src/`: Source code
  - `components/`: React components
  - `contexts/`: React contexts for state management
  - `ml/`: Machine learning models and utilities
  - `services/`: Firebase and other service integrations
  - `styles/`: CSS and styling

## Security & Privacy

This application is designed with privacy in mind:
- No long-term storage of video data
- Encrypted data transmission
- Strict access controls
- Compliance with healthcare privacy standards

## License

This project is licensed under the MIT License - see the LICENSE file for details.
"# Baadi" 
