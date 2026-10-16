import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import api from "../api.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useChatStore } from "../store/useChatStore.js";

export default function ChatSidebar({
  chatId,
  refreshChats,
  onChatsChanged,
  busy,
  onBusyChange,
}) {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const removeChat = useChatStore((state) => state.removeChat);

  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Fetch recent chats.
  useEffect(() => {
    let active = true;

    async function loadChats() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/chat/getRecentChat");

        if (active) {
          setChats(
            Array.isArray(response.data.chats)
              ? response.data.chats
              : []
          );
        }
      } catch (error) {
        if (!active) return;

        console.error("Failed to load recent chats:", error);

        if (error.response?.status === 401) {
          setUser(null);
        } else {
          setError(
            error.response?.data?.message ||
              "Could not load recent chats."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadChats();

    return () => {
      active = false;
    };
  }, [refreshChats, setUser]);

  // Delete a chat.
  async function handleDeleteChat(id) {
    if (
      busy ||
      deletingId ||
      !window.confirm(
        "Delete this chat and all its messages?"
      )
    ) {
      return;
    }

    setDeletingId(id);
    onBusyChange(true);
    setError("");

    try {
      await api.delete(`/chat/${id}`);

      removeChat(id);

      setChats((current) =>
        current.filter((chat) => chat._id !== id)
      );

      onChatsChanged();

      if (chatId === id) {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);

      if (error.response?.status === 401) {
        setUser(null);
      } else {
        setError(
          error.response?.data?.message ||
            "Could not delete chat."
        );
      }
    } finally {
      setDeletingId(null);
      onBusyChange(false);
    }
  }

  // Log out.
  async function handleLogout() {
    if (loggingOut || deletingAccount) return;

    setLoggingOut(true);
    setError("");

    try {
      // Change this endpoint if your backend uses another logout route.
      await api.post("/user/logout");

      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);

      if (error.response?.status === 401) {
        setUser(null);
        navigate("/login");
      } else {
        setError(
          error.response?.data?.message ||
            "Could not log out. Please try again."
        );
      }
    } finally {
      setLoggingOut(false);
      setShowProfile(false);
    }
  }

  // Delete the account.
  async function handleDeleteAccount() {
    if (deletingAccount || loggingOut) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingAccount(true);
    setError("");

    try {
      await api.delete("/user/delete");

      // Clear the authenticated user.
      setUser(null);

      // Redirect after successful deletion.
      navigate("/login");
    } catch (error) {
      console.error("Failed to delete account:", error);

      if (error.response?.status === 401) {
        setUser(null);
        navigate("/login");
      } else {
        setError(
          error.response?.data?.message ||
            "Could not delete your account. Please try again."
        );
      }
    } finally {
      setDeletingAccount(false);
      setShowProfile(false);
    }
  }

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-[#2f2f2f] bg-[#171717] p-3 text-[#ececec] md:h-full md:min-h-full md:w-64 md:border-r md:border-b-0">

      {/* New chat */}
      <Link
        to="/"
        onClick={(event) => {
          if (busy) event.preventDefault();
        }}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-[#252525]"
      >
        <span
          aria-hidden="true"
          className="text-xl leading-none"
        >
          ＋
        </span>
        New chat
      </Link>

      {/* Recent chats heading */}
      <h2 className="mt-7 mb-2 px-3 text-xs font-medium text-[#a8a8a8]">
        Recent chats
      </h2>

      {/* Loading state */}
      {loading && (
        <p className="px-3 py-2 text-sm text-[#a8a8a8]">
          Loading chats...
        </p>
      )}

      {/* Error state */}
      {error && (
        <p
          role="alert"
          className="px-3 py-2 text-sm text-[#f87171]"
        >
          {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && chats.length === 0 && (
        <p className="px-3 py-2 text-sm text-[#a8a8a8]">
          No chats yet.
        </p>
      )}

      {/* Chat list */}
      <nav
        aria-label="Recent chats"
        className="max-h-44 space-y-1 overflow-y-auto md:max-h-none md:min-h-0 md:flex-1"
      >
        {chats.map((chat) => {
          const title =
            chat.topic || chat.Topic || "New Chat";

          return (
            <div
              key={chat._id}
              className="group flex items-center gap-1"
            >
              <Link
                to={`/chat/${chat._id}`}
                onClick={(event) => {
                  if (busy) event.preventDefault();
                }}
                aria-current={
                  chatId === chat._id ? "page" : undefined
                }
                title={title}
                className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm ${
                  chatId === chat._id
                    ? "bg-[#2a2a2a]"
                    : "hover:bg-[#252525]"
                }`}
              >
                {title}
              </Link>

              <button
                type="button"
                onClick={() => handleDeleteChat(chat._id)}
                disabled={Boolean(deletingId) || busy}
                aria-label={`Delete chat ${title}`}
                title="Delete chat"
                className="rounded-lg p-2 text-[#a8a8a8] hover:bg-[#2a2a2a] hover:text-[#f87171] disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                </svg>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Profile section */}
      <div className="relative mt-auto shrink-0 border-t border-[#2f2f2f] pt-3">

        {/* Profile popup */}
        {showProfile && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border border-[#3a3a3a] bg-[#252525] p-2 shadow-xl">

            {/* User information */}
            <div className="border-b border-[#3a3a3a] px-3 py-3">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || "User"}
              </p>

              <p className="truncate text-xs text-[#a8a8a8]">
                {user?.email || ""}
              </p>
            </div>

            {/* Delete account */}
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || loggingOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-[#353535] disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
              </svg>

              {deletingAccount
                ? "Deleting account..."
                : "Delete account"}
            </button>

            {/* Log out */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut || deletingAccount}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#ececec] hover:bg-[#353535] disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>

              {loggingOut
                ? "Logging out..."
                : "Log out"}
            </button>
          </div>
        )}

        {/* Clickable profile button */}
        <button
          type="button"
          onClick={() =>
            setShowProfile((previous) => !previous)
          }
          aria-expanded={showProfile}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#252525]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3a3a3a] text-sm font-semibold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {user?.name || "User"}
            </p>

            <p className="text-xs text-[#a8a8a8]">
              Account settings
            </p>
          </div>

          <span className="text-lg text-[#a8a8a8]">
            ⋯
          </span>
        </button>
      </div>
    </aside>
  );
}