import { Router } from "express";
import bcrypt from "bcryptjs";
import { PanelRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware, requireRole } from "../middleware/auth";
import { runGlobalSpamSweep } from "../services/spamSweep";

const router = Router();
router.use(authMiddleware);
router.use(requireRole(PanelRole.ADMINISTRATOR));

router.get("/users", async (_req, res) => {
  const users = await prisma.panelUser.findMany({
    orderBy: { id: "asc" },
    select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
  res.json(users);
});

router.post("/users", async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: PanelRole;
  };
  if (!email?.trim() || !password || !role) {
    res.status(400).json({ error: "email, password i role są wymagane" });
    return;
  }
  if (role !== PanelRole.ADMINISTRATOR && role !== PanelRole.MARKETING) {
    res.status(400).json({ error: "Nieprawidłowa rola" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.panelUser.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
      },
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(user);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      res.status(409).json({ error: "Użytkownik z tym emailem już istnieje" });
      return;
    }
    throw e;
  }
});

router.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  const { password, role } = req.body as { password?: string; role?: PanelRole };
  if (password === undefined && role === undefined) {
    res.status(400).json({ error: "Podaj password i/lub role" });
    return;
  }
  if (role !== undefined && role !== PanelRole.ADMINISTRATOR && role !== PanelRole.MARKETING) {
    res.status(400).json({ error: "Nieprawidłowa rola" });
    return;
  }

  const data: { passwordHash?: string; role?: PanelRole } = {};
  if (password !== undefined) {
    if (password.length < 8) {
      res.status(400).json({ error: "Hasło min. 8 znaków" });
      return;
    }
    data.passwordHash = await bcrypt.hash(password, 10);
  }
  if (role !== undefined) data.role = role;

  try {
    const user = await prisma.panelUser.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    res.json(user);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      res.status(404).json({ error: "Użytkownik nie znaleziony" });
      return;
    }
    throw e;
  }
});

router.get("/banned-words", async (_req, res) => {
  const rows = await prisma.bannedWord.findMany({ orderBy: { id: "asc" } });
  res.json(rows);
});

router.post("/banned-words", async (req, res) => {
  const raw = (req.body as { word?: string }).word?.trim().toLowerCase();
  if (!raw) {
    res.status(400).json({ error: "word wymagane" });
    return;
  }
  try {
    const row = await prisma.bannedWord.create({ data: { word: raw } });
    res.status(201).json(row);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      res.status(409).json({ error: "To słowo już jest na liście" });
      return;
    }
    throw e;
  }
});

router.delete("/banned-words/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  try {
    await prisma.bannedWord.delete({ where: { id } });
    res.status(204).send();
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      res.status(404).json({ error: "Nie znaleziono" });
      return;
    }
    throw e;
  }
});

router.post("/spam-sweep", async (_req, res) => {
  try {
    const result = await runGlobalSpamSweep();
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Sweep failed" });
  }
});

router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const auth = req.auth!;
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Nieprawidłowe ID" });
    return;
  }
  if (id === auth.sub) {
    res.status(400).json({ error: "Nie możesz usunąć własnego konta" });
    return;
  }
  try {
    await prisma.panelUser.delete({ where: { id } });
    res.status(204).send();
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2025") {
      res.status(404).json({ error: "Użytkownik nie znaleziony" });
      return;
    }
    throw e;
  }
});

export default router;
