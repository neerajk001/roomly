import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { getEmailSender } from "@roomdesigner/shared";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { bootstrapWorkspace } from "./workspace.js";

const env = getServerEnv();
const emailSender = getEmailSender();

const googleCredentials =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : undefined;

const trustedOrigins = env.BETTER_AUTH_URL !== undefined
  ? [env.APP_URL, env.BETTER_AUTH_URL]
  : [env.APP_URL];

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  advanced: {
    database: {
      joins: true,
    },
  },
  rateLimit: {
    enabled: true,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    sendResetPassword: async ({ user, url }) => {
      void emailSender.send({
        to: user.email,
        subject: "Reset your RoomDesigner password",
        text: `Hi ${user.name},\n\nReset your password: ${url}\n\nIf you did not request this, you can ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void emailSender.send({
        to: user.email,
        subject: "Verify your RoomDesigner email",
        text: `Welcome to RoomDesigner!\n\nVerify your email: ${url}`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  ...(googleCredentials === undefined ? {} : { socialProviders: { google: googleCredentials } }),
  user: {
    additionalFields: {
      mode: {
        type: "string",
        defaultValue: "HOME",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await bootstrapWorkspace(user);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
