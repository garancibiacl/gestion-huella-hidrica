import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/dashboard" replace />;
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
        navigate("/dashboard");
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
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header institucional */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mx-auto mb-4"
          >
            {/* Reemplaza el src por el logo corporativo disponible en tu app */}
            <img
              src="/images/logo.png"
              alt="Buses JM"
              className="h-16 w-auto mx-auto"
              onError={(e) => {
                // Fallback tipográfico si no existe el asset
                (e.currentTarget as HTMLImageElement).style.display = "none";
                const fallback = document.getElementById("jm-fallback-logo");
                if (fallback) fallback.style.display = "inline-flex";
              }}
            />
            <div
              id="jm-fallback-logo"
              aria-hidden
              className="hidden h-16 md:h-24 w-16 md:w-24 rounded-xl bg-[#0A0D12] text-white mx-auto items-center justify-center text-lg md:text-2xl font-semibold"
            >
              JM
            </div>
          </motion.div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#0A0D12]">
            Buses JM
          </h1>
          <p className="text-sm md:text-base text-[#5B6770]">
            Gestión Medio Ambiental
          </p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white border border-[#E8EDF0] rounded-xl p-6 md:p-8 shadow-sm md:shadow-md"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p className="text-sm text-[#5B6770]">
              {isLogin
                ? "Accede a tu panel de gestión ambiental."
                : "Registra tu cuenta para comenzar"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <div className="relative">
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Nombre"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="focus-visible:ring-2 focus-visible:ring-[rgba(70,181,155,0.4)] focus-visible:border-transparent"
                      disabled={loading}
                      aria-label="Nombre"
                      aria-invalid={!!errors.firstName}
                      aria-describedby={
                        errors.firstName ? "firstName-error" : undefined
                      }
                    />
                  </div>
                  {errors.firstName && (
                    <p
                      id="firstName-error"
                      className="text-xs text-[#D62828]"
                      role="alert"
                    >
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <div className="relative">
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
                    />
                  </div>
                  {errors.lastName && (
                    <p
                      id="lastName-error"
                      className="text-xs text-[#D62828]"
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
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@busesjm.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-2 focus-visible:ring-[rgba(70,181,155,0.4)] focus-visible:border-transparent"
                  disabled={loading}
                  aria-label="Correo corporativo"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p
                  id="email-error"
                  className="text-xs text-[#D62828]"
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
                  className="pr-10 focus-visible:ring-2 focus-visible:ring-[rgba(70,181,155,0.4)] focus-visible:border-transparent"
                  disabled={loading}
                  aria-label="Contraseña"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6770] hover:text-[#0A0D12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(70,181,155,0.4)] rounded-full p-1"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-xs text-[#D62828]"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
              {isLogin && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-1 text-xs text-[#0E4F3D] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(70,181,155,0.4)] rounded"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-medium rounded-xl bg-[#D62828] text-white hover:bg-[#B71F1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(214,40,40,0.4)] disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Continuar
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          </form>

          {/* Botón de Google oculto por ahora (reservado para futura activación) */}

          <p className="text-center text-xs text-[#5B6770] mt-6">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#0E4F3D] hover:underline font-medium"
            >
              {isLogin ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>

          <p className="text-center text-xs text-[#5B6770] mt-4">
            Conexión segura. Usa tus credenciales de Buses JM.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
