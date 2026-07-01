import redisClient from "../config/redis.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days


export async function createSession(res, userId) {
  const sessionId = crypto.randomUUID();
  const redisKey = `session:${sessionId}`;

  await redisClient.json.set(redisKey, "$", { userId, createdAt: Date.now() });
  await redisClient.expire(redisKey, SESSION_TTL_SECONDS);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: "none",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}


export async function enforceDeviceLimit(userId, accessDevice) {
  let allSessions;
  try {
    allSessions = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${userId}}`,
      {
        RETURN: [],
        SORTBY: { BY: "createdAt", DIRECTION: "ASC" },
      }
    );
  } catch (err) {
    // Fallback for older/mismatched index definitions that don't have
    // createdAt indexed yet — evict without strict ordering rather than
    // failing the login entirely.
    allSessions = await redisClient.ft.search(
      "userIdIdx",
      `@userId:{${userId}}`,
      { RETURN: [] }
    );
  }

  const excess = allSessions.total - accessDevice + 1;
  if (excess > 0) {
    const toEvict = allSessions.documents.slice(0, excess).map((doc) => doc.id);
    if (toEvict.length) {
      await redisClient.del(...toEvict);
    }
  }
}

/** Deletes ALL sessions belonging to a user (logout-all / account deletion / admin actions). */
export async function deleteUserSessions(userId) {
  const allSessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${userId}}`,
    { RETURN: [] }
  );
  const sessionKeys = allSessions.documents.map((doc) => doc.id);
  if (sessionKeys.length > 0) {
    await redisClient.del(...sessionKeys);
  }
}
