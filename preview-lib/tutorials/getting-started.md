# Getting Started

Welcome! This short tutorial shows how to work with the preview library’s API and links to the generated documentation.

## Create your first Person

```js
// Example usage with the preview library classes
// (paths are relative to the preview setup)
import Person from '../class.person.js';

const alice = new Person('Alice', 30);
console.log(alice.greet()); // "Hello, I'm Alice."
```

- See the `Person` class reference: {@link Person}.
- Try listing all people: `Person.allHumans()`.

## Plan an event

`Person#planEvent` accepts flexible arguments and returns a summary object.

```js
const bob = new Person('Bob', 25);
const summary = bob.planEvent('2025-10-01T10:00:00Z', {
  location: 'Conference Room A',
  attendees: [alice],
  notify: true,
  metadata: { priority: 'high' }
}, 'Introductions', 'Roadmap');

console.log(summary.location); // "Conference Room A"
console.log(summary.attendees); // 1
```

## Next steps

- Explore the API docs for more classes, typedefs, and examples.
- Link to this tutorial from your docs with `{@tutorial getting-started}`.

