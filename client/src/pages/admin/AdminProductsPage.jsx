import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import AddProductModal from "./AddProductModal";
import adminService from "../../services/adminService";
import ConfirmDeleteModal from "../../components/common/ConfirmDeleteModal";

export default function AdminProductsPage() {
  const { user } = useSelector(s => s.auth); const qc = useQueryClient();
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("");
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-data"], queryFn: () => adminService.fetchAllAdminData(user.token), enabled: !!user?.token });
  const del = useMutation({ mutationFn: id => adminService.deleteProduct(id, user.token), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-data"] }); qc.invalidateQueries({ queryKey: ["admin-dashboard"] }); qc.invalidateQueries({ queryKey: ["public-data"] }); toast.success("Product removed from catalog"); setDeleting(null); }, onError: e => toast.error(e.response?.data?.message || e.message) });
  const products = useMemo(() => data?.products?.filter(p => (!category || p.category === category) && `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(search.toLowerCase())) || [], [data, search, category]);
  const categories = [...new Set((data?.products || []).map(p => p.category).filter(Boolean))];
  const openEdit = product => { setEditing(product); setOpen(true); };
  const closeModal = () => { setOpen(false); setEditing(null); };
  return <div className="min-h-screen bg-slate-50 flex"><AdminSidebar /><main className="flex-1 p-6 sm:p-10 space-y-6">
    <header className="flex justify-between items-center"><div><h1 className="text-2xl font-extrabold">Products & Inventory</h1><p className="text-xs text-slate-500">Live catalog inventory and stock status.</p></div><Button icon={Plus} onClick={() => { setEditing(null); setOpen(true); }}>Add Product</Button></header>
    <Card className="p-5"><div className="flex gap-3 mb-4"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input className="border rounded-xl pl-9 pr-3 py-2 w-full text-sm" placeholder="Search products" value={search} onChange={e => setSearch(e.target.value)} /></div><select className="border rounded-xl px-3" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
    {isLoading ? <p>Loading products…</p> : isError ? <p className="text-rose-600">Could not load products.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="text-slate-500 border-b"><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th /></tr></thead><tbody>{products.map(p => <tr key={p._id} className="border-b"><td className="p-3"><div className="flex items-center gap-3"><img src={p.image} alt="" className="w-10 h-10 rounded object-cover" /><span>{p.name}</span></div></td><td className="p-3">{p.category}</td><td className="p-3">₹{p.price}</td><td className="p-3">{p.stock}</td><td className="p-3"><Badge variant={p.isActive && p.stock > 0 ? "success" : "warning"}>{!p.isActive ? "INACTIVE" : p.stock > 0 ? "IN STOCK" : "OUT OF STOCK"}</Badge></td><td className="p-3"><button title="Edit product" onClick={() => openEdit(p)} className="p-2"><Pencil size={16} /></button>{p.isActive && <button title="Remove product" onClick={() => setDeleting(p)} className="p-2 text-rose-600"><Trash2 size={16} /></button>}</td></tr>)}</tbody></table>{!products.length && <p className="p-6 text-center text-slate-500">No products found.</p>}</div>}</Card>
    <AddProductModal isOpen={open} onClose={closeModal} product={editing} />
    <ConfirmDeleteModal isOpen={!!deleting} entityName={deleting?.name} entityType="product" isDeleting={del.isPending} onCancel={()=>setDeleting(null)} onConfirm={()=>del.mutate(deleting._id)} />
  </main></div>;
}
