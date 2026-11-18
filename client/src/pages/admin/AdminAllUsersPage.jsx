import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import adminService from "../../services/adminService";

export default function AdminAllUsersPage() {
  const { user } = useSelector(s=>s.auth); const qc=useQueryClient(); const [search,setSearch]=useState("");
  const {data,isLoading,isError}=useQuery({queryKey:["admin-data"],queryFn:()=>adminService.fetchAllAdminData(user.token),enabled:!!user?.token});
  const mutation=useMutation({mutationFn:({id,active})=>adminService.updateUser(id,active,user.token),onSuccess:()=>{qc.invalidateQueries({queryKey:["admin-data"]});toast.success("User status updated")},onError:e=>toast.error(e.response?.data?.message||e.message)});
  const users=useMemo(()=>data?.users?.filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))||[],[data,search]);
  return <div className="min-h-screen bg-slate-50 flex"><AdminSidebar/><main className="flex-1 p-6 sm:p-10 space-y-6"><header><h1 className="text-2xl font-extrabold">Registered Users</h1><p className="text-xs text-slate-500">Search accounts and manage non-admin access.</p></header><Card className="p-5"><div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/><input className="border rounded-xl pl-9 pr-3 py-2 w-full text-sm" placeholder="Search name or email" value={search} onChange={e=>setSearch(e.target.value)}/></div>{isLoading?<p>Loading users…</p>:isError?<p className="text-rose-600">Could not load users.</p>:<div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-slate-500 border-b"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Registered</th><th className="p-3">Status</th><th/></tr></thead><tbody>{users.map(u=><tr key={u._id} className="border-b"><td className="p-3 font-semibold">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.userType}</td><td className="p-3">{new Date(u.createdAt).toLocaleDateString("en-IN")}</td><td className="p-3"><Badge variant={u.isActive?"success":"danger"}>{u.isActive?"ACTIVE":"INACTIVE"}</Badge></td><td className="p-3">{u.userType!=="ADMIN"&&<button disabled={mutation.isPending} className="text-teal-700 underline" onClick={()=>mutation.mutate({id:u._id,active:!u.isActive})}>{u.isActive?"Deactivate":"Activate"}</button>}</td></tr>)}</tbody></table>{!users.length&&<p className="p-6 text-center text-slate-500">No users found.</p>}</div>}</Card></main></div>;
}
