# not_for_you.md

A working log. Small decisions, dead ends and the reasoning that did not earn a place in
DEVDOC. Written for me, in six months, wondering why something is the way it is.

---

## The bug that took the longest to find was the one nothing pointed at

82 tests passed. eslint was clean. CI was green on three jobs. And two endpoints in
`users.js` answered `404` to every caller who had ever tried them.

`GET /api/users/friends` was registered *below* `GET /api/users/:id`, so Express matched the
wildcard first with `id = "friends"`, `findById` threw a CastError, and the error handler turned
it into `404 Resource not found`. A tidy, plausible 404.

`GET /api/users/:id` was worse, because the cause is invisible:

```js
.select('username firstName lastName avatar level totalPoints currentStreak achievements teams')
...
if (!user.isActive) return res.status(404)...
if (user.preferences?.privacy?.profileVisibility === 'private') return res.status(403)...
```

`isActive` and `preferences` are not in that projection. Mongoose returns `undefined` for an
unselected path rather than complaining, so `!user.isActive` was `!undefined`, which is `true`,
for **every user, active or not**. The endpoint was dead. And the privacy logic under it could
never match either, so `profileVisibility: 'private'` was not enforced anywhere.

The thing I want to remember: the code reads correctly. Every line is defensible. It fails
because of a relationship between two lines forty characters apart, and no tool in the
repository was looking at that relationship.

What found it was pointing curl at the endpoint. Not reading, not linting, not the test suite.

### Why nobody noticed

Neither endpoint is called by the client. The August rebuild made the UI a keyboard-driven
console that does not show other users' profiles or a friends list. So the routes sat there,
fully documented in Swagger, serving 404s to nobody.

Two dead endpoints is not a crisis. But it means the Swagger document was lying, and anyone
building against this API would have lost an afternoon before concluding the server was broken.

---

## Things I changed my mind about

**The `friends` visibility level.** My first fix just added `isActive preferences` to the
projection, which revived the 404 guard and the `private` check. But the default for every
account is `friends`, and the code treated it as "not public", which meant it behaved exactly
like `public` for the base card and exactly like `private` for the detail block. The setting
meant nothing. It now requires an actual friendship for the detail block, which is the only
reading of the word that is not a lie. The base card stays visible because the leaderboard
already shows it.

**Adding `protect` to `GET /api/users/:id`.** I nearly did. The handler already tests
`req.user`, so my first instinct was that it was meant to be authenticated. But the route is a
public profile and the test is for "or you are looking at yourself", which is an *optional* auth
shape. `optionalAuth` was the honest fix: it makes the branch the author wrote actually
reachable instead of changing what the route is.

**Overriding the stranded advisories.** 16 advisories, and my first move was to write a
`overrides` block for `ws`, `engine.io`, `socket.io-parser`, `path-to-regexp` and friends. Then
I checked the parents' declared ranges: `socket.io` asks for `engine.io ~6.6.0` and the fix is
`6.6.10`; `router` asks for `path-to-regexp ^8.0.0` and the fix is `8.4.2`. **Every one of them
was already inside the range its parent allowed.** The lockfile was simply old. `npm update`
took all 16 to zero with no overrides at all.

I nearly committed a block of pins that pinned nothing, and would have had to be maintained
forever. Check what the parent actually asks for before you override it.

**Bumping vitest to 5.** npm's `audit fix` offered `vitest@5.0.1` and flagged it as breaking.
The advisory range is `>=2.1.0 <4.1.11`, so `4.1.11` is the minimal fix. Still a major from
3.2.7, but one major rather than two, and the suite passed on it unchanged.

---

## The health endpoint, and the hole I dug getting there

nginx proxied `/api/` and `/socket.io/`. The API's liveness endpoint is at `/health`, at the
root. Nothing proxied it, so `/health` fell through to `try_files ... /index.html` and returned
**200 with the SPA shell**.

I proved it properly: stopped the backend container, curled `/health`, got `200 text/html`
while `/api/auth/login` correctly gave `502`. Anything monitoring that URL would have reported
the service healthy with no API at all behind it.

So I added `location = /health { proxy_pass http://api/health; }`, rebuilt, and went back to
capturing screenshots. The next capture was of the Health page.

It rendered the API's JSON.

**`/health` is also a client route** - the wellness dashboard. I had taken a page away from
users to give a probe a nicer URL. The probe now lives at `/api/healthz`, which collides with
nothing, and CI asserts both: that `/api/healthz` returns the API's JSON, and that `/health`
still serves `<div id="root">`.

I would not have caught this by reading. I caught it because the very next screenshot in the
sequence was the page I had broken.

---

## Two configs that were right and did nothing

