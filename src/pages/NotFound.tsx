import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const handleGoHome = () => {
    if (user) {
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/auth", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-soft text-center max-w-md mx-4">
        <p className="text-xs font-medium text-primary mb-2 tracking-wide uppercase flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Error 404
        </p>
        <h1 className="mb-3 text-3xl font-semibold">Página no encontrada</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          La ruta <span className="font-mono text-foreground">{location.pathname}</span> no existe.
          {" "}
          Te llevaremos de vuelta a la aplicación.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGoHome} className="gap-2">
            {user ? <Home className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {user ? "Ir al dashboard" : "Ir al inicio de sesión"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            type="button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
