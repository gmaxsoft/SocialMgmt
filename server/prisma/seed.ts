import path from "path";
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient, PanelRole } from "@prisma/client";

config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

/** Domyślne dane — dokumentacja w README.md; nadpisz przez DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD w .env */
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? "demo@socialmgmt.local";
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? "Demo_SocialMgmt_2026!";

async function main() {
  const hash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);
  await prisma.panelUser.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    create: {
      email: DEMO_ADMIN_EMAIL,
      passwordHash: hash,
      role: PanelRole.ADMINISTRATOR,
    },
    update: {
      passwordHash: hash,
      role: PanelRole.ADMINISTRATOR,
    },
  });
  console.log(`[seed] Utworzono lub zaktualizowano konto administratora (demo): ${DEMO_ADMIN_EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
