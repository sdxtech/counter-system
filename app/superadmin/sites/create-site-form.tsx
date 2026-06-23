// app/superadmin/sites/create-site-form.tsx
"use client";

import { useRef, useTransition, useState } from "react";
import { createSiteAction } from "./actions";

export function CreateSiteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await createSiteAction(formData);
      formRef.current?.reset();
      setIsOpen(false); // Close modal on success
    });
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-purple-700 transition-all cursor-pointer active:scale-98"
      >
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Register New Site
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs transition-opacity">
          
          {/* Modal Container */}
          <div className="w-full max-w-md scale-100 rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Add Operational Site</h3>
                <p className="text-xs text-slate-500 mt-0.5">Register a physical facility deployment endpoint.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} action={handleSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Site Name / Code
                </label>
                <input 
                  type="text" 
                  name="siteName" 
                  required 
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-60 text-slate-900" 
                  placeholder="e.g., IDAME-CGK" 
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Registering..." : "Confirm & Save"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}