import React, { useState } from 'react'
import useSWR from 'swr'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { FiUsers } from 'react-icons/fi'
import { MdOutlineViewColumn } from 'react-icons/md'

const fetcher = (url: string) => {
  const token = localStorage.getItem("token")
  return axios.get(url, {
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }).then(r => r.data)
}

export default function Dashboard() {
  const base = import.meta.env.VITE_API_BASE + '/api/boards'
  const { data, mutate } = useSWR(base, fetcher)
  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const createBoard = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    try {
      await axios.post(base, { title }, { withCredentials: true, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      mutate()
      setModalOpen(false)
    } catch (err) { console.error(err); setError('Failed to create board') }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 h-full">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Your Boards</h1>
        <button
          className="px-5 py-2 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold transition-colors duration-300"
          onClick={() => { setTitle(''); setError(''); setModalOpen(true) }}
        >
          + New Board
        </button>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-full">
        {data?.map((b: any) => (
          <Link
            to={`/app/board/${b._id}`}
            key={b._id}
            className="block bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow hover:shadow-xl transition-shadow duration-200"
          >
            <h2 className="text-xl font-semibold text-white mb-2">{b.title}</h2>
            <div className="flex flex-col gap-2 text-gray-300 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <FiUsers className="text-green-400" />
                <span>{b.members?.length ?? 0} members</span>
              </div>
              <div className="flex items-center gap-1">
                <MdOutlineViewColumn className="text-purple-400" />
                <span>{b.columns?.length ?? 0} columns</span>
              </div>
            </div>
          </Link>
        ))}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h2 className="text-2xl font-bold text-teal-400">Create New Board</h2>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-white bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="Enter board title"
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors"
                onClick={createBoard}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
