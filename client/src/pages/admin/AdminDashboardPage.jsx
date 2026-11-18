import React, { useEffect } from "react";
import { Users, Package, Stethoscope, FlaskConical, ShoppingBag, Calendar, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import Card from "../../components/common/Card";
import LoaderScreen from "../../components/common/Loader";
import AdminSidebar from "../../components/admin/AdminSidebar";
import adminService from "../../services/adminService";

export default function AdminDashboardPage() {
  const { user } = useSelector(state=>state.auth);
  const {data,isLoading,isError,error}=useQuery({queryKey:["admin-dashboard"],queryFn:()=>adminService.getDashboard(user.token),enabled:!!user?.token});
  useEffect(()=>{if(isError)toast.error(error?.response?.data?.message||error?.message||"Could not load dashboard");},[isError,error]);
  if(isLoading)return <LoaderScreen/>;
  const stats=[
    {id:"revenue",label:"Completed Order Revenue",value:`₹${Number(data?.stats?.revenue||0).toLocaleString("en-IN")}`,change:data?.stats?.revenueGrowth==null?"No prior month data":`${data.stats.revenueGrowth>=0?"+":""}${data.stats.revenueGrowth.toFixed(1)}% vs last month`,icon:DollarSign,color:"text-emerald-600 bg-emerald-50"},
    {id:"orders",label:"Medicine Orders",value:data?.stats?.orders??0,change:"Recorded orders",icon:ShoppingBag,color:"text-teal-600 bg-teal-50"},
    {id:"doctors",label:"Doctor Applications",value:data?.stats?.doctors??0,change:"All verification states",icon:Stethoscope,color:"text-indigo-600 bg-indigo-50"},
    {id:"labs",label:"Pathology Labs",value:data?.stats?.labs??0,change:"All verification states",icon:FlaskConical,color:"text-cyan-600 bg-cyan-50"},
    {id:"users",label:"Registered Users",value:data?.stats?.users??0,change:"MongoDB records",icon:Users,color:"text-sky-600 bg-sky-50"},
    {id:"products",label:"Medicines & Products",value:data?.stats?.products??0,change:"Catalog records",icon:Package,color:"text-amber-600 bg-amber-50"},
    {id:"tests",label:"Lab Tests",value:data?.stats?.tests??0,change:"All availability states",icon:FlaskConical,color:"text-cyan-600 bg-cyan-50"},
    {id:"appointments",label:"Appointments",value:data?.stats?.appointments??0,change:"Doctor and lab appointments",icon:Calendar,color:"text-violet-600 bg-violet-50"},
  ];
  const monthly=data?.monthlyRevenue||[]; const maxRevenue=Math.max(1,...monthly.map(m=>m.revenue));
  return <div className="min-h-screen bg-slate-50 flex"><AdminSidebar/><main className="flex-1 p-6 sm:p-10 space-y-8 overflow-x-hidden"><header><h1 className="text-2xl font-extrabold text-slate-900">ADMIN OVERVIEW</h1><p className="text-xs text-slate-500 mt-1">Live operational statistics, completed-order revenue, and recent activity.</p></header>
    {isError&&<Card className="p-5 text-rose-600">Dashboard data could not be loaded.</Card>}
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{stats.map(({id,label,value,change,icon:Icon,color})=><Card key={id} className="p-5 border-slate-200"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`p-2 rounded-xl ${color}`}><Icon className="w-5 h-5"/></span></div><div className="mt-3"><span className="text-2xl font-black text-slate-900">{value}</span><p className="text-[11px] text-teal-700 font-semibold mt-1">{change}</p></div></Card>)}</section>
    <Card className="p-6 border-slate-200 space-y-5"><div><h2 className="font-bold text-slate-900">Monthly completed-order revenue</h2><p className="text-xs text-slate-500">Revenue is summed from delivered orders.</p></div>{monthly.length?<div className="flex items-end gap-2 h-40 border-b border-slate-200">{monthly.map(m=><div key={`${m._id.year}-${m._id.month}`} title={`${m._id.month}/${m._id.year}: ₹${Number(m.revenue).toLocaleString("en-IN")} · ${m.orders} orders`} className="flex-1 bg-teal-500 rounded-t min-w-3" style={{height:`${Math.max(5,m.revenue/maxRevenue*100)}%`}}/>)}</div>:<p className="text-sm text-slate-500">No completed orders recorded in the past 12 months.</p>}
      <div className="grid md:grid-cols-2 gap-6"><section><h3 className="text-sm font-semibold text-slate-700 mb-2">Recent orders</h3>{data?.recentOrders?.length?<ul className="divide-y">{data.recentOrders.map(o=><li key={o._id} className="py-2 flex justify-between gap-3 text-xs text-slate-600"><span>{o.orderId} · {o.user?.name||"Customer"} · {o.itemName||o.product?.name||"Product"}</span><span className="whitespace-nowrap">{o.status} · ₹{Number(o.total||0).toLocaleString("en-IN")}</span></li>)}</ul>:<p className="text-sm text-slate-500">No orders recorded.</p>}</section><section><h3 className="text-sm font-semibold text-slate-700 mb-2">Recent registration activity</h3>{data?.recentApplications?.length?<ul className="divide-y">{data.recentApplications.map(a=><li key={`${a.kind}-${a._id}`} className="py-2 flex justify-between gap-3 text-xs text-slate-600"><span>{a.kind==="doctor"?"Doctor":"Pathology lab"} · {a.name}</span><span className="whitespace-nowrap">{a.status} · {new Date(a.createdAt).toLocaleDateString("en-IN")}</span></li>)}</ul>:<p className="text-sm text-slate-500">No registration activity recorded.</p>}</section></div>
    </Card>
  </main></div>;
}
