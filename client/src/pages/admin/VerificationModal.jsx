
import React from "react";
import {
    ShieldCheck,
    XCircle,
    FileText,
    CheckCircle2
} from "lucide-react";

import Modal from "../../components/common/Modal";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

export default function VerificationModal({
    isOpen,
    onClose,
    item,
    type = "Doctor",
    onApprove,
    onReject,
    isSaving = false
}) {
    if (!item) return null;

    const isDoctor = type === "Doctor";

    const name = isDoctor
        ? item.clinicName
        : item.laboratoryName;

    const address = isDoctor
        ? item.address
        : item.laboratoryAddress;

    const specialization = Array.isArray(item.specialization)
        ? item.specialization.join(", ")
        : item.specialization || "N/A";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Verify ${type} Credentials`}
            subtitle={`Review registration details for ${name || type}`}
            maxWidth="max-w-xl"
            footer={
                <>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={onReject}
                        disabled={isSaving}
                        icon={XCircle}
                    >
                        Reject Application
                    </Button>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={onApprove}
                        disabled={isSaving}
                        icon={CheckCircle2}
                    >
                        {isSaving ? "Saving…" : "Approve & Verify"}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">

                {/* Practitioner Details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">

                    <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                            {name || "N/A"}
                        </span>

                        <Badge
                            variant={item.isVerified ? "success" : item.verificationStatus === "rejected" ? "danger" : "warning"}
                            size="sm"
                        >
                            {item.isVerified ? "Approved" : item.verificationStatus === "rejected" ? "Rejected" : "Pending"}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">

                        <div className="col-span-2">
                            <span className="text-slate-400 block">Applicant Account</span>
                            <span className="font-semibold text-slate-800">{item.user?.name || "N/A"}{item.user?.email ? ` · ${item.user.email}` : ""}</span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Registration Number
                            </span>
                            <span className="font-semibold text-slate-800">
                                {item.registrationNumber || "N/A"}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Specialization
                            </span>
                            <span className="font-semibold text-slate-800">
                                {specialization}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Qualification
                            </span>
                            <span className="font-semibold text-slate-800">
                                {item.qualification || "N/A"}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Experience
                            </span>
                            <span className="font-semibold text-slate-800">
                                {item.experience ?? "N/A"}
                                {item.experience != null ? " years" : ""}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Phone
                            </span>
                            <span className="font-semibold text-slate-800">
                                {item.phone || "N/A"}
                            </span>
                        </div>

                        <div>
                            <span className="text-slate-400 block">
                                Email
                            </span>
                            <span className="font-semibold text-slate-800 break-all">
                                {item.email || "N/A"}
                            </span>
                        </div>

                        <div className="col-span-2">
                            <span className="text-slate-400 block">
                                Address
                            </span>
                            <span className="font-semibold text-slate-800">
                                {address || "N/A"}
                            </span>
                        </div>

                    </div>
                </div>

                {/* Registration Review */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span className="text-xs font-semibold text-slate-800">
                            Registration Information
                        </span>
                    </div>

                    <p className="text-xs text-slate-500">
                        Review the submitted registration number and
                        qualification before approving this application.
                    </p>
                </div>

                {/* Notice */}
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />

                    <span>
                        Approval updates the verification status in your
                        database. It does not independently verify an
                        external medical license.
                    </span>
                </div>

            </div>
        </Modal>
    );
}

