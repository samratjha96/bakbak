# TanStack Start Server Functions: Comprehensive Guide

## Overview

Server functions in TanStack Start provide RPC-style endpoints that run exclusively on the server but can be called seamlessly from client-side code. This guide covers the complete spectrum from basic patterns to advanced TanStack Query integration.

## Architecture

### Core Concept
- **Server functions** are created with `createServerFn()` and execute only on the server
- **Client calls** are automatically serialized/deserialized across the network boundary
- **Type safety** is maintained from server to client with full TypeScript support
- **Error propagation** works seamlessly across the network boundary

### Basic Server Function Structure

```tsx
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// Define validation schema
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120),
})

// Create server function with validation
export const createUser = createServerFn({ method: 'POST' })
  .inputValidator(UserSchema)
  .handler(async ({ data }) => {
    // Server-only logic - database access, API calls, etc.
    const user = await db.users.create(data)
    return { success: true, userId: user.id }
  })
```

## Client-Side Calling Patterns

### 1. Direct Function Calls

The simplest pattern - call server functions directly like any async function:

```tsx
import { createUser } from '~/server/users'

function CreateUserForm() {
  const handleSubmit = async (formData) => {
    try {
      const result = await createUser({
        data: {
          name: formData.name,
          email: formData.email,
          age: parseInt(formData.age)
        }
      })
      console.log('User created:', result.userId)
      // Handle success
    } catch (error) {
      console.error('Validation failed:', error.message)
      // Handle error
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### 2. Hook-Based Pattern with `useServerFn()`

Use the `useServerFn()` hook for better integration with React patterns:

```tsx
import { useServerFn } from '@tanstack/react-start'
import { createUser } from '~/server/users'

function UserForm() {
  const createUserFn = useServerFn(createUser)

  const handleSubmit = async (formData) => {
    try {
      const result = await createUserFn({ data: formData })
      // Handle success
    } catch (error) {
      // Handle error
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form implementation */}
    </form>
  )
}
```

### 3. Router Integration Pattern

Call server functions from route loaders and handlers:

```tsx
// Route with server function loader
export const Route = createFileRoute('/users')({
  loader: async () => {
    return await getUsers() // Server function call
  },
  component: UsersPage,
})

