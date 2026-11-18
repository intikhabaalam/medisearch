import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Loader from "../../components/common/Loader";
import medicalService from "../../services/medicalService";

export default function MyLabAppointmentsPage(){const{user}=useSelector(s=>s.auth),navigate=useNavigate();const{data:appointments=[],isLoading,isError}=useQuery({queryKey:["my-lab-appointments"],queryFn:()=>medicalService.getMyLabAppointments(user.token),enabled:!!user?.token});if(isLoading)return <Loader/>;return <main className="max-w-5xl mx-auto px-4 py-8 space-y-6"><header className="flex justify-between items-center"><div><h1 className="text-2xl font-extrabold">My Lab Test Bookings</h1><p className="text-sm text-slate-500">Bookings associated with your account.</p></div><Button icon={Calendar} onClick={()=>navigate("/lab")}>Browse lab tests</Button></header>{isError?<Card className="p-8 text-rose-600">Could not load lab bookings.</Card>:appointments.length?appointments.map(a=><Card key={a._id} className="p-5"><div className="flex justify-between gap-4"><div><div className="flex gap-2 items-center"><h2 className="font-bold">{a.pathologyTest?.title||"Lab test"}</h2><Badge variant={a.status==="delivered"?"success":a.status==="cancelled"?"danger":"warning"}>{a.status||"pending"}</Badge></div><p className="text-sm text-slate-500 mt-1">{a.pathologyTest?.description}</p>{a.pathologyTest?.preparationInstructions&&<p className="text-xs bg-amber-50 text-amber-800 p-2 rounded-lg mt-2">Preparation: {a.pathologyTest.preparationInstructions}</p>}<p className="text-xs text-slate-600 mt-2"><b>Laboratory:</b> {a.pathologist?.laboratoryName}</p><p className="text-xs text-slate-500 flex gap-2 mt-1"><MapPin size={14}/>{a.pathologist?.laboratoryAddress}</p><p className="text-xs mt-2">Test price: ₹{Number(a.pathologyTest?.price||0).toFixed(2)}</p><p className="text-[11px] text-slate-400 mt-1">Booked {new Date(a.createdAt).toLocaleString("en-IN")}</p></div></div></Card>):<Card className="p-10 text-center text-slate-500">No lab tests have been booked yet.</Card>}</main>}
