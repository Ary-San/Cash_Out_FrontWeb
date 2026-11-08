import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/layout/PageHeader'
import { AutoRegisterSection } from '@/components/profile/AutoRegisterSection'
import { DeactivateAccount } from '@/components/profile/DeactivateAccount'
import { GmailSection } from '@/components/profile/GmailSection'
import { GoogleOnlySecurity } from '@/components/profile/GoogleOnlySecurity'
import { PasswordForm } from '@/components/profile/PasswordForm'
import { ProfileForm } from '@/components/profile/ProfileForm'

export default function ProfilePage() {
  const { user } = useAuth()
  // RequireAuth no deja llegar aqui sin sesion.
  if (!user) return null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Mi perfil" description="Tus datos y la seguridad de tu cuenta." />
      <ProfileForm key={user.id} user={user} />
      {user.googleOnly ? <GoogleOnlySecurity email={user.email} /> : <PasswordForm email={user.email} />}
      {user.roles.includes('USER') && (
        <>
          <GmailSection />
          <AutoRegisterSection />
        </>
      )}
      <DeactivateAccount />
    </div>
  )
}
