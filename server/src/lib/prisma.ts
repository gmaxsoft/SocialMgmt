import { Prisma, PrismaClient } from "@prisma/client";
import { SocialAccountService } from "../services/socialAccountService";

function encryptSocialAccountWriteData(data: Record<string, unknown>) {
  if (typeof data.accessToken === "string") {
    data.accessToken = SocialAccountService.encryptTokenForStorage(data.accessToken) as string;
  }
  if (typeof data.refreshToken === "string") {
    data.refreshToken = SocialAccountService.encryptTokenForStorage(data.refreshToken) as string;
  }
}

const base = new PrismaClient();

export const prisma = base.$extends({
  query: {
    socialAccount: {
      async create({
        args,
        query,
      }: {
        args: Prisma.SocialAccountCreateArgs;
        query: (a: Prisma.SocialAccountCreateArgs) => Promise<unknown>;
      }) {
        encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
      async update({
        args,
        query,
      }: {
        args: Prisma.SocialAccountUpdateArgs;
        query: (a: Prisma.SocialAccountUpdateArgs) => Promise<unknown>;
      }) {
        encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
      async upsert({
        args,
        query,
      }: {
        args: Prisma.SocialAccountUpsertArgs;
        query: (a: Prisma.SocialAccountUpsertArgs) => Promise<unknown>;
      }) {
        encryptSocialAccountWriteData(args.create as Record<string, unknown>);
        encryptSocialAccountWriteData(args.update as Record<string, unknown>);
        return query(args);
      },
      async updateMany({
        args,
        query,
      }: {
        args: Prisma.SocialAccountUpdateManyArgs;
        query: (a: Prisma.SocialAccountUpdateManyArgs) => Promise<unknown>;
      }) {
        if (args.data) encryptSocialAccountWriteData(args.data as Record<string, unknown>);
        return query(args);
      },
    },
  },
  result: {
    socialAccount: {
      accessToken: {
        needs: { accessToken: true },
        compute(s: { accessToken: string | null }) {
          return SocialAccountService.decryptTokenFromStorage(s.accessToken) ?? null;
        },
      },
      refreshToken: {
        needs: { refreshToken: true },
        compute(s: { refreshToken: string | null }) {
          return SocialAccountService.decryptTokenFromStorage(s.refreshToken) ?? null;
        },
      },
    },
  },
});
