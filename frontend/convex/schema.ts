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
    mode: v.optional(v.union(v.literal('citizen'), v.literal('dispatcher'))),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        citations: v.optional(
          v.array(
            v.object({
              sourceName: v.string(),
              note: v.optional(v.string()),
            })
          )
        ),
        incidentWarning: v.optional(
          v.object({
            title: v.string(),
            area: v.string(),
            summary: v.string(),
          })
        ),
      })
    ),
    userId: v.id("users"),
  }).index("by_userId", ["userId"]),
});