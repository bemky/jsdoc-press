/**
 * Logging behavior.
 * @mixin
 */
const Logging = {
  /**
   * Log a message.
   * @param {string} msg
   */
  log(msg) {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
};

module.exports = { Logging };

