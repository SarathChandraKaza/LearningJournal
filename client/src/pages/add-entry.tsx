import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required").max(5000, "Content too long"),
  tags: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const popularTags = ["React", "JavaScript", "Android", "Database", "Design", "Kotlin", "CSS", "Python"];

export default function AddEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const tagList = data.tags 
        ? data.tags.split(",").map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      return apiRequest("POST", "/api/entries", {
        title: data.title,
        content: data.content,
        tags: tagList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Success!",
        description: "Entry created successfully",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createEntryMutation.mutate(data);
  };

  const addPopularTag = (tagName: string) => {
    const currentTags = form.getValues("tags");
    const tagList = currentTags 
      ? currentTags.split(",").map(tag => tag.trim()).filter(tag => tag)
      : [];
    
    if (!tagList.includes(tagName)) {
      tagList.push(tagName);
      form.setValue("tags", tagList.join(", "));
      setSelectedTags(tagList);
    }
  };

  const handleTagsChange = (value: string) => {
    const tagList = value 
      ? value.split(",").map(tag => tag.trim()).filter(tag => tag)
      : [];
    setSelectedTags(tagList);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          <h1 className="text-xl font-semibold">New Entry</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Learning Entry</CardTitle>
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
                    <div className="text-sm font-medium text-foreground mb-3">Preview:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Tags */}
                <div>
                  <div className="text-sm font-medium text-foreground mb-3">Popular Tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addPopularTag(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setLocation("/")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createEntryMutation.isPending}
                  >
                    {createEntryMutation.isPending ? "Saving..." : "Save Entry"}
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
