import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import AdModal from "./admodal";
import AdDetailModal from "./addetailmodal";
import "../styles/global.css";

const tabs = [
    { id: "personal", label: "Особисті дані" },
    { id: "ads", label: "Мої оголошення" },
    { id: "favorites", label: "Улюблені оголошення" },
];

const statusLabels = {
    pending: "Очікує",
    active: "Активне",
    sold: "Продано",
    removed: "Знято",
};

function formatPrice(price) {
    return new Intl.NumberFormat("uk-UA", {
        style: "currency",
        currency: "UAH",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(price || 0));
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    return new Intl.DateTimeFormat("uk-UA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

function AdSummary({ ad, category, actionLabel, onAction, onOpenDetail }) {
    return (
        <article
            className="profile-listing-card"
            role="button"
            tabIndex="0"
            onClick={() => onOpenDetail(ad)}
            onKeyDown={(event) => {
                if (event.target !== event.currentTarget) {
                    return;
                }

                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenDetail(ad);
                }
            }}
        >
            <div>
                <span className={`status-badge ${ad.status}`}>{statusLabels[ad.status] || ad.status}</span>
                <h3>{ad.title}</h3>
            </div>
            <dl>
                <div>
                    <dt>Ціна</dt>
                    <dd>{formatPrice(ad.price)}</dd>
                </div>
                <div>
                    <dt>Категорія</dt>
                    <dd>{category?.name || "Без категорії"}</dd>
                </div>
                <div>
                    <dt>Дата</dt>
                    <dd>{formatDate(ad.created_at)}</dd>
                </div>
            </dl>
            {actionLabel && (
                <div className="profile-card-actions">
                    <button
                        className="small-btn primary"
                        onClick={(event) => {
                            event.stopPropagation();
                            onAction(ad);
                        }}
                    >
                        {actionLabel}
                    </button>
                </div>
            )}
        </article>
    );
}

export default function Profile({ session, onOpenAuth, onOpenChats, onSessionUpdate }) {
    const [activeTab, setActiveTab] = useState("personal");
    const [user, setUser] = useState(session?.user || null);
    const [ads, setAds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [profileForm, setProfileForm] = useState({
        username: session?.user?.username || "",
        email: session?.user?.email || "",
    });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(Boolean(session));
    const [profileSaving, setProfileSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [pendingEmailVerification, setPendingEmailVerification] = useState(null);
    const [emailVerificationCode, setEmailVerificationCode] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [managedAd, setManagedAd] = useState(null);
    const [detailAd, setDetailAd] = useState(null);

    const loadProfile = useCallback(async () => {
        if (!session) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const [nextUser, nextAds, nextCategories, nextUsers, nextFavorites] = await Promise.all([
                api.users.me(),
                api.ads.list(),
                api.categories.list(),
                api.users.list(),
                api.favorites.list(),
            ]);

            setUser(nextUser);
            setAds(nextAds);
            setCategories(nextCategories);
            setUsers(nextUsers);
            setFavorites(nextFavorites);
            setProfileForm({
                username: nextUser.username,
                email: nextUser.email,
            });
            setPendingEmailVerification(null);
            setEmailVerificationCode("");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (!message) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            setMessage("");
        }, 3000);

        return () => window.clearTimeout(timeout);
    }, [message]);

    const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
    const userById = useMemo(() => new Map(users.map((item) => [item.id, item])), [users]);
    const ownAds = useMemo(() => ads.filter((ad) => ad.user_id === user?.id), [ads, user]);
    const favoriteAds = useMemo(() => {
        const favoriteIds = new Set(favorites.map((favorite) => favorite.ad_id));
        return ads.filter((ad) => favoriteIds.has(ad.id));
    }, [ads, favorites]);

    function updateProfileField(event) {
        setProfileForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    function updatePasswordField(event) {
        setPasswordForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    function updateEmailVerificationCode(event) {
        setEmailVerificationCode(event.target.value);
    }

    async function saveProfile(event) {
        event.preventDefault();
        setMessage("");
        setError("");
        setProfileSaving(true);

        try {
            const nextEmail = profileForm.email.trim();
            const emailChanged = nextEmail.toLowerCase() !== user.email.toLowerCase();

            if (emailChanged && (!pendingEmailVerification || pendingEmailVerification.email !== nextEmail)) {
                const result = await api.users.requestEmailChange({ email: nextEmail });

                setPendingEmailVerification({
                    verificationId: result.verificationId,
                    email: nextEmail,
                });
                setEmailVerificationCode("");
                setMessage("Код підтвердження надіслано на нову пошту.");
                return;
            }

            if (emailChanged && !emailVerificationCode.trim()) {
                setError("Введіть код підтвердження нової пошти.");
                return;
            }

            const updatedUser = await api.users.updateMe({
                username: profileForm.username,
                email: nextEmail,
                ...(emailChanged ? {
                    emailVerificationId: pendingEmailVerification.verificationId,
                    emailVerificationCode: emailVerificationCode.trim(),
                } : {}),
            });

            setUser(updatedUser);
            onSessionUpdate(updatedUser);
            setPendingEmailVerification(null);
            setEmailVerificationCode("");
            setMessage("Дані профілю оновлено.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setProfileSaving(false);
        }
    }

    async function changePassword(event) {
        event.preventDefault();
        setMessage("");
        setError("");

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError("Нові паролі не збігаються.");
            return;
        }

        setPasswordSaving(true);

        try {
            await api.users.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setMessage("Пароль оновлено.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setPasswordSaving(false);
        }
    }

    function editOwnAd(ad) {
        setManagedAd(ad);
    }

    function openDetail(ad) {
        setDetailAd(ad);
    }

    function startFavoriteChat(ad) {
        setError("");

        if (ad.user_id === session.user.id) {
            setError("Це ваше оголошення. Для нього чат із собою не створюється.");
            return;
        }

        onOpenChats({ ad, receiverId: ad.user_id });
    }

    function handleAdSaved() {
        setManagedAd(null);
        loadProfile();
    }

    if (!session) {
        return (
            <div id="main">
                <div id="content" className="profile-content">
                    <section className="profile-hero">
                        <h1>Ваш профіль</h1>
                        <p>Увійдіть, щоб переглянути налаштування акаунту.</p>
                        <button className="btn primary" onClick={() => onOpenAuth("signin")}>
                            Увійти
                        </button>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div id="main">
            <div id="content" className="profile-content">
                {message && <div className="toast success-toast">{message}</div>}
                <section className="profile-hero">
                    <div>
                        <h1>Ваш профіль</h1>
                        <p>{user?.username || session.user.username}</p>
                    </div>
                </section>

                <section className="profile-shell">
                    <aside className="profile-menu" aria-label="Розділи профілю">
                        {tabs.map((tab) => (
                            <button
                                className={activeTab === tab.id ? "active" : ""}
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </aside>

                    <div className="profile-panel">
                        {loading ? (
                            <p className="empty-state compact">Завантаження...</p>
                        ) : (
                            <>
                                {error && <p className="page-error profile-message">{error}</p>}
                                {activeTab === "personal" && (
                                    <div className="profile-section-grid">
                                        <form className="profile-card profile-form" onSubmit={saveProfile}>
                                            <h2>Особисті дані</h2>
                                            <label>
                                                Нікнейм
                                                <input
                                                    name="username"
                                                    value={profileForm.username}
                                                    onChange={updateProfileField}
                                                    maxLength="15"
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Пошта
                                                <input
                                                    name="email"
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={updateProfileField}
                                                    required
                                                />
                                            </label>
                                            {pendingEmailVerification && (
                                                <>
                                                    <p className="modal-note">
                                                        Код підтвердження надіслано на {pendingEmailVerification.email}.
                                                    </p>
                                                    <label>
                                                        Код підтвердження пошти
                                                        <input
                                                            name="emailVerificationCode"
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={emailVerificationCode}
                                                            onChange={updateEmailVerificationCode}
                                                            maxLength="6"
                                                            required
                                                        />
                                                    </label>
                                                </>
                                            )}
                                            <button className="small-btn primary" type="submit" disabled={profileSaving}>
                                                {profileSaving ? "Зберігаю..." : "Зберегти"}
                                            </button>
                                        </form>

                                        <form className="profile-card profile-form" onSubmit={changePassword}>
                                            <h2>Зміна пароля</h2>
                                            <label>
                                                Поточний пароль
                                                <input
                                                    name="currentPassword"
                                                    type="password"
                                                    value={passwordForm.currentPassword}
                                                    onChange={updatePasswordField}
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Новий пароль
                                                <input
                                                    name="newPassword"
                                                    type="password"
                                                    minLength="6"
                                                    value={passwordForm.newPassword}
                                                    onChange={updatePasswordField}
                                                    required
                                                />
                                            </label>
                                            <label>
                                                Повторіть новий пароль
                                                <input
                                                    name="confirmPassword"
                                                    type="password"
                                                    minLength="6"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={updatePasswordField}
                                                    required
                                                />
                                            </label>
                                            <button className="small-btn primary" type="submit" disabled={passwordSaving}>
                                                {passwordSaving ? "Оновлюю..." : "Оновити пароль"}
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {activeTab === "ads" && (
                                    <div className="profile-card">
                                        <h2>Мої оголошення</h2>
                                        {ownAds.length ? (
                                            <div className="profile-listing-list">
                                                {ownAds.map((ad) => (
                                                    <AdSummary
                                                        ad={ad}
                                                        category={categoryById.get(ad.category_id)}
                                                        actionLabel="Редагувати"
                                                        onAction={editOwnAd}
                                                        onOpenDetail={openDetail}
                                                        key={ad.id}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="empty-state compact">У вас ще немає оголошень.</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === "favorites" && (
                                    <div className="profile-card">
                                        <h2>Улюблені оголошення</h2>
                                        {favoriteAds.length ? (
                                            <div className="profile-listing-list">
                                                {favoriteAds.map((ad) => (
                                                    <AdSummary
                                                        ad={ad}
                                                        category={categoryById.get(ad.category_id)}
                                                        actionLabel="Написати"
                                                        onAction={startFavoriteChat}
                                                        onOpenDetail={openDetail}
                                                        key={ad.id}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="empty-state compact">Улюблених оголошень ще немає.</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
                {managedAd && (
                    <AdModal
                        ad={managedAd}
                        categories={categories}
                        canManageStatus={false}
                        canDelete={managedAd.user_id === session.user.id}
                        onClose={() => setManagedAd(null)}
                        onSaved={handleAdSaved}
                    />
                )}
                {detailAd && (
                    <AdDetailModal
                        ad={detailAd}
                        category={categoryById.get(detailAd.category_id)}
                        seller={userById.get(detailAd.user_id)}
                        users={users}
                        session={session}
                        onClose={() => setDetailAd(null)}
                        onOpenAuth={onOpenAuth}
                        onOpenChats={onOpenChats}
                    />
                )}
            </div>
        </div>
    );
}
