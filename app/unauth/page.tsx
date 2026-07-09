"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative w-72 h-72">
            <img
              src="/assets/error_401.png"
              alt="401 Error"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative w-64 h-16">
            <img
              src="/assets/unauth_text.png"
              alt="Unauthorized"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Access Denied
          </h2>
          <p className="text-base text-gray-500">
            You are not authorized to access this site. The link may be expired, invalid, or requires a session verification.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-colors"
          >
            <ShieldAlert className="h-4 w-4" />
            Try Reconnecting
          </Link>
        </div>
      </div>
    </div>
  );
}
