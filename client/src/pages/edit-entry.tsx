import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { EntryWithTags } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required").max(5000, "Content too long"),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditEntry() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const entryId = parseInt(params.id as string);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
    },
  });

  // Update form when entry data loads
  useEffect(() => {
    if (entry) {
      const tagString = entry.tags.map(tag => tag.name).join(", ");
      form.reset({
        title: entry.title,
        content: entry.content,
        tags: tagString,
      });
      setSelectedTags(entry.tags.map(tag => tag.name));
    }
  }, [entry, form]);

  const updateEntryMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const tagList = data.tags 
        ? data.tags.split(",").map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      return apiRequest("PUT", `/api/entries/${entryId}`, {
        title: data.title,
        content: data.content,
        tags: tagList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries", entryId] });
      toast({
        title: "Success!",
        description: "Entry updated successfully",
      });
      setLocation(`/entry/${entryId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateEntryMutation.mutate(data);
  };

  const handleTagsChange = (value: string) => {
    const tagList = value 
      ? value.split(",").map(tag => tag.trim()).filter(tag => tag)
      : [];
    setSelectedTags(tagList);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg">
          <div className="max-w-md mx-auto flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-3 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setLocation(`/entry/${entryId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Edit Entry</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
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
            <h1 className="text-xl font-semibold">Edit Entry</h1>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-3 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setLocation(`/entry/${entryId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Edit Entry</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Edit Learning Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What did you learn today?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your learning experience, insights, and reflections..."
                          rows={8}
                          {...field}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground text-right">
                        {field.value?.length || 0} / 5000 characters
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="React, JavaScript, Frontend (comma-separated)"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleTagsChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Separate tags with commas
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tag Preview */}
                {selectedTags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-foreground mb-3">Current tags:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry Metadata */}
                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-foreground mb-2">Entry Information</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Created: {formatDateTime(entry.createdAt)}</div>
                      <div>Last modified: {formatDateTime(entry.updatedAt)}</div>
                      <div>Word count: {entry.content.split(/\s+/).length} words</div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation(`/entry/${entryId}`)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateEntryMutation.isPending}
                  >
                    {updateEntryMutation.isPending ? "Updating..." : "Update Entry"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
