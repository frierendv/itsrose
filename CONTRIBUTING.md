# Contributing to ItsRose

Thank you for your interest in contributing to **ItsRose**! Contributions from the community are essential for keeping this platform innovative, reliable, and open for everyone.

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Table of Contents

- [Contributing to ItsRose](#contributing-to-itsrose)
	- [Table of Contents](#table-of-contents)
	- [Code of Conduct](#code-of-conduct)
	- [Getting Started](#getting-started)
		- [Prerequisites](#prerequisites)
		- [Local Setup](#local-setup)
	- [Development Workflow](#development-workflow)
		- [Monorepo Architecture](#monorepo-architecture)
		- [Creating New Packages](#creating-new-packages)
		- [Managing Dependencies](#managing-dependencies)
	- [Commit Guidelines](#commit-guidelines)
		- [Commit Format](#commit-format)
		- [Allowed Commit Types](#allowed-commit-types)
		- [Commit Examples](#commit-examples)
	- [Code Quality \& Style](#code-quality--style)
		- [Style Enforcements](#style-enforcements)
		- [Pre-commit Verification](#pre-commit-verification)
	- [Submitting a Pull Request](#submitting-a-pull-request)
	- [Reporting Bugs \& Feature Requests](#reporting-bugs--feature-requests)
		- [Reporting Bugs](#reporting-bugs)
		- [Feature Requests](#feature-requests)

---

## Code of Conduct

This project and everyone participating in it is governed by the [ItsRose Code of Conduct](CODE_OF_CONDUCT.md). Please read it to understand our community standards and expectations before contributing.

---

## Getting Started

### Prerequisites

Before you begin development, make sure you have the following installed:

- **Node.js**: `v24.0.0` or higher
- **npm**: `v11.0.0` or higher
- **Git**

### Local Setup

1. **Fork and clone the repository:**

    ```bash
    git clone https://github.com/<your-username>/itsrose.git
    cd itsrose
    ```

2. **Add upstream remote:**

    ```bash
    git remote add upstream https://github.com/frierendv/itsrose.git
    ```

3. **Install workspace dependencies:**

    ```bash
    npm install
    ```

4. **Verify your setup:**
   Run a full type check and build to confirm your local environment is ready:
    ```bash
    npm run typecheck
    npm run build
    ```

---

## Development Workflow

### Monorepo Architecture

ItsRose is structured as a monorepo powered by **npm workspaces** and **Turborepo**:

- **`apps/`**: Deployable applications.
- **`packages/`**: Shared libraries and modular features.

Common development tasks:

```bash
# Start all services in development mode
npm run dev

# Start development mode for a specific app or package
npm run dev --filter=api

# Build all applications and packages
npm run build

# Run unit tests
npm test
```

### Creating New Packages

Always use the built-in Plop scaffolding tool to generate new modules in `packages/`. This ensures consistent directory structure, configuration inheritance, and proper package registration:

```bash
npm run plop
```

Follow the interactive prompts:

1. Select the module category.
2. Input the package name.
3. Enter optional module description and specify dependencies.

### Managing Dependencies

Since this project uses npm workspaces with `syncpack`:

- **Adding a dependency to a package:**

    ```bash
    npm install <package-name> -w @itsrose/<package-name>
    ```

- **Adding a devDependency to the root:**

    ```bash
    npm install -D <package-name>
    ```

- **Keeping dependency versions synchronized:**
  Run `syncpack` after adding or updating dependencies:
    ```bash
    npm run format
    ```

---

## Commit Guidelines

We enforce the [Conventional Commits specification](https://www.conventionalcommits.org/) using **Commitlint** and **Husky** git hooks.

### Commit Format

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Allowed Commit Types

| Type       | Description                                                         |
| :--------- | :------------------------------------------------------------------ |
| `feat`     | A new feature for the user or platform                              |
| `fix`      | A bug fix                                                           |
| `docs`     | Documentation changes only                                          |
| `style`    | Formatting, missing semi-colons, white-space, etc. (no code change) |
| `refactor` | Code restructuring without adding features or fixing bugs           |
| `perf`     | Code change that improves performance                               |
| `test`     | Adding or updating tests                                            |
| `build`    | Changes to build configuration or workspace dependencies            |
| `ci`       | Changes to CI configuration files and scripts                       |
| `chore`    | Maintenance tasks, release bumps, or generator updates              |
| `revert`   | Reverts a previous commit                                           |

### Commit Examples

```bash
git commit -m "feat(api): add streaming support for elevenlabs audio synthesis"
git commit -m "fix(http-client): honor retry-after header on 429 responses"
git commit -m "docs: update CONTRIBUTING guide with commit conventions"
```

---

## Code Quality & Style

We maintain strict quality rules across the entire codebase.

### Style Enforcements

- **TypeScript**: Strict mode is enabled. Avoid using `any` types; prefer strict interfaces and Zod schemas.
- **ESLint**: Code MUST pass all ESLint rules without warnings (`--max-warnings 0`).
- **Formatting**: Prettier and Syncpack formatters are configured.

### Pre-commit Verification

Before committing, run the following commands to check your changes locally:

```bash
# 1. Run ESLint checks
npm run lint

# 2. Run TypeScript typecheck
npm run typecheck

# 3. Run Jest test suite
npm test

# 4. Format code automatically
npm run format
```

> **Note**: Pre-commit git hooks via Husky will automatically run `lint-staged` on staged files.

---

## Submitting a Pull Request

1. **Create a topic branch:**

    ```bash
    git checkout -b feat/your-feature-name
    ```

2. **Commit your changes:** Follow the [Commit Guidelines](#commit-guidelines).

3. **Rebase against `upstream/main`:**

    ```bash
    git fetch upstream
    git rebase upstream/main
    ```

4. **Verify local builds and tests:**

    ```bash
    npm run lint
    npm run typecheck
    npm test
    npm run build
    ```

5. **Push to your fork:**

    ```bash
    git push origin feat/your-feature-name
    ```

6. **Open a Pull Request:**
    - Provide a clear PR title matching Conventional Commits syntax.
    - Describe what changed, why the change is necessary, and how to test it.
    - Link any related issues (e.g., `Closes #123`).

---

## Reporting Bugs & Feature Requests

### Reporting Bugs

If you find a bug, please check the [Issue Tracker](https://github.com/frierendv/itsrose/issues) first to see if it has already been reported. If not, open a new issue with:

- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected behavior vs. actual behavior.
- Relevant terminal logs, stack traces, and environment details (Node version, OS).

### Feature Requests

Feature requests are welcome! When opening a feature request:

- Detail the motivation and use case behind the proposed feature.
- Describe how the feature should behave and any potential API design ideas.
