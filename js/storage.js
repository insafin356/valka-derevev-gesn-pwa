const DB_NAME = 'gesn-tree-felling-pwa';
const DB_VERSION = 1;
const STORE_NAME = 'app';
const STATE_KEY = 'state';
const FALLBACK_KEY = 'gesn-tree-felling-pwa-state';

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Не удалось открыть IndexedDB'));
  });
}

async function idbGet(key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Ошибка чтения IndexedDB'));
    });
  } finally {
    db.close();
  }
}

async function idbSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Ошибка записи IndexedDB'));
      transaction.onabort = () => reject(transaction.error || new Error('Запись IndexedDB прервана'));
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Ошибка удаления IndexedDB'));
    });
  } finally {
    db.close();
  }
}

export async function loadAppState() {
  if (hasIndexedDb()) {
    try {
      return (await idbGet(STATE_KEY)) || null;
    } catch (error) {
      console.warn('IndexedDB недоступна, используется localStorage.', error);
    }
  }

  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Не удалось прочитать localStorage.', error);
    return null;
  }
}

export async function saveAppState(state) {
  if (hasIndexedDb()) {
    try {
      await idbSet(STATE_KEY, state);
      return;
    } catch (error) {
      console.warn('Не удалось сохранить в IndexedDB, используется localStorage.', error);
    }
  }

  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
}

export async function clearAppState() {
  if (hasIndexedDb()) {
    try {
      await idbDelete(STATE_KEY);
    } catch (error) {
      console.warn('Не удалось очистить IndexedDB.', error);
    }
  }
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch (error) {
    console.warn('Не удалось очистить localStorage.', error);
  }
}

export async function storageEstimate() {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.warn('Не удалось получить оценку хранилища.', error);
    }
  }
  return { usage: 0, quota: 0 };
}
