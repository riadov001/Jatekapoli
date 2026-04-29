import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import { AuthGate } from "@/components/AuthGate";
import { Layout } from "@/components/Layout";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Products from "@/pages/products";
import Categories from "@/pages/categories";
import Shops from "@/pages/shops";
import Reviews from "@/pages/reviews";
import Customers from "@/pages/customers";
import Staff from "@/pages/staff";
import Deliverymen from "@/pages/deliverymen";
import Roles from "@/pages/roles";
import Promotions from "@/pages/promotions";
import Wallets from "@/pages/wallets";
import Notifications from "@/pages/notifications";
import Reports from "@/pages/reports";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("jatek_backend_token"));

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <AuthGate>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/orders" component={Orders} />
              <Route path="/products" component={Products} />
              <Route path="/categories" component={Categories} />
              <Route path="/shops" component={Shops} />
              <Route path="/reviews" component={Reviews} />
              <Route path="/customers" component={Customers} />
              <Route path="/staff" component={Staff} />
              <Route path="/deliverymen" component={Deliverymen} />
              <Route path="/roles" component={Roles} />
              <Route path="/settings" component={SettingsPage} />
              <Route path="/promotions" component={Promotions} />
              <Route path="/wallets" component={Wallets} />
              <Route path="/notifications" component={Notifications} />
              <Route path="/reports" component={Reports} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </AuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
