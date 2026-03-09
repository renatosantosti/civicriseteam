import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { resolveUserId } from "./auth";

// List conversations for the authenticated user - conversation history
export const list = query({
  args: { authToken: v.string() },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    return await ctx.db
      .query("conversations")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get a specific conversation (only if owned by the user)
export const get = query({
  args: {
    id: v.id("conversations"),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const conversation = await ctx.db.get(args.id);
    if (!conversation) return null;
    if (conversation.userId !== userId) return null;
    return conversation;
  },
});

// Create a new conversation for the authenticated user
export const create = mutation({
  args: {
    title: v.string(),
    messages: v.optional(
      v.array(
        v.object({
          id: v.string(),
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    return await ctx.db.insert("conversations", {
      title: args.title,
      messages: args.messages || [],
      userId,
    });
  },
});

// Update conversation title (only if owned by the user)
export const updateTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.id, { title: args.title });
  },
});

// Add a message to a conversation (only if owned by the user)
export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    message: v.object({
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
    }),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Not authorized");
    const updatedMessages = [...conversation.messages, args.message];
    await ctx.db.patch(args.conversationId, { messages: updatedMessages });
  },
});

// Delete a conversation (only if owned by the user)
export const remove = mutation({
  args: {
    id: v.id("conversations"),
    authToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await resolveUserId(args.authToken);
    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");
    if (conversation.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
  },
});
