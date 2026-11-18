import React from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import medicalService from "../../services/medicalService";

export default function DoctorBookingPage() {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useSelector(s=>s.auth);
  const { data: doctors = [], isLoading, isError } = useQuery({ queryKey:["verified-doctors"], queryFn:medicalService.getDoctors });
  const doctor=doctors.find(item=>item._id===id);
  const booking=useMutation({mutationFn:async()=>{if(!user?.token)throw new Error("Log in to book an appointment");return (await axios.post(`/api/doctor/${id}`,{}, {headers:{Authorization:`Bearer ${user.token}`}})).data;},onSuccess:()=>{toast.success("Appointment request submitted");navigate("/auth/my-appointments");},onError:e=>toast.error(e.response?.data?.message||e.message)});
  if(isLoading)return <Loader/>;
  if(isError||!doctor)return <main className="max-w-3xl mx-auto p-8"><Card className="p-8 text-center"><p className="text-slate-600">This verified doctor could not be found.</p><Button className="mt-4" onClick={()=>navigate("/doctors")}>Back to doctors</Button></Card></main>;
  return <main className="max-w-3xl mx-auto px-4 py-10"><button onClick={()=>navigate("/doctors")} className="flex items-center gap-2 text-sm text-teal-700 mb-5"><ArrowLeft size={16}/> Back to doctors</button><Card className="p-7 space-y-5"><Badge variant="success">Verified doctor</Badge><div><h1 className="text-2xl font-extrabold">{doctor.user?.name||doctor.clinicName}</h1><p className="text-sm text-teal-700">{(doctor.specialization||[]).join(", ")}</p></div><div className="space-y-2 text-sm text-slate-600"><p><b>Qualification:</b> {doctor.qualification}</p><p><b>Experience:</b> {doctor.experience} years</p><p className="flex gap-2"><MapPin size={16}/>{doctor.clinicName}, {doctor.address}</p><p className="flex gap-2"><Clock size={16}/>{doctor.workingHours?.start} – {doctor.workingHours?.end}; {(doctor.availableDays||[]).join(", ")}</p><p><b>Consultation fee:</b> ₹{Number(doctor.consultationFee||0).toLocaleString("en-IN")}</p></div><p className="text-xs text-slate-500">The current appointment API creates a pending request; it does not accept a selected date or time.</p><Button icon={Calendar} disabled={booking.isPending} onClick={()=>booking.mutate()}>{booking.isPending?"Submitting…":"Request Appointment"}</Button></Card></main>;
}
