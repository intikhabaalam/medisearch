import React, { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ShieldCheck } from "lucide-react";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const specialities = ["Cardiology", "Dermatology", "Pediatrics", "General Medicine", "Neurology", "Orthopedics", "Psychiatry", "Gynecology"];

export default function DoctorApplicationPage() {
  const { user } = useSelector(state => state.auth);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({
    mutationFn: async body => (await axios.post("/api/doctor/request", body, { headers: { Authorization: `Bearer ${user.token}` } })).data,
    onSuccess: () => { setSubmitted(true); toast.success("Doctor application submitted for review"); },
    onError: error => toast.error(error.response?.data?.message || error.message || "Could not submit application"),
  });
  const submit = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const application = {
      clinicName: form.get("clinicName"), address: form.get("address"), qualification: form.get("qualification"),
      registrationNumber: form.get("registrationNumber"), experience: Number(form.get("experience")),
      specialization: form.getAll("specialization"), phone: form.get("phone"), email: form.get("email"),
      consultationFee: Number(form.get("consultationFee")), workingHours: { start: form.get("start"), end: form.get("end") },
      availableDays: form.getAll("availableDays"),
    };
    const documents = form.getAll("documents").filter(file => file.size > 0);
    if (!application.specialization.length || !application.availableDays.length) return toast.error("Select at least one specialty and available day");
    if (!documents.length) return toast.error("Upload at least one professional registration document");
    const body = new FormData();
    body.append("application", JSON.stringify(application));
    documents.forEach(file => body.append("documents", file));
    mutation.mutate(body);
  };

  return <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
    <header className="text-center space-y-2"><Badge variant="info">Physician Enrollment</Badge><h1 className="text-3xl font-extrabold text-slate-900">Doctor Registration</h1><p className="text-sm text-slate-600">Submit your practice and licensure details for administrator review.</p></header>
    <Card className="p-6 sm:p-8">{submitted ? <div className="text-center py-8 space-y-4"><ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto"/><h2 className="text-xl font-bold">Application pending review</h2><p className="text-sm text-slate-600">Your application is saved. You can access doctor features after an administrator approves it.</p></div> : <form onSubmit={submit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4"><Input label="Clinic / Practice Name" name="clinicName" required/><Input label="Qualification" name="qualification" placeholder="MBBS, MD" required/><Input label="Medical Registration Number" name="registrationNumber" required/><Input label="Years of Experience" name="experience" type="number" min="0" step="1" required/><Input label="Contact Phone" name="phone" type="tel" defaultValue={user?.phone || ""} required/><Input label="Contact Email" name="email" type="email" defaultValue={user?.email || ""} required/><Input label="Consultation Fee" name="consultationFee" type="number" min="0" step="0.01" defaultValue="0" required/><Input label="Practice Address" name="address" required/></div>
      <fieldset><legend className="text-xs font-semibold text-slate-700 mb-2">Specialties (select all that apply)</legend><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{specialities.map(value=><label key={value} className="flex items-center gap-2 text-xs"><input type="checkbox" name="specialization" value={value}/>{value}</label>)}</div></fieldset>
      <fieldset><legend className="text-xs font-semibold text-slate-700 mb-2">Available days</legend><div className="flex flex-wrap gap-3">{days.map(value=><label key={value} className="flex items-center gap-2 text-xs"><input type="checkbox" name="availableDays" value={value}/>{value}</label>)}</div></fieldset>
      <div className="grid sm:grid-cols-2 gap-4"><Input label="Working Hours Start" name="start" type="time" required/><Input label="Working Hours End" name="end" type="time" required/></div>
      <label className="block space-y-2"><span className="text-xs font-semibold text-slate-700">Professional registration documents (JPG, PNG or PDF; max 20 MB each)</span><input name="documents" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple required className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-teal-800"/></label>
      <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Submitting…" : "Submit for Admin Review"}</Button>
    </form>}</Card>
  </main>;
}
