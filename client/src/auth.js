const STORAGE_KEY = 'currentUser';

export function getStoredUser() {
  const rawUser = localStorage.getItem(STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  localStorage.setItem('isLoggedIn', 'true');
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('isLoggedIn');
}
