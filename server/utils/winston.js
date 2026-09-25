import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
    })
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),
    // General application log
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Access / login log
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'access.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 3,
    }),
    // Error log
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 3,
    }),
  ],
});

export default logger;
