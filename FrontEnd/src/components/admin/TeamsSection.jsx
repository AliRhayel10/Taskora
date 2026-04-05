import { useEffect, useMemo, useState } from "react";
import {
    FiSearch,
    FiPlus,
    FiMoreHorizontal,
    FiEdit2,
    FiTrash2,
    FiBriefcase,
    FiX,
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
    const [successMessage, setSuccessMessage] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [teamForm, setTeamForm] = useState({
        teamName: "",
        description: "",
    });

    const currentUser = useMemo(() => getStoredUser(), []);
    const companyId = currentUser?.companyId || 0;

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

    useEffect(() => {
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

    const openCreateModal = () => {
        setSuccessMessage("");
        setErrorMessage("");
        setTeamForm({
            teamName: "",
            description: "",
        });
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (isSubmitting) return;
        setIsCreateModalOpen(false);
    };

    const handleFormChange = (field, value) => {
        setTeamForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleCreateTeam = async (event) => {
        event.preventDefault();

        const cleanedForm = {
            teamName: teamForm.teamName.trim(),
            description: teamForm.description.trim(),
        };

        if (!cleanedForm.teamName) {
            setErrorMessage("Team name is required.");
            return;
        }

        if (!companyId) {
            setErrorMessage("Company not found. Please sign in again.");
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage("");
            setSuccessMessage("");

            const response = await fetch(`${API_BASE_URL}/api/teams`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    teamName: cleanedForm.teamName,
                    description: cleanedForm.description,
                    companyId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to create team.");
            }

            setSuccessMessage("Team created successfully.");
            setIsCreateModalOpen(false);
            setTeamForm({
                teamName: "",
                description: "",
            });

            await fetchTeams();
        } catch (error) {
            console.error("Failed to create team:", error);
            setErrorMessage(error.message || "Failed to create team.");
        } finally {
            setIsSubmitting(false);
        }
    };

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

                <button
                    type="button"
                    className="teams-section__create-btn"
                    onClick={openCreateModal}
                >
                    <FiPlus />
                    <span>Create Team</span>
                </button>
            </div>

            {successMessage && (
                <div className="teams-section__feedback teams-section__feedback--success">
                    {successMessage}
                </div>
            )}

            {isLoading && (
                <div className="teams-section__state-card">
                    <p>Loading teams...</p>
                </div>
            )}

            {!isLoading && errorMessage && !isCreateModalOpen && (
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

            {isCreateModalOpen && (
                <div className="teams-section__modal-overlay" onClick={closeCreateModal}>
                    <div
                        className="teams-section__modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="teams-section__modal-header">
                            <div>
                                <h3>Create Team</h3>
                                <p>Add a team name and short description.</p>
                            </div>

                            <button
                                type="button"
                                className="teams-section__modal-close"
                                onClick={closeCreateModal}
                                aria-label="Close create team form"
                            >
                                <FiX />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="teams-section__feedback teams-section__feedback--error">
                                {errorMessage}
                            </div>
                        )}

                        <form className="teams-section__form" onSubmit={handleCreateTeam}>
                            <div className="teams-section__form-group">
                                <label htmlFor="teamName">Team Name</label>
                                <input
                                    id="teamName"
                                    type="text"
                                    value={teamForm.teamName}
                                    onChange={(event) =>
                                        handleFormChange("teamName", event.target.value)
                                    }
                                    placeholder="Enter team name"
                                    maxLength={100}
                                />
                            </div>

                            <div className="teams-section__form-group">
                                <label htmlFor="teamDescription">Team Description</label>
                                <textarea
                                    id="teamDescription"
                                    value={teamForm.description}
                                    onChange={(event) =>
                                        handleFormChange("description", event.target.value)
                                    }
                                    placeholder="Enter team description"
                                    rows={4}
                                    maxLength={500}
                                />
                            </div>

                            <div className="teams-section__form-actions">
                                <button
                                    type="button"
                                    className="teams-section__secondary-btn"
                                    onClick={closeCreateModal}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="teams-section__submit-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create Team"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
