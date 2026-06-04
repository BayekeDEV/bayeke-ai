import { randomUUID } from "crypto";

export const SESSION_HEADER = "x-session-id";

export function sessionMiddleware(req, res, next) {
  let sessionId = req.headers[SESSION_HEADER];

  if (
    !sessionId ||
    typeof sessionId !== "string" ||
    sessionId.length < 8 ||
    sessionId.length > 128
  ) {
    sessionId = randomUUID();
  }

  req.sessionId = sessionId;
  res.setHeader(SESSION_HEADER, sessionId);
  next();
}
