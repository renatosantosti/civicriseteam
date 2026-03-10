import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { LoadingIndicator } from './LoadingIndicator';
import { ChatInput } from './ChatInput';
import { Sidebar } from './Sidebar';
import { WelcomeScreen } from './WelcomeScreen';
import { TopBanner } from './TopBanner';
import { useConversations, useAppState, actions } from '../store';
import { genAIResponse, ChatApiError, type Message } from '../utils';

const RAG_DEBUG = import.meta.env.DEV ?? true;

function ragLog(label: string, data: unknown) {
  if (RAG_DEBUG) {
    console.log('[RAG]', label, data);
  }
}

export function AssistantPage() {
  const {
    conversations,
    currentConversationId,
    currentConversation,
    setCurrentConversationId,
    createNewConversation,
    updateConversationTitle,
    deleteConversation,
    addMessage,
  } = useConversations();

  const { isLoading, setLoading, setBannerVisible, appMode, residentZip } = useAppState();

  const messages = useMemo(() => currentConversation?.messages || [], [currentConversation]);

  const [input, setInput] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollToBottom = useCallback((smooth: boolean = false) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pendingMessage && isLoading) {
      scrollToBottom(true);
    }
  }, [pendingMessage, isLoading, scrollToBottom]);

  const createTitleFromInput = useCallback((text: string) => {
    const words = text.trim().split(/\s+/);
    const firstThreeWords = words.slice(0, 3).join(' ');
    return firstThreeWords + (words.length > 3 ? '...' : '');
  }, []);

  const processAIResponse = useCallback(
    async (conversationId: string, userMessage: Message) => {
      try {
        setPendingMessage({
          id: 'temp-loading',
          role: 'assistant',
          content: 'Checking verified Montgomery sources...',
        });

        const requestPayload = {
          messages: [...messages, userMessage],
          mode: appMode,
          residentZip: residentZip || undefined,
        };
        ragLog('Request', {
          messages: requestPayload.messages.map((m) => ({
            role: m.role,
            contentLength: m.content.length,
          })),
          mode: requestPayload.mode,
          residentZip: requestPayload.residentZip ?? null,
        });

        const response = await genAIResponse({
          data: requestPayload,
        });

        ragLog('Response', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });
        const debugHeader = response.headers.get('X-RAG-Debug');
        if (debugHeader) {
          try {
            ragLog('Server', JSON.parse(debugHeader) as {
              provider?: string;
              apiKeySet?: boolean;
              apiKeyLength?: number;
              resolvedModel?: string;
              envModelSet?: boolean;
            });
          } catch {
            // ignore
          }
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({ answer: response.statusText })) as { answer?: string; error?: string; detail?: string };
          ragLog('Response body (error)', { status: response.status, answer: err.answer ?? err.error ?? err.detail });
          const message = err.answer ?? err.error ?? err.detail ?? response.statusText ?? 'Failed to get AI response';
          throw new ChatApiError(message, response.status, err.detail);
        }

        const payload = await response.json() as { answer?: string; citations?: Message['citations']; incidentWarning?: Message['incidentWarning'] };
        ragLog('Success', {
          answerLength: payload.answer?.length ?? 0,
          citationsCount: payload.citations?.length ?? 0,
        });
        const newMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: payload.answer ?? 'I could not produce a verified answer right now.',
          citations: payload.citations ?? [],
          incidentWarning: payload.incidentWarning,
        };

        setPendingMessage(null);
        if (newMessage.content.trim()) {
          await addMessage(conversationId, newMessage);
        }
      } catch (err) {
        if (err instanceof ChatApiError) {
          ragLog('Error', { status: err.status, message: err.message, detail: err.detail });
        } else {
          ragLog('Error', { message: err instanceof Error ? err.message : String(err) });
        }
        console.error('Error in AI response:', err);
        if (err instanceof ChatApiError && err.status === 503) {
          setBannerVisible(true);
        }
        const displayMessage = err instanceof ChatApiError ? err.message : 'Sorry, I encountered an error generating a response. Please set the required API keys in your environment variables.';
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: displayMessage,
        };
        await addMessage(conversationId, errorMessage);
      }
    },
    [messages, addMessage, appMode, residentZip, setBannerVisible]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      const currentInput = input;
      ragLog('Submit', {
        inputLength: currentInput.trim().length,
        conversation: currentConversationId ?? 'new',
      });
      setInput('');
      setLoading(true);
      setError(null);
      const conversationTitle = createTitleFromInput(currentInput);
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: currentInput.trim(),
      };
      let conversationId = currentConversationId;
      if (!conversationId) {
        try {
          const convexId = await createNewConversation(conversationTitle);
          if (convexId) {
            conversationId = convexId;
            await addMessage(conversationId, userMessage);
          } else {
            const tempId = Date.now().toString();
            actions.addConversation({
              id: tempId,
              title: conversationTitle,
              messages: [],
            });
            conversationId = tempId;
            actions.addMessage(conversationId, userMessage);
          }
        } catch (err) {
          console.error('Error creating conversation:', err);
          throw new Error('Failed to create conversation');
        }
      } else {
        await addMessage(conversationId, userMessage);
      }
      try {
        await processAIResponse(conversationId, userMessage);
      } catch (err) {
        if (err instanceof ChatApiError) {
          ragLog('Error', { status: err.status, message: err.message, detail: err.detail });
        } else {
          ragLog('Error', { message: err instanceof Error ? err.message : String(err) });
        }
        console.error('Error:', err);
        if (err instanceof ChatApiError && err.status === 503) {
          setBannerVisible(true);
        }
        const displayMessage = err instanceof ChatApiError ? err.message : 'Sorry, I encountered an error processing your request.';
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: displayMessage,
        };
        if (currentConversationId) {
          await addMessage(currentConversationId, errorMessage);
        } else {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      isLoading,
      createTitleFromInput,
      currentConversationId,
      createNewConversation,
      addMessage,
      processAIResponse,
      setLoading,
      setBannerVisible,
    ]
  );

  const handleNewChat = useCallback(() => createNewConversation(), [createNewConversation]);
  const handleDeleteChat = useCallback(async (id: string) => await deleteConversation(id), [deleteConversation]);
  const handleUpdateChatTitle = useCallback(
    async (id: string, title: string) => {
      await updateConversationTitle(id, title);
      setEditingChatId(null);
      setEditingTitle('');
    },
    [updateConversationTitle]
  );

  return (
    <div className="relative flex h-screen bg-gray-900 min-h-0">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        handleNewChat={handleNewChat}
        setCurrentConversationId={setCurrentConversationId}
        handleDeleteChat={handleDeleteChat}
        editingChatId={editingChatId}
        setEditingChatId={setEditingChatId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        handleUpdateChatTitle={handleUpdateChatTitle}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 lg:hidden border-b border-gray-800">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
            aria-label="Open chat list"
          >
            <MessageSquare className="h-5 w-5" />
            Chats
          </button>
        </div>
        <TopBanner />
        {error && (
          <p className="mx-auto w-full max-w-3xl p-4 font-bold text-orange-500">{error}</p>
        )}
        {currentConversationId ? (
          <>
            <div
              ref={messagesContainerRef}
              className="messages-container flex-1 overflow-y-auto pb-24 min-h-0"
            >
              <div className="mx-auto w-full max-w-3xl px-4">
                {[...messages, pendingMessage]
                  .filter((message): message is Message => message !== null)
                  .map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isStreaming={message === pendingMessage && isLoading}
                    />
                  ))}
                {isLoading && <LoadingIndicator />}
              </div>
            </div>
            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </>
        ) : (
          <WelcomeScreen
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
