import winston from 'winston';

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

// File logs are opt-in (LOG_TO_FILE=true); on PaaS hosts stdout is collected anyway.
if (process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info'),
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports,
});

export default logger;
