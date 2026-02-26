import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="w-24 h-24 text-emerald-500 mb-8" />
      <h1 className="text-6xl font-black text-white mb-4 italic tracking-tighter">404 ERROR</h1>
      <p className="text-zinc-400 mb-12 text-xl max-w-lg">
        This sector of the arcade is currently offline or does not exist.
      </p>
      <Link 
        href="/"
        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-10 py-5 rounded-2xl transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
      >
        BACK TO COMMAND CENTER
      </Link>
    </div>
  );
}
