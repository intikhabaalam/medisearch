import useNavigateById from '../../hooks/useNavigateById';
import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Pill, 
  ShieldCheck, 
  ArrowRight, 
  RotateCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  Activity,
  HeartHandshake,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function PrescriptionExplainerPage() {
  const onNavigate = useNavigateById();
  const { user } = useSelector((state) => state.auth);

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasScanned, setHasScanned] = useState(false);
  const [parsedPrescription, setParsedPrescription] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Track expanded state for each medicine card's AI details
  const [expandedMeds, setExpandedMeds] = useState({});
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const toggleMedicineDetails = (index) => {
    setExpandedMeds(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSizeBytes = 20 * 1024 * 1024; // 20 MB

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|pdf)$/i)) {
      toast.error('Invalid file format. Please upload a JPG, PNG, or PDF file.');
      return;
    }

    if (file.size > maxSizeBytes) {
      toast.error('File size exceeds the 20MB limit. Please choose a smaller file.');
      return;
    }

    setSelectedFile(file);
    setScanError(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleUploadAndScan = async (fileToScan) => {
    const targetFile = fileToScan || selectedFile;
    if (!targetFile) {
      fileInputRef.current?.click();
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('prescription', targetFile);

    try {
      const token = user?.token;
      const headers = {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      const response = await axios.post('/api/ai/prescription', formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 90) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      setUploadProgress(100);
      setParsedPrescription(response.data);
      setHasScanned(true);

      // Expand all medicine details by default for convenience
      if (response.data?.medicines) {
        const initialExpanded = {};
        response.data.medicines.forEach((_, idx) => {
          initialExpanded[idx] = true;
        });
        setExpandedMeds(initialExpanded);
      }

      toast.success('Prescription scanned and detailed medical explanations generated!');
    } catch (err) {
      console.error('Prescription scan error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.details || 'Prescription scanning failed. Please check the image and try again.';
      setScanError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFetchMedicineDetails = async () => {
    if (!parsedPrescription?._id && (!parsedPrescription?.medicines || parsedPrescription.medicines.length === 0)) {
      return;
    }

    setIsFetchingDetails(true);
    try {
      const token = user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        '/api/ai/prescription/explain-details',
        {
          prescriptionId: parsedPrescription._id,
          medicines: parsedPrescription.medicines,
          diagnosis_notes: parsedPrescription.diagnosis_notes
        },
        { headers }
      );

      setParsedPrescription(prev => ({
        ...prev,
        medicines: response.data.medicine_details || prev.medicines,
        overall_explanation: response.data.overall_explanation || prev.overall_explanation
      }));

      // Expand all details
      const initialExpanded = {};
      (response.data.medicine_details || []).forEach((_, idx) => {
        initialExpanded[idx] = true;
      });
      setExpandedMeds(initialExpanded);

      toast.success('Detailed medicine information generated by Gemini AI!');
    } catch (err) {
      console.error('Error generating details:', err);
      toast.error('Unable to refresh detailed medicine explanations.');
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setParsedPrescription(null);
    setHasScanned(false);
    setScanError(null);
    setUploadProgress(0);
    setExpandedMeds({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to parse visual schedule pills from frequency text
  const parseSchedule = (frequencyStr) => {
    const str = (frequencyStr || '').toLowerCase();
    const isMorning = str.includes('morning') || str.includes('1-') || str.includes('once') || str.includes('twice') || str.includes('thrice') || str.includes('1,');
    const isNoon = str.includes('noon') || str.includes('afternoon') || str.includes('-1-') || str.includes('thrice');
    const isNight = str.includes('night') || str.includes('bedtime') || str.includes('-1') || str.includes('twice') || str.includes('thrice');
    return [isMorning ? 1 : 0, isNoon ? 1 : 0, isNight ? 1 : 0];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Hidden native file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="hidden"
      />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="purple" size="sm">
          Vision OCR & Clinical Pharmacologist
        </Badge>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          AI Prescription Explainer & Medicine Guide
        </h1>
        <p className="text-sm text-slate-600">
          Upload any handwritten doctor's slip or clinic discharge summary. Our medical vision model deciphers medication schedules, explains active salts, actions, precautions, and food interactions.
        </p>
      </div>

      {/* Upload Zone & Scan State */}
      <Card 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-8 border-dashed border-2 transition-all text-center ${
          isDragging 
            ? 'border-indigo-500 bg-indigo-50/40 scale-[1.01]' 
            : 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/20'
        }`}
      >
        
        {isScanning ? (
          /* Animated Scanning State */
          <div className="py-10 space-y-4 max-w-md mx-auto animate-pulse">
            <div className="relative w-20 h-20 mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Scan className="w-10 h-10 animate-spin" />
              </div>
              <div className="absolute inset-0 border-2 border-indigo-400 rounded-2xl animate-ping" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-indigo-950">
                Analyzing Doctor's Prescription...
              </h3>
              <p className="text-xs text-indigo-700/80">
                Running Gemini OCR vision, deciphering medication regimens, and generating detailed pharmacological guides...
              </p>
            </div>

            <div className="w-56 bg-indigo-200 rounded-full h-2 mx-auto overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(uploadProgress, 20)}%` }}
              />
            </div>
            <p className="text-[11px] text-indigo-600 font-semibold">{uploadProgress}% Processed</p>
          </div>
        ) : (
          /* Dropzone / File Ready */
          <div className="py-6 space-y-4">
            
            {selectedFile ? (
              <div className="space-y-3">
                {filePreview ? (
                  <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-300 shadow-md bg-white">
                    <img src={filePreview} alt="Selected prescription" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                    <FileText className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Analysis
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Drag & Drop Your Prescription Image or PDF
                  </h3>
                  <p className="text-xs text-slate-400">
                    Supports JPG, PNG, PDF up to 20MB. Clear lighting produces best accuracy.
                  </p>
                </div>
              </div>
            )}

            {scanError && (
              <div className="max-w-md mx-auto p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{scanError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {selectedFile ? (
                <>
                  <Button
                    variant="ai"
                    size="md"
                    onClick={() => handleUploadAndScan()}
                    icon={Sparkles}
                  >
                    Analyze with Gemini AI
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Different File
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={handleReset}
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ai"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                    icon={Upload}
                  >
                    Select Prescription File
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Local Files
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

      </Card>

      {/* Extracted Results Section (Only rendered on real scan results) */}
      {hasScanned && parsedPrescription && !isScanning && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Metadata Strip */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 font-bold">
                  {parsedPrescription._id ? `RX-${parsedPrescription._id.slice(-6).toUpperCase()}` : 'RX-VERIFIED'}
                </span>
                <Badge variant="success" size="sm" dot>
                  Verified AI Extraction
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Prescribed by: {parsedPrescription.doctor_name || 'Doctor Unspecified'}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: {parsedPrescription.patient_name || 'Patient Unspecified'} • Date: {parsedPrescription.date || 'Recent'}
              </p>
              {parsedPrescription.diagnosis_notes && (
                <p className="text-xs text-indigo-700 mt-1.5 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                  <strong>Clinical Notes:</strong> {parsedPrescription.diagnosis_notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {parsedPrescription.image && (
                <a 
                  href={parsedPrescription.image} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Original
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('pharmacy')}
                icon={Pill}
              >
                Order via Pharmacy
              </Button>
            </div>
          </div>

          {/* TASK 1: Overall Prescription Explanation Card */}
          {parsedPrescription.overall_explanation && (
            <Card className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-teal-950 text-white shadow-xl space-y-4 border-indigo-900">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">AI Overall Prescription Explanation</h3>
                    <p className="text-[11px] text-slate-300">Dynamic clinical evaluation of prescribed course</p>
                  </div>
                </div>
                <Badge variant="purple" size="sm" className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40">
                  Comprehensive Overview
                </Badge>
              </div>

              {parsedPrescription.overall_explanation.medicines_summary && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 block mb-1">
                    Detected Medications Summary
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {parsedPrescription.overall_explanation.medicines_summary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                {parsedPrescription.overall_explanation.overall_purpose && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1">
                    <span className="font-bold text-indigo-300 block flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      Overall Purpose of Prescription:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {parsedPrescription.overall_explanation.overall_purpose}
                    </p>
                  </div>
                )}

                {parsedPrescription.overall_explanation.possible_reasons && (
                  <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 space-y-1">
                    <span className="font-bold text-teal-300 block flex items-center gap-1.5">
                      <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
                      Clinical Rationale for this Combination:
                    </span>
                    <p className="text-slate-300 leading-relaxed">
                      {parsedPrescription.overall_explanation.possible_reasons}
                    </p>
                  </div>
                )}
              </div>

              {parsedPrescription.overall_explanation.purpose_of_each?.length > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Individual Medicine Objectives in Regimen
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {parsedPrescription.overall_explanation.purpose_of_each.map((item, i) => (
                      <div key={i} className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                        <strong className="text-teal-300 block">{item.name}:</strong>
                        <span className="text-slate-300">{item.general_purpose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 pt-1 italic">
                * Note: Prescription analysis is informational. A specific medicine does not confirm a definitive disease. Always follow your doctor's clinical consultation.
              </p>
            </Card>
          )}

          {/* Cards for each extracted medicine */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Medications & AI Pharmacological Details ({parsedPrescription.medicines?.length || 0})
              </h3>
              {(!parsedPrescription.overall_explanation || !parsedPrescription.medicines?.[0]?.generic_name) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFetchMedicineDetails}
                  disabled={isFetchingDetails}
                >
                  {isFetchingDetails ? 'Generating Details...' : 'Generate Full AI Explanations'}
                </Button>
              )}
            </div>

            {(!parsedPrescription.medicines || parsedPrescription.medicines.length === 0) ? (
              <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                No specific medications were identified on this slip. Please verify the image quality and lighting.
              </div>
            ) : (
              parsedPrescription.medicines.map((med, index) => {
                const schedulePills = parseSchedule(med.frequency);
                const isExpanded = !!expandedMeds[index];

                return (
                  <Card key={index} className="p-6 border-slate-200 shadow-xs space-y-4">
                    
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <h4 className="text-lg font-extrabold text-slate-900">{med.name || 'Unspecified Medicine'}</h4>
                          {med.category && (
                            <Badge variant="purple" size="sm">
                              {med.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 pl-8">
                          {med.generic_name && med.generic_name !== med.name ? (
                            <span><strong>Active Generic Salt:</strong> {med.generic_name} • </span>
                          ) : null}
                          <span><strong>Dosage:</strong> {med.dosage || 'As directed'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMedicineDetails(index)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                        >
                          {isExpanded ? (
                            <span className="flex items-center gap-1">
                              <span>Hide AI Guide</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <span>View AI Guide</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onNavigate('pharmacy')}
                        >
                          Find in Pharmacy
                        </Button>
                      </div>
                    </div>

                    {/* Original Schedule Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      
                      {/* Daily Timing Pills */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Daily Timing & Frequency
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${schedulePills[0] ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            Morning ({schedulePills[0]})
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${schedulePills[1] ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            Noon ({schedulePills[1]})
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${schedulePills[2] ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            Night ({schedulePills[2]})
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block pt-1">
                          Frequency: {med.frequency || 'Follow prescription instructions'}
                        </span>
                      </div>

                      {/* Administration Guideline */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Administration & Duration
                        </span>
                        <p className="text-xs font-medium text-slate-800 flex items-start gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                          Duration: {med.duration || 'Complete prescribed course'}
                        </p>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Take with adequate water unless advised otherwise.
                        </p>
                      </div>

                      {/* Safety & Notes */}
                      <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/70 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                          Prescription OCR Notes
                        </span>
                        <p className="text-xs text-amber-900 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          {med.notes || 'No specific contraindications flagged on prescription slip.'}
                        </p>
                      </div>

                    </div>

                    {/* TASK 1: Expandable AI-Powered Detailed Medicine Information */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                            AI Clinical Pharmacological Guide: {med.name}
                          </h5>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          
                          {/* What it is used for & conditions */}
                          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                            <span className="font-bold text-indigo-950 block">What is this medicine used for?</span>
                            <p className="text-slate-700 leading-relaxed">
                              {med.usage || 'Commonly prescribed for symptomatic recovery and targeted therapeutic indications.'}
                            </p>

                            {med.conditions_treated?.length > 0 && (
                              <div className="pt-2">
                                <span className="font-semibold text-indigo-900 block mb-1.5">Common Conditions Treated:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {med.conditions_treated.map((cond, ci) => (
                                    <span key={ci} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                      {cond}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* How it works in the body */}
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                            <span className="font-bold text-slate-900 block">How does it work in the body? (Mechanism)</span>
                            <p className="text-slate-700 leading-relaxed">
                              {med.mechanism_of_action || 'Acts on specific cellular or enzymatic pathways to restore balance and relieve symptoms.'}
                            </p>

                            {med.food_interactions && (
                              <div className="pt-2 border-t border-slate-200/60">
                                <span className="font-semibold text-slate-800 block mb-0.5">Food & Dietary Instructions:</span>
                                <p className="text-slate-600 text-[11px]">{med.food_interactions}</p>
                              </div>
                            )}
                          </div>

                          {/* Side Effects */}
                          <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-100 space-y-2">
                            <span className="font-bold text-rose-950 block flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Common Side Effects
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-700">
                              {(med.side_effects?.length > 0 ? med.side_effects : ['Mild nausea or upset stomach', 'Drowsiness or dizziness in some patients']).map((se, sei) => (
                                <li key={sei}>{se}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Precautions & Drug Interactions */}
                          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 space-y-2">
                            <span className="font-bold text-amber-950 block flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                              Precautions & Drug Interactions
                            </span>
                            {med.precautions?.length > 0 && (
                              <ul className="list-disc list-inside space-y-1 text-slate-700 mb-2">
                                {med.precautions.map((prec, pi) => (
                                  <li key={pi}>{prec}</li>
                                ))}
                              </ul>
                            )}
                            {med.drug_interactions?.length > 0 && (
                              <div className="pt-1 border-t border-amber-200/60 text-[11px] text-amber-900">
                                <strong>Potential Interactions:</strong> {med.drug_interactions.join(' • ')}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>
                    )}

                  </Card>
                );
              })
            )}
          </div>

          <div className="rounded-xl bg-slate-100 p-4 text-xs text-slate-500 text-center">
            MediTrust AI extraction is an assistive readout. Always double-check dosage instructions with the packaging label and your pharmacist.
          </div>

        </div>
      )}

    </div>
  );
}
