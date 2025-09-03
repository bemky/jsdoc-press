/**
 * Utility helpers.
 * @module util
 */

/**
 * Capitalize the first letter of a string.
 * @param {string} s - Input string.
 * @returns {string}
 */
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Sum a list of numbers.
 * @param {...number} nums
 * @returns {number}
 */
function sum(...nums) {
  return nums.reduce((a, b) => a + b, 0);
}

// Exported for illustration; JSDoc reads comments regardless of the runtime export style.
module.exports = { capitalize, sum };

