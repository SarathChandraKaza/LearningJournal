import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar as CalendarIcon, Flame, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { EntryWithTags } from "@shared/schema";

export default function Streak() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: entries = [], isLoading } = useQuery<EntryWithTags[]>({
    queryKey: ["/api/entries"],
  });

  // Calculate streak data
  const entryDates = entries.map(entry => {
    const date = new Date(entry.createdAt);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  });

  const uniqueDates = Array.from(new Set(entryDates.map(date => date.toDateString())))
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => b.getTime() - a.getTime());

  // Calculate current streak
  const calculateCurrentStreak = () => {
    if (uniqueDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let checkDate = new Date(today);
    
    // Check if there's an entry today, if not start from yesterday
    const hasEntryToday = uniqueDates.some(date => 
      date.toDateString() === today.toDateString()
    );
    
    if (!hasEntryToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const hasEntry = uniqueDates.some(date => 
        date.toDateString() === checkDate.toDateString()
      );
      
      if (hasEntry) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Calculate longest streak
  const calculateLongestStreak = () => {
    if (uniqueDates.length === 0) return 0;
    
    let longestStreak = 1;
    let currentStreak = 1;
    
    const sortedDates = [...uniqueDates].sort((a, b) => a.getTime() - b.getTime());
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currentDate = sortedDates[i];
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return longestStreak;
  };

  const currentStreak = calculateCurrentStreak();
  const longestStreak = calculateLongestStreak();
  const totalEntries = entries.length;
  const totalDaysActive = uniqueDates.length;

  // Get entries for selected date
  const getEntriesForDate = (date: Date) => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate.toDateString() === date.toDateString();
    });
  };

  const selectedDateEntries = selectedDate ? getEntriesForDate(selectedDate) : [];

  // Check if a date has entries
  const hasEntriesOnDate = (date: Date) => {
    return uniqueDates.some(entryDate => 
      entryDate.toDateString() === date.toDateString()
    );
  };

  const modifiers = {
    hasEntry: uniqueDates,
  };

  const modifiersStyles = {
    hasEntry: {
      backgroundColor: 'hsl(243, 75%, 59%)',
      color: 'white',
      borderRadius: '50%',
    },
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
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Streak Calendar</h1>
          </div>
        </header>
        <div className="max-w-md mx-auto p-4">
          <div className="animate-pulse space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
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
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Streak Calendar</h1>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="h-6 w-6 text-orange-500 mr-2" />
                <span className="text-2xl font-bold text-foreground">{currentStreak}</span>
              </div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-blue-500 mr-2" />
                <span className="text-2xl font-bold text-foreground">{longestStreak}</span>
              </div>
              <p className="text-sm text-muted-foreground">Longest Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-foreground">{totalEntries}</div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{totalDaysActive}</div>
                <p className="text-sm text-muted-foreground">Active Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Activity Calendar
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Days with entries are highlighted in blue
            </p>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Selected Date Entries */}
        {selectedDate && selectedDateEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Entries for {formatDate(selectedDate)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDateEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => setLocation(`/entry/${entry.id}`)}
                >
                  <h4 className="font-medium text-foreground mb-1">{entry.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {entry.content.substring(0, 100)}...
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedDate && selectedDateEntries.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No entries found for {formatDate(selectedDate)}
              </p>
              {selectedDate.toDateString() === new Date().toDateString() && (
                <Button
                  className="mt-3"
                  onClick={() => setLocation("/add")}
                >
                  Add Entry for Today
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}