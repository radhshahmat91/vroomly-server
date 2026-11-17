/**
 * validate({ body, query, params }) parses with Zod and stores the result:
 *   body   -> req.body (replaced with parsed value)
 *   query  -> req.valid.query   (Express 5 makes req.query read-only)
 *   params -> req.valid.params
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid || {};
  if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
  if (schemas.query) req.valid.query = schemas.query.parse(req.query ?? {});
  if (schemas.params) req.valid.params = schemas.params.parse(req.params ?? {});
  next();
};
