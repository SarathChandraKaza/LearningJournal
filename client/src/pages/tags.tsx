import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Tag as TagIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, truncateText } from "@/lib/utils";
import type { EntryWithTags, Tag } from "@shared/schema";

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

export default function Tags() {
  const [, setLocation] = useLocation();
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);

  const { data: entries = [], isLoading: entriesLoading } = useQuery<EntryWithTags[]>({
    queryKey: ["/api/entries"],
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Get entries for selected tag
  const tagEntries = selectedTag 
    ? entries.filter(entry => entry.tags.some(tag => tag.id === selectedTag.id))
    : [];

  // Group entries by tags
  const tagGroups = tags.map(tag => ({
    tag,
    entries: entries.filter(entry => entry.tags.some(entryTag => entryTag.id === tag.id)),
    count: entries.filter(entry => entry.tags.some(entryTag => entryTag.id === tag.id)).length
  })).filter(group => group.count > 0)
    .sort((a, b) => b.count - a.count);

  const handleTagSelect = (tag: Tag) => {
    setSelectedTag(tag);
    setCurrentEntryIndex(0);
  };

  const handlePreviousEntry = () => {
    if (currentEntryIndex > 0) {
      setCurrentEntryIndex(currentEntryIndex - 1);
    }
  };

  const handleNextEntry = () => {
    if (currentEntryIndex < tagEntries.length - 1) {
      setCurrentEntryIndex(currentEntryIndex + 1);
    }
  };

  const currentEntry = tagEntries[currentEntryIndex];

  if (entriesLoading || tagsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg">
          <div className="max-w-md mx-auto flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-3 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Browse by Tags</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => {
              if (selectedTag) {
                setSelectedTag(null);
                setCurrentEntryIndex(0);
              } else {
                setLocation("/");
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">
            {selectedTag ? selectedTag.name : "Browse by Tags"}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        {!selectedTag ? (
          // Tag list view
          <div className="space-y-4">
            {tagGroups.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TagIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No tags found</h3>
                    <p className="text-muted-foreground">
                      Start adding tags to your entries to organize them better.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              tagGroups.map(({ tag, count }) => (
                <Card key={tag.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4" onClick={() => handleTagSelect(tag)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="secondary"
                          className={`${getTagColor(tag.name)} text-sm font-medium`}
                        >
                          {tag.name}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {count} {count === 1 ? "entry" : "entries"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          // Tag entries view
          <div className="space-y-4">
            {tagEntries.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      No entries found with tag "{selectedTag.name}".
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Navigation controls */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousEntry}
                        disabled={currentEntryIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentEntryIndex + 1} of {tagEntries.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextEntry}
                        disabled={currentEntryIndex === tagEntries.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Current entry */}
                {currentEntry && (
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-6" onClick={() => setLocation(`/entry/${currentEntry.id}`)}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-foreground text-lg leading-tight flex-1 mr-2">
                          {currentEntry.title}
                        </h3>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(currentEntry.createdAt)}
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {truncateText(currentEntry.content, 200)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {currentEntry.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className={`text-xs ${getTagColor(tag.name)} ${
                              tag.id === selectedTag.id ? 'ring-2 ring-primary' : ''
                            }`}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Entry list preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      All entries with "{selectedTag.name}"
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tagEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                          index === currentEntryIndex 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setCurrentEntryIndex(index)}
                      >
                        <div className="font-medium">{entry.title}</div>
                        <div className="text-xs opacity-80">
                          {formatDateTime(entry.createdAt)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}