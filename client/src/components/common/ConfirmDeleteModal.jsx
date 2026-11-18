import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDeleteModal({ isOpen, entityName, entityType = "item", isDeleting = false, onCancel, onConfirm }) {
  return <Modal isOpen={isOpen} onClose={isDeleting ? undefined : onCancel} title={`Delete ${entityType}?`} subtitle="This action cannot be undone." footer={<><Button variant="outline" disabled={isDeleting} onClick={onCancel}>Cancel</Button><Button variant="danger" disabled={isDeleting} onClick={onConfirm}>{isDeleting ? "Deleting…" : "Delete"}</Button></>}><div className="flex gap-3 items-start text-sm text-slate-600"><AlertTriangle className="w-5 h-5 text-rose-600 shrink-0"/><p>Delete <strong className="text-slate-900">{entityName}</strong>? This will remove it from the system.</p></div></Modal>;
}
