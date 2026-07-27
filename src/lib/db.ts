import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function getDemoWorkspace() {
  return db.workspace.upsert({
    where: { slug: "acme-studio" },
    update: {},
    create: {
      name: "Acme Studio",
      slug: "acme-studio",
      subscription: { create: { plan: "free", status: "active" } }
    }
  });
}
