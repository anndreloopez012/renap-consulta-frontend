import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginRes = await api.post('/api/auth/local', { identifier, password });
      const { jwt } = loginRes.data;

      const meRes = await api.get('/api/users/me?populate=role', {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      setAuth(jwt, meRes.data);
      navigate('/search');
    } catch {
      setError('Credenciales incorrectas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--gradient-login)' }}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary-glow/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-strong rounded-2xl p-8 shadow-2xl pulse-glow">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 relative">
              <Shield className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight gradient-text">RENAP</h1>
            <p className="text-muted-foreground text-sm mt-2 tracking-wide">Sistema de Consulta de Información</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-muted-foreground">Usuario o correo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  autoComplete="username"
                  className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Iniciar sesión
            </Button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-muted-foreground/50 mt-6"
          >
            © {new Date().getFullYear()} RENAP · Todos los derechos reservados
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
