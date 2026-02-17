// API Configuration
// For Android emulator use 10.0.2.2, for iOS simulator use localhost
// For physical devices, use your machine's LAN IP

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001';
export const AGENT_URL = process.env.EXPO_PUBLIC_AGENT_URL || 'http://localhost:5000';
export const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10);
export const DEBUG = process.env.EXPO_PUBLIC_DEBUG === 'true';

