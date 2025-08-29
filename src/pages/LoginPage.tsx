import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post(
        import.meta.env.VITE_API_BASE + '/api/auth/login',
        { email, password },
        { withCredentials: true }
      )
      if (res.data?.token) localStorage.setItem('token', res.data.token)
      nav('/app')
    } catch (err) {
      console.error(err)
      alert('Login failed')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="card w-full max-w-md bg-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-700 mb-6 text-center">Welcome Back</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="input bg-gray-300 text-white placeholder-gray-400 border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input bg-gray-300 text-white placeholder-gray-400 border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            className="btn btn-primary w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 rounded-xl transition-colors duration-300"
            type="submit"
          >
            Login
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-6 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-teal-400 hover:text-teal-500 underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}
