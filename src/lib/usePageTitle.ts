import { useEffect } from "react";

export function usePageTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `Emmanuel Church | ${page}` : "Emmanuel Church";
  }, [page]);
}
