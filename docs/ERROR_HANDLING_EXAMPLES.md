# Error Handling - Implementation Examples

Quick reference examples for implementing error handling in StreamSense.

## Screen with Error Handling Template

```typescript
import React from 'react';
import { View, ScrollView } from 'react-native';
import {
  ErrorView,
  SkeletonDashboard,
  useToast,
} from '@/components';
import { logError, getUserFriendlyMessage } from '@/utils';
import { useNetworkStatus } from '@/hooks';

export const ExampleScreen: React.FC = () => {
  const toast = useToast();
  const { isOffline } = useNetworkStatus();

  // Data fetching with error handling
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['example'],
    queryFn: fetchExample,
    enabled: !isOffline,
  });

  // Loading state
  if (isLoading) {
    return <SkeletonDashboard />;
  }

  // Error state
  if (error) {
    return (
      <ErrorView
        error={error}
        onRetry={refetch}
        fullScreen
      />
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title="No Data"
        message="Start by adding your first item"
      />
    );
  }

  // Success state with data
  return (
    <ScrollView>
      {/* Your content here */}
    </ScrollView>
  );
};
```

## Mutation with Error Handling

```typescript
const ExampleForm = () => {
  const toast = useToast();
  const { isOffline } = useNetworkStatus();

  const handleSubmit = async (formData) => {
    // Check network first
    if (isOffline) {
      toast.showWarning('You are offline. Please check your connection.');
      return;
    }

    try {
      // Perform mutation
      const result = await handleApiCall(
        () => supabase.from('table').insert(formData),
        {
          component: 'ExampleForm',
          action: 'handleSubmit',
          formData,
        }
      );

      // Success
      toast.showSuccess('Item created successfully!');
      navigation.goBack();
    } catch (error) {
      // Error
      const message = getUserFriendlyMessage(error);
      toast.showError(message);

      // Log for debugging
      logError(error, {
        component: 'ExampleForm',
        action: 'handleSubmit',
      });
    }
  };

  return (
    <View>
      {/* Form fields */}
      <Button onPress={handleSubmit}>Submit</Button>
    </View>
  );
};
```

## Delete with Undo Toast

```typescript
const handleDelete = async (id: string) => {
  try {
    // Delete item
    await supabase.from('table').delete().eq('id', id);

    // Show success with undo option
    toast.showToast({
      message: 'Item deleted',
      type: 'success',
      duration: 5000,
      action: {
        label: 'Undo',
        onPress: async () => {
          try {
            await restoreItem(id);
            toast.showSuccess('Item restored');
          } catch (error) {
            toast.showError('Failed to restore item');
          }
        },
      },
    });
  } catch (error) {
    toast.showError('Failed to delete item');
    logError(error, { component: 'List', action: 'handleDelete', id });
  }
};
```

## List Screen with Skeletons

```typescript
const ListScreen = () => {
  const { data, isLoading, error, refetch } = useList();

  if (isLoading) {
    return (
      <View style={{ padding: 16 }}>
        <SkeletonList count={10} showAvatar showSubtitle />
      </View>
    );
  }

  if (error) {
    return <ErrorView error={error} onRetry={refetch} fullScreen />;
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <ListItem item={item} />}
      ListEmptyComponent={
        <EmptyState
          icon="inbox"
          title="No Items"
          message="Add your first item to get started"
        />
      }
    />
  );
};
```

## Card-Based Screen with Skeletons

```typescript
const CardScreen = () => {
  const { data, isLoading, error } = useCards();

  if (isLoading) {
    return (
      <ScrollView style={{ padding: 16 }}>
        <SkeletonCard showImage imageHeight={200} lines={3} />
        <SkeletonCard showImage imageHeight={200} lines={3} />
        <SkeletonCard showImage imageHeight={200} lines={3} />
      </ScrollView>
    );
  }

  if (error) {
    return <ErrorView error={error} fullScreen />;
  }

  return (
    <ScrollView>
      {data.map(item => (
        <Card key={item.id} item={item} />
      ))}
    </ScrollView>
  );
};
```

## Error Boundary with Reset on User Change

```typescript
// Wrap component that depends on userId
<ErrorBoundary resetOnPropsChange={[userId]}>
  <UserProfile userId={userId} />
</ErrorBoundary>
```

## Custom Error Messages

```typescript
const handleAction = async () => {
  try {
    await performAction();
    toast.showSuccess('Action completed!');
  } catch (error) {
    // Custom error messages based on error type
    const category = categorizeError(error);

    if (category === 'network') {
      toast.showError('Connection lost. Please check your internet.');
    } else if (category === 'permission') {
      toast.showError('You do not have permission to perform this action.');
    } else if (category === 'not_found') {
      toast.showError('The item you are looking for no longer exists.');
    } else {
      toast.showError(getUserFriendlyMessage(error));
    }

    logError(error, { component: 'Component', action: 'handleAction' });
  }
};
```

