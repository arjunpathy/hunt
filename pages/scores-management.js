import { useEffect } from "react";

export default function ScoresManagement() {
  useEffect(() => {
    // Redirect to new admin location
    window.location.href = "/admin?tab=scores";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
      <p>Redirecting to admin panel...</p>
    </div>
  );
}
