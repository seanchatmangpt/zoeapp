# Truex NPM Package Rebranding Tracker

As part of the operational transition from ZoeOS / seanchatmangpt references to the authoritative **Truex** identity, the following NPM packages must be migrated or aliased to the `@truex` scope.

## Target Packages to Migrate

| Current NPM Package | Recommended Truex Identity | Status |
|---------------------|----------------------------|--------|
| `@seanchatmangpt/unjucks` | `@truex/unjucks` | Pending |
| `@seanchatmangpt/pictl` | `@truex/pictl` | Pending |
| `@seanchatmangpt/pm4wasm` | `@truex/pm4wasm` | Pending |
| `@unrdf/zkp` | `@truex/zkp` | Pending |

## Execution Steps

1. **NPM Organization Creation**: Register the `@truex` NPM organization.
2. **Repository Renaming**: Transfer source repositories from `github.com/seanchatmangpt/` to `github.com/truex/`.
3. **Package JSON Updates**: Update the `name` field in each package's `package.json`.
4. **Publishing**: Run `npm publish --access public` for the new identities.
5. **Deprecation**: Run `npm deprecate @seanchatmangpt/<package> "This package has moved to @truex/<package>"` to redirect consumers.
6. **Internal References**: Update all internal boilerplate and import paths within the `zoeapp` monorepo to resolve to the new `@truex` namespaces.
