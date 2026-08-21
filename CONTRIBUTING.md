# Contributing

## Branching

- `main` is always deployable.
- Work happens on feature branches (`feat/short-description`,
  `fix/short-description`, etc.), merged into `main` via pull request.
- CI (lint, typecheck, build, Docker build — see
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml)) must pass before
  merging.

## Before pushing

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Releasing

Versioning is manual semver (`MAJOR.MINOR.PATCH` in `package.json`), no
automated changelog tooling:

- **patch** (`0.1.0` → `0.1.1`) — bug fixes, no behavior change.
- **minor** (`0.1.0` → `0.2.0`) — new backward-compatible features.
- **major** (`0.x` → `1.0.0`, or `1.x` → `2.0.0`) — breaking changes.

To cut a release:

1. Bump `"version"` in `package.json` on `main`.
2. Tag the commit and push the tag:

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

3. (Optional) Create a [GitHub Release](https://github.com/onetodone/qrcode-generator/releases)
   from the tag — GitHub can auto-generate release notes from merged PRs.

Docker images are built from source (`docker compose up --build`) rather than
published to a registry for now.
