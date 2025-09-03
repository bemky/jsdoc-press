/**
 * An object that can serialize itself.
 * @interface
 */
function Serializable() {}

/**
 * Convert to JSON-friendly value.
 * @name Serializable#toJSON
 * @function
 * @returns {any}
 */
Serializable.prototype.toJSON = function () {};

module.exports = { Serializable };

