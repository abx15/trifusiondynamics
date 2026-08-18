import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="w-full flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
