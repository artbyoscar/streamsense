# StreamSense - Setup Documentation

## Dependencies Installed

### Core Libraries

- **@supabase/supabase-js** (^2.x) - Backend as a Service client
- **zustand** (^5.x) - Lightweight state management
- **@tanstack/react-query** (^5.x) - Data fetching and caching
- **expo-secure-store** - Secure token storage

### Navigation

- **@react-navigation/native** (^6.x) - Navigation framework
- **@react-navigation/bottom-tabs** - Bottom tab navigator
- **react-native-screens** - Native screen optimization
- **react-native-safe-area-context** - Safe area handling

### UI Components

- **react-native-paper** (^5.x) - Material Design 3 components

### Forms & Validation

- **react-hook-form** (^7.x) - Form state management
- **zod** (^3.x) - Schema validation

### Development Tools

- **babel-plugin-module-resolver** - Path alias resolution

## Project Structure

```
src/
├── config/
│   ├── supabase.ts          # Supabase client configuration
│   └── index.ts
├── stores/
│   ├── authStore.ts         # Zustand auth state management
│   └── index.ts
├── providers/
│   ├── QueryProvider.tsx    # React Query configuration
│   ├── ThemeProvider.tsx    # React Native Paper + Navigation theming
│   └── index.tsx            # Combined app providers
├── types/
│   ├── auth.ts              # Authentication type definitions
│   └── index.ts
├── components/              # Reusable UI components
├── features/                # Feature-specific modules
├── hooks/                   # Custom React hooks
├── services/                # API and external services
├── utils/                   # Utility functions
└── navigation/              # Navigation configuration
```

## Configuration Files

### Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

See [.env.example](.env.example) for reference.

### Path Aliases

The following path aliases are configured in both [tsconfig.json](tsconfig.json) and [babel.config.js](babel.config.js):

- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@features/*` → `src/features/*`
- `@hooks/*` → `src/hooks/*`
- `@services/*` → `src/services/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@config/*` → `src/config/*`
- `@navigation/*` → `src/navigation/*`
- `@stores/*` → `src/stores/*`
- `@providers/*` → `src/providers/*`

**Example usage:**

```typescript
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores';
import Button from '@/components/Button';
```

## Key Features

### 1. Supabase Integration ([src/config/supabase.ts](src/config/supabase.ts))

- Configured with Expo SecureStore for secure auth token persistence
- Auto-refresh tokens enabled
- Session persistence enabled

### 2. Authentication Store ([src/stores/authStore.ts](src/stores/authStore.ts))

Zustand store with the following methods:

- `initialize()` - Initialize auth state and listen for changes
- `signIn(email, password)` - Sign in user
- `signUp(email, password)` - Register new user
- `signOut()` - Sign out current user

**Usage:**

```typescript
import { useAuthStore } from '@/stores';

function MyComponent() {
  const { user, isAuthenticated, signIn } = useAuthStore();

  // Access user state
  console.log(user);
}
```

### 3. React Query Provider ([src/providers/QueryProvider.tsx](src/providers/QueryProvider.tsx))

Configured with:

- 2 retries for failed queries
- 5-minute stale time
- 10-minute garbage collection time
- Disabled refetch on window focus
- Enabled refetch on reconnect

### 4. Theme Provider ([src/providers/ThemeProvider.tsx](src/providers/ThemeProvider.tsx))

- Material Design 3 theme (React Native Paper)
- Integrated with React Navigation
- Custom color scheme with purple primary

### 5. App Providers ([src/providers/index.tsx](src/providers/index.tsx))

All providers are combined in the `AppProviders` component which:

- Wraps the app with React Query
- Initializes authentication on mount
- Provides theming and navigation

## Usage Examples

### Using React Query for Data Fetching

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

function SubscriptionsScreen() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return <SubscriptionList subscriptions={data} />;
}
```

### Using React Hook Form with Zod

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextInput, Button } from 'react-native-paper';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { control, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextInput
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            error={!!fieldState.error}
          />
        )}
      />
      <Button onPress={handleSubmit(onSubmit)}>Submit</Button>
    </>
  );
}
```

### Using React Native Paper Components

```typescript
import { Button, Card, Text } from 'react-native-paper';

function SubscriptionCard() {
  return (
    <Card>
      <Card.Content>
        <Text variant="titleLarge">Netflix</Text>
        <Text variant="bodyMedium">$15.99/month</Text>
      </Card.Content>
      <Card.Actions>
        <Button>Cancel</Button>
        <Button mode="contained">Edit</Button>
      </Card.Actions>
    </Card>
  );
}
```

## Next Steps

1. **Set up Supabase**:
   - Create a Supabase project at https://supabase.com
   - Copy your project URL and anon key to `.env` file
   - Create necessary database tables for subscriptions

2. **Create database schema**:

   ```sql
   create table subscriptions (
     id uuid default uuid_generate_v4() primary key,
     user_id uuid references auth.users not null,
     name text not null,
     amount decimal(10,2) not null,
     billing_cycle text not null,
     next_billing_date date not null,
     created_at timestamp with time zone default timezone('utc'::text, now()) not null
   );
   ```

3. **Implement features**:
   - Create subscription list screen
   - Add subscription form
   - Set up bottom tab navigation
   - Add notifications for upcoming bills

## Development Commands

```bash
# Start development server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

## Troubleshooting

### Metro bundler cache issues

```bash
npx expo start --clear
```

### TypeScript path resolution issues

- Make sure both `tsconfig.json` and `babel.config.js` have matching path aliases
- Restart TypeScript server in your IDE

### Auth session not persisting

- Ensure Expo SecureStore is properly installed
- Check that Supabase URL and key are correctly set in `.env`

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Native Paper Documentation](https://callstack.github.io/react-native-paper/)
- [React Navigation Documentation](https://reactnavigation.org/)
- [React Hook Form Documentation](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
