import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, theme: 'light' },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setTheme: (state, action) => { state.theme = action.payload; },
  },
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0 },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
    markAsRead: (state, action) => {
      const notification = state.items.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearAll: (state) => {
      state.items.forEach((n) => { n.read = true; });
      state.unreadCount = 0;
    },
  },
});

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    notifications: notificationSlice.reducer,
  },
});

export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
export const { toggleSidebar, setTheme } = uiSlice.actions;
export const { addNotification, markAsRead, clearAll } = notificationSlice.actions;
export default store;
