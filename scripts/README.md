# Repository scripts

Run scripts from the repository root so their relative paths resolve correctly.

## `database/`

Database maintenance utilities live here. Clearing scripts are destructive; verify the target project and environment before running them. The supported seed cleanup command is exposed through `npm run remove-seed-cash-accounts`.

## `codemods/`

These are historical one-off migrations that directly rewrite files under `src/`. They are kept out of the application root so they are not mistaken for runtime entry points. Review the implementation and current source structure before reusing one.
