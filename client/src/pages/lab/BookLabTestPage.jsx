import React from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { ArrowLeft, FlaskConical } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

export default function BookLabTestPage() {
  const { state } = useLocation(); const navigate = useNavigate(); const { user } = useSelector(s=>s.auth); const qc=useQueryClient(); const test=state?.test;
  const booking=useMutation({mutationFn:async()=>{if(!user?.token)throw new Error("Please log in to book a lab test");return (await axios.post(`/api/pathologist/${test.pathologist._id}`,{pathologyTest:test._id},{headers:{Authorization:`Bearer ${user.token}`}})).data;},onSuccess:()=>{toast.success("Lab test booking submitted");qc.invalidateQueries({queryKey:["my-lab-appointments"]});navigate("/auth/my-lab-appointments");},onError:e=>toast.error(e.response?.data?.message||e.message)});
  if(!test)return <main className="max-w-3xl mx-auto p-8"><Card className="p-8 text-center space-y-4"><h1 className="text-xl font-bold">Choose a lab test first</h1><Button onClick={()=>navigate("/lab")}>Browse available tests</Button></Card></main>;
  return <main className="max-w-3xl mx-auto px-4 py-10"><button onClick={()=>navigate("/lab")} className="flex items-center gap-2 text-sm text-teal-700 mb-5"><ArrowLeft size={16}/> Back to lab tests</button><Card className="p-7 space-y-6"><div className="flex items-start gap-4"><div className="p-3 bg-teal-50 rounded-xl"><FlaskConical className="text-teal-700"/></div><div className="flex-1"><Badge>{test.category||"General"}</Badge><h1 className="text-2xl font-extrabold mt-2">{test.title}</h1><p className="text-sm text-slate-600 mt-2">{test.description}</p></div><strong className="text-xl">₹{Number(test.price).toFixed(2)}</strong></div>{test.preparationInstructions&&<div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm"><b>Preparation instructions</b><p className="mt-1">{test.preparationInstructions}</p></div>}<div className="border-t pt-4 text-sm"><p><b>Laboratory:</b> {test.pathologist?.laboratoryName||"Registered lab"}</p><p className="text-slate-500">{test.pathologist?.laboratoryAddress}</p><p className="text-slate-500">{test.pathologist?.phone} · {test.pathologist?.email}</p></div><Button disabled={booking.isPending} onClick={()=>booking.mutate()}>{booking.isPending?"Submitting…":"Confirm Lab Booking"}</Button></Card></main>;
}
