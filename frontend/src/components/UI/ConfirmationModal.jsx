import React from "react";
import Modal from "./Modal";
import Button from "./Button";

/**
 * Reusable modal for standard action/delete confirmations.
 * Replaces default browser window.confirm alerts.
 */
const ConfirmationModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action? This cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      title={title}
      onClose={onCancel}
      width="420px"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", gap: "1.1rem", alignItems: "flex-start", padding: "0.5rem 0.2rem" }}>
        <i
          className={
            variant === "danger"
              ? "fa-solid fa-triangle-exclamation"
              : "fa-solid fa-circle-question"
          }
          style={{
            fontSize: "1.85rem",
            color: variant === "danger" ? "var(--accent-coral)" : "var(--accent-teal)",
            flexShrink: 0,
            marginTop: "2px",
          }}
        ></i>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
          {message}
        </p>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
