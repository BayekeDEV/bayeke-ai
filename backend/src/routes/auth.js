import { Router } from "express";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail, findUserById } from "../db/index.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { getDbMode } from "../db/index.js";

const router = Router();

function authUnavailable(_req, res) {
  return res.status(503).json({
    error: "Авторизация MongoDB қажет. .env → DATABASE_URL=mongodb://...",
  });
}

router.post("/auth/register", async (req, res, next) => {
  try {
    if (getDbMode() !== "mongodb") return authUnavailable(req, res);

    const email = req.body?.email?.trim();
    const password = req.body?.password;
    const name = req.body?.name?.trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Жарамды email енгізіңіз" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Құпия сөз кемінде 6 таңба" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Бұл email тіркелген" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, name });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Бұл email тіркелген" });
    }
    next(err);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    if (getDbMode() !== "mongodb") return authUnavailable(req, res);

    const email = req.body?.email?.trim();
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({ error: "Email және құпия сөз міндетті" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Email немесе құпия сөз қате" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Email немесе құпия сөз қате" });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    if (getDbMode() !== "mongodb") return authUnavailable(req, res);

    const user = await findUserById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "Пайдаланушы табылмады" });
    }
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    next(err);
  }
});

export default router;
