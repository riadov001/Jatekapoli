import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import HomePage from "@/pages/home";
import RestaurantPage from "@/pages/restaurant";
import CartPage from "@/pages/cart";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import RewardsPage from "@/pages/rewards";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ProfilePage from "@/pages/profile";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import AdminRestaurantsPage from "@/pages/admin/restaurants";
import AdminRestaurantMenuPage from "@/pages/admin/restaurant-menu";
import AdminDriversPage from "@/pages/admin/drivers";
import AdminOrdersPage from "@/pages/admin/orders";
import AdminReviewsPage from "@/pages/admin/reviews";
import AdminSupportPage from "@/pages/admin/support";
import AdminPromotionsPage from "@/pages/admin/promotions";
import AdminSettingsPage from "@/pages/admin/settings";
import { AdminRoute } from "@/components/AdminRoute";
import RestaurantDashboardPage from "@/pages/restaurant-panel/dashboard";
import RestaurantMenuPage from "@/pages/restaurant-panel/menu";
import DriverDashboardPage from "@/pages/driver/dashboard";
import WelcomePage from "@/pages/welcome";
import LegalPage from "@/pages/legal";
import NotFound from "@/pages/not-found";

setAuthTokenGetter(() => localStorage.getItem("jatek_token"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, gcTime: 5 * 60_000, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});

function Router() {
  const [location] = useLocation();
  const isWelcome = location === "/welcome";

  if (isWelcome) {
    return <WelcomePage />;
  }

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
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/legal" component={LegalPage} />
        <Route path="/admin"><Redirect to="/admin/dashboard" /></Route>
        <Route path="/admin/dashboard"><AdminRoute><AdminDashboardPage /></AdminRoute></Route>
        <Route path="/admin/users"><AdminRoute><AdminUsersPage /></AdminRoute></Route>
        <Route path="/admin/restaurants"><AdminRoute><AdminRestaurantsPage /></AdminRoute></Route>
        <Route path="/admin/restaurants/:id/menu"><AdminRoute><AdminRestaurantMenuPage /></AdminRoute></Route>
        <Route path="/admin/drivers"><AdminRoute><AdminDriversPage /></AdminRoute></Route>
        <Route path="/admin/orders"><AdminRoute><AdminOrdersPage /></AdminRoute></Route>
        <Route path="/admin/reviews"><AdminRoute><AdminReviewsPage /></AdminRoute></Route>
        <Route path="/admin/support"><AdminRoute><AdminSupportPage /></AdminRoute></Route>
        <Route path="/admin/promotions"><AdminRoute><AdminPromotionsPage /></AdminRoute></Route>
        <Route path="/admin/settings"><AdminRoute><AdminSettingsPage /></AdminRoute></Route>
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
