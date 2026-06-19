import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ScoresManagement() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin?tab=scores");
  }, [router]);

  return null;
}
