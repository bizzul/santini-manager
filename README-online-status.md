# Online/Offline Status Management

This document describes the online/offline status management system implemented in the Baccialegno application.

## Features

### 1. Network Status Detection
- Real-time detection of online/offline status using the browser's `navigator.onLine` API
- Automatic status updates when network connectivity changes
- Visual indicators showing current connection status

### 2. Kanban List Management
- Automatic refresh of kanban list when coming back online
- Periodic background updates (every 30 seconds) when online
- Graceful handling of offline state with appropriate user feedback
- Manual refresh option with network status validation

### 3. User Experience Improvements
- Toast notifications for connection status changes
- Visual feedback for network-dependent operations
- Disabled functionality when offline with clear messaging
- Last sync time display for transparency

## Components

### useOnlineStatus Hook
Located in `hooks/use-online-status.tsx`
- Manages online/offline state
- Tracks last online time
- Provides reusable hook for other components

### NetworkStatus Component
Located in `components/ui/network-status.tsx`
- Reusable component for displaying network status
- Configurable size and sync time display
- Consistent styling across the application

### AppSidebar Updates
- Integrated network status detection
- Enhanced kanban list management
- Improved user feedback for network operations

## Usage

### Basic Network Status Display
```tsx
import { NetworkStatus } from '@/components/ui/network-status';

<NetworkStatus size="sm" showLastSync={true} />
```

### Using the Online Status Hook
```tsx
import { useOnlineStatus } from '@/hooks/use-online-status';

const { isOnline, lastOnlineTime } = useOnlineStatus();
```

## Behavior

### Online State
- Green WiFi icon
- "Online" status text
- Full functionality available
- Automatic background updates

### Offline State
- Red warning triangle icon
- "Offline" status text
- Limited functionality
- Clear messaging about unavailable features

### Connection Recovery
- Automatic detection when coming back online
- Immediate refresh of data
- User notification of successful reconnection

## Technical Implementation

### Event Listeners
- `window.addEventListener('online', ...)`
- `window.addEventListener('offline', ...)`

### State Management
- Uses React hooks for state management
- Zustand store for kanban data persistence
- Local state for UI feedback

### Error Handling
- Graceful degradation when offline
- Clear error messages for failed operations
- Fallback to cached data when appropriate

## Future Enhancements

1. **Service Worker Integration**: Add offline caching for better offline experience
2. **Queue Management**: Queue operations when offline and sync when back online
3. **Conflict Resolution**: Handle data conflicts when reconnecting
4. **Offline Indicators**: More prominent offline status in the main UI
5. **Sync Status**: Show sync progress and status for background operations 