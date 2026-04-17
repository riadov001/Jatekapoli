import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import HomePage from "@/pages/home";
import RestaurantPage from "@/pages/restaurant";
import CartPage from "@/pages/cart";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import RewardsPage from "@/pages/rewards";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import AdminRestaurantsPage from "@/pages/admin/restaurants";
import AdminDriversPage from "@/pages/admin/drivers";
import AdminOrdersPage from "@/pages/admin/orders";
import RestaurantDashboardPage from "@/pages/restaurant-panel/dashboard";
import RestaurantMenuPage from "@/pages/restaurant-panel/menu";
import DriverDashboardPage from "@/pages/driver/dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/restaurants" component={HomePage} />
        <Route path="/restaurants/:id" component={RestaurantPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/orders/:id" component={OrderDetailPage} />
        <Route path="/rewards" component={RewardsPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/admin/dashboard" component={AdminDashboardPage} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/restaurants" component={AdminRestaurantsPage} />
        <Route path="/admin/drivers" component={AdminDriversPage} />
        <Route path="/admin/orders" component={AdminOrdersPage} />
        <Route path="/restaurant/dashboard" component={RestaurantDashboardPage} />
        <Route path="/restaurant/menu" component={RestaurantMenuPage} />
        <Route path="/driver/dashboard" component={DriverDashboardPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CartProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ErrorBoundary>
                  <Router />
                </ErrorBoundary>
              </WouterRouter>
              <Toaster />
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
