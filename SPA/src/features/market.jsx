import { useCallback, useMemo, useState, useEffect } from "react";

import { api } from "../api/client";
import AdModal from "./admodal";
import AdDetailModal from "./addetailmodal";
import "../styles/global.css";

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

export default function Market({ session, onOpenAuth, onOpenChats }) {
    const [ads, setAds] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("active");
    const [sortOrder, setSortOrder] = useState("newest");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [managedAd, setManagedAd] = useState(null);
    const [detailAd, setDetailAd] = useState(null);
    const [showAdForm, setShowAdForm] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const shouldRequestAllStatuses = session?.user?.role === "admin" || session?.user?.role === "moderator";
            const [nextAds, nextCategories, nextUsers, nextFavorites] = await Promise.all([
                api.ads.list(shouldRequestAllStatuses ? undefined : { status: "active" }),
                api.categories.list(),
                api.users.list(),
                session ? api.favorites.list().catch(() => []) : Promise.resolve([]),
            ]);

            setAds(nextAds);
            setCategories(nextCategories);
            setUsers(nextUsers);
            setFavorites(nextFavorites);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
    const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
    const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.ad_id)), [favorites]);
    const canManageStatus = session?.user?.role === "admin" || session?.user?.role === "moderator";
    const effectiveStatusFilter = canManageStatus ? statusFilter : "active";

    const filteredAds = useMemo(() => {
        const query = search.trim().toLowerCase();

        return ads.filter((ad) => {
            const matchesSearch = !query
                || ad.title.toLowerCase().includes(query)
                || (ad.description || "").toLowerCase().includes(query);
            const matchesCategory = categoryFilter === "all" || String(ad.category_id || "") === categoryFilter;
            const matchesStatus = effectiveStatusFilter === "all" || ad.status === effectiveStatusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        }).sort((left, right) => {
            if (sortOrder === "oldest") {
                return new Date(left.created_at) - new Date(right.created_at);
            }

            if (sortOrder === "price-desc") {
                return Number(right.price || 0) - Number(left.price || 0);
            }

            if (sortOrder === "price-asc") {
                return Number(left.price || 0) - Number(right.price || 0);
            }

            return new Date(right.created_at) - new Date(left.created_at);
        });
    }, [ads, categoryFilter, effectiveStatusFilter, search, sortOrder]);

    async function toggleFavorite(ad) {
        if (!session) {
            onOpenAuth("signin");
            return;
        }

        setError("");

        try {
            if (favoriteIds.has(ad.id)) {
                await api.favorites.remove(ad.id);
                setFavorites((current) => current.filter((favorite) => favorite.ad_id !== ad.id));
            } else {
                const favorite = await api.favorites.add(ad.id);
                setFavorites((current) => [...current, favorite]);
            }
        } catch (requestError) {
            setError(requestError.message);
        }
    }

    function openCreateForm() {
        if (!session) {
            onOpenAuth("signin");
            return;
        }

        setManagedAd(null);
        setShowAdForm(true);
    }

    function openEditForm(ad) {
        setManagedAd(ad);
        setShowAdForm(true);
    }

    function openDetail(ad) {
        setDetailAd(ad);
    }

    function startChat(ad) {
        if (!session) {
            onOpenAuth("signin");
            return;
        }

        if (ad.user_id === session.user.id) {
            setError("Це ваше оголошення. Для нього чат із собою не створюється.");
            return;
        }

        onOpenChats({ ad, receiverId: ad.user_id });
    }

    function handleSavedAd() {
        setShowAdForm(false);
        setManagedAd(null);
        loadData();
    }

    return (
        <div id="main">
            <div id="content" className="market-content">
                <section className="market-hero">
                    <div>
                        <h1>Маркет</h1>
                    </div>
                    <button className="btn primary" onClick={openCreateForm}>
                        Додати оголошення
                    </button>
                </section>

                <section className={`market-toolbar ${canManageStatus ? "" : "compact"}`} aria-label="Фільтри оголошень">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Пошук за назвою або описом"
                    />
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                        <option value="all">Усі категорії</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                        <option value="newest">Спочатку нові</option>
                        <option value="oldest">Спочатку старі</option>
                        <option value="price-desc">Спочатку дорожчі</option>
                        <option value="price-asc">Спочатку дешевші</option>
                    </select>
                    {canManageStatus && (
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                            <option value="active">Активні</option>
                            <option value="pending">Очікують</option>
                            <option value="sold">Продані</option>
                            <option value="removed">Зняті</option>
                            <option value="all">Усі статуси</option>
                        </select>
                    )}
                </section>

                {error && <p className="page-error">{error}</p>}

                {loading ? (
                    <div className="empty-state">Завантаження оголошень...</div>
                ) : filteredAds.length === 0 ? (
                    <div className="empty-state">Оголошень за обраними фільтрами немає.</div>
                ) : (
                    <section className="listing-grid">
                        {filteredAds.map((ad) => {
                            const seller = userById.get(ad.user_id);
                            const category = categoryById.get(ad.category_id);
                            const isOwner = session?.user?.id === ad.user_id;
                            const canEdit = isOwner;

                            return (
                                <article
                                    className="listing-card"
                                    key={ad.id}
                                    role="button"
                                    tabIndex="0"
                                    onClick={() => openDetail(ad)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openDetail(ad);
                                        }
                                    }}
                                >
                                    <div className="listing-card-top">
                                        <span className={`status-badge ${ad.status}`}>{statusLabels[ad.status] || ad.status}</span>
                                        {!isOwner && (
                                            <button
                                                className={`icon-button ${favoriteIds.has(ad.id) ? "selected" : ""}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleFavorite(ad);
                                                }}
                                                aria-label="Додати в обране"
                                            >
                                                ★
                                            </button>
                                        )}
                                    </div>
                                    {ad.image_url && (
                                        <img className="listing-image" src={ad.image_url} alt={ad.title} />
                                    )}
                                    <h2>{ad.title}</h2>
                                    <strong className="price">{formatPrice(ad.price)}</strong>
                                    <dl className="listing-meta">
                                        <div>
                                            <dt>Категорія</dt>
                                            <dd>{category?.name || "Без категорії"}</dd>
                                        </div>
                                        <div>
                                            <dt>Продавець</dt>
                                            <dd>{seller?.username || `#${ad.user_id}`}</dd>
                                        </div>
                                        <div>
                                            <dt>Дата</dt>
                                            <dd>{formatDate(ad.created_at)}</dd>
                                        </div>
                                    </dl>
                                    <div className="card-actions">
                                        {!isOwner && (
                                            <button
                                                className="small-btn primary"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    startChat(ad);
                                                }}
                                            >
                                                Написати
                                            </button>
                                        )}
                                        {canEdit && (
                                            <button
                                                className="small-btn"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    openEditForm(ad);
                                                }}
                                            >
                                                Редагувати
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}

                {showAdForm && (
                    <AdModal
                        ad={managedAd}
                        categories={categories}
                        canManageStatus={Boolean(managedAd && canManageStatus)}
                        canDelete={Boolean(managedAd && managedAd.user_id === session?.user?.id)}
                        onClose={() => setShowAdForm(false)}
                        onSaved={handleSavedAd}
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
