import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    zipCode: v.optional(v.string()),
    passwordHash: v.string(),
  }).index("by_email", ["email"]),

  conversations: defineTable({
    title: v.string(),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});