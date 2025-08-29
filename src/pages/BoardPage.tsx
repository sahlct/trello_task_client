import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import Select from 'react-select'
import { FiPlus, FiEdit, FiUserPlus, FiTrash2 } from 'react-icons/fi'

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [taskModal, setTaskModal] = useState<any>({ isOpen: false })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignee: '', dueDate: '' })
  const [columnModal, setColumnModal] = useState<any>({ isOpen: false, title: '', columnId: '' })
  const [deleteTaskModal, setDeleteTaskModal] = useState<any>({ isOpen: false, taskId: '' })
  const [deleteColumnModal, setDeleteColumnModal] = useState<any>({ isOpen: false, columnId: '', hasTasks: false })
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const axiosInstance = useMemo(() => axios.create({
    baseURL: import.meta.env.VITE_API_BASE,
    headers: { Authorization: token ? `Bearer ${token}` : '' }
  }), [token])

  const socket = useMemo(() => io(import.meta.env.VITE_API_BASE.replace('/api',''), { auth: { token } }), [token])

  // Load board and columns
  async function loadBoard() {
    try {
      const boards = await axiosInstance.get('/api/boards').then(r => r.data)
      const b = boards.find((x: any) => x._id === id)
      if (!b) return setBoard(null)
      setBoard(b)
      const colData: any[] = await axiosInstance.get(`/api/columns?boardId=${id}`).then(r => r.data)
      for (const c of colData) {
        const tasks = await Promise.all((c.taskOrder || []).map(async (tid: string) => {
          try { return (await axiosInstance.get(`/api/tasks/${tid}`)).data } catch { return null }
        }))
        c.tasks = tasks.filter(Boolean)
      }
      setColumns(colData)
      socket.emit('joinBoard', id)
    } catch (err) { console.error(err) }
  }

  async function loadUsers() {
    try {
      const me = await axiosInstance.get('/api/auth/me').then(r => r.data)
      setCurrentUser(me)
      const allUsers = await axiosInstance.get(`/api/users?boardId=${id}`).then(r => r.data)
      setUsers(allUsers.filter((u:any) => u._id !== me._id))
    } catch (err) { console.error(err) }
  }

  useEffect(() => {
    loadBoard()
    loadUsers()
    return () => { socket.disconnect() }
  }, [id])

  useEffect(() => {
    socket.on('taskMoved', (p:any) => { if (p.boardId === id) loadBoard() })
    socket.on('taskCreated', (p:any) => { if (p.boardId === id) loadBoard() })
    socket.on('taskUpdated', (p:any) => { if (p.boardId === id) loadBoard() })
    socket.on('columnUpdated', (p:any) => { if (p.boardId === id) loadBoard() })
  }, [socket, id])

  // Drag & Drop
  const onDragEnd = async (result: any) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    setColumns(prev => {
      const newCols = [...prev]
      const sIdx = newCols.findIndex(c => c._id === source.droppableId)
      const dIdx = newCols.findIndex(c => c._id === destination.droppableId)
      const sourceCol = { ...newCols[sIdx], tasks: [...newCols[sIdx].tasks] }
      const destCol = source.droppableId === destination.droppableId ? sourceCol : { ...newCols[dIdx], tasks: [...newCols[dIdx].tasks] }
      const [moved] = sourceCol.tasks.splice(source.index, 1)
      destCol.tasks.splice(destination.index, 0, moved)
      newCols[sIdx] = sourceCol
      if (sIdx !== dIdx) newCols[dIdx] = destCol
      return newCols
    })

    try {
      await axiosInstance.patch(`/api/tasks/move/${draggableId}`, {
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index
      })
      socket.emit('taskMoved', { boardId: id, taskId: draggableId, fromColumnId: source.droppableId, toColumnId: destination.droppableId, toIndex: destination.index })
    } catch { loadBoard() }
  }

  // Task, Column, Delete actions
  const submitTask = async () => {
    try {
      await axiosInstance.post('/api/tasks', {
        boardId: id,
        columnId: taskModal.columnId,
        title: taskForm.title,
        description: taskForm.description,
        assignee: taskForm.assignee,
        dueDate: taskForm.dueDate
      })
      setTaskModal({ isOpen: false })
      setTaskForm({ title: '', description: '', assignee: '', dueDate: '' })
      loadBoard()
    } catch (err) { console.error(err) }
  }

  const submitColumn = async () => {
    try {
      if (columnModal.columnId) {
        await axiosInstance.patch(`/api/columns/${columnModal.columnId}`, { title: columnModal.title })
      } else {
        await axiosInstance.post('/api/columns', { boardId: id, title: columnModal.title })
      }
      setColumnModal({ isOpen: false, title: '', columnId: '' })
      loadBoard()
    } catch (err) { console.error(err) }
  }

  const confirmDeleteTask = async () => {
    if (!deleteTaskModal.taskId) return
    try {
      await axiosInstance.delete(`/api/tasks/${deleteTaskModal.taskId}`)
      setDeleteTaskModal({ isOpen: false, taskId: '' })
      loadBoard()
    } catch (err) { console.error(err) }
  }

  const confirmDeleteColumn = async () => {
    if (!deleteColumnModal.columnId) return
    if (deleteColumnModal.hasTasks) { alert('Cannot delete a column with tasks.'); setDeleteColumnModal({ isOpen: false, columnId: '', hasTasks: false }); return }
    try {
      await axiosInstance.delete(`/api/columns/${deleteColumnModal.columnId}`)
      setDeleteColumnModal({ isOpen: false, columnId: '', hasTasks: false })
      loadBoard()
    } catch (err) { console.error(err) }
  }

  return (
    <main className="h-full flex flex-col bg-gray-900 p-6 overflow-auto space-y-6">
      {/* Board Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">{board?.title || 'Board'}</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold flex items-center gap-1" onClick={()=>setColumnModal({ isOpen:true })}><FiPlus /> Column</button>
          <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-xl font-semibold flex items-center gap-1" onClick={()=>setShowInviteModal(true)}><FiUserPlus /> Users</button>
        </div>
      </div>

      {/* Columns */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {columns.map((col:any) => (
            <Droppable droppableId={col._id} key={col._id}>
              {(provided:any) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="bg-gray-800 rounded-2xl p-3 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-white">{col.title}</h2>
                    <div className="flex gap-1">
                      <button onClick={()=>setTaskModal({ isOpen: true, columnId: col._id })} className="p-1 hover:bg-gray-700 rounded text-white"><FiPlus /></button>
                      <button onClick={()=>setColumnModal({ isOpen: true, columnId: col._id, title: col.title })} className="p-1 hover:bg-gray-700 rounded text-white"><FiEdit /></button>
                      <button onClick={()=>setDeleteColumnModal({ isOpen: true, columnId: col._id, hasTasks: col.tasks.length>0 })} className="p-1 hover:text-red-600 text-red-400"><FiTrash2 /></button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-auto">
                    {col.tasks.map((t:any, idx:number) => (
                      <Draggable draggableId={t._id} index={idx} key={t._id}>
                        {(p:any) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className="bg-gray-700 text-white rounded-md p-3 shadow flex justify-between items-start gap-2">
                            <div>
                              <div className="font-medium">{t.title}</div>
                              <div className="text-xs text-gray-300">Due: {t.dueDate}</div>
                              <div className="text-xs text-gray-300">Assignee: {users.find(u=>u._id===t.assignee)?.name || 'Unknown'}</div>
                            </div>
                            <button className="p-1 text-red-400 hover:text-red-600" onClick={()=>setDeleteTaskModal({ isOpen: true, taskId: t._id })}><FiTrash2 /></button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Invite Users Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-teal-400">Add Users</h2>
            <Select
              options={users.map(u=>({ value: u._id, label: `${u.name} (${u.email})` }))}
              isMulti
              onChange={(vals:any)=>setSelectedUsers(vals.map((v:any)=>v.value))}
              className="text-black"
            />
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700" onClick={()=>setShowInviteModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold" onClick={async ()=>{
                await Promise.all(selectedUsers.map(uid => axiosInstance.post('/api/boards/invite',{ boardId:id, userId:uid })))
                setShowInviteModal(false)
                setSelectedUsers([])
                loadBoard()
              }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-teal-400">Add Task</h2>
            <input type="text" placeholder="Title" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} className="w-full px-3 py-2 rounded bg-gray-700 text-white"/>
            <textarea placeholder="Description" value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})} className="w-full px-3 py-2 rounded bg-gray-700 text-white"/>
            <Select
              options={users.map(u=>({ value: u._id, label: u.name }))}
              value={users.filter(u=>u._id===taskForm.assignee).map(u=>({ value: u._id, label: u.name }))}
              onChange={(val:any)=>setTaskForm({...taskForm, assignee: val.value})}
              className="text-black"
            />
            <input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm({...taskForm,dueDate:e.target.value})} className="w-full px-3 py-2 rounded bg-gray-700 text-white"/>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700" onClick={()=>setTaskModal({isOpen:false})}>Cancel</button>
              <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold" onClick={submitTask}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Column Modal */}
      {columnModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-teal-400">{columnModal.columnId ? 'Rename Column' : 'Add Column'}</h2>
            <input type="text" placeholder="Column Title" value={columnModal.title} onChange={e=>setColumnModal({...columnModal,title:e.target.value})} className="w-full px-3 py-2 rounded bg-gray-700 text-white"/>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700" onClick={()=>setColumnModal({isOpen:false,columnId:'',title:''})}>Cancel</button>
              <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 rounded-lg font-semibold" onClick={submitColumn}>{columnModal.columnId ? 'Rename' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Modal */}
      {deleteTaskModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-400">Delete Task</h2>
            <p>Are you sure you want to delete this task?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700" onClick={()=>setDeleteTaskModal({isOpen:false,taskId:''})}>Cancel</button>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold" onClick={confirmDeleteTask}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Column Modal */}
      {deleteColumnModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-400">Delete Column</h2>
            <p>Are you sure you want to delete this column?</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700" onClick={()=>setDeleteColumnModal({isOpen:false,columnId:'',hasTasks:false})}>Cancel</button>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold" onClick={confirmDeleteColumn}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
