import useNavigateById from '../../hooks/useNavigateById';
import React, { useState } from 'react';
import {
  Package,
  Truck,
  FileText,
  ArrowRight,
  RotateCw,
  ShoppingBag,
  MapPin
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import medicalService from '../../services/medicalService';

const FILTER_TABS = ['All Orders', 'Pending / Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function MyOrdersPage() {
  const onNavigate = useNavigateById();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('All Orders');

  const { data: orders = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-orders', user?.token],
    queryFn: () => medicalService.getMyOrders(user?.token),
    enabled: Boolean(user?.token)
  });

  const displayedOrders = (Array.isArray(orders) ? orders : []).filter((ord) => {
    if (activeTab === 'All Orders') return true;
    if (activeTab === 'Pending / Processing') return ['Pending', 'Confirmed'].includes(ord.status);
    if (activeTab === 'Shipped') return ord.status === 'Shipped';
    if (activeTab === 'Delivered') return ord.status === 'Delivered';
    if (activeTab === 'Cancelled') return ord.status === 'Cancelled';
    return true;
  });

  if (!user?.token) {
    navigate('/login');
    return null;
  }

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="info" size="sm" className="mb-1">
            Medicine Dispatch & History
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            My Medicine Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time fulfillment tracking, digital invoices, and prescription logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('pharmacy')}
            icon={ShoppingBag}
          >
            Order Medicines
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.response?.data?.error || error?.message || "Could not load your orders."}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {displayedOrders.length === 0 ? (
        <Card className="p-12 text-center max-w-lg mx-auto border-dashed border-2 border-slate-200 space-y-4">
          <div className="w-20 h-20 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-inner">
            <Package className="w-10 h-10 stroke-1" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't placed any medicine orders under this category yet. Find authentic medicines with doorstep express dispatch.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('pharmacy')}
              icon={ArrowRight}
              iconPosition="right"
            >
              Explore MediSearch Pharmacy
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {displayedOrders.map((order) => (
            <Card key={order.id || order._id} className="p-6 border-slate-200/90 shadow-sm space-y-6">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-slate-900 text-base">{order.id}</span>
                  <span className="text-xs text-slate-400">• Placed on {order.date}</span>
                  <Badge variant={order.statusVariant} size="sm" dot>
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-base font-extrabold text-slate-900">₹{Number(order.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {order.status !== 'Cancelled' && (
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span className={order.timelineStep >= 0 ? 'text-teal-700' : ''}>Order Placed</span>
                    <span className={order.timelineStep >= 1 ? 'text-teal-700' : ''}>Prescription Verified</span>
                    <span className={order.timelineStep >= 2 ? 'text-teal-700' : ''}>Out for Delivery</span>
                    <span className={order.timelineStep >= 3 ? 'text-teal-700' : ''}>Delivered</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(order.timelineStep / 3) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Truck className="w-3.5 h-3.5 text-teal-600" />
                      Status: <strong className="text-slate-800">{order.eta}</strong>
                    </span>
                    <span>Tracking: {order.trackingNumber}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <Package className="w-6 h-6 text-teal-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span>₹{Number(item.price || 0).toFixed(2)} each</span>
                          {item.rxVerified && (
                            <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                              Rx Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      ₹{(Number(item.quantity || 0) * Number(item.price || 0)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                {order.address ? (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Delivering to: {order.address}</span>
                  </div>
                ) : <span />}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" icon={FileText}>
                    Invoice
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate('pharmacy')}
                    icon={RotateCw}
                  >
                    Reorder
                  </Button>
                </div>
              </div>

            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
