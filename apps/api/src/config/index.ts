import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'hotelpro_super_secret_jwt_key_dev_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshSecret: process.env.REFRESH_SECRET || 'hotelpro_super_secret_refresh_key_dev_2026',
  refreshExpiresInDays: 30,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  databaseUrl: process.env.DATABASE_URL || 'postgresql://hotelpro:hotelpro_dev_password@localhost:5432/hotelpro?schema=public',
};
