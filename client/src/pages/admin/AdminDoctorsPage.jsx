
import React, { useEffect, useMemo, useState } from "react";
import { Search, Filter } from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import VerificationModal from "./VerificationModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminService from "../../services/adminService";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import LoaderScreen from "../../components/common/Loader";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useLocation } from "react-router-dom";

export default function AdminDoctorsPage() {
    const { user } = useSelector((state) => state.auth);
    const { pathname } = useLocation();
    const queryClient = useQueryClient();

    const currentPath = pathname.split("/").pop();

    const [verificationTarget, setVerificationTarget] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Fetch doctors and other admin data
    const {
        data,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ["admin-data"],
        queryFn: () => adminService.fetchAllAdminData(user.token),
        enabled: !!user?.token
    });

    // Approve / Reject doctor
    const doctorMutation = useMutation({
        mutationFn: ({ doctorId, isVerified }) =>
            adminService.updateDoctor(
                doctorId,
                isVerified,
                user.token
            ),

        onSuccess: (response, variables) => {
            toast.success(
                response.message ||
                (variables.isVerified
                    ? "Doctor verified successfully"
                    : "Doctor verification rejected")
            );

            setVerificationTarget(null);

            queryClient.invalidateQueries({
                queryKey: ["admin-data"]
            });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["verified-doctors"] });
            queryClient.invalidateQueries({ queryKey: ["public-data"] });
        },

        onError: (error) => {
            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Doctor update failed"
            );
        }
    });

    useEffect(() => {
        if (isError && error) {
            toast.error(
                error.response?.data?.message || error.message
            );
        }
    }, [isError, error]);

    // Search doctors
    const filteredDoctors = useMemo(() => {
        const doctors = data?.doctors || [];

        return doctors.filter((doctor) => {
            const search = searchTerm.toLowerCase();

            const specialization = Array.isArray(doctor.specialization)
                ? doctor.specialization.join(" ")
                : doctor.specialization || "";

            const status = doctor.isVerified ? "approved" : doctor.verificationStatus || "pending";
            return (!statusFilter || status === statusFilter) && (
                (doctor.clinicName || "").toLowerCase().includes(search) ||
                specialization.toLowerCase().includes(search) ||
                (doctor.address || "").toLowerCase().includes(search) ||
                (doctor.qualification || "").toLowerCase().includes(search) ||
                (doctor.registrationNumber || "").toLowerCase().includes(search) ||
                (doctor.email || "").toLowerCase().includes(search) ||
                (doctor.phone || "").toLowerCase().includes(search)
            );
        });
    }, [data?.doctors, searchTerm, statusFilter]);

    if (isLoading) {
        return <LoaderScreen />;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar />

            <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-hidden">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 capitalize">
                        {currentPath} Overview
                    </h1>

                    <p className="text-xs text-slate-500 mt-1">
                        Manage doctor registrations and verification.
                    </p>
                </div>

                {/* Doctors Table */}
                <Card className="p-6 border-slate-200 shadow-xs space-y-4">

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">

                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search doctors..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Filter className="w-4 h-4" />
                            Total Doctors: {filteredDoctors.length}
                        </div>
                        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-xs"><option value="">All applications</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">

                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Clinic Name</th>
                                    <th className="py-3 px-4">Specialty</th>
                                    <th className="py-3 px-4">Address</th>
                                    <th className="py-3 px-4">Registration Number</th>
                                    <th className="py-3 px-4">Verification</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {filteredDoctors.map((row) => (
                                    <tr
                                        key={row._id}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 font-semibold text-slate-900">
                                            {row.clinicName || "N/A"}
                                        </td>

                                        <td className="py-3 px-4 text-teal-700 font-medium">
                                            {Array.isArray(row.specialization)
                                                ? row.specialization.join(", ")
                                                : row.specialization || "N/A"}
                                        </td>

                                        <td className="py-3 px-4">
                                            {row.address || "N/A"}
                                        </td>

                                        <td className="py-3 px-4 font-mono">
                                            {row.registrationNumber || "N/A"}
                                        </td>

                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={row.isVerified ? "success" : row.verificationStatus === "rejected" ? "danger" : "warning"}
                                                size="sm"
                                                dot
                                            >
                                                {row.isVerified
                                                    ? "VERIFIED"
                                                    : row.verificationStatus === "rejected" ? "REJECTED" : "PENDING"}
                                            </Badge>
                                        </td>

                                        <td className="py-3 px-4 text-right">
                                            <Button
                                                variant={row.isVerified ? "outline" : "primary"}
                                                size="sm"
                                                onClick={() =>
                                                    setVerificationTarget(row)
                                                }
                                            >
                                                {row.isVerified
                                                    ? "View Details"
                                                    : "Review & Verify"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}

                                {filteredDoctors.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan="6"
                                            className="text-center py-10 text-slate-400"
                                        >
                                            No doctors found.
                                        </td>
                                    </tr>
                                )}

                            </tbody>
                        </table>
                    </div>
                </Card>
            </main>

            {/* Verification Modal */}
            <VerificationModal
                isOpen={!!verificationTarget}
                onClose={() => setVerificationTarget(null)}
                item={verificationTarget}
                type="Doctor"
                onApprove={() =>
                    doctorMutation.mutate({
                        doctorId: verificationTarget._id,
                        isVerified: true
                    })
                }
                onReject={() =>
                    doctorMutation.mutate({
                        doctorId: verificationTarget._id,
                        isVerified: false
                    })
                }
                isSaving={doctorMutation.isPending}
            />
        </div>
    );
}
