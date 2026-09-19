import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Nav } from "./components/Nav";
import { LandingPage } from "./pages/LandingPage";
import { PendingPage } from "./pages/PendingPage";
import { HomePage } from "./pages/HomePage";
import { VolunteeringPage } from "./pages/VolunteeringPage";
import { FeastsPage } from "./pages/FeastsPage";
import { ManagePage } from "./pages/ManagePage";

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <LandingPage />;

  return <RegisteredApp />;
}

function RegisteredApp() {
  const me = useQuery(api.users.getMe);
  const ensureAccount = useMutation(api.users.ensureAccount);

  useEffect(() => {
    if (me?.status === "unregistered") {
      ensureAccount({});
    }
  }, [me?.status, ensureAccount]);

  if (me === undefined) return null;
  if (me.status === "unregistered" || me.status === "signed-out") return null;
  if (me.status === "pending") return <PendingPage denied={false} />;
  if (me.status === "denied") return <PendingPage denied={true} />;

  const isAdmin = me.user.role === "admin";

  return (
    <BrowserRouter>
      <Nav isAdmin={isAdmin} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/volunteering"
          element={<VolunteeringPage isAdmin={isAdmin} />}
        />
        <Route path="/feasts" element={<FeastsPage />} />
        <Route
          path="/manage"
          element={isAdmin ? <ManagePage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
