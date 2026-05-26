import { useEffect, useState } from "react";

import { api } from "../api/client";
import { lockPageScroll } from "../utils/scrollLock";
import "../styles/modal.css";

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 191;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function buildInitialForm(ad) {
    return {
        title: ad?.title || "",
        description: ad?.description || "",
        image_url: ad?.image_url || "",
        price: ad?.price ? String(ad.price) : "",
        category_id: ad?.category_id ? String(ad.category_id) : "",
        status: ad?.status || "pending",
    };
}

export default function AdModal({ ad, categories, canManageStatus, canDelete, onClose, onSaved }) {
    const [form, setForm] = useState(() => buildInitialForm(ad));
    const [error, setError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isEditing = Boolean(ad);

    useEffect(() => {
        return lockPageScroll();
    }, []);

    function updateField(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    function updateImage(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        if (!allowedImageTypes.includes(file.type)) {
            setError("Зображення має бути у форматі JPG, PNG або WebP.");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setError("Зображення має бути не більше 1.5 МБ.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setError("");
            setForm((current) => ({
                ...current,
                image_url: String(reader.result || ""),
            }));
        };
        reader.onerror = () => setError("Не вдалося прочитати зображення.");
        reader.readAsDataURL(file);
    }

    function removeImage() {
        setForm((current) => ({
            ...current,
            image_url: "",
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const price = Number(form.price);

        if (!Number.isFinite(price) || price <= 0) {
            setError("Вартість має бути більше 0.");
            return;
        }

        if (form.description.trim().length > MAX_DESCRIPTION_LENGTH) {
            setError(`Опис має бути не довшим за ${MAX_DESCRIPTION_LENGTH} символ.`);
            return;
        }

        setIsSaving(true);

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            image_url: form.image_url || null,
            price,
            category_id: form.category_id ? Number(form.category_id) : null,
        };

        if (isEditing && canManageStatus) {
            payload.status = form.status;
        }

        try {
            if (isEditing) {
                await api.ads.update(ad.id, payload);
            } else {
                await api.ads.create(payload);
            }

            onSaved();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete() {
        if (!isEditing || !canDelete) {
            return;
        }

        const confirmed = window.confirm("Видалити це оголошення?");
        if (!confirmed) {
            return;
        }

        setError("");
        setIsDeleting(true);

        try {
            await api.ads.remove(ad.id);
            onSaved();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <div className="modal-overlay form-overlay" role="presentation" onMouseDown={onClose}>
            <div className="modal-window form-window" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <button className="close-btn" onClick={onClose} aria-label="Закрити">×</button>
                <h2>{isEditing ? "Редагувати оголошення" : "Нове оголошення"}</h2>

                <form className="modal-form" onSubmit={handleSubmit}>
                    <label>
                        Назва
                        <input name="title" value={form.title} onChange={updateField} required />
                    </label>
                    <label>
                        Категорія
                        <select name="category_id" value={form.category_id} onChange={updateField}>
                            <option value="">Без категорії</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Ціна
                        <input
                            name="price"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.price}
                            onChange={updateField}
                            required
                        />
                    </label>
                    <div className="image-upload-field">
                        <label>
                            Зображення
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={updateImage}
                            />
                        </label>
                        {form.image_url ? (
                            <div className="listing-image-preview">
                                <img src={form.image_url} alt="Попередній перегляд" />
                                <button className="small-btn" type="button" onClick={removeImage}>
                                    Прибрати зображення
                                </button>
                            </div>
                        ) : (
                            <p className="modal-note">Можна додати одне зображення до 1.5 МБ.</p>
                        )}
                    </div>
                    <label>
                        Опис
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={updateField}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            rows="5"
                        />
                        <span className="field-hint">
                            {form.description.length}/{MAX_DESCRIPTION_LENGTH}
                        </span>
                    </label>
                    {isEditing && canManageStatus && (
                        <label>
                            Статус
                            <select name="status" value={form.status} onChange={updateField}>
                                <option value="pending">Очікує</option>
                                <option value="active">Активне</option>
                                <option value="sold">Продано</option>
                                <option value="removed">Знято</option>
                            </select>
                        </label>
                    )}

                    {error && <p className="form-error">{error}</p>}

                    <div className="modal-actions">
                        <button className="btn-log" type="submit" disabled={isSaving || isDeleting}>
                            {isSaving ? "Зберігаю..." : "Зберегти"}
                        </button>
                        {isEditing && canDelete && (
                            <button
                                className="btn-log danger"
                                type="button"
                                onClick={handleDelete}
                                disabled={isSaving || isDeleting}
                            >
                                {isDeleting ? "Видаляю..." : "Видалити"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
