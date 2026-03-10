/**
 * Shared HTTP fetch utilities
 */
import https from 'https';

/**
 * Fetch with timeout and environment-aware TLS configuration
 */
export function fetchWithTimeout(url: string, options: any, timeout: number = 30000) {
    let agent: https.Agent | undefined = undefined;

    if (url.startsWith('https')) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        agent = new https.Agent({
            rejectUnauthorized: !isDevelopment,
            minVersion: 'TLSv1.2',
            checkServerIdentity: isDevelopment ? () => undefined : undefined,
        });
    }

    const fetchOptions = { ...options, agent };

    return Promise.race([
        fetch(url, fetchOptions),
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
        ),
    ]) as Promise<Response>;
}
