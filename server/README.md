# WellnessHub Backend

## Overview

WellnessHub is a comprehensive wellness platform backend API built with Node.js, Express, and MongoDB. It features gamification, health tracking, wealth management, insurance management, and social community features.

## 🚀 Key Features

### Core Features
- **User Authentication & Authorization** - JWT-based auth with role management
- **Gamification Engine** - Points, levels, achievements, streaks, leaderboards
- **Health Tracking** - Steps, water intake, workouts, nutrition logging
- **Wealth Management** - Financial goals, budget tracking, investment insights
- **Insurance Management** - Policy tracking, recommendations, coverage analysis
- **Challenge System** - Individual, team, and community challenges
- **Social Features** - Teams, friends, activity sharing, leaderboards
- **Real-time Updates** - Socket.IO for live notifications and updates
- **Analytics Dashboard** - Comprehensive user and admin analytics

### Technical Features
- **RESTful API** - Well-structured REST endpoints
- **Real-time Communication** - Socket.IO integration
- **Comprehensive Validation** - Input validation and sanitization
- **Security** - Helmet, CORS, rate limiting, data encryption
- **Documentation** - Swagger/OpenAPI documentation
- **Error Handling** - Centralized error handling
- **Logging** - Winston-based logging system
- **Database** - MongoDB with Mongoose ODM

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **Validation**: express-validator
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, bcryptjs
- **Logging**: Winston
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Task Scheduling**: node-cron

## 📁 Project Structure

```
server/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   └── swagger.js    # API documentation
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js       # Authentication middleware
│   │   └── errorHandler.js # Error handling
│   ├── models/          # Mongoose models
│   │   ├── User.js      # User model with gamification
│   │   ├── Challenge.js # Challenge system
│   │   ├── Team.js      # Team management
│   │   └── Achievement.js # Achievement system
│   ├── routes/          # API routes
│   │   ├── auth.js      # Authentication endpoints
│   │   ├── users.js     # User management
│   │   ├── gamification.js # Points & achievements
│   │   ├── health.js    # Health tracking
│   │   ├── wealth.js    # Financial management
│   │   ├── insurance.js # Insurance management
│   │   ├── challenges.js # Challenge system
│   │   ├── community.js # Social features
│   │   └── analytics.js # Analytics & insights
│   ├── utils/           # Utility functions
│   │   └── logger.js    # Logging configuration
│   ├── scripts/         # Database scripts
│   │   └── seedDatabase.js # Database seeding
│   └── app.js           # Express app configuration
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
└── server.js           # Server entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd WellnessHub/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/wellnesshub
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   CLIENT_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Setup (Alternative)

1. **Using Docker Compose** (from project root)
   ```bash
   docker-compose up -d
   ```

## 📚 API Documentation

Once the server is running, access the interactive API documentation:
- **Swagger UI**: http://localhost:5000/api-docs
- **JSON Spec**: http://localhost:5000/api-docs.json

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in requests:

```bash
Authorization: Bearer <your-jwt-token>
```

### Sample Login Request
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

## 📖 API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset

### Users (`/api/users`)
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `GET /friends` - Get friends list
- `POST /friends/:id` - Send friend request
- `GET /leaderboard` - Get leaderboard

### Gamification (`/api/gamification`)
- `POST /points` - Add points
- `GET /achievements` - Get achievements
- `POST /daily-bonus` - Claim daily bonus
- `GET /leaderboard` - Get points leaderboard

### Health (`/api/health`)
- `POST /activity` - Log health activity
- `GET /statistics` - Get health stats
- `POST /goals` - Set health goals
- `GET /goals` - Get health goals

### Wealth (`/api/wealth`)
- `GET /financial-profile` - Get financial profile
- `POST /financial-profile` - Update financial profile
- `GET /goals` - Get financial goals
- `POST /goals` - Create financial goal
- `GET /insights` - Get financial insights

### Insurance (`/api/insurance`)
- `GET /profile` - Get insurance profile
- `POST /profile` - Update insurance profile
- `GET /policies` - Get insurance policies
- `POST /policies` - Add insurance policy
- `GET /recommendations` - Get insurance recommendations

### Challenges (`/api/challenges`)
- `GET /` - Get challenges
- `POST /` - Create challenge
- `POST /:id/join` - Join challenge
- `POST /:id/progress` - Update progress
- `GET /:id/leaderboard` - Get challenge leaderboard

### Community (`/api/community`)
- `GET /feed` - Get activity feed
- `GET /teams` - Get teams
- `POST /teams` - Create team
- `POST /teams/:id/join` - Join team
- `GET /leaderboard` - Get community leaderboard

### Analytics (`/api/analytics`)
- `GET /dashboard` - Get user dashboard
- `GET /trends` - Get activity trends
- `GET /engagement` - Get engagement metrics
- `GET /admin/overview` - Admin analytics (admin only)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📊 Database Models

### User Model
- Authentication & profile data
- Gamification features (points, level, achievements)
- Health tracking data
- Wealth profile & financial goals
- Insurance profile & policies
- Social connections (friends, teams)

### Challenge Model
- Individual, team, and community challenges
- Progress tracking
- Leaderboards
- Participation management

### Achievement Model
- Gamification achievements
- Trigger conditions
- Rarity levels
- Category organization

### Team Model
- Team management
- Member tracking
- Team statistics
- Challenge participation

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `5000` |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRE` | JWT expiration time | No | `30d` |
| `CLIENT_URL` | Frontend URL for CORS | No | `http://localhost:3000` |
| `CLOUDINARY_NAME` | Cloudinary cloud name | No | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No | - |
| `EMAIL_HOST` | SMTP host | No | - |
| `EMAIL_PORT` | SMTP port | No | `587` |
| `EMAIL_USER` | SMTP username | No | - |
| `EMAIL_PASS` | SMTP password | No | - |

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set strong JWT secret
- [ ] Configure CORS for production domain
- [ ] Set up process manager (PM2)
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up SSL/TLS certificates
- [ ] Configure monitoring and logging
- [ ] Set up backup strategy

### Docker Deployment
```bash
# Build image
docker build -t wellnesshub-api .

# Run container
docker run -p 5000:5000 --env-file .env wellnesshub-api
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: support@wellnesshub.app

## 🔄 Changelog

### v1.0.0 (Current)
- ✅ Complete authentication system
- ✅ Gamification engine with points and achievements
- ✅ Health tracking features
- ✅ Wealth management system
- ✅ Insurance management features
- ✅ Challenge system (individual, team, community)
- ✅ Social features and team management
- ✅ Real-time updates with Socket.IO
- ✅ Comprehensive analytics dashboard
- ✅ Admin panel features
- ✅ API documentation
- ✅ Docker support