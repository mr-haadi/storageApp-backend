import { rateLimit } from 'express-rate-limit';


export const rateLimiter = (windowMs, limit) => rateLimit({
    windowMs,
    limit,
    message: {
        error: "Too many requests. Please try again in a few minutes."
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ipv6Subnet: 56,
});


export function throttle({
    waitTime = 1000,
    delayAfter = 3,
    maxDelay = 10000,
    cleanupAfter = 5 * 60 * 1000,
} = {}) {
    const throttleData = {};

    setInterval(() => {
        const now = Date.now();

        for (const ip in throttleData) {
            if (now - throttleData[ip].lastSeen > cleanupAfter) {
                delete throttleData[ip];
            }
        }
    }, 60000);

    return (req, res, next) => {
        const now = Date.now();
        const ip = req.ip;

        const data = throttleData[ip] || {
            hits: 0,
            previousDelay: 0,
            lastRequestTime: now - waitTime,
            lastSeen: now,
        };

        data.hits++;
        data.lastSeen = now;

        let delay = 0;

        if (data.hits > delayAfter) {
            const timePassed = now - data.lastRequestTime;

            delay = Math.min(
                maxDelay,
                Math.max(
                    0,
                    waitTime + data.previousDelay - timePassed
                )
            );
        }

        data.previousDelay = delay;
        data.lastRequestTime = now;

        throttleData[ip] = data;

        setTimeout(next, delay);
    };
}