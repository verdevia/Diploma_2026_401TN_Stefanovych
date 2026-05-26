import { useLocation, useNavigate } from "react-router-dom";

import "../styles/headfoot.css";

export default function Header({ session, onOpenAuth, onOpenAdmin, onOpenChats, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const canAdmin = session?.user?.role === "admin" || session?.user?.role === "moderator";

    return (
        <div id="header">
            <div id="partcont">
                <button onClick={() => navigate("/")} className={`nav ${location.pathname === "/" ? "active" : ""}`}>
                    <img id="icon" src="/assets/header/homelight.png" alt="" />
                </button>
                <button onClick={() => navigate("/market")} className={`nav ${location.pathname === "/market" ? "active" : ""}`}>
                    <img id="icon" src="/assets/header/storelight.png" alt="" />
                </button>
            </div>
            <div id="partcont" className="brand-slot">
                <strong>C2C Marketplace</strong>
            </div>
            <div id="partcont" className="header-actions">
                {session && (
                    <span className="greeting">Привіт, {session.user.username}!</span>
                )}
                {session && (
                    <button onClick={onOpenChats} className="nav compact">
                        <img id="icon" src="/assets/header/emaillight.png" alt="" />
                    </button>
                )}
                {canAdmin && (
                    <button onClick={onOpenAdmin} className="nav compact">
                        Адмін-панель
                    </button>
                )}
                {session ? (
                    <>
                        <button onClick={() => navigate("/profile")} className="nav compact profile-link">
                            Ваш профіль
                        </button>
                        <button onClick={onLogout} className="nav compact">
                            <img id="icon" src="/assets/header/logout.png" alt="" />
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onOpenAuth("signin")} className="nav compact">
                            Увійти
                        </button>
                        <button onClick={() => onOpenAuth("signup")} className="nav compact filled">
                            Реєстрація
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
