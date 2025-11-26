# Authentication Feature

Comprehensive authentication management for StreamSense using Zustand and Supabase.

## Overview

The auth feature provides a complete authentication system with:

- ✅ Email/password authentication
- ✅ User registration
- ✅ Password reset
- ✅ Session management
- ✅ Automatic session refresh
- ✅ Protected routes/screens
- ✅ Type-safe state management
- ✅ Dev tools integration

## Architecture

```
┌─────────────────────────────────────┐
│     React Components/Screens        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│     Auth Hooks (useAuth, etc.)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    Zustand Auth Store (authStore)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Supabase Auth Client           │
└─────────────────────────────────────┘
```

## Files

### Store

- [store/authStore.ts](store/authStore.ts) - Zustand store with auth state and actions

### Hooks

- [hooks/useAuth.ts](hooks/useAuth.ts) - Main auth hook
- [hooks/useAuthGuard.ts](hooks/useAuthGuard.ts) - Route protection
- [hooks/useAuthInit.ts](hooks/useAuthInit.ts) - Initialization hook

### Types

- [types/index.ts](types/index.ts) - TypeScript definitions

## Quick Start

### Initialize Authentication

Add to your root component (already done in [src/providers/index.tsx](../../providers/index.tsx)):

```typescript
import { useAuthInit } from '@/features/auth';

function App() {
  useAuthInit(); // Initialize auth on app start

  return <YourApp />;
}
```

### Use Authentication

```typescript
import { useAuth } from '@/features/auth';

function LoginScreen() {
  const { login, register, logout, user, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({
        email: 'user@example.com',
        password: 'password',
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) return <Loading />;

  return <LoginForm onSubmit={handleLogin} />;
}
```

## State

The auth store manages the following state:

| Property          | Type                | Description                       |
| ----------------- | ------------------- | --------------------------------- |
| `user`            | `User \| null`      | Current authenticated user        |
| `session`         | `Session \| null`   | Current session data              |
| `isLoading`       | `boolean`           | Loading state for auth operations |
| `isAuthenticated` | `boolean`           | Whether user is authenticated     |
| `isInitialized`   | `boolean`           | Whether auth has been initialized |
| `error`           | `AuthError \| null` | Last authentication error         |

## Actions

### initialize()

Initialize authentication and set up session listener.

```typescript
const { initialize } = useAuth();

await initialize();
```

This is automatically called by `useAuthInit()`.

### login(credentials)

Sign in with email and password.

```typescript
const { login } = useAuth();

await login({
  email: 'user@example.com',
  password: 'password',
});
```

### register(credentials)

Register a new user.

```typescript
const { register } = useAuth();

await register({
  email: 'user@example.com',
  password: 'password',
  metadata: {
    full_name: 'John Doe',
  },
});
```

### logout()

Sign out the current user.

```typescript
const { logout } = useAuth();

await logout();
```

### resetPassword(request)

Send password reset email.

```typescript
const { resetPassword } = useAuth();

await resetPassword({
  email: 'user@example.com',
});
```

### updatePassword(request)

Update user password.

```typescript
const { updatePassword } = useAuth();

await updatePassword({
  newPassword: 'new-secure-password',
});
```

### refreshSession()

Manually refresh the current session.

```typescript
const { refreshSession } = useAuth();

await refreshSession();
```

### setSession(session)

Manually set session (for testing or external auth).

```typescript
const { setSession } = useAuth();

setSession(newSession);
```

### clearError()

Clear the error state.

```typescript
const { clearError } = useAuth();

clearError();
```

## Hooks

### useAuth()

Main hook providing full auth state and actions.

```typescript
const {
  // State
  user,
  session,
  isLoading,
  isAuthenticated,
  isInitialized,
  error,

  // Actions
  login,
  register,
  logout,
  resetPassword,
  updatePassword,
  refreshSession,
  setSession,
  clearError,
} = useAuth();
```

### useUser()

Get only the user object.

```typescript
const user = useUser();
```

### useAuthStatus()

Get only authentication status.

```typescript
const { isLoading, isAuthenticated, isInitialized, error } = useAuthStatus();
```

### useSession()

Get only the session object.

```typescript
const session = useSession();
```

### useAuthGuard(options)

Protect routes/screens that require authentication.

```typescript
const { canAccess, isEmailVerified } = useAuthGuard({
  onUnauthenticated: () => {
    navigation.navigate('Login');
  },
  requireEmailVerified: true,
});

if (!canAccess) {
  return <Loading />;
}

return <ProtectedContent />;
```

### useRequireAuth()

Throw an error if user is not authenticated.

```typescript
function ProtectedScreen() {
  useRequireAuth(); // Throws if not authenticated

  return <ProtectedContent />;
}
```

