import { useEffect, useMemo, useState } from "react";
import {
    FiSearch,
    FiPlus,
    FiMoreHorizontal,
    FiEdit2,
    FiTrash2,
    FiBriefcase,
} from "react-icons/fi";
import "../../assets/styles/admin/teams-section.css";

const API_BASE_URL = "http://localhost:5000";

function getStoredUser() {
    try {
        const rawUser = localStorage.getItem("user");
        return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
        console.error("Failed to read user from localStorage.", error);
        return null;
    }
}

export default function TeamsSection() {
    const [teams, setTeams] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const currentUser = useMemo(() => getStoredUser(), []);
    const companyId = currentUser?.companyId || 0;

    useEffect(() => {
        const fetchTeams = async () => {
            if (!companyId) {
                setErrorMessage("Company not found. Please sign in again.");
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setErrorMessage("");

                const response = await fetch(
                    `${API_BASE_URL}/api/teams/company/${companyId}`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Failed to load teams.");
                }

                setTeams(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch teams:", error);
                setErrorMessage(error.message || "Failed to load teams.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeams();
    }, [companyId]);

    const filteredTeams = useMemo(() => {
        const value = searchTerm.trim().toLowerCase();

        if (!value) {
            return teams;
        }

        return teams.filter((team) => {
            return (
                (team.teamName || "").toLowerCase().includes(value) ||
                (team.description || "").toLowerCase().includes(value) ||
                (team.teamLeaderName || "").toLowerCase().includes(value)
            );
        });
    }, [searchTerm, teams]);

    return (
        <section className="teams-section">
            <div className="teams-section__title-row">
                <h2>Teams</h2>
                <div className="teams-section__title-line"></div>
            </div>

            <div className="teams-section__toolbar">
                <div className="teams-section__search">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search teams..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>

                <button type="button" className="teams-section__create-btn">
                    <FiPlus />
                    <span>Create Team</span>
                </button>
            </div>

            {isLoading && (
                <div className="teams-section__state-card">
                    <p>Loading teams...</p>
                </div>
            )}

            {!isLoading && errorMessage && (
                <div className="teams-section__state-card teams-section__state-card--error">
                    <p>{errorMessage}</p>
                </div>
            )}

            {!isLoading && !errorMessage && filteredTeams.length === 0 && (
                <div className="teams-section__state-card">
                    <div className="teams-section__state-icon">
                        <FiBriefcase />
                    </div>
                    <h3>No teams yet</h3>
                    <p>
                        Created teams will appear here after they are saved in the backend.
                    </p>
                </div>
            )}

            {!isLoading && !errorMessage && filteredTeams.length > 0 && (
                <div className="teams-section__grid">
                    {filteredTeams.map((team) => (
                        <article key={team.teamId} className="teams-section__card">
                            <div className="teams-section__card-top">
                                <div>
                                    <h3>{team.teamName}</h3>
                                    <p>{team.description || "No description added yet."}</p>
                                </div>

                                <button
                                    type="button"
                                    className="teams-section__icon-btn"
                                    aria-label={`More actions for ${team.teamName}`}
                                >
                                    <FiMoreHorizontal />
                                </button>
                            </div>

                            <div className="teams-section__card-bottom">
                                <div className="teams-section__meta">
                                    <span className="teams-section__badge">
                                        {team.teamLeaderName || "No team leader assigned"}
                                    </span>
                                    <span className="teams-section__tasks">
                                        {team.tasksCount || 0} Tasks
                                    </span>
                                </div>

                                <div className="teams-section__actions">
                                    <button type="button" className="teams-section__action-btn">
                                        <FiEdit2 />
                                        <span>Edit</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="teams-section__action-btn teams-section__action-btn--danger"
                                    >
                                        <FiTrash2 />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}