// app/superadmin/users/create-form.tsx
"use client";

import { useRef, useTransition, useState } from "react";
import { createUserAction } from "./actions";

interface CreateUserFormProps {
  sites: Array<{ id: string; name: string }>;
}

export function CreateUserForm({ sites }: CreateUserFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await createUserAction(formData);
      formRef.current?.reset();
      setIsOpen(false); // Smoothly close the modal on success
    });
  };

  return (
    <>
      {/* Trigger Button - Positioned beautifully at the top of your list page */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer active:scale-98"
      >
        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add New System User
      </button>

      {/* Pop-up Modal Overlay Wrapper */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
          
          {/* Modal Container Card */}
          <div className="w-full max-w-md scale-100 rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all animate-scale-up">
            
            {/* Header Area */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Onboard New Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Fill in credentials to assign system access boundaries.</p>
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

            {/* Form Fields */}
            <form ref={formRef} action={handleSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 text-slate-900"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Temporary Password
                </label>
                <input 
                  type="password" 
                  name="password" 
                  required 
                  minLength={6}
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Operating Site
                </label>
                <select 
                  name="siteId" 
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 text-slate-900 font-medium"
                >
                  <option value="">-- Select Deployment Location --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  System Role Access
                </label>
                <select 
                  name="role" 
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-60 text-slate-900 font-medium"
                >
                  <option value="staff">Staff</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {/* Modal Actions Footer */}
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creating Account..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}