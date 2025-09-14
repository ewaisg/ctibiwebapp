import { redirect } from 'next/navigation'

export default function LoginPage() {
    // Redirect to the login page
    redirect('/dashboard')
}