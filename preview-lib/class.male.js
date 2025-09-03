/**
 * Represents a male.
 * @memberof Person
 * @extends Person
 */
class Male extends Person {
  /**
   * This guys friends.
   * @returns {string}
   */
  bros () {
    return `Hello, I'm ${this.name}.`;
  }
}

