export async function safeKvGet(cache: KVNamespace, key: string): Promise<string | null> {
  try {
    return await cache.get(key);
  } catch {
    return null;
  }
}

export async function safeKvPut(
  cache: KVNamespace,
  key: string,
  value: string,
  options?: KVNamespacePutOptions
): Promise<boolean> {
  try {
    await cache.put(key, value, options);
    return true;
  } catch {
    return false;
  }
}
