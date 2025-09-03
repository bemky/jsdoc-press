/**
 * Networking utilities.
 * @namespace Net
 */
const Net = {};

/**
 * Connect to a host.
 * @function connect
 * @memberof Net
 * @param {string} host - Hostname or URL.
 * @returns {Promise<void>}
 */
function connect(host) {
  void host; // no-op for preview
  return Promise.resolve();
}

/**
 * Default timeout in milliseconds.
 * @memberof Net
 * @type {number}
 */
Net.timeout = 3000;

module.exports = { Net, connect };

