// Remove Firebase imports
// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db } from './firebaseConfig';

// Simple cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default class DbLookupService {
  static async checkNameExists(name, collectionName = 'workspaceNames') {
    // Check cache first
    const cacheKey = `${collectionName}:${name}`;
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Perform DB lookup using Dexie DB
    const exists = await db[collectionName].where('name').equals(name).count() > 0;
    
    // Cache the result
    this.cacheResult(cacheKey, exists);
    
    return exists;
  }

  static getCachedResult(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.value;
    }
    cache.delete(key);
    return undefined;
  }

  static cacheResult(key, value) {
    cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  static clearCache() {
    cache.clear();
  }
}