function UsersPage() {
  const users = Route.useLoaderData()
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

## TanStack Query Integration Patterns

The most powerful pattern combines server functions with TanStack Query for sophisticated client-side state management.

### Query Pattern (Data Fetching)

```tsx
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { getUsers } from '~/server/users'

function UserList() {
  const getUsersFn = useServerFn(getUsers)

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersFn(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  })

  if (isLoading) return <div>Loading users...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name} - {user.email}</div>
      ))}
    </div>
  )
}
```

### Mutation Pattern with Cache Management

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { createUser, updateUser, deleteUser } from '~/server/users'

function useUserMutations() {
  const queryClient = useQueryClient()
  const createUserFn = useServerFn(createUser)
  const updateUserFn = useServerFn(updateUser)
  const deleteUserFn = useServerFn(deleteUser)

  const createMutation = useMutation({
    mutationFn: createUserFn,
    onSuccess: (result) => {
      // Invalidate users list to refetch
      queryClient.invalidateQueries({ queryKey: ['users'] })

      // Optimistically add to cache
      queryClient.setQueryData(['user', result.userId], result.user)
    },
    onError: (error) => {
      console.error('Failed to create user:', error)
    }
  })

  const updateMutation = useMutation({
    mutationFn: updateUserFn,
    onSuccess: (result, variables) => {
      // Update specific user in cache
      queryClient.setQueryData(['user', variables.data.id], result.user)

      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserFn,
    onSuccess: (result, variables) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: ['user', variables.data.id] })

      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  return {
    createUser: createMutation.mutate,
    updateUser: updateMutation.mutate,
    deleteUser: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

### Optimistic Updates Pattern

```tsx
function useOptimisticUserUpdate() {
  const queryClient = useQueryClient()
  const updateUserFn = useServerFn(updateUser)

  return useMutation({
    mutationFn: updateUserFn,

    // Optimistic update before server call
    onMutate: async (variables) => {
      const { id, data } = variables.data

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user', id] })

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['user', id])

      // Optimistically update cache
      queryClient.setQueryData(['user', id], (old) => ({
        ...old,
        ...data,
        updating: true
      }))

      return { previousUser, id }
    },

    // Rollback on error
    onError: (error, variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(['user', context.id], context.previousUser)
      }
    },

    // Always refetch after completion
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['user', context.id] })
    }
  })
}
```

### Global Auto-Invalidation Pattern

```tsx
// Global query client configuration
import { QueryClient, MutationCache } from '@tanstack/react-query'

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSettled: () => {
      // Auto-invalidate all queries after any mutation completes
      if (queryClient.isMutating() === 1) {
        return queryClient.invalidateQueries()
      }
    },
  }),
})
```

## Advanced Server Function Patterns

### Middleware Integration

```tsx
import { createMiddleware } from '@tanstack/react-start'

// Auth middleware
const authMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next, context }) => {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    return next({
      context: { ...context, user }
    })
  })

// Server function with middleware
export const getProtectedData = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // context.user is typed and available
    return await db.getUserData(context.user.id)
  })
```

### Form Handling with Validation

```tsx
// Form data server function
export const submitContactForm = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData')
    }

    const name = data.get('name')?.toString()
    const email = data.get('email')?.toString()
    const message = data.get('message')?.toString()

    if (!name || !email || !message) {
      throw new Error('All fields are required')
    }

    return { name, email, message }
  })
  .handler(async ({ data }) => {
    // Process form data
    await sendEmail(data)
    return { success: true, message: 'Form submitted successfully' }
  })

// Client usage
function ContactForm() {
  const submitForm = useServerFn(submitContactForm)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.target)

    try {
      const result = await submitForm({ data: formData })
      alert(result.message)
    } catch (error) {
      alert(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Error Handling and Redirects

```tsx
// Auth-protected server function with redirect
export const requireAuth = createServerFn().handler(async () => {
  const user = await getCurrentUser()

  if (!user) {
    // Server-side redirect
    throw redirect({ to: '/login' })
  }

  return user
})

// Server function with custom error types
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const createProduct = createServerFn({ method: 'POST' })
  .inputValidator(ProductSchema)
  .handler(async ({ data }) => {
    // Check for duplicate
    const existing = await db.products.findByName(data.name)
    if (existing) {
      throw new ValidationError('name', 'Product name already exists')
    }

    return await db.products.create(data)
  })

// Client error handling
function ProductForm() {
  const createProductFn = useServerFn(createProduct)
  const [errors, setErrors] = useState({})

  const handleSubmit = async (data) => {
    try {
      await createProductFn({ data })
      setErrors({})
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field]: error.message })
      } else {
        setErrors({ general: error.message })
      }
    }
  }
}
```

## Integration with Route Data

### Prefetching with Loaders

```tsx
// Server function for data fetching
export const getPostsWithComments = createServerFn({ method: 'GET' })
  .handler(async () => {
    const posts = await db.posts.findMany({
      include: { comments: true }
    })
    return posts
  })

// Route with prefetched data
export const Route = createFileRoute('/posts')({
  loader: async () => {
    return await getPostsWithComments()
  },
  component: PostsPage,
})

function PostsPage() {
  const initialPosts = Route.useLoaderData()
  const getPostsFn = useServerFn(getPostsWithComments)

  // Use TanStack Query with initial data
  const { data: posts } = useQuery({
    queryKey: ['posts'],
    queryFn: () => getPostsFn(),
    initialData: initialPosts,
  })

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
```

## Best Practices

### 1. Input Validation
Always validate inputs on the server:

```tsx
export const updateUserProfile = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    bio: z.string().max(500).optional(),
  }))
  .handler(async ({ data }) => {
    // data is fully typed and validated
    return await db.users.update(data.id, data)
  })
```

### 2. Consistent Error Handling

```tsx
// Custom error types
export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized access')
    this.name = 'UnauthorizedError'
  }
}

// Server function with proper error handling
export const getUserById = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) throw new UnauthorizedError()

    const targetUser = await db.users.findById(data.id)
    if (!targetUser) throw new NotFoundError('User')

    return targetUser
  })
