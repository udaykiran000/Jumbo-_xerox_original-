import React, { useMemo } from "react";
import { Loader2, Pause, Play, ChevronRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const ServiceSummary = ({
  serviceType,
  files = [], // Array of file objects or names
  settings = {}, // The settings object from the form
  price = 0, // Total estimated price
  uploadState = {}, // { uploading, isPaused, overallProgress, eta }
  onPlaceOrder,
  onPauseToggle,
  isDisabled = false,
}) => {
  // Normalize settings similar to Checkout logic for consistent display
  const normalizedSettings = useMemo(() => {
    return {
      paperSize: settings.size || settings.paperSize,
      paperType: settings.media || settings.paperType || settings.paper, // QuickPrint 'media', BusCard 'paper'
      printColor: settings.printType || settings.printColor,
      printSide: settings.sides || settings.printSide,
      binding: settings.binding,
      cover: settings.cover,
      lamination: settings.lamination,
      corner: settings.corner,
      cardType: settings.cardType,
      qty: settings.qty || settings.copies,
      pages: settings.pages || settings.totalPages,
    };
  }, [settings]);

  const { uploading, isPaused, overallProgress, eta } = uploadState;

  return (
    <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden font-sans">
      {/* HEADER */}
      <div className="bg-slate-800 text-white p-4 text-center">
        <h3 className="font-bold text-lg">Item Summary</h3>
        <p className="text-slate-400 text-xs mt-0.5">Review your selection</p>
      </div>

      <div className="p-6">
        {/* FILES SECTION */}
        <div className="mb-6">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 
            {files.length > 0 ? `${files.length} Files Uploaded` : "No Files Selected"}
          </p>
          
          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="bg-white p-1.5 rounded text-red-500 shadow-sm">
                    <span className="text-[9px] font-bold">PDF</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate flex-1">
                    {file.name || file} 
                  </span>
                  <CheckCircle2 size={12} className="text-green-500" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SPECIFICATIONS SECTION */}
        <div className="mb-6">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Specifications
          </p>
          <div className="text-sm space-y-2">
             <SpecRow label="Service" value={serviceType} />
             
             {/* Dynamic Fields */}
             {normalizedSettings.qty && <SpecRow label="Quantity/Sets" value={normalizedSettings.qty} />}
             {normalizedSettings.pages && <SpecRow label="Total Pages" value={normalizedSettings.pages} />}
             {normalizedSettings.paperSize && <SpecRow label="Size" value={normalizedSettings.paperSize} />}
             {normalizedSettings.paperType && <SpecRow label="Paper Type" value={normalizedSettings.paperType} />}
             {normalizedSettings.printColor && <SpecRow label="Color Mode" value={normalizedSettings.printColor} />}
             {normalizedSettings.printSide && <SpecRow label="Print Sides" value={normalizedSettings.printSide} />}
             {normalizedSettings.binding && normalizedSettings.binding !== "none" && <SpecRow label="Binding" value={normalizedSettings.binding} />}
             {normalizedSettings.lamination && normalizedSettings.lamination !== "none" && <SpecRow label="Lamination" value={normalizedSettings.lamination} />}
          </div>
        </div>

        {/* UPLOAD PROGRESS SECTION (For QuickPrint) */}
        {(uploading || isPaused) && (
          <div className="mb-6 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                  {isPaused ? "Upload Paused" : "Uploading..."}
                </span>
                <span className="text-[10px] text-gray-400 font-bold">
                  {eta ? `ETA: ${eta}` : "Calculating..."}
                </span>
              </div>
              {onPauseToggle && (
                <button
                  onClick={onPauseToggle}
                  className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
              )}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${overallProgress}%` }}
                className={`h-full ${isPaused ? "bg-yellow-400" : "bg-blue-600"}`}
              />
            </div>
            <div className="text-right text-[9px] font-black text-gray-400">
              {Math.round(overallProgress)}% COMPLETE
            </div>
          </div>
        )}

        {/* PRICE & ACTION */}
        <div className="pt-4 border-t-2 border-dashed border-slate-200">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm font-bold text-gray-600">Total Estimate</span>
            <span className="text-2xl font-black text-blue-600">
              ₹{Number(price).toFixed(2)}
            </span>
          </div>

          <button
            onClick={onPlaceOrder}
            disabled={isDisabled || (uploading && !isPaused)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading && !isPaused ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">Uploading...</span>
              </>
            ) : isPaused ? (
              "Resume Upload"
            ) : (
              <>
                Place Order <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const SpecRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
    <span className="text-xs font-bold text-slate-800 capitalize text-right max-w-[150px] truncate">{value}</span>
  </div>
);

export default ServiceSummary;
