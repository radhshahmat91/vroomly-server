import { toDateOnly } from '../utils/dates.js';

/** Expose `id` instead of `_id`, drop `__v`, and (optionally) render date-only fields as 'YYYY-MM-DD'. */
export function normalizeJSON(schema, dateOnlyFields = []) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      for (const f of dateOnlyFields) if (ret[f]) ret[f] = toDateOnly(ret[f]);
      return ret;
    },
  });
}
