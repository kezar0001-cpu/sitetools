"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getIcon } from "@/components/icons/getIcon";
import { Suspense } from "react";
import { LoginClient } from "./LoginClient";

function LoginLoadingFallback() {
    return (
        <div className="flex-1 flex items-center justify-center py-24">
            <div className="h-8 w-8 rounded-full border-b-2 border-amber-500 animate-spin" />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginLoadingFallback />}>
            <LoginClient />
        </Suspense>
    );
}
