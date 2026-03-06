import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Shield, Building, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        password: newPassword,
        passwordConfirmation: confirmPassword,
      });
      toast({ title: 'Contraseña actualizada correctamente' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Error al cambiar la contraseña.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const roleColor = user?.role?.type === 'admin' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Mi Perfil</h1>
      <p className="text-sm text-muted-foreground mb-8">Administra tu cuenta y seguridad</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Decorative bg */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />
          
          <div className="relative mb-5">
            <Avatar className="h-24 w-24 ring-4 ring-primary/10">
              <AvatarFallback className="bg-primary/20 text-primary text-3xl font-extrabold">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-success flex items-center justify-center shadow-lg shadow-success/30">
              <div className="w-2.5 h-2.5 rounded-full bg-success-foreground" />
            </div>
          </div>

          <h2 className="text-xl font-bold">{user?.username}</h2>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>

          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {user?.role && (
              <Badge className={`${roleColor} border-0 gap-1.5`}>
                <Shield className="h-3 w-3" />
                {user.role.name}
              </Badge>
            )}
            {user?.company && (
              <Badge variant="outline" className="border-border/50 gap-1.5">
                <Building className="h-3 w-3" />
                {user.company}
              </Badge>
            )}
          </div>

          {user?.createdAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mt-6">
              <Calendar className="h-3 w-3" />
              Miembro desde {new Date(user.createdAt).toLocaleDateString('es-GT')}
            </div>
          )}
        </motion.div>

        {/* Change password card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-8"
        >
          <h2 className="text-lg font-bold mb-1">Cambiar contraseña</h2>
          <p className="text-sm text-muted-foreground mb-6">Actualiza tu contraseña de acceso</p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Contraseña actual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10 bg-background/50 border-border/50"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10 bg-background/50 border-border/50"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground/50">Mínimo 8 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Confirmar nueva contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="bg-background/50 border-border/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Actualizar contraseña
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
