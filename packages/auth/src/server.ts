import { getServerEnv } from "@roomdesigner/config/env";
import { prisma } from "@roomdesigner/db";
import { getEmailSender } from "@roomdesigner/shared/email";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { bootstrapWorkspace } from "./workspace";

const env = getServerEnv();
const emailSender = getEmailSender();

const googleCredentials =
  env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : undefined;

const trustedOrigins = env.BETTER_AUTH_URL !== undefined
  ? [env.APP_URL, env.BETTER_AUTH_URL]
  : [env.APP_URL];

/** Fixed OTP for Playwright runs only; never active in production. */
const e2eOtp = env.NODE_ENV !== "production" && process.env.E2E === "1" ? "123456" : undefined;

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
  ...(googleCredentials === undefined ? {} : { socialProviders: { google: googleCredentials } }),
  user: {
    additionalFields: {
      mode: {
        type: "string",
        defaultValue: "HOME",
      },
      onboardedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await bootstrapWorkspace(user);
          // Email OTP and social sign-in both prove email ownership, so accounts
          // created through them are verified. Password auth is disabled.
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        },
      },
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      ...(e2eOtp === undefined ? {} : { generateOTP: () => e2eOtp }),
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === "sign-in"
            ? "Your RoomDesigner sign-in code"
            : type === "email-verification"
              ? "Verify your RoomDesigner email"
              : "Reset your RoomDesigner password";
        await emailSender.send({
          to: email,
          subject,
          text: `Your RoomDesigner code is ${otp}. It expires in 5 minutes. If you did not request this, you can ignore this email.`,
        });
      },
    }),
    nextCookies(),
  ],
});
