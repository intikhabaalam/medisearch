import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Clock, Building2, Calendar, Stethoscope } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import medicalService from "../../services/medicalService";

export default function DoctorListingPage() {
  const navigate = useNavigate(); const [search, setSearch] = useState(""); const [location, setLocation] = useState(""); const [specialty, setSpecialty] = useState("");
  const { data: doctors = [], isLoading, isError, error } = useQuery({ queryKey: ["verified-doctors"], queryFn: medicalService.getDoctors });
  const specialties = [...new Set(doctors.flatMap(doc => doc.specialization || []).filter(Boolean))];
  const filtered = useMemo(() => doctors.filter(doc => `${doc.user?.name || ""} ${doc.clinicName} ${(doc.specialization || []).join(" ")} ${doc.qualification} ${doc.address}`.toLowerCase().includes(search.toLowerCase()) && doc.address?.toLowerCase().includes(location.toLowerCase()) && (!specialty || doc.specialization?.includes(specialty))), [doctors, search, location, specialty]);
  if (isLoading) return <Loader/>;
  if (isError) return <main className="max-w-5xl mx-auto p-8 text-center text-rose-600">{error.message || "Could not load doctors"}</main>;
  return <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7"><header className="rounded-3xl bg-gradient-to-r from-teal-800 via-teal-700 to-sky-900 p-8 text-white"><Badge variant="info" className="bg-white/20 text-white">Verified doctors</Badge><h1 className="text-3xl font-extrabold mt-3">Find a Doctor</h1><p className="text-teal-100 text-sm mt-2">Browse registered doctors approved by MediTrust administrators.</p><Button variant="outline" size="sm" className="mt-4 bg-white/10 text-white border-white/30" onClick={()=>navigate("/auth/doctor-apply")}>Register as a Doctor</Button></header>
    <section className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute w-4 h-4 left-3.5 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search doctor, clinic, specialty or qualification" className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm"/></div><div className="relative md:w-72"><MapPin className="absolute w-4 h-4 left-3.5 top-3 text-slate-400"/><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Filter by address" className="w-full border rounded-xl pl-10 pr-3 py-2.5 text-sm"/></div><select value={specialty} onChange={e=>setSpecialty(e.target.value)} className="border rounded-xl px-3 py-2.5 text-sm"><option value="">All specialties</option>{specialties.map(s=><option key={s} value={s}>{s}</option>)}</select></section>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified doctors ({filtered.length})</p>
    {filtered.length ? <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{filtered.map(doc=><Card key={doc._id} className="p-5 flex flex-col gap-4"><div><Badge variant="info">{(doc.specialization||[]).join(", ") || "General"}</Badge><h2 className="text-lg font-bold mt-2">{doc.user?.name || doc.clinicName}</h2><p className="text-xs text-slate-500">{doc.qualification} · {doc.experience} years experience</p></div><div className="space-y-2 text-sm text-slate-600"><p className="flex gap-2"><Building2 size={16}/>{doc.clinicName}</p><p className="flex gap-2"><MapPin size={16}/>{doc.address}</p><p className="flex gap-2"><Clock size={16}/>{doc.workingHours?.start || "Hours not listed"}{doc.workingHours?.end ? ` – ${doc.workingHours.end}` : ""} · {(doc.availableDays||[]).join(", ") || "Days not listed"}</p><p><b>Consultation fee:</b> ₹{Number(doc.consultationFee||0).toLocaleString("en-IN")}</p></div><Button className="mt-auto" icon={Calendar} onClick={()=>navigate(`/doctors/${doc._id}/book`)}>Book Appointment</Button></Card>)}</section> : <Card className="p-10 text-center text-slate-500"><Stethoscope className="mx-auto mb-3"/><p>No verified doctors match these filters.</p></Card>}</main>;
}
