import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Edit, Trash, Calendar, Clock, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

export default function EntryDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const entryId = parseInt(params.id as string);

  const { data: entry, isLoading, error } = useQuery<EntryWithTags>({
    queryKey: ["/api/entries", entryId],
    queryFn: async () => {
      const response = await fetch(`/api/entries/${entryId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Entry not found");
        }
        throw new Error("Failed to fetch entry");
      }
      return response.json();
    },
  });

  const { data: allEntries = [] } = useQuery<EntryWithTags[]>({
    queryKey: ["/api/entries"],
  });

  // Find current entry index and get next/previous entries
  const currentIndex = allEntries.findIndex(e => e.id === entryId);
  const previousEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null;
  const nextEntry = currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null;

  // Export functionality
  const exportData = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalEntries: allEntries.length,
      entries: allEntries.map(entry => ({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        tags: entry.tags.map(tag => tag.name),
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      }))
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learning-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: "Your journal data has been downloaded",
    });
  };

  const deleteEntryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Success!",
        description: "Entry deleted successfully",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
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
            <h1 className="text-xl font-semibold">Entry Details</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !entry) {
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
            <h1 className="text-xl font-semibold">Entry Details</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
                <p className="text-muted-foreground">
                  {error?.message === "Entry not found" 
                    ? "This entry could not be found."
                    : "Failed to load entry. Please try again later."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const wordCount = entry.content.split(/\s+/).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="mr-3 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setLocation("/")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Entry Details</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={exportData}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setLocation(`/edit/${entryId}`)}
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                  >
                    <Trash className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Entry</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this entry? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteEntryMutation.mutate()}
                      disabled={deleteEntryMutation.isPending}
                    >
                      {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => previousEntry && setLocation(`/entry/${previousEntry.id}`)}
              disabled={!previousEntry}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-primary-foreground/80 text-sm">
              {currentIndex + 1} of {allEntries.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => nextEntry && setLocation(`/entry/${nextEntry.id}`)}
              disabled={!nextEntry}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        <div className="space-y-6">
          {/* Entry Title */}
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-bold text-foreground leading-tight mb-4">
                {entry.title}
              </h1>
              
              {/* Entry Metadata */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateTime(entry.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{wordCount} words</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className={`text-sm font-medium ${getTagColor(tag.name)}`}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entry Content */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Content</h3>
              <div className="prose prose-sm max-w-none text-foreground">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {entry.content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => setLocation(`/edit/${entryId}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Entry</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this entry? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteEntryMutation.mutate()}
                    disabled={deleteEntryMutation.isPending}
                  >
                    {deleteEntryMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
