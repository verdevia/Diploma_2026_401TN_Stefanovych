import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client";
import { lockPageScroll } from "../utils/scrollLock";
import "../styles/modal.css";

const emptyReviewForm = {
    rating: "5",
    comment: "",
};

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

function renderStars(value) {
    const rating = Number(value || 0);
    return "★★★★★".split("").map((star, index) => (
        <span className={index < rating ? "filled" : ""} key={`${star}-${index}`}>★</span>
    ));
}

function StarRatingInput({ value, onChange, disabled = false }) {
    const [hoveredRating, setHoveredRating] = useState(0);
    const selectedRating = Number(value || 0);
    const activeRating = hoveredRating || selectedRating;

    return (
        <div className="rating-picker" role="radiogroup" aria-label="Оцінка" onMouseLeave={() => setHoveredRating(0)}>
            {[1, 2, 3, 4, 5].map((rating) => (
                <button
                    className={`rating-star ${rating <= activeRating ? "active" : ""}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedRating === rating}
                    aria-label={`${rating} з 5`}
                    disabled={disabled}
                    key={rating}
                    onClick={() => onChange(String(rating))}
                    onMouseEnter={() => setHoveredRating(rating)}
                >
                    ★
                </button>
            ))}
        </div>
    );
}

export default function AdDetailModal({ ad, category, seller, users, session, onClose, onOpenAuth, onOpenChats }) {
    const [reviews, setReviews] = useState([]);
    const [reviewForm, setReviewForm] = useState(emptyReviewForm);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingReviewId, setDeletingReviewId] = useState(null);
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [error, setError] = useState("");
    const isOwner = session?.user?.id === ad.user_id;
    const canReviewAd = ad.status === "active";
    const isEditingReview = Boolean(editingReviewId);
    const canModerateReviews = session?.user?.role === "admin" || session?.user?.role === "moderator";

    const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
    const myReview = useMemo(() => (
        session ? reviews.find((review) => review.reviewer_id === session.user.id) : null
    ), [reviews, session]);
    const averageRating = useMemo(() => {
        if (!reviews.length) {
            return 0;
        }

        return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
    }, [reviews]);

    useEffect(() => {
        return lockPageScroll();
    }, []);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        api.reviews.list(ad.id)
            .then((nextReviews) => {
                if (active) {
                    setReviews(nextReviews);
                }
            })
            .catch((requestError) => {
                if (active) {
                    setError(requestError.message);
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [ad.id]);

    function updateReviewField(event) {
        setReviewForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    function updateReviewRating(rating) {
        setReviewForm((current) => ({
            ...current,
            rating,
        }));
    }

    function resetReviewForm() {
        setReviewForm(emptyReviewForm);
        setEditingReviewId(null);
    }

    function startEditReview(review) {
        setError("");
        setEditingReviewId(review.id);
        setReviewForm({
            rating: String(review.rating || 5),
            comment: review.comment || "",
        });
    }

    function requireAuth(action) {
        if (!session) {
            onClose();
            onOpenAuth("signin");
            return false;
        }

        action();
        return true;
    }

    function startChat() {
        requireAuth(() => {
            if (!isOwner) {
                onClose();
                onOpenChats({ ad, receiverId: ad.user_id });
            }
        });
    }

    async function submitReview(event) {
        event.preventDefault();
        setError("");

        if (!session) {
            onClose();
            onOpenAuth("signin");
            return;
        }

        if (!canReviewAd) {
            setError("Відгук можна залишити лише для активного оголошення.");
            return;
        }

        if (!reviewForm.comment.trim()) {
            setError("Введіть текст відгуку.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                rating: Number(reviewForm.rating),
                comment: reviewForm.comment.trim(),
            };

            if (isEditingReview) {
                const review = await api.reviews.update(editingReviewId, payload);
                setReviews((current) => current.map((item) => (item.id === review.id ? review : item)));
                resetReviewForm();
            } else {
                const review = await api.reviews.create({
                    ...payload,
                    ad_id: ad.id,
                });

                setReviews((current) => [review, ...current]);
                setReviewForm(emptyReviewForm);
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function deleteReview(review) {
        const isMyReview = session?.user?.id === review.reviewer_id;
        const confirmed = window.confirm(isMyReview ? "Видалити ваш відгук?" : "Видалити цей відгук?");
        if (!confirmed) {
            return;
        }

        setError("");
        setDeletingReviewId(review.id);

        try {
            await api.reviews.remove(review.id);
            setReviews((current) => current.filter((item) => item.id !== review.id));

            if (editingReviewId === review.id) {
                resetReviewForm();
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setDeletingReviewId(null);
        }
    }

    return (
        <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
            <div className="modal-window detail-window" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <button className="close-btn" onClick={onClose} aria-label="Закрити">×</button>

                <div className="detail-layout">
                    <section className="detail-media">
                        {ad.image_url ? (
                            <img src={ad.image_url} alt={ad.title} />
                        ) : (
                            <div className="detail-image-placeholder">Зображення не додано</div>
                        )}
                    </section>

                    <section className="detail-info">
                        <span className={`status-badge ${ad.status}`}>{statusLabels[ad.status] || ad.status}</span>
                        <h2>{ad.title}</h2>
                        <strong className="detail-price">{formatPrice(ad.price)}</strong>
                        <p>{ad.description || "Опис не додано."}</p>

                        <dl className="detail-meta">
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

                        {!isOwner && (
                            <button className="small-btn primary" type="button" onClick={startChat}>
                                Написати продавцю
                            </button>
                        )}
                    </section>
                </div>

                <section className="review-section">
                    <div className="review-heading">
                        <div>
                            <h3>Відгуки</h3>
                            <p>{reviews.length ? `${reviews.length} відгуків` : "Відгуків ще немає"}</p>
                        </div>
                        {reviews.length > 0 && (
                            <div className="rating-summary">
                                <strong>{averageRating.toFixed(1)}</strong>
                                <span className="star-rating" aria-label={`Середня оцінка ${averageRating.toFixed(1)}`}>
                                    {renderStars(Math.round(averageRating))}
                                </span>
                            </div>
                        )}
                    </div>

                    {error && <p className="form-error wide">{error}</p>}

                    {loading ? (
                        <p className="empty-state compact">Завантаження відгуків...</p>
                    ) : reviews.length === 0 ? (
                        <p className="empty-state compact">Будьте першим, хто залишить відгук про цей товар.</p>
                    ) : (
                        <div className="review-list">
                            {reviews.map((review) => {
                                const reviewer = userById.get(review.reviewer_id);
                                const isMyReview = session?.user?.id === review.reviewer_id;
                                const canDeleteReview = isMyReview || canModerateReviews;

                                return (
                                    <article className="review-card" key={review.id}>
                                        <div className="review-card-heading">
                                            <div>
                                                <strong>{reviewer?.username || `Користувач #${review.reviewer_id}`}</strong>
                                                {isMyReview && <span className="own-review-label">Ваш відгук</span>}
                                            </div>
                                            <span>{formatDate(review.created_at)}</span>
                                        </div>
                                        <span className="star-rating" aria-label={`Оцінка ${review.rating}`}>
                                            {renderStars(review.rating)}
                                        </span>
                                        <p>{review.comment}</p>
                                        {canDeleteReview && (
                                            <div className="review-actions">
                                                {isMyReview && (
                                                    <button
                                                        className="small-btn"
                                                        type="button"
                                                        onClick={() => startEditReview(review)}
                                                        disabled={isSubmitting || Boolean(deletingReviewId)}
                                                    >
                                                        Редагувати
                                                    </button>
                                                )}
                                                {canDeleteReview && (
                                                    <button
                                                        className="small-btn danger"
                                                        type="button"
                                                        onClick={() => deleteReview(review)}
                                                        disabled={isSubmitting || Boolean(deletingReviewId)}
                                                    >
                                                        {deletingReviewId === review.id ? "Видаляю..." : "Видалити"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {isOwner ? (
                        <p className="modal-note">Власник оголошення не може залишати відгук на свій товар.</p>
                    ) : !canReviewAd ? (
                        <p className="modal-note">Відгук можна залишити лише для активного оголошення.</p>
                    ) : myReview && !isEditingReview ? (
                        <p className="modal-note">Ви вже залишили відгук на цей товар. Його можна змінити або видалити у списку вище.</p>
                    ) : (
                        <form className="review-form" onSubmit={submitReview}>
                            <label>
                                Оцінка
                                <StarRatingInput value={reviewForm.rating} onChange={updateReviewRating} disabled={isSubmitting} />
                            </label>
                            <label>
                                Текст відгуку
                                <textarea
                                    name="comment"
                                    value={reviewForm.comment}
                                    onChange={updateReviewField}
                                    maxLength="1000"
                                    rows="4"
                                    required
                                />
                            </label>
                            <div className="review-form-actions">
                                <button className="btn-log" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Зберігаю..." : (isEditingReview ? "Зберегти зміни" : "Залишити відгук")}
                                </button>
                                {isEditingReview && (
                                    <button className="small-btn" type="button" onClick={resetReviewForm} disabled={isSubmitting}>
                                        Скасувати
                                    </button>
                                )}
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </div>
    );
}