**nginx `add_header`.** The server block declared `X-Frame-Options`, `X-Content-Type-Options`
and `Referrer-Policy`, all three with `always`. Every one of them was missing from every HTML
page and every script the app served.

nginx does not merge `add_header` across levels. A `location` that declares *any* `add_header`
discards every one inherited from above. `location /` sets `Cache-Control`. `location /assets/`
sets `Cache-Control`. `location = /healthz` sets `Content-Type`. All three therefore threw away
the security headers, and `always` does not help because it only governs error responses.

The only place the three appeared was on the proxied endpoint, which already had them from
helmet - and there they *duplicated*, giving one response both `X-Frame-Options: DENY` and
`X-Frame-Options: SAMEORIGIN`.

This is the second repository in this job with a config that reads correctly and is inert
(shopflow's HAProxy `stats auth` took `${RABBITMQ_USER}:${RABBITMQ_PASS}` as a literal
credential). Both were caught the same way: by reading a real response instead of the file.

**The frontend healthcheck.** `wget --spider http://localhost/healthz`. In that image
`localhost` resolves to `::1` first, and nginx listens on IPv4 only. Connection refused, every
30 seconds, forever. The container served every request perfectly and reported `unhealthy` for
its entire life.

I found it by accident: `docker compose ps` printed `(unhealthy)` next to a container I had been
curling successfully for an hour. If anything had gated on that container being healthy, the
stack would never have come up.

Both now have CI assertions, because both are invisible to every other check in the pipeline.

---

## The seed was writing the future

The Wealth screenshot showed transactions dated 26 and 27 September. It was the 24th.

`daysAgo()` in the seed has a cutoff and a comment explaining exactly why:

> Today's entries would otherwise land at a fixed evening hour even when seeded in the morning,
> putting them ahead of `now`. That both contradicts the API's no-future-entries rule and pushes
> them outside any window that ends at now.

`inMonth()`, twenty lines below it, had no cutoff. In the current month every day up to the 28th
is generated, so seeding on the 24th produces four days of salary and groceries that have not
happened.

Then I checked whether the API would have accepted those rows, and it would have.
`POST /api/health/activities` refuses a future date with a 400 and a comment saying why.
`POST /api/wealth/transactions` had no such check at all, and a transaction dated 2032 lands in
a 2032 month bucket and drags the savings rate and the prior-month averages with it.

Same shape a third time in one repository: two paths that must agree, one of which knows less.

---

## Decisions I am not going to relitigate

- **`join-challenge` still checks nothing.** Unlike `join-team`. That is not an oversight I am
  leaving in: REST lets any signed-in user join any active challenge, so the room exposes
  nothing a member could not already fetch. If private challenges ever exist, this becomes real
  the same day.
- **`/users/search` still needs no credentials.** Escaping the term and capping the page size
  killed the directory dump, which was the actual vulnerability. Whether the endpoint should be
  public at all is a product question, and `/community/leaderboard` is public too, so they
  should be decided together rather than one of them changed quietly.
- **The client coverage floor is 14%.** That is an honest number against all of `src/`, not a
  flattering one measured over the files tests happen to import. It is not a quality bar and
  the DEVDOC says so. It exists because **Vitest exits 0 when it runs no tests**, and a
  coverage figure is the only thing in the pipeline that can tell those two apart.
- **`server/package.json` had `"author": "WellnessHub Team"`.** Changed to the actual author.
  The Swagger contact had `api@wellnesshub.com`, a domain nobody owns, and the production server
  URL was `https://api.wellnesshub.com/api`, which would have pointed every "Try it out" button
  at someone else's DNS. That one is now a relative `/api`, which is correct for the
  same-origin deployment and correct wherever else it is deployed.

---

## Screenshot notes

The stack runs on 3100, not 3000: the user's tourism stack owns 3000 and stopping someone's
containers to take a screenshot is not a trade I get to make on my own.

Captures go through the iframe harness plus a throwaway reverse proxy, because nginx sends
`X-Frame-Options: DENY` and that header is correct and stays. The proxy strips only the framing
headers, only for the capture session, and the real headers were asserted against the app
directly rather than through it.

The harness needed two localStorage keys this time, the theme and the session token, so the
skill's generator now takes any number of `key=value` pairs. Without the token it faithfully
captures the login screen on all eight routes.

Demo data beyond `npm run seed`: John joins two challenges, Jane posts three shares, and John
friends Jane. All of it through the app's own API rather than written into the database, so the
screenshots show states the app can actually reach.

---

## What I did not do

The **light theme and responsive captures are missing**. The Chrome extension disconnected
partway through the dark set, and the rule for this job is to ask for a reconnect rather than
reach for Playwright. Five of eight dark screens are in. What remains is mechanical: the
harness, the proxy and the seeded stack are all still standing and parameterised by route,
viewport and theme.
