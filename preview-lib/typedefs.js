/**
 * A user record.
 * @typedef {Object} User
 * @property {string} id - Unique identifier.
 * @property {string} name - Display name.
 * @property {number} [age] - Optional age.
 */

/**
 * Map of string keys to numbers.
 * @typedef {Object.<string, number>} NumericMap
 */

/**
 * Options used when reloading a record.
 *
 * This is a plain options object passed to the underlying reload/sync logic.
 * Its exact shape is implementation‑specific; use it to control how a
 * reload is performed (for example, transport, query, or request behavior).
 *
 * @typedef {Object} ReloadOptions
 * @property {Function} [success] - Success callback
 * @property {Function} [error] - Error callback
 */