const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isBrowser = () => typeof window !== 'undefined' && typeof window.location !== 'undefined';

export const resolveApiBaseUrl = (rawValue: string | null | undefined): string => {
  if (!isBrowser()) {
    return typeof rawValue === 'string' ? rawValue : '';
  }

  const fallbackOrigin = window.location.origin;
  if (!rawValue) {
    return fallbackOrigin;
  }

  try {
    const candidate = new URL(rawValue, fallbackOrigin);
    if (!['http:', 'https:'].includes(candidate.protocol)) {
      console.warn(`EmailBuilderEditor: unsupported apiBaseUrl protocol "${candidate.protocol}". Falling back to window origin.`);
      return fallbackOrigin;
    }

    if (LOCAL_HOSTNAMES.has(candidate.hostname)) {
      return fallbackOrigin;
    }

    return candidate.origin;
  } catch (error) {
    console.warn('EmailBuilderEditor: invalid apiBaseUrl provided. Falling back to window origin.', error);
    return fallbackOrigin;
  }
};
