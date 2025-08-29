import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post(
        import.meta.env.VITE_API_BASE + '/api/auth/register',
        { email, password, name },
        { withCredentials: true }
      )
      nav('/login')
    } catch (err) {
      console.error(err)
      alert('Register failed')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="card w-full max-w-md bg-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-700 mb-6 text-center">Create Your Account</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            className="input bg-gray-300 text-white placeholder-gray-400 border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
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
            Register
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-400 hover:text-teal-500 underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}
