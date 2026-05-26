import { useEffect, useState } from "react";

import { api } from "../api/client";
import { lockPageScroll } from "../utils/scrollLock";
import "../styles/modal.css";

const initialForm = {
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export default function LoginModal({ mode, onModeChange, onClose, onAuthenticated }) {
    const [form, setForm] = useState(initialForm);
    const [pendingSignup, setPendingSignup] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSignup = mode === "signup";

    useEffect(() => {
        const unlock = lockPageScroll();

        function onKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", onKeyDown);

        return () => {
            unlock();
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    function updateField(event) {
        setForm((current) => ({
            ...current,
            [event.target.name]: event.target.value,
        }));
    }

    function switchMode(nextMode) {
        setPendingSignup(null);
        setVerificationCode("");
        setError("");
        onModeChange(nextMode);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (isSignup && !pendingSignup && form.password !== form.confirmPassword) {
            setError("Паролі не збігаються.");
            return;
        }

        if (isSignup && pendingSignup && !verificationCode.trim()) {
            setError("Введіть код підтвердження.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (isSignup && pendingSignup) {
                const session = await api.auth.confirmSignUp({
                    verificationId: pendingSignup.verificationId,
                    code: verificationCode.trim(),
                });

                onAuthenticated(session);
                return;
            }

            if (isSignup) {
                const result = await api.auth.requestSignUp({
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password,
                });

                setPendingSignup({
                    verificationId: result.verificationId,
                    email: form.email.trim(),
                });
                setVerificationCode("");
                return;
            }

            const session = await api.auth.signIn({
                email: form.email.trim(),
                password: form.password,
            });

            onAuthenticated(session);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
            <div className="modal-window auth-window" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                <button className="close-btn" onClick={onClose} aria-label="Закрити">×</button>

                <div className="modal-tabs" aria-label="Авторизація">
                    <button className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>
                        Вхід
                    </button>
                    <button className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
                        Реєстрація
                    </button>
                </div>

                <h2>{isSignup ? "Створити акаунт" : "Увійти"}</h2>

                <form className="modal-form" onSubmit={handleSubmit}>
                    {isSignup && pendingSignup ? (
                        <>
                            <p className="modal-note">
                                Ми надіслали код на {pendingSignup.email}. Введіть його, щоб створити акаунт.
                            </p>
                            <label>
                                Код підтвердження
                                <input
                                    name="verificationCode"
                                    type="text"
                                    inputMode="numeric"
                                    value={verificationCode}
                                    onChange={(event) => setVerificationCode(event.target.value)}
                                    maxLength="6"
                                    required
                                />
                            </label>
                            <button
                                className="small-btn"
                                type="button"
                                onClick={() => {
                                    setPendingSignup(null);
                                    setVerificationCode("");
                                    setError("");
                                }}
                            >
                                Змінити дані
                            </button>
                        </>
                    ) : (
                        <>
                            {isSignup && (
                                <label>
                                    Ім'я користувача
                                    <input
                                        name="username"
                                        type="text"
                                        value={form.username}
                                        onChange={updateField}
                                        minLength="2"
                                        maxLength="15"
                                        required
                                    />
                                </label>
                            )}
                            <label>
                                Email
                                <input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={updateField}
                                    required
                                />
                            </label>
                            <label>
                                Пароль
                                <input
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={updateField}
                                    minLength="6"
                                    required
                                />
                            </label>
                            {isSignup && (
                                <label>
                                    Повторіть пароль
                                    <input
                                        name="confirmPassword"
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={updateField}
                                        minLength="6"
                                        required
                                    />
                                </label>
                            )}
                        </>
                    )}

                    {error && <p className="form-error">{error}</p>}

                    <button className="btn-log" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Зачекайте..." : pendingSignup ? "Підтвердити код" : isSignup ? "Зареєструватися" : "Увійти"}
                    </button>
                </form>
            </div>
        </div>
    );
}
