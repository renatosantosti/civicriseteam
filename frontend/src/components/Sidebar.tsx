import { PlusCircle, MessageCircle, Trash2, Edit2, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface SidebarProps {
  conversations: Array<{ id: string; title: string }>;
  currentConversationId: string | null;
  handleNewChat: () => void;
  setCurrentConversationId: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  editingChatId: string | null;
  setEditingChatId: (id: string | null) => void;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  handleUpdateChatTitle: (id: string, title: string) => void;
  /** When true on mobile, drawer is visible. On desktop (lg+) sidebar is always visible. */
  open?: boolean;
  /** Called when user closes the drawer (mobile overlay or close button). */
  onClose?: () => void;
}

export const Sidebar = ({
  conversations,
  currentConversationId,
  handleNewChat,
  setCurrentConversationId,
  handleDeleteChat,
  editingChatId,
  setEditingChatId,
  editingTitle,
  setEditingTitle,
  handleUpdateChatTitle,
  open = true,
  onClose,
}: SidebarProps) => {
  const sidebarContent = (
    <div className="flex h-full flex-col w-64 max-w-[85vw] bg-gray-800 border-r border-gray-700">
      {onClose && (
        <div className="flex items-center justify-end border-b border-gray-700 p-2 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
            aria-label="Close chat list"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className={`border-b border-gray-700 p-4 ${onClose ? '' : 'pt-4'}`}>
        <button
          onClick={() => {
            handleNewChat();
            onClose?.();
          }}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <PlusCircle className="w-4 h-4" />
          New Chat
        </button>
        <Link
          to="/dispatcher"
          onClick={onClose}
          className="mt-2 flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-orange-200 rounded-lg border border-orange-500/40 hover:bg-orange-500/10"
        >
          Dispatcher View
        </Link>
        <Link
          to="/rag-admin"
          onClick={onClose}
          className="mt-2 flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-medium text-orange-200 rounded-lg border border-orange-500/40 hover:bg-orange-500/10"
        >
          RAG Admin
        </Link>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className={`group flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-700/50 ${
              chat.id === currentConversationId ? 'bg-gray-700/50' : ''
            }`}
            onClick={() => {
              setCurrentConversationId(chat.id);
              onClose?.();
            }}
          >
            <MessageCircle className="w-4 h-4 flex-shrink-0 text-gray-400" />
            {editingChatId === chat.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onFocus={(e) => e.target.select()}
                onBlur={() => {
                  if (editingTitle.trim()) {
                    handleUpdateChatTitle(chat.id, editingTitle);
                  }
                  setEditingChatId(null);
                  setEditingTitle('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editingTitle.trim()) {
                    handleUpdateChatTitle(chat.id, editingTitle);
                  } else if (e.key === 'Escape') {
                    setEditingChatId(null);
                    setEditingTitle('');
                  }
                }}
                className="flex-1 min-w-0 text-sm text-white bg-transparent focus:outline-none"
                autoFocus
              />
            ) : (
              <span className="flex-1 min-w-0 text-sm text-gray-300 truncate">
                {chat.title}
              </span>
            )}
            <div className="items-center hidden gap-1 group-hover:flex flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingChatId(chat.id);
                  setEditingTitle(chat.title);
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(chat.id);
                }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay when drawer is open */}
      {open && onClose && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      {/* Desktop: always visible sidebar */}
      <div className="hidden lg:block lg:flex-shrink-0 lg:w-64">
        {sidebarContent}
      </div>
      {/* Mobile: drawer (fixed, slides in when open) */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
