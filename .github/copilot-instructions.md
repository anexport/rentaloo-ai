# GitHub Copilot Instructions for RentAloo

## Project Overview

RentAloo is a modern peer-to-peer rental marketplace platform built with React, TypeScript, and Supabase. The platform enables users to rent and lend equipment across various categories including skiing, photography, camping, construction, and more.

### Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS 4, Shadcn UI Components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payment Processing**: Stripe
- **State Management**: React Query (@tanstack/react-query), Context API
- **Testing**: Vitest, React Testing Library
- **Build Tool**: Vite 7

## Project Structure

```
rentaloo-ai/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── booking/      # Booking-related components
│   │   ├── equipment/    # Equipment listing components
│   │   ├── explore/      # Search and filter components
│   │   ├── layout/       # Layout components (header, sidebar)
│   │   ├── messaging/    # Chat interface components
│   │   ├── payment/      # Payment and escrow components
│   │   ├── reviews/      # Review system components
│   │   ├── renter/       # Renter-specific components
│   │   ├── verification/ # Identity verification components
│   │   └── ui/           # Shadcn UI primitives
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and API clients
│   ├── types/            # TypeScript type definitions
│   ├── contexts/         # React context providers
│   ├── features/         # Feature-specific modules
│   ├── config/           # Configuration files
│   └── assets/           # Static assets
├── supabase/
│   ├── migrations/       # Database migration files
│   └── guides/           # Documentation for Supabase features
└── public/               # Static public assets
```

## Coding Standards and Best Practices

### TypeScript

- **Always use TypeScript**: All new files should use `.ts` or `.tsx` extensions
- **Strict typing**: Avoid `any` types; use proper type definitions
- **Type imports**: Use type imports where appropriate (`import type { ... }`)
- **Interface vs Type**: Prefer `interface` for object shapes, `type` for unions and intersections
- **Path aliases**: Use `@/` alias for imports from `src/` directory (e.g., `@/components/ui/button`)

### React Components

- **Functional components**: Always use functional components with hooks
- **Component structure**: Follow this order in components:
  1. Imports (React, third-party, local types, components, hooks, utilities)
  2. Types/interfaces
  3. Component definition
  4. Hooks (useAuth, useState, useEffect, etc.)
  5. Helper functions
  6. Event handlers
  7. JSX return
- **Early returns**: Use early returns for loading states and error conditions
- **Named exports**: Use default exports for page components, named exports for utility components
- **Props destructuring**: Destructure props in function parameters when possible

### Styling

- **TailwindCSS**: Use Tailwind utility classes for all styling
- **Shadcn UI**: Leverage Shadcn UI components from `@/components/ui/` for consistent design
- **Custom styles**: Avoid inline styles and CSS modules; use Tailwind classes
- **Responsive design**: Always consider mobile-first design with Tailwind breakpoints (md:, lg:, etc.)
- **Class composition**: Use `clsx` or `cn` utility for conditional classes

### State Management

- **React Query**: Use React Query for server state management (data fetching, caching, mutations)
- **Context API**: Use Context for global UI state (auth, theme, etc.)
- **Local state**: Use `useState` for component-local state
- **Form state**: Use `react-hook-form` with `zod` for form validation

### Error Handling

- **Async operations**: Always handle errors in async operations with try-catch or Promise.catch()
- **User feedback**: Show toast notifications for user actions (success/error)
- **Console logging**: Use `console.error()` for errors, avoid `console.log()` in production code
- **Error boundaries**: Use React error boundaries for component-level error handling

### Data Fetching

- **Supabase client**: Use the `supabase` client from `@/lib/supabase`
- **Authentication**: Always check authentication state before protected operations
- **RLS policies**: Be aware that Supabase Row Level Security policies control data access
- **Parallel fetching**: Use `Promise.allSettled()` for independent parallel queries
- **Real-time**: Use Supabase real-time subscriptions for live data updates

### Naming Conventions

- **Files**: Use PascalCase for component files (e.g., `QuickActions.tsx`)
- **Components**: Use PascalCase for component names (e.g., `QuickActions`)
- **Hooks**: Prefix custom hooks with `use` (e.g., `useAuth`, `useToast`)
- **Types**: Use PascalCase for type names (e.g., `BookingRequest`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `API_BASE_URL`)
- **Variables**: Use camelCase for variables and functions (e.g., `fetchUserData`)