```

### 3. Cache Management Strategy

```tsx
// Structured cache invalidation
function useInvalidateUserQueries() {
  const queryClient = useQueryClient()

  return {
    invalidateUser: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
    invalidateUsersList: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    invalidateAllUserData: (userId: string) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [resource, id] = query.queryKey
          return resource === 'user' ||
                 (Array.isArray(query.queryKey) && query.queryKey.includes(userId))
        }
      })
    }
  }
}
```

### 4. Type-Safe Server Function Definitions

```tsx
// Define return types explicitly
export interface User {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface CreateUserResponse {
  success: boolean
  user: User
  message: string
}

export const createUser = createServerFn({ method: 'POST' })
  .inputValidator(UserSchema)
  .handler(async ({ data }): Promise<CreateUserResponse> => {
    const user = await db.users.create(data)
    return {
      success: true,
      user,
      message: 'User created successfully'
    }
  })
```

### 5. Environment-Specific Patterns

```tsx
// Server-only utilities
import { createServerOnlyFn } from '@tanstack/react-start'

export const getEnvironmentConfig = createServerOnlyFn(() => ({
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY,
  isDevelopment: process.env.NODE_ENV === 'development'
}))

// Use in server functions
export const getAppConfig = createServerFn().handler(async () => {
  const config = getEnvironmentConfig()

  // Return only safe config to client
  return {
    isDevelopment: config.isDevelopment,
    version: process.env.APP_VERSION
  }
})
```

## Common Patterns and Use Cases

### Real-time Data Updates

```tsx
// Server function with polling
export const getUserNotifications = createServerFn().handler(async () => {
  const user = await getCurrentUser()
  if (!user) return []

  return await db.notifications.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: 'desc' }
  })
})

// Client with polling
function NotificationsList() {
  const getNotificationsFn = useServerFn(getUserNotifications)

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotificationsFn(),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: true,
  })

  return (
    <div>
      {notifications?.map(notification => (
        <NotificationCard key={notification.id} notification={notification} />
      ))}
    </div>
  )
}
```

### File Upload with Progress

```tsx
// Server function for file upload
export const uploadFile = createServerFn({ method: 'POST' })
  .inputValidator((data) => {
    if (!(data instanceof FormData)) throw new Error('Expected FormData')
    const file = data.get('file')
    if (!(file instanceof File)) throw new Error('File required')
    return { file }
  })
  .handler(async ({ data }) => {
    const { file } = data

    // Upload to storage service
    const url = await uploadToS3(file)

    // Save file record
    const fileRecord = await db.files.create({
      name: file.name,
      size: file.size,
      type: file.type,
      url
    })

    return { success: true, file: fileRecord }
  })

// Client with file upload
function FileUpload() {
  const uploadFileFn = useServerFn(uploadFile)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadFileFn({ data: formData })
      console.log('Upload successful:', result.file)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
        }}
        disabled={uploading}
      />
      {uploading && <div>Uploading...</div>}
    </div>
  )
}
```

## Performance Considerations

### 1. Query Deduplication
TanStack Query automatically deduplicates identical queries:

```tsx
function UserProfile({ userId }: { userId: string }) {
  // These will be deduplicated if called simultaneously
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserFn({ data: { id: userId } }),
  })

  return <div>{user?.name}</div>
}
```

### 2. Selective Cache Invalidation
Be specific about what to invalidate:

```tsx
// Instead of invalidating all user data
queryClient.invalidateQueries({ queryKey: ['users'] })

// Be more specific
queryClient.invalidateQueries({
  queryKey: ['users'],
  exact: false, // Invalidate all queries starting with ['users']
  refetchType: 'active' // Only refetch active queries
})
```

### 3. Background Refetching
Configure appropriate refetch behaviors:

```tsx
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: getUsersFn,
  staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
  refetchOnWindowFocus: false, // Disable refetch on window focus
  refetchOnReconnect: true,    // Refetch when connection restored
})
```

This comprehensive guide covers the full spectrum of TanStack Start server functions integration patterns, from basic usage to sophisticated client-side state management with TanStack Query.