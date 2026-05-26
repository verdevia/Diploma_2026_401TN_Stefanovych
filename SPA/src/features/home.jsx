import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import "../styles/global.css";

const fallbackStats = [
    { label: "Активних оголошень", value: "0" },
    { label: "Зареєстрованих користувачів", value: "0" },
];

function getDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function buildLastSevenDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));

        return {
            key: getDayKey(date),
            label: new Intl.DateTimeFormat("uk-UA", { weekday: "short" }).format(date),
            dateLabel: new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit" }).format(date),
            count: 0,
        };
    });
}

function buildWeeklyAdChart(ads) {
    const days = buildLastSevenDays();
    const counts = new Map(days.map((day) => [day.key, 0]));

    ads.forEach((ad) => {
        if (!ad.created_at) {
            return;
        }

        const createdAt = new Date(ad.created_at);
        const dayKey = getDayKey(createdAt);

        if (counts.has(dayKey)) {
            counts.set(dayKey, counts.get(dayKey) + 1);
        }
    });

    return days.map((day) => ({
        ...day,
        count: counts.get(day.key) || 0,
    }));
}

export default function Home({ session, onOpenAuth }) {
    const navigate = useNavigate();
    const [stats, setStats] = useState(fallbackStats);
    const [weeklyAds, setWeeklyAds] = useState(() => buildLastSevenDays());

    useEffect(() => {
        let active = true;

        Promise.all([
            api.ads.list(),
            api.users.list(),
        ])
            .then(([ads, users]) => {
                if (!active) {
                    return;
                }

                setStats([
                    { label: "Активних оголошень", value: String(ads.filter((ad) => ad.status === "active").length) },
                    { label: "Зареєстрованих користувачів", value: String(users.length) },
                ]);
                setWeeklyAds(buildWeeklyAdChart(ads));
            })
            .catch(() => {
                if (active) {
                    setStats(fallbackStats);
                    setWeeklyAds(buildLastSevenDays());
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const maxWeeklyAds = Math.max(1, ...weeklyAds.map((day) => day.count));

    return (
        <div id="main">
            <div id="content">
                <section id="welcome">
                    <h1>C2C Marketplace</h1>
                    <p>Надійна торгівельна платформа для швидких та якісних угод</p>
                </section>

                <section id="block">
                    <div className="containerv">
                        <h2>Чому саме ми?</h2>
                        <div className="containerh feature-grid">
                            <article className="panel">
                                <img src="/assets/home/shop.png" alt="" />
                                <h3>Купуйте та продавайте</h3>
                                <p>Легко створюйте власні оголошення та знаходьте те, що вам потрібно</p>
                            </article>
                            <article className="panel">
                                <img src="/assets/home/lock.png" alt="" />
                                <h3>Безпечні угоди</h3>
                                <p>Система рейтингів та відгуків для забезпечення безпечних та надійних угод</p>
                            </article>
                            <article className="panel">
                                <img src="/assets/home/message.png" alt="" />
                                <h3>Прямий зв'язок</h3>
                                <p>Безпосередній зв'язок між продавцем та покупцем</p>
                            </article>
                            <article className="panel">
                                <img src="/assets/home/star.png" alt="" />
                                <h3>Обране</h3>
                                <p>Сподобалось оголошення? Додайте його до улюблених!</p>
                            </article>
                        </div>
                    </div>

                    <div className="containerv stats-section">
                        <h2>Статистика</h2>
                        <div className="containerh stats-grid">
                            {stats.map((item) => (
                                <article className="panel stat-panel" key={item.label}>
                                    <strong>{item.value}</strong>
                                    <span>{item.label}</span>
                                </article>
                            ))}
                            <article className="panel chart-panel">
                                <h3>Оголошення за 7 днів</h3>
                                <div className="weekly-chart" aria-label="Кількість створених оголошень за останні 7 днів">
                                    {weeklyAds.map((day) => (
                                        <div className="chart-column" key={day.key}>
                                            <span className="chart-value">{day.count}</span>
                                            <div className="chart-bar-track">
                                                <div
                                                    className="chart-bar"
                                                    style={{ "--bar-height": day.count === 0 ? "0%" : `${Math.max(8, (day.count / maxWeeklyAds) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="chart-label">{day.label}</span>
                                            <span className="chart-date">{day.dateLabel}</span>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                <section id="quickstart">
                    <div className="containerv">
                        <h2>Готові розпочати?</h2>
                        <p>Приєднуйтесь до спільноти й відкривайте перші пропозиції просто зараз.</p>
                        {session ? (
                            <button className="btn primary" id="reg" onClick={() => navigate("/market")}>
                                До маркету
                            </button>
                        ) : (
                            <button className="btn primary" id="reg" onClick={() => onOpenAuth("signup")}>
                            Зареєструватися
                            </button>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
