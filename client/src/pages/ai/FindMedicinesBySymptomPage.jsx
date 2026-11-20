import useNavigateById from '../../hooks/useNavigateById';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Search, 
  AlertCircle, 
  Pill, 
  Stethoscope, 
  Star,
  Loader2
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';

const POPULAR_SYMPTOMS = [
  'Acid Reflux & Heartburn',
  'Seasonal Allergies & Sneezing',
  'Mild Tension Headache',
  'Chest Congestion & Cough',
  'Joint Pain & Muscle Soreness',
];

export default function FindMedicinesBySymptomPage() {
  const onNavigate = useNavigateById();
  const { user } = useSelector((state) => state.auth);

  const [query, setQuery] = useState('Acid Reflux & Heartburn');
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const searchInProgress = useRef(false);
  const initialSearchStarted = useRef(false);

  const handleSearch = useCallback(async (symptomQuery) => {
    const q = typeof symptomQuery === 'string' ? symptomQuery : query;
    if (!q || !q.trim() || searchInProgress.current) return;

    searchInProgress.current = true;
    setIsLoading(true);
    setSearchError(null);

    try {
      const token = user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        '/api/ai/symptoms',
        { query: q.trim() },
        { headers }
      );

      setAiAnalysis(response.data);
    } catch (err) {
      console.error('Symptom search error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.details || 'Failed to match symptoms. Please verify your connection.';
      setSearchError(errMsg);
      toast.error(errMsg);
    } finally {
      searchInProgress.current = false;
      setIsLoading(false);
    }
  }, [query, user]);

  // Perform initial search for default symptom on first load
  useEffect(() => {
    if (initialSearchStarted.current) return;
    initialSearchStarted.current = true;
    queueMicrotask(() => handleSearch('Acid Reflux & Heartburn'));
  }, [handleSearch]);

  const handleChipClick = (sym) => {
    setQuery(sym);
    handleSearch(sym);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(query);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="purple" size="sm">
          Symptom-to-Medicine Matching
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Find Safe OTC Medicines by Symptom
        </h1>
        <p className="text-sm text-slate-600">
          Describe your discomfort or select a common symptom. Our clinical engine queries real pharmacy inventory, suggests verified relief options, and highlights red-flag warning signs.
        </p>
      </div>

      {/* Symptom Search Bar */}
      <Card className="p-6 border-indigo-200/80 shadow-md space-y-4">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe symptoms, e.g. 'burning throat after dinner', 'fever and headache'..."
            className="w-full pl-12 pr-28 py-3.5 rounded-xl border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <div className="absolute right-2">
            <Button
              variant="ai"
              size="sm"
              onClick={() => handleSearch(query)}
              disabled={isLoading || !query.trim()}
              className="px-4 py-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Matching...
                </span>
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>

        {/* Popular chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-slate-500">Popular Queries:</span>
          {POPULAR_SYMPTOMS.map((sym, i) => (
            <button
              key={i}
              onClick={() => handleChipClick(sym)}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                query === sym
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-medium'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </Card>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="text-center py-12 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 animate-spin">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Searching MediSearch Pharmacy & Evaluating Clinical Guidance...</p>
          <p className="text-xs text-slate-400">Comparing real active products in inventory against your symptoms.</p>
        </div>
      )}

      {/* Error display */}
      {searchError && !isLoading && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{searchError}</span>
        </div>
      )}

      {/* AI Clinical Reasoning Result */}
      {!isLoading && aiAnalysis && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Diagnostic Assessment Card */}
          <Card className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">MediSearch AI Clinical Analysis</h3>
              </div>
              <Badge variant="purple" size="sm" className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40">
                Matched for: {aiAnalysis.symptomQuery || query}
              </Badge>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              {aiAnalysis.clinicalAssessment}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <span className="font-bold text-teal-300 block mb-1">Non-Pharmacological Guidance:</span>
                <p className="text-slate-300">{aiAnalysis.lifestyleAdvice}</p>
              </div>
              <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                <span className="font-bold text-amber-300 block mb-1">When to Seek Immediate Care:</span>
                <p className="text-amber-200/90">{aiAnalysis.redFlags}</p>
              </div>
            </div>
          </Card>

          {/* Suggested Medicines Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Clinically Recommended OTC Options ({aiAnalysis.suggestedMedicines?.length || 0})
              </h3>
              <span className="text-xs text-slate-400">Direct inventory dispatch via MediSearch Pharmacy</span>
            </div>

            {(!aiAnalysis.suggestedMedicines || aiAnalysis.suggestedMedicines.length === 0) ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm space-y-2">
                <p className="font-semibold text-slate-700">No matching over-the-counter medicine found in current inventory.</p>
                <p className="text-xs text-slate-400">
                  Please consult a board-certified physician for personalized clinical prescription or check our complete pharmacy catalog.
                </p>
                <Button variant="outline" size="sm" onClick={() => onNavigate('pharmacy')} className="mt-2">
                  Browse All Medicines
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {aiAnalysis.suggestedMedicines.map((med, idx) => (
                  <Card key={med.id || idx} hoverEffect className="p-6 flex flex-col justify-between h-full border-slate-200">
                    <div>
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 overflow-hidden">
                          {med.image ? (
                            <img src={med.image} alt={med.name} className="w-full h-full object-contain" />
                          ) : (
                            <Pill className="w-8 h-8 text-teal-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <Badge variant={med.fastActing ? 'warning' : 'info'} size="sm">
                              {med.category || 'OTC Medicine'}
                            </Badge>
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              {med.rating || 4.8}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-base mt-1 truncate">{med.name}</h4>
                          <p className="text-xs text-slate-400">{med.brand || 'Verified Generic'}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <p><strong className="text-slate-800">Action:</strong> {med.indication}</p>
                        <p><strong className="text-slate-800">Standard Dosing:</strong> {med.dailyDose}</p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        {med.originalPrice && (
                          <span className="text-xs text-slate-400 line-through block -mb-1">
                            ${Number(med.originalPrice).toFixed(2)}
                          </span>
                        )}
                        <span className="text-lg font-black text-slate-900">
                          ${Number(med.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate(med.id ? `pharmacy/${med.id}` : 'pharmacy')}
                        icon={Pill}
                      >
                        View & Order Now
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Doctor consult callout */}
          <div className="rounded-2xl bg-teal-50 border border-teal-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-teal-950 text-sm">Symptoms lasting more than 7 days?</h4>
                <p className="text-xs text-teal-800/80">Connect with a licensed gastroenterologist or family physician for personalized diagnosis.</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('doctors')}
              className="whitespace-nowrap shrink-0"
            >
              Find a Doctor
            </Button>
          </div>

        </div>
      )}

    </div>
  );
}
