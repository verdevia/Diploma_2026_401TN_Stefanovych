import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import AdModal from "./admodal";
import AdDetailModal from "./addetailmodal";
import { lockPageScroll } from "../utils/scrollLock";
import "../styles/modal.css";

const roles = ["user", "moderator"];

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
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function toDateInputValue(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isWithinDateFilter(ad, from, to) {
    const createdDate = toDateInputValue(ad.created_at);

    if (from && createdDate < from) {
        return false;
    }

    if (to && createdDate > to) {
        return false;
    }

    return true;
}

export default function AdminModal({ session, onClose, onOpenAuth, onOpenChats }) {
    const [tab, setTab] = useState("users");
    const [users, setUsers] = useState([]);
    const [ads, setAds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryDrafts, setCategoryDrafts] = useState({});
    const [newCategory, setNewCategory] = useState("");
    const [adSearch, setAdSearch] = useState("");
    const [adDateFrom, setAdDateFrom] = useState("");
    const [adDateTo, setAdDateTo] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [managedAd, setManagedAd] = useState(null);
    const [detailAd, setDetailAd] = useState(null);
    const canAdmin = session.user.role === "admin" || session.user.role === "moderator";

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [nextUsers, nextAds, nextCategories] = await Promise.all([
                api.users.list(),
                api.ads.list(),
                api.categories.list(),
            ]);

            setUsers(nextUsers);
            setAds(nextAds);
            setCategories(nextCategories);
            setCategoryDrafts(Object.fromEntries(nextCategories.map((category) => [category.id, category.name])));
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

    const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
    const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
    const pendingAds = useMemo(() => (
        ads
            .filter((ad) => ad.status === "pending")
            .sort((left, right) => new Date(left.created_at) - new Date(right.created_at))
    ), [ads]);
    const manageableAds = useMemo(() => (
        ads
            .filter((ad) => ad.status !== "pending")
            .filter((ad) => isWithinDateFilter(ad, adDateFrom, adDateTo))
            .filter((ad) => {
                const query = adSearch.trim().toLowerCase();

                if (!query) {
                    return true;
                }

                const category = categoryById.get(ad.category_id)?.name || "";
                const seller = userById.get(ad.user_id)?.username || "";

                return [
                    ad.title,
                    ad.description,
                    category,
                    seller,
                ].some((value) => String(value || "").toLowerCase().includes(query));
            })
    ), [adDateFrom, adDateTo, adSearch, ads, categoryById, userById]);
    const pendingAd = pendingAds[0];

    function openDatePicker(event) {
        event.currentTarget.showPicker?.();
    }

    function preventDateTextInput(event) {
        if (!["Tab", "Shift", "ArrowLeft", "ArrowRight"].includes(event.key)) {
            event.preventDefault();
        }
    }

    async function updateUserRole(userId, role) {
        setError("");

        try {
            const updated = await api.users.updateRole(userId, role);
            setUsers((current) => current.map((user) => user.id === userId ? updated : user));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function deleteUser(userId) {
        setError("");

        try {
            await api.users.remove(userId);
            setUsers((current) => current.filter((user) => user.id !== userId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function createCategory(event) {
        event.preventDefault();
        setError("");

        const name = newCategory.trim();
        if (!name) {
            return;
        }

        try {
            const category = await api.categories.create({ name });
            setCategories((current) => [...current, category]);
            setCategoryDrafts((current) => ({ ...current, [category.id]: category.name }));
            setNewCategory("");
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function saveCategory(categoryId) {
        setError("");
        const name = categoryDrafts[categoryId]?.trim();

        if (!name) {
            setError("Назва категорії не може бути порожньою.");
            return;
        }

        try {
            const updated = await api.categories.update(categoryId, { name });
            setCategories((current) => current.map((category) => category.id === categoryId ? updated : category));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function deleteCategory(categoryId) {
        setError("");

        try {
            await api.categories.remove(categoryId);
            setCategories((current) => current.filter((category) => category.id !== categoryId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function approvePendingAd(ad) {
        setError("");

        try {
            const updated = await api.ads.update(ad.id, { status: "active" });
            setAds((current) => current.map((item) => item.id === ad.id ? updated : item));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    async function deleteAd(adId) {
        setError("");

        try {
            await api.ads.remove(adId);
            setAds((current) => current.filter((ad) => ad.id !== adId));
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    function editAd(ad) {
        setManagedAd(ad);
    }

    function openDetail(ad) {
        setDetailAd(ad);
    }

    function handleAdSaved() {
        setManagedAd(null);
        loadData();
    }

    return (
        <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
            <div className="modal-window admin-window" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <button className="close-btn" onClick={onClose} aria-label="Закрити">×</button>
                <h2>Адмін-панель</h2>

                <div className="modal-tabs" aria-label="Розділи адмін-панелі">
                    <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
                        Користувачі
                    </button>
                    <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>
                        Категорії
                    </button>
                    <button className={tab === "ads" ? "active" : ""} onClick={() => setTab("ads")}>
                        Оголошення
                    </button>
                    <button className={tab === "moderation" ? "active" : ""} onClick={() => setTab("moderation")}>
                        Модерація
                    </button>
                </div>

                {!canAdmin ? (
                    <p className="empty-state compact">Немає доступу.</p>
                ) : loading ? (
                    <p className="empty-state compact">Завантаження...</p>
                ) : (
                    <>
                        {error && <p className="form-error wide">{error}</p>}

                        {tab === "users" && (
                            <div className="admin-list">
                                {users.map((user) => (
                                    <div className="admin-row" key={user.id}>
                                        <div>
                                            <strong>{user.username}</strong>
                                            <span>{user.email}</span>
                                        </div>
                                        <select
                                            value={roles.includes(user.role) ? user.role : ""}
                                            onChange={(event) => updateUserRole(user.id, event.target.value)}
                                            disabled={user.id === session.user.id}
                                        >
                                            {user.role === "admin" && <option value="">admin</option>}
                                            {roles.map((role) => (
                                                <option value={role} key={role}>{role}</option>
                                            ))}
                                        </select>
                                        <button className="small-btn danger" onClick={() => deleteUser(user.id)} disabled={user.id === session.user.id}>
                                            Видалити
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {tab === "categories" && (
                            <div className="admin-stack">
                                <form className="inline-form" onSubmit={createCategory}>
                                    <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Нова категорія" />
                                    <button className="small-btn primary" type="submit">Додати</button>
                                </form>
                                {categories.length === 0 ? (
                                    <p className="empty-state compact">Категорій ще немає.</p>
                                ) : (
                                    <div className="admin-list">
                                        {categories.map((category) => (
                                            <div className="admin-row" key={category.id}>
                                                <input
                                                    value={categoryDrafts[category.id] || ""}
                                                    onChange={(event) => setCategoryDrafts((current) => ({
                                                        ...current,
                                                        [category.id]: event.target.value,
                                                    }))}
                                                />
                                                <button className="small-btn" onClick={() => saveCategory(category.id)}>
                                                    Зберегти
                                                </button>
                                                <button className="small-btn danger" onClick={() => deleteCategory(category.id)}>
                                                    Видалити
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "ads" && (
                            <div className="admin-stack">
                                <div className="admin-date-filter" aria-label="Фільтр оголошень за датою">
                                    <label className="admin-search-field">
                                        Пошук
                                        <input
                                            type="search"
                                            value={adSearch}
                                            onChange={(event) => setAdSearch(event.target.value)}
                                            placeholder="Ключові слова"
                                        />
                                    </label>
                                    <label>
                                        Від
                                        <input
                                            type="date"
                                            value={adDateFrom}
                                            onChange={(event) => setAdDateFrom(event.target.value)}
                                            onClick={openDatePicker}
                                            onKeyDown={preventDateTextInput}
                                            onPaste={(event) => event.preventDefault()}
                                            onDrop={(event) => event.preventDefault()}
                                        />
                                    </label>
                                    <label>
                                        До
                                        <input
                                            type="date"
                                            value={adDateTo}
                                            onChange={(event) => setAdDateTo(event.target.value)}
                                            onClick={openDatePicker}
                                            onKeyDown={preventDateTextInput}
                                            onPaste={(event) => event.preventDefault()}
                                            onDrop={(event) => event.preventDefault()}
                                        />
                                    </label>
                                    {(adSearch || adDateFrom || adDateTo) && (
                                        <button
                                            className="small-btn"
                                            type="button"
                                            onClick={() => {
                                                setAdSearch("");
                                                setAdDateFrom("");
                                                setAdDateTo("");
                                            }}
                                        >
                                            Скинути
                                        </button>
                                    )}
                                </div>
                                {manageableAds.length === 0 ? (
                                    <p className="empty-state compact">Оголошень для редагування немає.</p>
                                ) : (
                                    <div className="admin-list">
                                        {manageableAds.map((ad) => (
                                            <div
                                                className="admin-row listing-admin-row compact"
                                                key={ad.id}
                                                role="button"
                                                tabIndex="0"
                                                onClick={() => openDetail(ad)}
                                                onKeyDown={(event) => {
                                                    if (event.target !== event.currentTarget) {
                                                        return;
                                                    }

                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        openDetail(ad);
                                                    }
                                                }}
                                            >
                                                <div>
                                                    <strong>{ad.title}</strong>
                                                    <span>
                                                        {formatPrice(ad.price)} · {categoryById.get(ad.category_id)?.name || "Без категорії"} · {userById.get(ad.user_id)?.username || `#${ad.user_id}`} · {formatDate(ad.created_at)}
                                                    </span>
                                                </div>
                                                <button
                                                    className="small-btn"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        editAd(ad);
                                                    }}
                                                >
                                                    Редагувати
                                                </button>
                                                <button
                                                    className="small-btn danger"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        deleteAd(ad.id);
                                                    }}
                                                >
                                                    Видалити
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === "moderation" && (
                            <div className="moderation-panel">
                                {!pendingAd ? (
                                    <p className="empty-state compact">Оголошень у черзі на розгляд немає.</p>
                                ) : (
                                    <article className="moderation-card">
                                        <div className="moderation-card-header">
                                            <span className="status-badge pending">Очікує</span>
                                            <span>{pendingAds.length} у черзі</span>
                                        </div>
                                        <h3>{pendingAd.title}</h3>
                                        {pendingAd.image_url && (
                                            <img className="moderation-image" src={pendingAd.image_url} alt={pendingAd.title} />
                                        )}
                                        <strong>{formatPrice(pendingAd.price)}</strong>
                                        <p>{pendingAd.description || "Опис не додано."}</p>
                                        <dl className="moderation-meta">
                                            <div>
                                                <dt>Категорія</dt>
                                                <dd>{categoryById.get(pendingAd.category_id)?.name || "Без категорії"}</dd>
                                            </div>
                                            <div>
                                                <dt>Продавець</dt>
                                                <dd>{userById.get(pendingAd.user_id)?.username || `#${pendingAd.user_id}`}</dd>
                                            </div>
                                            <div>
                                                <dt>Створено</dt>
                                                <dd>{formatDate(pendingAd.created_at)}</dd>
                                            </div>
                                        </dl>
                                        <div className="moderation-actions">
                                            <button className="btn-log danger" onClick={() => deleteAd(pendingAd.id)}>
                                                Відхилити
                                            </button>
                                            <button className="btn-log" onClick={() => approvePendingAd(pendingAd)}>
                                                Одобрити
                                            </button>
                                        </div>
                                    </article>
                                )}
                            </div>
                        )}
                    </>
                )}
                {managedAd && (
                    <AdModal
                        ad={managedAd}
                        categories={categories}
                        canManageStatus
                        canDelete={false}
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
