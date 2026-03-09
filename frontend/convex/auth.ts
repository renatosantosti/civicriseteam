import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import * as bcrypt from "bcryptjs";
import * as jose from "jose";

const SALT_ROUNDS = 10;
const JWT_EXPIRY = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("JWT_SECRET is not set in Convex environment variables");
  }
  return secret.trim();
}

/**
 * Verifies the JWT and returns the user id (sub claim).
 * Used by conversations and any other Convex function that needs the current user.
 */
export async function resolveUserId(authToken: string): Promise<Id<"users">> {
  if (!authToken || typeof authToken !== "string") {
    throw new Error("Missing or invalid auth token");
  }
  const secret = getJwtSecret();
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  try {
    const { payload } = await jose.jwtVerify(authToken, secretBytes, {
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    if (typeof sub !== "string" || !sub) {
      throw new Error("Invalid token: missing sub");
    }
    return sub as Id<"users">;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    if (!args.password || args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      throw new Error("An account with this email already exists");
    }
    const passwordHash = bcrypt.hashSync(args.password, SALT_ROUNDS);
    const userId = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      zipCode: args.zipCode?.trim() ?? undefined,
      passwordHash,
    });
    return { userId };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error("Invalid email or password");
    }
    const valid = bcrypt.compareSync(args.password, user.passwordHash);
    if (!valid) {
      throw new Error("Invalid email or password");
    }
    const secret = getJwtSecret();
    const secretBytes = new TextEncoder().encode(secret);
    const token = await new jose.SignJWT({ email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user._id)
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRY)
      .sign(secretBytes);

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        zipCode: user.zipCode ?? undefined,
      },
    };
  },
});

export const updateProfile = mutation({
  args: {
    authToken: v.string(),
    name: v.string(),
    zipCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const name = args.name.trim();
    const zipCode = args.zipCode?.trim() ?? undefined;
    await ctx.db.patch(userId, { name, zipCode });
    return {
      user: {
        id: user._id,
        name,
        email: user.email,
        zipCode,
      },
    };
  },
});

export const updatePassword = mutation({
  args: {
    authToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const valid = bcrypt.compareSync(args.currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
    if (!args.newPassword || args.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters");
    }
    const passwordHash = bcrypt.hashSync(args.newPassword, SALT_ROUNDS);
    await ctx.db.patch(userId, { passwordHash });
  },
});
