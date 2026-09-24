# Comment style

The rule is one sentence long: **a comment explains why, never what.**

The code already says what it does. A comment that repeats it costs a line, ages
badly, and trains the next reader to skip comments.

## What belongs in a comment

- **A decision and its alternative.** Why this approach and not the obvious one.
- **A constraint from outside the file.** A platform quirk, a protocol rule, a
  limit in a dependency.
- **A trap.** Something that looks safe to change and is not.
- **A threat model.** What a guard defends against, so nobody relaxes it.

```js
// 127.0.0.1, not localhost: in this image localhost resolves to ::1 first and
// nginx listens on IPv4 only, so wget was refused and the container reported
// unhealthy for its whole life while serving every request normally.
```

That comment survives a rewrite of the line beneath it, because it is about the
environment rather than the syntax.

## What does not

```js
// Increment the counter
counter += 1;

// Loop through users
for (const user of users) {
```

Both are noise. So is a commented-out block: the history has it.

## Module headers

Every source file opens with a block saying what the module is for and one
thing that is not obvious from reading it. Two to five lines.

```js
/**
 * Every environment value the app reads, resolved once at startup.
 *
 * Nothing else in the codebase touches process.env. That is what makes a
 * misconfigured deployment fail here, on boot, with a message naming the
 * missing key, rather than on the first request that happens to need it.
 */
```

## Exports

Every exported function, class and constant carries a doc comment. One line is
usually enough. Spend the extra lines where a caller could get it wrong:

```js
/** The label to print for the primary shortcut modifier, e.g. "Ctrl" or "Cmd". */
```

Route handlers additionally carry their `@swagger` block, because the OpenAPI
document is generated from them. A route without one is undocumented in the
published spec.

## Tests

A test's name says what it checks. Its comment says **what broke**, so that
someone who deletes the assertion knows what they are giving up:

```js
// Passed through raw, this matched every document and returned the whole
// user directory to a caller with no credentials.
expect(res.body.data).toEqual([]);
```

## Punctuation

Plain ASCII everywhere: files, UI strings, commit messages. No em dashes, no
emoji, no arrow glyphs. Use `-`, `>` or rewrite the sentence. CI enforces this,
including the HTML entity forms, which are pure ASCII in the file and render as
the forbidden character in a browser.