## Optimistic Updates with Rollback

```typescript
const handleToggle = async (id: string, currentValue: boolean) => {
  // Optimistic update
  queryClient.setQueryData(['items'], (old) =>
    old.map(item =>
      item.id === id ? { ...item, active: !currentValue } : item
    )
  );

  try {
    await supabase
      .from('items')
      .update({ active: !currentValue })
      .eq('id', id);

    toast.showSuccess('Updated successfully');
  } catch (error) {
    // Rollback on error
    queryClient.setQueryData(['items'], (old) =>
      old.map(item =>
        item.id === id ? { ...item, active: currentValue } : item
      )
    );

    toast.showError('Failed to update');
    logError(error, { component: 'Item', action: 'handleToggle', id });
  }
};
```

## Network-Aware Data Fetching

```typescript
const Component = () => {
  const { isOffline } = useNetworkStatus();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    enabled: !isOffline,
    onError: (error) => {
      logError(error, { component: 'Component', action: 'fetchData' });
    },
  });

  useEffect(() => {
    if (isOffline) {
      toast.showWarning('You are offline. Data may be outdated.');
    }
  }, [isOffline]);

  if (isLoading) return <SkeletonList />;
  if (isOffline && !data) {
    return (
      <ErrorView
        title="No Connection"
        message="Please connect to the internet to load data."
        icon="wifi-off"
      />
    );
  }

  return <View>{/* Content */}</View>;
};
```

## Form Validation with Errors

```typescript
const FormComponent = () => {
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (data) => {
    // Clear previous errors
    setErrors({});

    // Validate
    const validationErrors = validate(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.showError('Please fix the errors in the form');
      return;
    }

    try {
      await saveData(data);
      toast.showSuccess('Saved successfully!');
    } catch (error) {
      // Handle specific validation errors from API
      if (categorizeError(error) === 'validation') {
        const apiErrors = parseValidationErrors(error);
        setErrors(apiErrors);
        toast.showError('Please check your input');
      } else {
        toast.showError(getUserFriendlyMessage(error));
      }

      logError(error, { component: 'Form', action: 'handleSubmit' });
    }
  };

  return (
    <View>
      <Input
        label="Name"
        value={name}
        error={errors.name}
        onChangeText={(value) => {
          setName(value);
          setErrors(prev => ({ ...prev, name: undefined }));
        }}
      />
      {/* More fields */}
    </View>
  );
};
```

## Error Recovery Suggestions

```typescript
const handleError = (error: unknown) => {
  const message = getUserFriendlyMessage(error);
  const suggestions = getErrorSuggestions(error);

  Alert.alert(
    'Error',
    message,
    [
      ...suggestions.map(suggestion => ({
        text: suggestion,
        onPress: () => {
          if (suggestion.includes('internet')) {
            // Open settings
          } else if (suggestion.includes('retry')) {
            refetch();
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};
```

## Retry with Exponential Backoff

```typescript
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries = 3,
  baseDelay = 1000
) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isRetryableError(error)) {
        const delay = baseDelay * Math.pow(2, attempt);
        toast.showInfo(`Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};

// Usage
try {
  const data = await retryWithBackoff(() => fetchData());
  toast.showSuccess('Data loaded');
} catch (error) {
  toast.showError('Failed after multiple attempts');
  logError(error, { component: 'Screen', action: 'fetchWithRetry' });
}
```

## Loading Button States

```typescript
const ActionButton = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);

    try {
      await performAction();
      toast.showSuccess('Action completed!');
    } catch (error) {
      toast.showError(getUserFriendlyMessage(error));
      logError(error, { component: 'ActionButton', action: 'handleAction' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onPress={handleAction}
      loading={loading}
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Submit'}
    </Button>
  );
};
```

## Conditional Rendering Based on Error Type

```typescript
const Component = () => {
  const { error } = useData();

  if (error) {
    const category = categorizeError(error);

    if (category === 'network') {
      return (
        <ErrorView
          title="Connection Lost"
          message="Please check your internet connection and try again."
          icon="wifi-off"
          onRetry={refetch}
        />
      );
    }

    if (category === 'permission') {
      return (
        <ErrorView
          title="Access Denied"
          message="You do not have permission to view this content."
          icon="lock"
        />
      );
    }

    if (category === 'not_found') {
      return (
        <ErrorView
          title="Not Found"
          message="The content you're looking for doesn't exist."
          icon="file-question"
          onRetry={refetch}
        />
      );
    }

    return <ErrorView error={error} onRetry={refetch} />;
  }

  return <View>{/* Content */}</View>;
};
```

These examples cover most common error handling scenarios in StreamSense. Mix and match patterns as needed for your specific use case.