### Testing

- **Test files**: Place tests next to components with `.test.tsx` or `.test.ts` suffix
- **Test naming**: Describe what the test does (e.g., `it('should render booking details')`)
- **Testing Library**: Use React Testing Library queries (`getByRole`, `getByText`, etc.)
- **User interactions**: Use `@testing-library/user-event` for simulating user actions
- **Mock data**: Create mock data that resembles real data structures

## Build and Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server (http://localhost:5173)

# Building
npm run build            # Build for production

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
```

### Development Workflow

1. **Start the dev server**: Run `npm run dev` to start the Vite development server
2. **Make changes**: Edit files; hot reload will update the browser automatically
3. **Type checking**: Run `npm run type-check` frequently to catch type errors
4. **Testing**: Write tests for new features and run `npm run test`
5. **Linting**: Run `npm run lint` before committing

### Environment Variables

Required environment variables (in `.env` file):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key

## Common Patterns and Practices

### Authentication

- Use `useAuth` hook to access authentication state
- Check `user` object before making authenticated requests
- Redirect to login page for unauthenticated users accessing protected routes

### Forms

- Use `react-hook-form` for form state management
- Use `zod` for schema validation
- Use Shadcn form components for consistent form UI
- Show validation errors inline with form fields

### API Calls

- Use React Query hooks (`useQuery`, `useMutation`) for data fetching
- Handle loading and error states appropriately
- Show user feedback (toasts) for successful mutations
- Use optimistic updates when appropriate

### Routing

- Use React Router v7 for navigation
- Use `Link` component for internal navigation
- Use `useNavigate` hook for programmatic navigation
- Lazy load routes when possible for better performance

### Accessibility

- Use semantic HTML elements
- Include ARIA labels and roles where needed
- Ensure keyboard navigation works for interactive elements
- Maintain color contrast ratios for readability
- Test with screen readers when possible

### Performance

- Use React Query for efficient data caching
- Implement lazy loading for routes and heavy components
- Optimize images (use appropriate formats and sizes)
- Minimize bundle size by avoiding unnecessary dependencies
- Use React.memo() for expensive component renders

## Supabase Integration

### Database Queries

- Use Supabase client methods (`.from()`, `.select()`, `.insert()`, etc.)
- Apply filters and sorts on the database side when possible
- Use `.single()` for queries expected to return one row
- Use `.maybeSingle()` when a row might not exist
- Handle database errors appropriately

### Real-time Subscriptions

- Use `.channel()` and `.on()` for real-time updates
- Always clean up subscriptions in useEffect cleanup
- Handle subscription errors gracefully

### Storage

- Use Supabase Storage for file uploads (images, documents)
- Generate public URLs for stored files when needed
- Implement proper file validation before upload

## Security Considerations

- **Never commit secrets**: Keep API keys and secrets in `.env` files
- **Input validation**: Always validate and sanitize user input
- **RLS policies**: Rely on Supabase RLS policies for data security
- **Authentication checks**: Verify user authentication before sensitive operations
- **XSS prevention**: Use React's built-in XSS protection (avoid dangerouslySetInnerHTML)

## Git and Version Control

- **Branch naming**: Use descriptive branch names (e.g., `feature/booking-calendar`, `fix/login-error`)
- **Commit messages**: Write clear, descriptive commit messages
- **Small commits**: Make small, focused commits
- **Pull requests**: Include description of changes and testing performed

## Documentation

- **Code comments**: Add comments for complex logic, not obvious code
- **JSDoc**: Use JSDoc comments for exported functions and hooks
- **README updates**: Update README when adding new features or changing setup
- **Type documentation**: Document complex types with comments

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vite.dev/)

## Notes for Copilot

When working on tasks:
1. Follow the established patterns in existing code
2. Use the correct import paths with `@/` alias
3. Maintain consistency with the existing component structure
4. Write tests for new features when test infrastructure exists
5. Run linting and type checking before finalizing changes
6. Use early returns for guard clauses and error conditions
7. Prefer descriptive variable names over short abbreviations
8. Keep components focused and single-purpose
9. Extract reusable logic into custom hooks
10. Use Shadcn UI components for consistent design system
