import getLogger from 'utils/logger';

interface Cache<K, V> {
  get(key: K): V | undefined;

  set(key: K, value: V): this;
}

export interface CacheManager<K, KK, V> {
  getCache(key: K): Cache<KK, V>;
}

class MapCacheManager implements CacheManager<string, any, any> {
  private _container: Map<any, any> = null;

  private getContainer() {
    return this._container || (this._container = new Map<any, any>());
  }

  getCache(key: string): Cache<any, any> {
    const _c = this.getContainer();
    return _c.get(key) || _c.set(key, new Map<any, any>()).get(key);
  }
}

class SessionCache implements Cache<string, any> {
  private readonly name: any;

  constructor(name) {
    this.name = name;
  }

  get(key: string): any | undefined {
    const json = sessionStorage.getItem(`${this.name}/${key}`);
    return JSON.parse(json);
  }

  set(key: string, value: any): this {
    const json = JSON.stringify(value);
    sessionStorage.setItem(`${this.name}/${key}`, json);
    return this;
  }
}

class SessionCacheManager implements CacheManager<string, string, any> {
  private _container: Map<any, SessionCache> = null;

  private getContainer() {
    return this._container || (this._container = new Map<any, SessionCache>());
  }

  getCache(key: string): SessionCache {
    const _c = this.getContainer();
    return _c.get(key) || _c.set(key, new SessionCache(key)).get(key);
  }
}

const defaultCache = new SessionCacheManager();

if (process.env.NODE_ENV === 'development') {
  getLogger('CacheManager').info(
    'looks like we are in development! you can control cache by $$defaultCache'
  );
  window['$$defaultCache'] = defaultCache;
}

function replacer(key, value) {
  if (value === null) {
    return void 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}

export function cacheable<F extends (...args: any[]) => Promise<any>>(name: string, func: F, keySupplier?: (...args: any[]) => string): F {
  const cache = defaultCache.getCache('cacheable/' + name);
  return async function() {
    let keyValue = arguments;
    if (keySupplier) {
      keyValue = keySupplier.apply(null, arguments)
    }
    const key = JSON.stringify(keyValue, replacer);
    let result = cache.get(key);
    if (result) {
      return result;
    }
    result = await func.apply(null, arguments);
    cache.set(key, result);
    return result;
  } as F;
}

export default defaultCache;
