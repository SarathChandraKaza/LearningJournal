import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AddEntry from "@/pages/add-entry";
import EntryDetail from "@/pages/entry-detail";
import EditEntry from "@/pages/edit-entry";
import Streak from "@/pages/streak";
import Tags from "@/pages/tags";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/add" component={AddEntry} />
      <Route path="/entry/:id" component={EntryDetail} />
      <Route path="/edit/:id" component={EditEntry} />
      <Route path="/streak" component={Streak} />
      <Route path="/tags" component={Tags} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
