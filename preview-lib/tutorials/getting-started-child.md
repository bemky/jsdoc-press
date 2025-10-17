# Getting Started: Deep Dive

This child tutorial expands on {@tutorial getting-started} with more detailed steps and tips.

## Tips

- Use `Person.allHumans()` to fetch demo data quickly.
- Leverage `{@link Person#planEvent}` for complex examples.

## Example

```js
import Person from '../class.person.js';

const bob = new Person('Bob', 25);
const quick = bob.planEvent(new Date(), { location: 'Cafe', attendees: ['Diana', 'Eve'] }, 'Coffee chat');
console.log(quick.agenda); // ["Coffee chat"]
```

## Next

- Continue to {@tutorial next-steps}
