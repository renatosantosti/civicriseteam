import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all conversations
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("conversations").collect();
  },
});

// Get a specific conversation
export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create a new conversation
export const create = mutation({
  args: {
    title: v.string(),
    mode: v.optional(v.union(v.literal('citizen'), v.literal('dispatcher'))),
    messages: v.optional(
      v.array(
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
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      title: args.title,
      mode: args.mode,
      messages: args.messages || [],
    });
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, { title: args.title });
  },
});

// Add a message to a conversation
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
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    const updatedMessages = [...conversation.messages, args.message];
    return await ctx.db.patch(args.conversationId, { 
      messages: updatedMessages 
    });
  },
});

// Delete a conversation
export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});