### useAuthInit()

Initialize authentication (use once in root component).

```typescript
function App() {
  const { isInitialized } = useAuthInit();

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return <MainApp />;
}
```

## Usage Examples

### Complete Login Flow

```typescript
import { useAuth } from '@/features/auth';
import { useState } from 'react';

function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      clearError();
      await login({ email, password });
      // Navigation handled by auth state change
    } catch (err) {
      // Error is set in store
      console.error('Login failed');
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text>{error.message}</Text>}
      <Button onPress={handleLogin} loading={isLoading}>
        Login
      </Button>
    </View>
  );
}
```

### Registration

```typescript
function RegisterScreen() {
  const { register, isLoading, error } = useAuth();

  const handleRegister = async (data: RegisterForm) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        metadata: {
          full_name: data.fullName,
        },
      });
    } catch (err) {
      console.error('Registration failed');
    }
  };

  return <RegisterForm onSubmit={handleRegister} />;
}
```

### Protected Screen

```typescript
import { useAuthGuard } from '@/features/auth';

function ProfileScreen({ navigation }) {
  const { canAccess, user } = useAuthGuard({
    onUnauthenticated: () => {
      navigation.navigate('Login');
    },
  });

  if (!canAccess) {
    return <Loading />;
  }

  return (
    <View>
      <Text>Welcome {user?.email}</Text>
    </View>
  );
}
```

### Password Reset

```typescript
function ForgotPasswordScreen() {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    try {
      await resetPassword({ email });
      setSent(true);
    } catch (err) {
      console.error('Password reset failed');
    }
  };

  if (sent) {
    return <Text>Check your email for reset link</Text>;
  }

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <Button onPress={handleReset} loading={isLoading}>
        Send Reset Link
      </Button>
    </View>
  );
}
```

### Conditional Rendering

```typescript
function App() {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return <SplashScreen />;
  }

  return isAuthenticated ? <MainApp /> : <AuthStack />;
}
```

### Listen to Auth Changes

The store automatically listens to Supabase auth changes. You can react to auth state changes using the hooks:

```typescript
function AuthListener() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User logged in:', user?.email);
      // Initialize user data, analytics, etc.
    } else {
      console.log('User logged out');
      // Clear user data, analytics, etc.
    }
  }, [isAuthenticated, user]);

  return null;
}
```

## Error Handling

All auth actions throw errors that can be caught:

```typescript
const { login, error } = useAuth();

try {
  await login({ email, password });
} catch (err) {
  // Error is also available in the `error` state
  if (err.message.includes('Invalid login credentials')) {
    // Handle invalid credentials
  }
}

// Or use the error from state
if (error) {
  console.error('Auth error:', error.message);
}
```

## Session Management

Sessions are automatically managed:

- ✅ Stored in Expo SecureStore
- ✅ Auto-refreshed before expiry
- ✅ Persisted across app restarts
- ✅ Synced across auth state changes

## Dev Tools

The store integrates with Redux DevTools for debugging:

1. Install [Redux DevTools](https://github.com/reduxjs/redux-devtools)
2. Open DevTools
3. Monitor auth actions and state changes

## Testing

### Mock Auth State

```typescript
import { useAuthStore } from '@/features/auth';

// In tests
useAuthStore.setState({
  user: mockUser,
  session: mockSession,
  isAuthenticated: true,
  isInitialized: true,
});
```

### Reset Store

```typescript
// Reset to initial state
useAuthStore.setState({
  user: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,
  error: null,
});
```

## Migration from Old Auth Store

The old auth store (`src/stores/authStore.ts`) has been deprecated. Update your imports:

```typescript
// Old
import { useAuthStore } from '@/stores';

// New
import { useAuthStore, useAuth } from '@/features/auth';
```

Both will work, but prefer importing from `@/features/auth`.

## Type Definitions

All types are exported from `@/features/auth/types`:

```typescript
import type {
  AuthState,
  LoginCredentials,
  RegisterCredentials,
  PasswordResetRequest,
  UpdatePasswordRequest,
  User,
  Session,
  AuthError,
} from '@/features/auth';
```

## Best Practices

1. **Use `useAuth()` in components** - Don't access the store directly
2. **Handle errors** - Always wrap auth actions in try/catch
3. **Clear errors** - Call `clearError()` before new auth actions
4. **Use guards** - Protect routes with `useAuthGuard()`
5. **Initialize once** - Call `useAuthInit()` only in root component
6. **Check `isInitialized`** - Wait for initialization before rendering

## Related Files

- [src/config/supabase.ts](../../config/supabase.ts) - Supabase client configuration
- [src/services/auth.ts](../../services/auth.ts) - Auth service helpers
- [src/providers/index.tsx](../../providers/index.tsx) - App providers with auth init
