import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir automáticamente a la vista de inicio de sesión apenas abran localhost:3000
  redirect('/auth/login');
}
