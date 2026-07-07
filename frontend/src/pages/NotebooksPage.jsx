import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import Modal from "../components/UI/Modal";
import Button from "../components/UI/Button";
import ConfirmationModal from "../components/UI/ConfirmationModal";
import { useGhostGuard } from "../hooks/useGhostGuard";
import { GHOST_NOTEBOOKS } from "../data/ghostDemoData";
import { toast } from "react-hot-toast";
import "../assets/styles/pages/notebooks.css";

const ACCENTS = [
  "var(--accent-teal)", "var(--accent-purple)", "var(--accent-amber)",
  "var(--accent-coral)", "var(--accent-blue)", "var(--accent-pink)",
  "var(--accent-lime)", "var(--accent-yellow)", "var(--accent-cyan)", "var(--accent-peach)",
];

const fetchNotebooksList = async () => {
  const { data } = await api.get("/notebooks");
  return data;
};

const NotebooksPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guardAction, isGhost } = useGhostGuard();

  const [showModal, setShowModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false });
  const [name, setName]           = useState("");
  const [accent, setAccent]       = useState(ACCENTS[0]);
  const [saving, setSaving]       = useState(false);
  const [editingNotebook, setEditingNotebook] = useState(null);

  const showConfirm = (options) => {
    setConfirmConfig({
      isOpen: true,
      ...options
    });
  };

  const location = useLocation();

  const { data: serverNotebooks = [], isLoading: loading } = useQuery({
    queryKey: ["notebooks"],
    queryFn: fetchNotebooksList,
    enabled: !isGhost,
  });

  const notebooks = isGhost ? GHOST_NOTEBOOKS : serverNotebooks;

  const openCreate = () => {
    setEditingNotebook(null);
    setName("");
    setAccent(ACCENTS[Math.floor(Math.random() * ACCENTS.length)]);
    setShowModal(true);
  };

  useEffect(() => {
    if (location.state?.createNew) {
      guardAction(openCreate);
      window.history.replaceState({}, document.title);
    }
  }, [location, guardAction]);

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNotebook(null);
  };

  const handleEditClick = (e, notebook) => {
    e.stopPropagation();
    setEditingNotebook(notebook);
    setName(notebook.name);
    setAccent(notebook.accent || "var(--accent-purple)");
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    guardAction(async () => {
      setSaving(true);
      try {
        await api.post("/notebooks", { name: name.trim(), accent });
        queryClient.invalidateQueries({ queryKey: ["notebooks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        setShowModal(false);
        toast.success("Notebook created successfully!");
      } catch (error) {
        toast.error("Failed to create notebook.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleUpdate = async () => {
    if (!name.trim() || !editingNotebook) return;
    guardAction(async () => {
      setSaving(true);
      try {
        await api.put(`/notebooks/${editingNotebook._id}`, { name: name.trim(), accent });
        queryClient.invalidateQueries({ queryKey: ["notebooks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        setShowModal(false);
        setEditingNotebook(null);
        toast.success("Notebook updated successfully!");
      } catch (error) {
        toast.error("Failed to update notebook.");
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = (e, notebook) => {
    e.stopPropagation();
    showConfirm({
      title: "Delete Notebook?",
      message: `Are you sure you want to delete "${notebook.name}"? Notes inside will be kept, just ungrouped.`,
      confirmLabel: "Delete Notebook",
      variant: "danger",
      onConfirm: async () => {
        setConfirmConfig({ isOpen: false });
        guardAction(async () => {
          try {
            await api.delete(`/notebooks/${notebook._id}`);
            queryClient.invalidateQueries({ queryKey: ["notebooks"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
            toast.success("Notebook deleted successfully!");
          } catch (error) {
            toast.error("Failed to delete notebook.");
          }
        });
      },
      onCancel: () => setConfirmConfig({ isOpen: false })
    });
  };

  const openNotebook = (notebook) => {
    navigate(`/notebooks/${notebook._id}`);
  };

  return (
    <div>
      <div className="notebooks-header-container">
        <div>
          <h1 className="page-heading" style={{ marginBottom: 0 }}>Notebooks</h1>
          <p className="page-subheading">Organize your notebooks.</p>
        </div>
        <Button onClick={() => guardAction(openCreate)} icon="fa-solid fa-plus">New Notebook</Button>
      </div>

      {loading ? (
        <div className="notebook-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="notebook-card skeleton-loader" style={{ height: "135px", borderRadius: "var(--radius-md)" }}></div>
          ))}
        </div>
      ) : notebooks.length === 0 ? (
        <div className="empty-state">
          <i className="fa-regular fa-folder-open"></i>
          <p>No notebooks yet. Create one to start organizing your notes.</p>
        </div>
      ) : (
        <div className="notebook-grid">
          {notebooks.map((nb) => (
            <div
              className="notebook-card"
              key={nb._id}
              onClick={() => openNotebook(nb)}
              style={{ "--card-accent": nb.accent || "var(--accent-purple)" }}
            >
              <div className="notebook-card-header">
                <span className="notebook-card-icon" style={{ background: `color-mix(in srgb, var(--card-accent) 15%, transparent)`, color: `var(--card-accent)` }}>
                  <i className="fa-solid fa-folder"></i>
                </span>
                <div className="notebook-card-actions">
                  <button
                    type="button"
                    className="notebook-edit-btn"
                    title="Edit notebook"
                    onClick={(e) => handleEditClick(e, nb)}
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    type="button"
                    className="notebook-delete-btn"
                    title="Delete notebook"
                    onClick={(e) => { e.stopPropagation(); handleDelete(e, nb); }}
                  >
                    <i className="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              </div>
              <div className="notebook-card-value" title={nb.name}>
                {nb.name}
              </div>
              <div className="notebook-card-label">
                {nb.pageCount || 0} PAGE{nb.pageCount === 1 ? "" : "S"}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingNotebook ? "Edit notebook" : "New notebook"}
          onClose={handleCloseModal}
          footer={
            <>
              <Button variant="secondary" onClick={handleCloseModal}>Cancel</Button>
              <Button onClick={editingNotebook ? handleUpdate : handleCreate} disabled={saving}>
                {saving ? (editingNotebook ? "Saving..." : "Creating...") : (editingNotebook ? "Save" : "Create")}
              </Button>
            </>
          }
        >
          <div className="field-group">
            <label className="field-label">Name</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Competitive Programming"
              onKeyDown={(e) => e.key === "Enter" && (editingNotebook ? handleUpdate() : handleCreate())}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Color</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", background: c,
                    border: accent === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                    cursor: "pointer",
                  }}
                  aria-label={`Choose ${c}`}
                />
              ))}
            </div>
          </div>
        </Modal>
      )}

      <ConfirmationModal {...confirmConfig} />
    </div>
  );
};

export default NotebooksPage;
