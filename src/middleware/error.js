import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Something went wrong.';
  let errors;

  if (err instanceof ZodError) {
    status = 400;
    message = err.issues[0]?.message ? `Please check your input: ${err.issues[0].message}` : 'Please check your input.';
    errors = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    message = errors[0]?.message || 'Validation failed.';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'That id or value is not valid.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Each photo must be 6 MB or smaller.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'You can upload up to 8 photos at a time.'
          : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  }

  if (status >= 500) {
    // Deliberate ApiErrors (e.g. "payments not configured") are expected; only log real surprises.
    if (err.name !== 'ApiError') console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (env.isProd && err.name !== 'ApiError') message = 'Something went wrong on our side. Please try again.';
  }

  res.status(status).json({
    message,
    ...(errors ? { errors } : {}),
    ...(typeof err.code === 'string' && err.code !== 'ERR_' ? { code: err.code } : {}),
  });
}
