import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Calendar, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime, truncateText } from "@/lib/utils";
import type { EntryWithTags } from "@shared/schema";

const tagColors = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800", 
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-yellow-100 text-yellow-800",
  "bg-red-100 text-red-800",
];

function getTagColor(tagName: string) {
  const hash = tagName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tagColors[hash % tagColors.length];
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Fetch entries based on search query
  const { data: entries = [], isLoading, error } = useQuery<EntryWithTags[]>({
    queryKey: searchQuery 
      ? ["/api/entries/search", { q: searchQuery }] 
      : ["/api/entries"],
    queryFn: async ({ queryKey }) => {
      const [url, params] = queryKey;
      if (params && typeof params === "object" && "q" in params) {
        const searchParams = new URLSearchParams({ q: params.q as string });
        const response = await fetch(`${url}?${searchParams}`);
        if (!response.ok) throw new Error("Failed to search entries");
        return response.json();
      } else {
        const response = await fetch(url as string);
        if (!response.ok) throw new Error("Failed to fetch entries");
        return response.json();
      }
    },
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
              <p className="text-muted-foreground">
                Failed to load entries. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-6 shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Learning Journal</h1>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search Bar */}
          {isSearchVisible && (
            <div className="mt-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search entries or tags..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-white/90 border-primary-foreground/30 text-gray-900 placeholder:text-gray-600 focus:bg-white"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary-foreground/60" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pb-20">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded-full w-12"></div>
                    <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <TagIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No matching entries" : "No entries yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "Try adjusting your search terms" 
                : "Start your learning journey by adding your first entry"
              }
            </p>
            {!searchQuery && (
              <Link href="/add">
                <Button>Add Entry</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Link key={entry.id} href={`/entry/${entry.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-foreground text-lg leading-tight flex-1 mr-2">
                        {entry.title}
                      </h3>
                      <div className="flex items-center text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatRelativeTime(entry.createdAt)}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {truncateText(entry.content, 120)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className={`text-xs ${getTagColor(tag.name)}`}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Link href="/add">
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
