import useNavigateById from '../../hooks/useNavigateById';
import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Truck,
  AlertCircle,
  Minus,
  Plus,
  Star,
  FileText,
  Sparkles,
  Clock,
  ArrowRight,
  Pill
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import medicalService from '../../services/medicalService';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <p className="text-xs text-slate-500 font-medium">
      {label}: <span className="text-slate-800 font-semibold">{value}</span>
    </p>
  );
}

export default function ProductDetailPage() {
  const onNavigate = useNavigateById();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => medicalService.getProductById(id),
    enabled: Boolean(id)
  });

  const { data: catalog } = useQuery({
    queryKey: ['medicine-search', ''],
    queryFn: () => medicalService.searchMedicines(''),
    staleTime: 60_000
  });

  const related = useMemo(() => {
    return (catalog?.medicines || [])
      .filter((item) => item._id !== product?._id)
      .slice(0, 3);
  }, [catalog, product]);

  const orderMutation = useMutation({
    mutationFn: () => medicalService.createOrder({
      productId: product._id,
      quantity,
      token: user?.token
    }),
    onSuccess: (result) => {
      toast.success(result.message || "Medicine order placed successfully!");
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      navigate('/auth/orders');
    },
    onError: (err) => {
      const status = err?.response?.status;
      if (status === 401) {
        toast.error("Please log in to place an order.");
        navigate('/login');
        return;
      }
      toast.error(err?.response?.data?.error || err.message || "Failed to place order");
    }
  });

  const handleOrder = () => {
    if (!user?.token) {
      toast.error("Please log in to place an order.");
      navigate('/login');
      return;
    }
    if (!product?._id) {
      toast.error("This medicine cannot be ordered right now.");
      return;
    }
    if (product.stock < quantity) {
      toast.error(`Only ${product.stock} units are currently in stock.`);
      return;
    }
    if (orderMutation.isPending) return;
    orderMutation.mutate();
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Medicine details unavailable</h1>
        <p className="text-sm text-slate-500">
          {error?.response?.data?.error || error?.message || "This medicine could not be loaded from the catalog or medicine database."}
        </p>
        <Button variant="primary" onClick={() => onNavigate('pharmacy')}>Back to Pharmacy</Button>
      </div>
    );
  }

  const unitPrice = Number(product.price || 0);
  const totalPrice = unitPrice * quantity;
  const images = [product.image].filter(Boolean);
  const inStock = Number(product.stock) > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button onClick={() => onNavigate('landing')} className="hover:text-teal-600">Home</button>
        <span>/</span>
        <button onClick={() => onNavigate('pharmacy')} className="hover:text-teal-600">Pharmacy</button>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-center aspect-square overflow-hidden relative">
            {images[0] ? (
              <img
                src={images[0]}
                alt={product.name}
                className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Pill className="w-24 h-24 text-teal-600" />
            )}
            {product.rxRequired && (
              <div className="absolute top-4 left-4">
                <Badge variant="warning" size="md">
                  Prescription Required
                </Badge>
              </div>
            )}
          </div>

          {!product.imageIsOfficial && images[0] && (
            <p className="text-[11px] text-slate-400">Illustrative pharmacy image. Official pack art was not provided by the data source.</p>
          )}

          <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-4 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-950">MediTrust AI Prescription Check</h4>
              <p className="text-xs text-indigo-800/80 mt-0.5">
                Have an active doctor's prescription slip? Upload it to auto-verify dosage instructions.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('ai-prescription')}
                className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
              >
                Upload & Verify Rx Now <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {product.category && (
                <Badge variant="info" size="sm">
                  {product.category}
                </Badge>
              )}
              <Badge variant={inStock ? "success" : "danger"} size="sm" dot>
                {inStock ? `In Stock (${product.stock} units available)` : "Currently unavailable"}
              </Badge>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              {product.name}
            </h1>
            <InfoRow label="Brand" value={product.brand} />
            <InfoRow label="Generic" value={product.genericName} />
            <InfoRow label="Active ingredient" value={product.activeIngredient} />
            <InfoRow label="Manufacturer" value={product.manufacturer} />
            <InfoRow label="Strength" value={product.strength} />
            <InfoRow label="Dosage form" value={product.dosageForm} />

            {product.rating ? (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">{product.rating}</span>
                {product.reviewsCount ? (
                  <span className="text-xs text-slate-400">({product.reviewsCount} verified patient reviews)</span>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900">
                ₹{totalPrice.toFixed(2)}
              </span>
            </div>
            {product.packaging && (
              <p className="text-xs text-slate-500">
                Packaging: <span className="font-semibold text-slate-700">{product.packaging}</span>
              </p>
            )}
            {product.priceSource === "nadac" && (
              <p className="text-[11px] text-slate-400">Pharmacy listing derived from CMS NADAC acquisition cost for a 10-unit pack.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-teal-200/80 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">

              <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50 p-1 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-lg hover:bg-white text-slate-600 transition-colors disabled:opacity-40"
                  disabled={quantity <= 1 || orderMutation.isPending}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-5 text-sm font-bold text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(Math.max(product.stock || 1, 1), quantity + 1))}
                  className="p-2 rounded-lg hover:bg-white text-slate-600 transition-colors"
                  disabled={!inStock || quantity >= product.stock || orderMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full sm:flex-1 justify-center shadow-md shadow-teal-600/25"
                onClick={handleOrder}
                disabled={!inStock || orderMutation.isPending}
              >
                {orderMutation.isPending ? "Placing order..." : `Order Now (₹${totalPrice.toFixed(2)})`}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Tomorrow by 2:00 PM (Express)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>100% Genuine Pharmacy Guarantee</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(product.description || product.indications?.length > 0) && (
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Clinical Description & Indications
                </h3>
                {product.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {product.description}
                  </p>
                )}
                {product.indications?.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-semibold text-slate-700 mb-1.5">Common Medical Uses:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {product.indications.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {product.dosageLabel && (
              <div className="border border-amber-200 rounded-2xl p-5 bg-amber-50/50 space-y-2">
                <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-700" />
                  Official labeling: dosage & administration
                </h3>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  {product.dosageLabel}
                </p>
                <p className="text-[11px] text-amber-800/70">
                  This text is from regulatory labeling. It is not a personal dosage recommendation. Follow your prescriber.
                </p>
              </div>
            )}

            {product.warnings?.length > 0 && (
              <div className="border border-slate-200 rounded-2xl p-5 bg-white space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-600" />
                  Safety notes & precautions
                </h3>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {product.warnings.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>

      </div>

      {related.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Frequently Purchased Together</h2>
              <p className="text-xs text-slate-500 mt-0.5">Other medicines currently listed in the pharmacy</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('pharmacy')}
            >
              Browse More
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((prod) => (
              <Card key={prod._id} hoverEffect className="p-4 flex flex-col justify-between">
                <div>
                  <div className="aspect-square bg-slate-50 rounded-xl p-4 mb-3 flex items-center justify-center">
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-contain" />
                    ) : (
                      <Pill className="w-10 h-10 text-teal-600" />
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
                  <p className="text-xs text-slate-400">{prod.brand}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">₹{Number(prod.price || 0).toFixed(2)}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/pharmacy/${prod._id}`)}
                  >
                    Order Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
