import mongoose from 'mongoose';
import { ApiError } from '../utils/apiError.js';

/** Use with router.param('id', checkId) so malformed ids become a clean 404 instead of a CastError. */
export function checkId(_req, _res, next, id) {
  if (!mongoose.isValidObjectId(id)) return next(new ApiError(404, 'We could not find what you were looking for.'));
  return next();
}
