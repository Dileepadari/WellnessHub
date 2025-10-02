const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WellnessHub API',
      version: '1.0.0',
      description: 'Comprehensive wellness platform API with gamification features',
      contact: {
        name: 'WellnessHub Team',
        email: 'api@wellnesshub.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.wellnesshub.com/api' 
          : `http://localhost:${process.env.PORT || 5000}/api`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            avatar: { type: 'string' },
            level: { type: 'number' },
            totalPoints: { type: 'number' },
            currentStreak: { type: 'number' },
            longestStreak: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Challenge: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { 
              type: 'string',
              enum: ['health', 'wealth', 'insurance', 'wellness', 'community']
            },
            type: {
              type: 'string', 
              enum: ['individual', 'team', 'community']
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard']
            },
            points: { type: 'number' },
            duration: { type: 'number' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            participants: { type: 'number' },
            isActive: { type: 'boolean' }
          }
        },
        Achievement: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            icon: { type: 'string' },
            category: { type: 'string' },
            points: { type: 'number' },
            rarity: {
              type: 'string',
              enum: ['common', 'rare', 'epic', 'legendary']
            },
            unlockedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
            statusCode: { type: 'number' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

const swaggerSetup = (app) => {
  // Swagger UI setup
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'WellnessHub API Documentation',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    }
  }));

  // JSON spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

module.exports = swaggerSetup;