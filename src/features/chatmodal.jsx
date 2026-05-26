import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../api/client";
import { lockPageScroll } from "../utils/scrollLock";
import "../styles/modal.css";

function buildConversationKey(adId, otherUserId) {
    return `${adId}:${otherUserId}`;
}

function formatTime(value) {
    if (!value) {
        return "";
    }

    return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function upsertMessage(messages, nextMessage) {
    const exists = messages.some((message) => message.id === nextMessage.id);

    if (exists) {
        return messages.map((message) => message.id === nextMessage.id ? nextMessage : message);
    }

    return [...messages, nextMessage];
}

export default function ChatModal({ session, target, onClose }) {
    const [messages, setMessages] = useState([]);
    const [ads, setAds] = useState([]);
    const [users, setUsers] = useState([]);
    const [conversationScope, setConversationScope] = useState(() => (
        target?.ad?.user_id === session.user.id ? "own" : "foreign"
    ));
    const [selectedKey, setSelectedKey] = useState("");
    const [preferredKey, setPreferredKey] = useState(() => (
        target?.ad && target.receiverId ? buildConversationKey(target.ad.id, target.receiverId) : ""
    ));
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const messageListRef = useRef(null);
    const myId = session.user.id;

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [nextMessages, nextAds, nextUsers] = await Promise.all([
                api.messages.list(),
                api.ads.list(),
                api.users.list(),
            ]);

            setMessages(nextMessages);
            setAds(nextAds);
            setUsers(nextUsers);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unlock = lockPageScroll();
        loadData();

        return () => {
            unlock();
        };
    }, [loadData]);

    useEffect(() => {
        if (!session.token || typeof EventSource === "undefined") {
            return undefined;
        }

        const stream = new EventSource(api.messages.streamUrl(session.token));

        function readEvent(event) {
            return JSON.parse(event.data);
        }

        function handleCreated(event) {
            setMessages((current) => upsertMessage(current, readEvent(event)));
        }

        function handleUpdated(event) {
            setMessages((current) => upsertMessage(current, readEvent(event)));
        }

        function handleDeleted(event) {
            const deletedMessage = readEvent(event);
            setMessages((current) => current.filter((message) => message.id !== deletedMessage.id));
        }

        stream.addEventListener("message:created", handleCreated);
        stream.addEventListener("message:updated", handleUpdated);
        stream.addEventListener("message:deleted", handleDeleted);

        return () => {
            stream.close();
        };
    }, [session.token]);

    const adById = useMemo(() => new Map(ads.map((ad) => [ad.id, ad])), [ads]);
    const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

    const conversations = useMemo(() => {
        const map = new Map();

        messages.forEach((message) => {
            const otherUserId = message.sender_id === myId ? message.receiver_id : message.sender_id;
            const key = buildConversationKey(message.ad_id, otherUserId);
            const conversation = map.get(key) || {
                key,
                adId: message.ad_id,
                otherUserId,
                ad: adById.get(message.ad_id),
                otherUser: userById.get(otherUserId),
                messages: [],
            };

            conversation.messages.push(message);
            conversation.ad = conversation.ad || adById.get(message.ad_id);
            conversation.otherUser = conversation.otherUser || userById.get(otherUserId);
            map.set(key, conversation);
        });

        if (target?.ad && target.receiverId) {
            const key = buildConversationKey(target.ad.id, target.receiverId);
            const conversation = map.get(key) || {
                key,
                adId: target.ad.id,
                otherUserId: target.receiverId,
                ad: target.ad,
                otherUser: userById.get(target.receiverId),
                messages: [],
            };

            conversation.ad = conversation.ad || target.ad;
            conversation.otherUser = conversation.otherUser || userById.get(target.receiverId);
            map.set(key, conversation);
        }

        return Array.from(map.values()).sort((left, right) => {
            const leftDate = left.messages.at(-1)?.sent_at || "";
            const rightDate = right.messages.at(-1)?.sent_at || "";
            return rightDate.localeCompare(leftDate);
        });
    }, [adById, messages, myId, target, userById]);

    const visibleConversations = useMemo(() => (
        conversations.filter((conversation) => {
            const isOwnAd = conversation.ad?.user_id === myId;
            return conversationScope === "own" ? isOwnAd : !isOwnAd;
        })
    ), [conversationScope, conversations, myId]);

    useEffect(() => {
        if (visibleConversations.length === 0) {
            setSelectedKey("");
            return;
        }

        const hasSelected = visibleConversations.some((conversation) => conversation.key === selectedKey);

        if (preferredKey && visibleConversations.some((conversation) => conversation.key === preferredKey)) {
            setSelectedKey(preferredKey);
            setPreferredKey("");
        } else if (!hasSelected) {
            setSelectedKey(visibleConversations[0].key);
        }
    }, [preferredKey, selectedKey, visibleConversations]);

    const selectedConversation = visibleConversations.find((conversation) => conversation.key === selectedKey);

    useEffect(() => {
        const messageList = messageListRef.current;
        if (messageList) {
            messageList.scrollTop = messageList.scrollHeight;
        }
    }, [selectedConversation?.messages.length, selectedKey]);

    async function sendMessage(event) {
        event.preventDefault();
        setError("");

        const content = draft.trim();
        if (!content || !selectedConversation) {
            return;
        }

        try {
            const message = await api.messages.create({
                receiver_id: selectedConversation.otherUserId,
                ad_id: selectedConversation.adId,
                content,
            });

            setMessages((current) => upsertMessage(current, message));
            setDraft("");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    return (
        <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
            <div className="modal-window chat-window" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <button className="close-btn" onClick={onClose} aria-label="Закрити">×</button>
                <h2>Чати</h2>

                {error && <p className="form-error wide">{error}</p>}

                {loading ? (
                    <p className="empty-state compact">Завантаження...</p>
                ) : conversations.length === 0 ? (
                    <p className="empty-state compact">Активних діалогів ще немає.</p>
                ) : (
                    <div className="chat-stack">
                        <div className="chat-scope-switch" aria-label="Тип оголошень у чатах">
                            <button
                                className={conversationScope === "own" ? "active" : ""}
                                type="button"
                                onClick={() => setConversationScope("own")}
                            >
                                Мої оголошення
                            </button>
                            <button
                                className={conversationScope === "foreign" ? "active" : ""}
                                type="button"
                                onClick={() => setConversationScope("foreign")}
                            >
                                Чужі оголошення
                            </button>
                        </div>

                        {visibleConversations.length === 0 ? (
                            <p className="empty-state compact">У цьому розділі діалогів ще немає.</p>
                        ) : (
                            <div className="chat-layout">
                        <aside className="conversation-list" aria-label="Діалоги">
                            {visibleConversations.map((conversation) => (
                                <button
                                    key={conversation.key}
                                    className={conversation.key === selectedKey ? "active" : ""}
                                    onClick={() => setSelectedKey(conversation.key)}
                                >
                                    <strong>{conversation.ad?.title || `Оголошення #${conversation.adId}`}</strong>
                                    <span>{conversation.otherUser?.username || `Користувач #${conversation.otherUserId}`}</span>
                                </button>
                            ))}
                        </aside>

                        <section className="chat-panel">
                            <div className="chat-heading">
                                <strong>{selectedConversation?.ad?.title || "Оголошення"}</strong>
                                <span>{selectedConversation?.otherUser?.username || "Співрозмовник"}</span>
                            </div>

                            <div className="message-list" ref={messageListRef}>
                                {selectedConversation?.messages.length ? (
                                    selectedConversation.messages.map((message) => (
                                        <div
                                            className={`message-bubble ${message.sender_id === myId ? "outgoing" : "incoming"}`}
                                            key={message.id}
                                        >
                                            <p>{message.content}</p>
                                            <span>{formatTime(message.sent_at)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-state compact">Напишіть перше повідомлення.</p>
                                )}
                            </div>

                            <form className="chat-compose" onSubmit={sendMessage}>
                                <input
                                    value={draft}
                                    onChange={(event) => setDraft(event.target.value)}
                                    placeholder="Повідомлення"
                                />
                                <button className="small-btn primary" type="submit">Надіслати</button>
                            </form>
                        </section>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
