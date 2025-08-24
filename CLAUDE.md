# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web application built with TanStack Router, a file-based routing system for React applications. The project demonstrates various routing features and serves as an example of how to use TanStack Router effectively.

## Commands

### Development

```sh
# Install dependencies
pnpm install

# Start development server
pnpm dev  # Runs on http://localhost:3000 by default

# Build the project
pnpm build
```

## Code Architecture

### Core Technologies

- **React 19**: Modern UI library
- **TanStack Router**: File-based routing for React
- **TanStack Query**: Data fetching and state management
- **TypeScript**: Static typing
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server

### Project Structure

- `/src`: Main source code
  - `/components`: Reusable React components
  - `/routes`: File-based routing structure
    - `__root.tsx`: Root layout component
    - Route files follow TanStack Router naming conventions
    - Files with `$` prefix denote dynamic route parameters
    - Files with `_` prefix denote layout routes without path segments
  - `/styles`: CSS styles
  - `/utils`: Utility functions
- `/public`: Static assets
- `/designs`: Design assets and mockups

### Routing System

The application uses TanStack Router, which follows a file-based routing approach:

1. Route files are defined in the `/src/routes` directory
2. The routing structure is automatically generated in `routeTree.gen.ts`
3. Route components are created using `createFileRoute` and `createRootRouteWithContext`
4. Dynamic routes use `$parameter` syntax in filenames
5. Nested routes can use layout components 
6. API routes are available under the `/api` path

### Data Fetching

The application uses TanStack Query for data fetching:

1. The React Query client is initialized in the router configuration
2. Query capabilities are provided through the router context
3. Data fetching can be configured in route loaders

## Development Notes

- This project is set up as a demonstration of TanStack Router features
- The application shows examples of route layouts, dynamic routes, and API routes

## Code Quality and Maintenance

- Always run npx prettier **/*.ts* --write after a big feature to lint the codebase

## Build and Run Guidelines

- Use npm for all build and run commands
- Use npm build to compile the project

## Documentation Sources

- Use https://tanstack.com/start/latest/docs/framework/react/ as documentation source for anything related to building API endpoints, server functions, middlewares etc

## Tool Preferences

- Use npm for all commands. That's our tool of choice