# Testing Guidelines

## Core rules

- Add or update tests when behavior changes.
- Prefer tests that verify user-observable behavior.
- Keep fixtures small and explicit.

## Current stack

- Test runner: Vitest
- DOM env: jsdom
- UI assertions: Testing Library + jest-dom

## Practical conventions

- Name tests in Spanish when the behavior description is domain-specific.
- Keep one behavioral expectation per assertion block when possible.
- For pure helpers, prioritize table-like input/output test cases.

## Commands

- `npm run test`
- `npm run lint`
- `npm run build`
