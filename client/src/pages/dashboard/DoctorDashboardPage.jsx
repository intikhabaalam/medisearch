import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Calendar, Clock, MapPin, UserRound } from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import medicalService from "../../services/medicalService";

export default function DoctorDashboardPage() {
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ["doctor-appointments", user?.token],
    queryFn: () => medicalService.getDoctorAppointments(user.token),
    enabled: user?.userType === "DOCTOR" && !!user?.token,
  });
  const profileQuery = useQuery({
    queryKey: ["doctor-profile", user?.token],
    queryFn: () => medicalService.getDoctorProfile(user.token),
    enabled: user?.userType === "DOCTOR" && !!user?.token,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => medicalService.updateDoctorAppointment({ token: user.token, id, status }),
    onSuccess: () => {
      toast.success("Appointment updated");
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments", user?.token] });
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not update appointment"),
  });

  if (user?.userType !== "DOCTOR") return <Navigate to="/auth/dashboard" replace />;
  if (appointmentsQuery.isLoading || profileQuery.isLoading) return <Loader />;

  const appointments = appointmentsQuery.data || [];
  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">Doctor Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Review and manage appointment requests for your practice.</p>
      </header>
      {profileQuery.isError ? <Card className="text-rose-600">Your approved doctor profile could not be loaded. Dashboard access is available only to verified doctors.</Card> : <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{profileQuery.data?.user?.name || profileQuery.data?.clinicName}</h2><Badge variant="success">Verified</Badge></div>
        <p className="text-sm text-teal-700">{(profileQuery.data?.specialization || []).join(", ")}</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600">
          <p><b>Clinic:</b> {profileQuery.data?.clinicName}</p><p><b>Qualification:</b> {profileQuery.data?.qualification}</p>
          <p><b>Registration:</b> {profileQuery.data?.registrationNumber}</p><p><b>Experience:</b> {profileQuery.data?.experience} years</p>
          <p><b>Address:</b> {profileQuery.data?.address}</p><p><b>Consultation fee:</b> ₹{Number(profileQuery.data?.consultationFee || 0).toLocaleString("en-IN")}</p>
        </div>
      </Card>}
      {appointmentsQuery.isError ? (
        <Card className="text-rose-600">Could not load your appointments. Please try again later.</Card>
      ) : appointments.length ? appointments.map((appointment) => (
        <Card key={appointment._id} className="flex flex-wrap justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900">{appointment.user?.name || "Patient"}</h2>
              <Badge variant={appointment.status === "confirmed" ? "success" : appointment.status === "cancelled" ? "danger" : "warning"}>
                {appointment.status || "pending"}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 flex items-center gap-2"><UserRound size={15} />{appointment.user?.email || "Patient contact unavailable"}{appointment.user?.phone ? ` · ${appointment.user.phone}` : ""}</p>
            <p className="text-xs text-slate-500 flex items-center gap-2"><Calendar size={14} />Requested {appointment.createdAt ? new Date(appointment.createdAt).toLocaleString() : "date unavailable"}</p>
            <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={14} />{appointment.doctor?.clinicName || "Your clinic"}, {appointment.doctor?.address || ""}</p>
            <p className="text-xs text-slate-500 flex items-center gap-2"><Clock size={14} />{appointment.doctor?.workingHours?.start || ""}–{appointment.doctor?.workingHours?.end || ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {appointment.status !== "confirmed" && appointment.status !== "cancelled" && <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: appointment._id, status: "confirmed" })}>Confirm</Button>}
            {appointment.status !== "cancelled" && <Button variant="danger" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: appointment._id, status: "cancelled" })}>Cancel</Button>}
          </div>
        </Card>
      )) : <Card className="p-10 text-center text-slate-500">You have no appointment requests yet.</Card>}
    </main>
  );
}
