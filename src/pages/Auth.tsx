import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JmSigninSplit } from "@/components/ui/jm-signin-split";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const signupSchema = loginSchema.extend({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  // Loader global mientras se inicializa la sesión de Supabase
  if (authLoading) {
    return <FullPageLoader />;
  }

  if (user) {
    return <Navigate to="/hub" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const schema = isLogin ? loginSchema : signupSchema;
      const data = isLogin
        ? { email, password }
        : { email, password, firstName, lastName };
      schema.parse(data);

      const fullName = !isLogin
        ? `${firstName.trim()} ${lastName.trim()}`.trim()
        : "";

      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message === "Invalid login credentials"
              ? "Credenciales inválidas"
              : error.message === "User already registered"
              ? "Este email ya está registrado"
              : error.message,
        });
      } else {
        if (!isLogin) {
          toast({
            title: "Cuenta creada",
            description: "Bienvenido a Buses JM",
          });
        }
        navigate("/hub");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Ingresa tu correo",
        description:
          "Escribe tu correo electrónico para enviar el enlace de restablecimiento.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Correo enviado",
        description:
          "Revisa tu bandeja de entrada para restablecer la contraseña.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "No se pudo enviar el correo",
        description: error?.message || "Intenta nuevamente en unos minutos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo iniciar sesión con Google",
      });
    }
    setLoading(false);
  };

  return (
    <JmSigninSplit
      title="Plataforma JM"
      subtitle="Gestión integrada de Medio Ambiente y Seguridad en un solo lugar."
      bullets={[
        "Todo en un solo lugar: Gestión Ambiental y Seguridad (PAM)",
        "Seguimiento completo desde monitoreo hasta cumplimiento",
        "Tu equipo ahorra tiempo con software integrado y fácil de usar",
        "Experiencia consistente y profesional en todo momento",
      ]}
      supportingText="Somos especialistas en faenas mineras. Conectamos colaboradores entre V y II región."
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[#0A0D12] sm:text-xl">
            {isLogin ? "Iniciar sesión" : "Crear cuenta"}
          </h2>
          <p className="text-sm text-[#5B6770]">
            {isLogin
              ? "Accede a la plataforma completa de gestión integrada."
              : "Registra tu cuenta para comenzar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  aria-label="Nombre"
                  aria-invalid={!!errors.firstName}
                  aria-describedby={
                    errors.firstName ? "firstName-error" : undefined
                  }
                  className="border-[#E6E9ED] bg-[#F9FAFB] focus-visible:ring-2 focus-visible:ring-[#ba4a3f]/40 focus-visible:border-[#ba4a3f]"
                />
                {errors.firstName && (
                  <p
                    id="firstName-error"
                    className="text-xs text-[#C3161D]"
                    role="alert"
                  >
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  aria-label="Apellido"
                  aria-invalid={!!errors.lastName}
                  aria-describedby={
                    errors.lastName ? "lastName-error" : undefined
                  }
                  className="border-[#E6E9ED] bg-[#F9FAFB] focus-visible:ring-2 focus-visible:ring-[#C3161D]/40 focus-visible:border-[#C3161D]"
                />
                {errors.lastName && (
                  <p
                    id="lastName-error"
                    className="text-xs text-[#C3161D]"
                    role="alert"
                  >
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Correo corporativo</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@busesjm.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              aria-label="Correo corporativo"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="border-[#E6E9ED] bg-[#F9FAFB] focus-visible:ring-2 focus-visible:ring-[#C3161D]/40 focus-visible:border-[#C3161D]"
            />
            {errors.email && (
              <p
                id="email-error"
                className="text-xs text-[#C3161D]"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                aria-label="Contraseña"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="border-[#E6E9ED] bg-[#F9FAFB] pr-10 focus-visible:ring-2 focus-visible:ring-[#ba4a3f]/40 focus-visible:border-[#ba4a3f]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6B7280] hover:text-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba4a3f]/40"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p
                id="password-error"
                className="text-xs text-[#C3161D]"
                role="alert"
              >
                {errors.password}
              </p>
            )}
            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#ba4a3f] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba4a3f]/30 rounded"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>

          <Button
            type="submit"
            className="h-10 w-full rounded-xl bg-[#ba4a3f] text-sm font-medium text-white shadow-[0_10px_24px_rgba(186,74,63,0.45)] hover:bg-[#a13f36] hover:shadow-[0_14px_30px_rgba(186,74,63,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba4a3f]/40 disabled:opacity-70 transition-shadow"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continuar
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </form>

        <div className="space-y-3 text-center text-xs text-[#6B7280]">
          <p>
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-[#ba4a3f] hover:underline"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
          <p>Conexión segura. Usa tus credenciales de Buses JM.</p>
        </div>
      </div>
    </JmSigninSplit>
  );
}
