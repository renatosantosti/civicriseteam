import { useStore } from '@tanstack/react-store';
import { v4 as uuidv4 } from 'uuid';
import { actions, selectors, store, type Conversation } from './store';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { Message } from '../utils/ai';
import { useEffect } from 'react';
import { useOptionalAuth } from '../contexts/AuthContext';

// Check if Convex URL is provided
const isConvexAvailable = Boolean(import.meta.env.VITE_CONVEX_URL);

// Original app hook that matches the interface expected by the app
export function useAppState() {
  const isLoading = useStore(store, s => selectors.getIsLoading(s));
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const prompts = useStore(store, s => selectors.getPrompts(s));
  const isBannerVisible = useStore(store, s => selectors.getIsBannerVisible(s));

  return {
    conversations,
    currentConversationId,
    isLoading,
    prompts,
    isBannerVisible,

    // Actions
    setCurrentConversationId: actions.setCurrentConversationId,
    addConversation: actions.addConversation,
    deleteConversation: actions.deleteConversation,
    updateConversationTitle: actions.updateConversationTitle,
    addMessage: actions.addMessage,
    setLoading: actions.setLoading,
    setBannerVisible: actions.setBannerVisible,
    createPrompt: actions.createPrompt,
    deletePrompt: actions.deletePrompt,
    setPromptActive: actions.setPromptActive,

    // Selectors
    getCurrentConversation: selectors.getCurrentConversation,
    getActivePrompt: selectors.getActivePrompt,
  };
}

// Hook for Convex integration with fallback to local state
export function useConversations() {
  const auth = useOptionalAuth();
  const token = auth?.token ?? null;

  // Local state for UI reactivity
  const conversations = useStore(store, s => selectors.getConversations(s));
  const currentConversationId = useStore(store, s => selectors.getCurrentConversationId(s));
  const currentConversation = useStore(store, s => selectors.getCurrentConversation(s));

  // Query Convex when available; skip when no token so we don't require auth for the query call
  const convexListResult = isConvexAvailable
    ? useQuery(api.conversations.list, token ? { authToken: token } : 'skip')
    : undefined;
  const convexConversations = convexListResult ?? null;

  // Convex mutations (only when Convex available; authToken passed at call time)
  const createConversation = isConvexAvailable ? useMutation(api.conversations.create) : null;
  const updateTitle = isConvexAvailable ? useMutation(api.conversations.updateTitle) : null;
  const deleteConversation = isConvexAvailable ? useMutation(api.conversations.remove) : null;
  const addMessageToConversation = isConvexAvailable ? useMutation(api.conversations.addMessage) : null;

  // Sync Convex conversations to local store, or clear when no token
  useEffect(() => {
    if (!isConvexAvailable || !token) {
      actions.setConversations([]);
      return;
    }
    if (convexConversations && convexConversations.length > 0) {
      const formattedConversations: Conversation[] = convexConversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        messages: conv.messages as Message[],
      }));
      actions.setConversations(formattedConversations);
    } else if (convexConversations && convexConversations.length === 0) {
      actions.setConversations([]);
    }
  }, [convexConversations, token, isConvexAvailable]);
  
  return {
    conversations,
    currentConversationId,
    currentConversation,
    
    setCurrentConversationId: (id: string | null) => {
      actions.setCurrentConversationId(id);
    },
    
    createNewConversation: async (title: string = 'New Conversation') => {
      const id = uuidv4();
      const newConversation: Conversation = {
        id,
        title,
        messages: [],
      };
      
      // First update local state for immediate UI feedback
      actions.addConversation(newConversation);
      
      // Then create in Convex database if available and authenticated
      if (isConvexAvailable && createConversation && token) {
        try {
          const convexId = await createConversation({
            title,
            messages: [],
            authToken: token,
          });
          actions.updateConversationId(id, convexId);
          actions.setCurrentConversationId(convexId);
          return convexId;
        } catch (error) {
          console.error('Failed to create conversation in Convex:', error);
        }
      }
      
      // If Convex is not available or there was an error, just use the local ID
      actions.setCurrentConversationId(id);
      return id;
    },
    
    updateConversationTitle: async (id: string, title: string) => {
      // First update local state
      actions.updateConversationTitle(id, title);
      
      // Then update in Convex if available and authenticated
      if (isConvexAvailable && updateTitle && token) {
        try {
          await updateTitle({ id: id as Id<'conversations'>, title, authToken: token });
        } catch (error) {
          console.error('Failed to update conversation title in Convex:', error);
        }
      }
    },
    
    deleteConversation: async (id: string) => {
      // First update local state
      actions.deleteConversation(id);
      
      // Then delete from Convex if available and authenticated
      if (isConvexAvailable && deleteConversation && token) {
        try {
          await deleteConversation({ id: id as Id<'conversations'>, authToken: token });
        } catch (error) {
          console.error('Failed to delete conversation from Convex:', error);
        }
      }
    },
    
    addMessage: async (conversationId: string, message: Message) => {
      // First update local state
      actions.addMessage(conversationId, message);
      
      // Then add to Convex if available and authenticated
      if (isConvexAvailable && addMessageToConversation && token) {
        try {
          await addMessageToConversation({
            conversationId: conversationId as Id<'conversations'>,
            message,
            authToken: token,
          });
        } catch (error) {
          console.error('Failed to add message to Convex:', error);
        }
      }
    },
  };
} 