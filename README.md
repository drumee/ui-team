# Drumee Web OS UI

The front-end of the Drumee workspace — the desk you actually see: files,
folder-native chat, tasks, sharing and meetings.

- **Website:** [drumee.com](https://drumee.com) ·
  **Docs:** [docs.drumee.com](https://docs.drumee.com/introduction/)
- **Back-end counterpart:** [drumee/server-team](https://github.com/drumee/server-team)

> Looking to **run** Drumee rather than develop it? Follow the
> [self-hosting guides](https://docs.drumee.com/self-hosting/overview) —
> Docker Compose, Debian packages, and production operations.

---

## What it is

A collaborative web application built on Backbone.js and Marionette, rendered
entirely on the client. Drumee is a **pure client-side rendering** app: the
server sends a loader and holds a WebSocket, and everything you see is built in
the browser.

The interface is **not** written as HTML. It is expressed as JSON component
trees — the **LETC** system — which the rendering engine in
[`@drumee/ui-core`](https://github.com/drumee/ui-core) turns into DOM. A screen
is a tree of `Skeletons.*` components (`Box.Y`, `Box.X`, `Button`, `Note`,
`Entry`, `List`, `Image`, …), styled with SCSS tokens and BEM class names, with
all user-facing text coming from the locale files rather than string literals.

If you are used to JSX or templates, this is the one thing to internalise before
reading the source: there is no markup to grep for.

## Requirements

The UI needs a Drumee back-end to talk to. The supported way to get one on a
developer machine, follow the
[getting-started guides](https://docs.drumee.com/getting-started); the build and
deployment source lives in [drumee/debian](https://github.com/drumee/debian).

## Development

```console
npm install
npm run setup     # write the development environment config (once, after clone)
npm run dev       # development server with live rebuild
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run deploy` | **The production build.** This is what CI runs — there is no `build` script |
| `npm run build:icons` | Rebuild the SVG icon sprites |
| `npm run md:style` | Recompile the markdown viewer CSS |
| `npm run add-widget -- --fig=group.name --dest src/path/to/widget` | Scaffold a new widget |

Build and entry-point generation live in
[`@drumee/ui-dev-tools`](https://github.com/drumee/ui-dev-tools), not in this
repository's `webpack/` directory.

## Layout

| Path | What it holds |
|---|---|
| `src/drumee/` | Application source — the desk, windows, widgets and services |
| `letc/` | LETC integration |
| `icons/` | SVG icon sources; `npm run build:icons` compiles the sprites |
| `locale/` | User-facing strings. All text goes through here |
| `webpack/` | Legacy build configuration |
| `tests/` | Tests |

## Built on

| Package | Role |
|---|---|
| [`@drumee/ui-core`](https://github.com/drumee/ui-core) | The rendering engine — LETC, the kind registry, skeleton builders |
| [`@drumee/ui-essentials`](https://github.com/drumee/ui-essentials) | Shared front-end library — sockets, transport, utilities |
| [`@drumee/ui-toolkit`](https://github.com/drumee/ui-toolkit) | Shared widgets |
| `@drumee/ui-styles` | Style tokens |

## Contributing

See the org [CONTRIBUTING guide](https://github.com/drumee/.github/blob/main/CONTRIBUTING.md).
Questions: [Discussions](https://github.com/orgs/drumee/discussions).

## License

AGPL-3.0 — see [LICENSE](LICENSE).
