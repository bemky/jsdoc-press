/**
 * Represents a person.
 */
class Person {
  /**
   * Create a person.
   * @param {string} name - Person's name.
   * @param {number} [age] - Optional age.
   */
  constructor(name, age) {
    /** @type {string} */
    this.name = name;
    /** @type {number|undefined} */
    this.age = age;
  }
  
 /**
  * Show All Humans
  * @returns {Array.<Person>} An array of Person instances.
  */
 static allHumans () {
     return [
       new Person('Alice', 30),
       new Person('Bob', 25),
       new Person('Carol', 40)
     ];
 }

  /**
   * A computed identifier for this person.
   * @type {string}
   */
  get id() {
      return this.name.toLowerCase() + "-" + (this.age || 'na');
  }

  /**
   * Say hello.
   * @returns {string}
   */
  greet() {
    return `Hello, I'm ${this.name}.`;
  }
  
  /**
   * Reloads the record from the server
   * @param {ReloadOptions} [options={}] - Options for reloading
   * @returns {Promise} Promise that resolves with the reloaded record
   * @throws {Errors.ConnectionNotEstablished} If no connection is established
   * @async
   */
  async reload(options = {}) {
      if (!this.constructor.connection) {
          throw new Errors.ConnectionNotEstablished();
      }
      
      if (this.isNewRecord()) { return }
      
      return await this.constructor.connection.get(this.url(), this.optionsForSync('reload', options));
  }

  /**
   * Plan an event for this person with complex arguments.
   *
   * @param {(Date|string)} when - When the event occurs (Date or ISO string).
   * @param {Object} details - Event details object.
   * @param {string} details.location - Where the event takes place.
   * @param {(Array<Person>|string[])} details.attendees - People attending (Person instances or names).
   * @param {boolean} [details.notify=false] - Whether to send notifications.
   * @param {Object<string, *>} [details.metadata] - Arbitrary metadata by key.
   * @param {...string} agenda - One or more agenda item titles.
   * @returns {{ id: string, when: Date, location: string, attendees: number, agenda: string[] }} Summary of the planned event.
   * @example
   * // Using an ISO date string and Person attendees
   * const alice = new Person('Alice', 30);
   * const summary = alice.planEvent('2025-10-01T10:00:00Z', {
   *   location: 'Conference Room A',
   *   attendees: [new Person('Bob', 25), new Person('Carol', 40)],
   *   notify: true,
   *   metadata: { priority: 'high' }
   * }, 'Introductions', 'Roadmap');
   * console.log(summary.id);        // e.g., "alice-30-event-1696154400000"
   * console.log(summary.location);  // "Conference Room A"
   * console.log(summary.attendees); // 2
   *
   * @example
   * // Using a Date object and string attendee names
   * const quick = alice.planEvent(new Date(), {
   *   location: 'Cafe',
   *   attendees: ['Diana', 'Eve']
   * }, 'Coffee chat');
   * console.log(quick.agenda);      // ["Coffee chat"]
   */
  planEvent(when, details, ...agenda) {
    const at = (when instanceof Date) ? when : new Date(String(when));
    const location = details && details.location ? String(details.location) : 'TBD';
    const attendees = Array.isArray(details && details.attendees) ? details.attendees.length : 0;
    return {
      id: `${this.id}-event-${at.getTime()}`,
      when: at,
      location,
      attendees,
      agenda: agenda || []
    };
  }
}
