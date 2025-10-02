# WellnessHub - Complete Full-Stack Application

A comprehensive wellness platform that gamifies health, wealth, and insurance management with dark/light themes, real-time features, and motivational elements built with the MERN stack.

## 🌟 Features

### Core Modules
- **Health Tracking**: Monitor fitness, nutrition, and wellness goals
- **Wealth Management**: Budget tracking, expense management, financial planning
- **Insurance Management**: Policy tracking, coverage optimization, recommendations
- **Community**: Social features, challenges, leaderboards
- **Analytics**: Comprehensive progress visualization and insights
- **Gamification**: Points, levels, badges, streaks, and achievements

### Technical Features
- **Authentication**: JWT-based secure authentication with React contexts
- **Real-time Updates**: Socket.io integration for live updates
- **Dark/Light Themes**: Customizable theme system with system preference detection
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **API Integration**: RESTful API with React Query for efficient data fetching
- **Data Visualization**: Charts and analytics with Chart.js
- **State Management**: Redux Toolkit for global state
- **Form Handling**: React Hook Form with validation
- **Animations**: Framer Motion for smooth interactions

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation & Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd WellnessHub
   
   # Backend setup
   cd server && npm install
   
   # Frontend setup  
   cd ../client && npm install
   ```

2. **Environment Configuration**
   
   **Backend (.env in server/)**
   ```bash
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/wellnesshub
   JWT_SECRET=your-super-secret-jwt-key-here
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000
   ```
   
   **Frontend (.env in client/)**
   ```bash
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

3. **Start the application**
   ```bash
   # Easy startup with provided script
   ./start.sh
   
   # Or manually:
   # Terminal 1: cd server && npm start
   # Terminal 2: cd client && npm start
   ```

4. **Access points**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Documentation: http://localhost:5000/api-docs

## 📊 Key Performance Indicators

- **Increase DAU by 40%** through engaging daily interactions
- **Drive organic downloads by 50%** through viral and social features  
- **Improve feature adoption by 60%** across all wellness categories

## 🚀 Key Features

### 1. Gamification Engine
- **Points System**: Dynamic points for activities (steps, water, workouts, challenges)
- **Level Progression**: XP-based leveling with visual progress bars
- **Achievements**: Real-time achievement notifications and tracking
- **Streaks**: Daily activity streaks with fire indicators
- **Leaderboards**: Global and team-based rankings

### 2. Multi-Category Wellness Platform
- **Health & Fitness**: Step tracking, water intake, workout logging, health challenges
- **Wealth Management**: Savings goals, budget tracking, investment monitoring, financial scores
- **Insurance Engagement**: Policy management, wellness rewards, safe driving scores
- **Community Features**: Teams, challenges, social feed, activity sharing

### 3. Advanced Social & Viral Features
- **Community Challenges**: Team-based goals with collective progress
- **Social Feed**: User-generated content and achievement sharing
- **Teams & Groups**: Multiple team memberships with rankings
- **Viral Sharing**: Achievement posting and social engagement

### 4. User Engagement Solutions
- **Feature Discovery**: Prominent navigation and quick action buttons
- **Motivation Systems**: Daily challenges, progress tracking, reward notifications
- **Habit Formation**: Consistent micro-rewards and streak tracking
- **Personalized Experience**: AI-powered insights and recommendations

## 🏗️ Technical Architecture

### Frontend (React TypeScript)
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit + React Query
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Headless UI + Custom components
- **Animations**: Framer Motion
- **Charts**: Recharts for analytics
- **Routing**: React Router v6

### Backend (Node.js)
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Real-time**: Socket.io for live updates
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer for notifications
- **Scheduling**: Node-cron for automated tasks
- **API Documentation**: Swagger

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB
- **Caching**: Redis (planned)
- **File Storage**: Cloudinary
- **Deployment**: Docker-ready for cloud deployment

## 📁 Project Structure

```
WellnessHub/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── store/         # Redux store setup
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   └── styles/        # Global styles
│   ├── public/
│   └── package.json
├── server/                # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Utility functions
│   │   └── config/        # Configuration files
│   ├── tests/
│   └── package.json
├── docker-compose.yml     # Docker services
├── .env.example          # Environment variables template
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WellnessHub
   ```

2. **Install dependencies**
   ```bash
   # Install all dependencies
   npm run install:all
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   # Edit with your configuration
   ```

4. **Start Development**
   ```bash
   # Start both frontend and backend
   npm run dev
   ```

### Docker Setup

1. **Build and start services**
   ```bash
   npm run docker:up
   ```

2. **Stop services**
   ```bash
   npm run docker:down
   ```

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/wellnesshub
MONGODB_TEST_URI=mongodb://localhost:27017/wellnesshub_test

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Server
PORT=5000
NODE_ENV=development

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Client URL
CLIENT_URL=http://localhost:3000
```

## 📱 API Documentation

Once the server is running, visit `http://localhost:5000/api-docs` for interactive API documentation.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run server tests only
cd server && npm test

# Run client tests only
cd client && npm test
```

## 🚀 Deployment

The application is containerized and ready for deployment on any cloud platform:

- **Frontend**: Static build served by nginx
- **Backend**: Node.js API server
- **Database**: MongoDB
- **File Storage**: Cloudinary

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by the best wellness and gamification platforms
- Designed for scalability and mobile-first experience