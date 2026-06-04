import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export const AUTH_HEADER = "authorization";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers[AUTH_HEADER];
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Кіру қажет" });
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    req.userName = payload.name;
    next();
  } catch {
    return res.status(401).json({ error: "Жарамсыз немесе мерзімі өткен токен" });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers[AUTH_HEADER];
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      req.userId = payload.sub;
      req.userEmail = payload.email;
      req.userName = payload.name;
    } catch {
      /* ignore invalid token */
    }
  }
  next();
}
