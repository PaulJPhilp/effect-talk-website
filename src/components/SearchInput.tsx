"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function SearchInput() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form className="relative w-full max-w-sm" onSubmit={handleSubmit}>
      <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        className="h-9 pl-8"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search patterns, rules..."
        type="search"
        value={query}
      />
    </form>
  );
}
