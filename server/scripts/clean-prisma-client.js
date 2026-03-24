/**
 * Usuwa wygenerowany katalog .prisma (np. przed ponownym `prisma generate` na Windows,
 * gdy EPERM blokuje nadpisanie query_engine-*.dll).
 */
const fs = require("fs");
const path = require("path");

const prismaDir = path.join(__dirname, "..", "node_modules", ".prisma");
if (fs.existsSync(prismaDir)) {
  try {
    fs.rmSync(prismaDir, { recursive: true, force: true });
    console.log("[clean-prisma-client] Usunięto:", prismaDir);
  } catch (e) {
    console.error(
      "[clean-prisma-client] Nie można usunąć folderu (często EPERM na Windows). Zatrzymaj: npm run dev, Prisma Studio, inne terminale z Node, potem spróbuj ponownie.",
      "\n",
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
  }
} else {
  console.log("[clean-prisma-client] Brak katalogu, pomijam:", prismaDir);
}
