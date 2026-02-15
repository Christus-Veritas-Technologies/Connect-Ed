import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'connect_ed_access_token';

let memoryToken: string | null = null;

export async function getAccessToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return memoryToken;
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  memoryToken = token;
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  } catch {
    // SecureStore might fail on some devices, token stays in memory
  }
}

export async function clearAccessToken(): Promise<void> {
  memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    // ignore
  }
}
