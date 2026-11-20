import useNavigateById from '../../hooks/useNavigateById';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Pill,
  Sparkles,
  Zap
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import medicalService from '../../services/medicalService';
import Loader from '../../components/common/Loader';

const MOCK_CATEGORIES = [
  'All Products',
  'Prescription Drugs',
  'Pain Relief & OTC',
  'Vitamins & Nutrition',
  'Diabetes Management',
  'First Aid & Surgical',
  'Cardiac Care',
  'Skin & Dermatology',
];
const EMPTY_MEDICINES = [];

export default function ProductListingPage() {
  const onNavigate = useNavigateById();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('Popularity');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['medicine-search', debouncedQuery],
    queryFn: () => medicalService.searchMedicines(debouncedQuery),
    placeholderData: (previous) => previous
  });

  const medicines = data?.medicines ?? EMPTY_MEDICINES;

  const filtered = useMemo(() => {
    let list = [...medicines];
    if (selectedCategory !== 'All Products') {
      list = list.filter((prod) => (prod.category || '').toLowerCase().includes(selectedCategory.toLowerCase().split(' ')[0])
        || (prod.category || '') === selectedCategory);
    }
    if (sortBy === 'Price: Low to High') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'Price: High to Low') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'Highest Rated') {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }
    return list;
  }, [medicines, selectedCategory, sortBy]);

  const openProduct = (prod) => {
    if (!prod?._id) return;
    navigate(`/pharmacy/${prod._id}`);
  };

  if (isLoading && !data) {
    return (
      <Loader />
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-lg">
        <div className="max-w-2xl space-y-3 relative z-10">
          <Badge variant="success" size="sm" className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30">
            Express Medicine Dispatch
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            MediSearch Online Pharmacy
          </h1>
          <p className="text-teal-100 text-sm sm:text-base leading-relaxed">
            Order authentic prescription and over-the-counter medications directly to your doorstep. Free delivery on orders above $35.
          </p>
        </div>
        <div className="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2 opacity-20">
          <Pill className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">

        {/* Search input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search medicine brand or generic salt..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option>Popularity</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Highest Rated</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('ai-prescription')}
            icon={Sparkles}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            Upload Prescription
          </Button>
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {MOCK_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              type="button"
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${isActive
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error?.response?.data?.error || error?.message || "Medicine search is temporarily unavailable. Please try again."}
        </div>
      )}

      {!isError && data?.sourceError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live medicine database returned an error. Showing matching catalog results when available. {data.sourceError}
        </div>
      )}

      {/* Main Grid of Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Showing <span className="text-slate-900 font-bold">{filtered.length}</span> Verified Medicines
            {isFetching && <span className="ml-2 text-teal-700 normal-case tracking-normal">Searching…</span>}
          </p>
          <span className="text-xs text-teal-700 font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-teal-600 text-teal-600" />
            Same-day dispatch available
          </span>
        </div>

        {isFetching && medicines.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-200 space-y-2">
            <Pill className="w-10 h-10 text-teal-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No medicines found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {debouncedQuery
                ? `No approved listing matched “${debouncedQuery}”. Try a brand name, generic name, or active ingredient.`
                : "No medicines are currently listed in the pharmacy catalog."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((prod) => (
              <Card
                key={prod._id}
                hoverEffect
                className="flex flex-col justify-between p-4 h-full group"
              >
                <div>
                  <div
                    onClick={() => openProduct(prod)}
                    className="relative rounded-xl overflow-hidden aspect-square mb-3 bg-slate-50 flex items-center justify-center p-4 cursor-pointer"
                  >
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Pill className="w-16 h-16 text-teal-600" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3
                      onClick={() => openProduct(prod)}
                      className="font-bold text-slate-900 text-sm hover:text-teal-700 transition-colors cursor-pointer line-clamp-1"
                    >
                      {prod.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {prod.description || prod.genericName || prod.activeIngredient}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-base font-extrabold text-slate-900">₹{Number(prod.price || 0).toFixed(2)}</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openProduct(prod)}
                    className="shadow-xs"
                  >
                    Order Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Showing {filtered.length} medicine{filtered.length === 1 ? "" : "s"}
          {debouncedQuery ? ` for “${debouncedQuery}”` : ""}
        </p>
      </div>

    </div>
  );
}
