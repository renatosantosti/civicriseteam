import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
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
  }),
  incidents: defineTable({
    title: v.string(),
    category: v.string(),
    zip: v.string(),
    summary: v.string(),
    status: v.union(v.literal('active'), v.literal('resolved')),
    updatedAt: v.number(),
  }),
  tickets: defineTable({
    issueType: v.string(),
    status: v.union(v.literal('open'), v.literal('scheduled'), v.literal('closed')),
    zip: v.string(),
    lat: v.optional(v.number()),
    lon: v.optional(v.number()),
    photoUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  alertsSubscriptions: defineTable({
    zip: v.string(),
    channel: v.union(v.literal('sms'), v.literal('email'), v.literal('push')),
    categories: v.array(v.string()),
    active: v.boolean(),
  }),
});