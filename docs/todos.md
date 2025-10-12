# TanStack Start Codebase Improvement Todos

## Executive Summary

This project is generally well-structured and follows many TanStack Start best practices. However, there are several inconsistencies and patterns that need standardization to improve maintainability and developer experience.

## High Priority Items (Immediate Impact)

### 🔥 Critical Performance & Architecture

- [ ] **Remove deprecated redirect routes** - Clean up `/transcribe` and `/record` routes that only redirect
  - Files: `src/routes/transcribe.tsx`, `src/routes/record.tsx`
  - Impact: Reduces bundle size and removes unnecessary redirects

- [ ] **Split monolithic recordings.ts** - Break down the 706-line server file into focused modules
  - File: `src/server/recordings.ts`
  - Target structure:
    ```
    src/server/recordings/
    ├── index.ts          // Core CRUD operations
    ├── transcription.ts  // Transcription-specific operations  
    ├── translation.ts    // Translation-specific operations
    └── queries.ts        // Shared query builders
    ```

- [ ] **Consolidate transcription/translation functions** - Merge related server logic
  - Files: `src/server/transcription.ts`, `src/server/translation.ts`
  - Goal: Reduce duplication and improve maintainability

- [ ] **Fix N+1 query problem** - Optimize the recordings list performance
  - File: `src/routes/recordings/index.tsx:95-97`
  - Issue: Each recording card queries transcription status individually
  - Solution: Batch or preload transcription status data

## Medium Priority Items (Quality & Consistency)

### 🔧 Server Function Improvements

- [ ] **Standardize error handling patterns** - Create consistent patterns across server functions
  - Goal: Unified error responses and logging
  - Files: All `src/server/*.ts` files

### 🔄 Query Management

- [ ] **Standardize query invalidation patterns** - Make cache management predictable
  - Current: 15+ different invalidation patterns found
  - Goal: Consistent invalidation across all mutations
  - Files: All components using `queryClient.invalidateQueries`

- [ ] **Add optimistic updates** - Improve user experience for key mutations
  - Target: Recording updates, transcription updates, note updates
  - Goal: Immediate UI feedback before server confirmation

### 📊 Data Loading & State Management

- [ ] **Remove empty loaders or implement proper data prefetching**
  - File: `src/routes/recordings/index.tsx:370-374` (empty loader)
  - Goal: Either remove or add meaningful prefetching

- [ ] **Extract business logic from UI components** - Move logic to custom hooks
  - Target: Components with complex data fetching and state management
  - Goal: Cleaner, more testable components

- [ ] **Standardize loading and error state handling**
  - Goal: Consistent UX patterns across the application
  - Create reusable loading/error components

### ⚡ Performance Optimizations

- [ ] **Implement request batching for workspace queries**
  - Issue: Workspace queries not properly batched
  - Goal: Reduce number of API calls

- [ ] **Standardize cache strategies** - Consistent stale times and background refetch behavior
  - Review all `queryOptions` configurations
  - Goal: Predictable cache behavior across the app

## Low Priority Items (Cleanup & Polish)

### 🧹 Code Cleanup

- [ ] **Clean up empty dashboard directory**
  - Remove: `src/routes/dashboard/` (empty directory)
  - Impact: Cleaner project structure

- [ ] **Consolidate duplicate formatting utilities**
  - Files: Multiple formatters scattered across components
  - Goal: Centralized utility functions in `src/utils/`

- [ ] **Remove unused imports and dead code**
  - Tool: Use TypeScript compiler or ESLint to identify unused code
  - Impact: Smaller bundle size and cleaner codebase

## Implementation Strategy

### Phase 1: Critical Fixes (Week 1)
Focus on high-priority items that impact performance and user experience.

### Phase 2: Standardization (Week 2)
Work through medium-priority items to improve consistency and maintainability.

### Phase 3: Polish (Week 3)
Complete low-priority cleanup items for a polished codebase.

## Key Metrics to Track

- **Bundle Size**: Monitor for improvements after cleanup
- **Query Efficiency**: Measure reduction in API calls
- **Development Experience**: Faster development with consistent patterns
- **Performance**: Page load times and query response times

## Notes

- The authentication architecture is exemplary and should be used as a template
- Server function patterns are generally good, just need consolidation
- File structure is logical, just needs some cleanup
- Query patterns work but need standardization for maintainability

---

*Generated from codebase analysis - update as items are completed*