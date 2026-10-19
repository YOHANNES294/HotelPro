'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { Sparkles, Plus, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { HousekeepingPriority } from '@hotelpro/shared';

interface HousekeepingTask {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INSPECTED';
  priority: HousekeepingPriority;
  notes?: string;
  completedAt?: string;
  room: {
    id: string;
    roomNumber: string;
    roomType: {
      name: string;
    };
  };
  assignedTo?: {
    id: string;
    fullName: string;
  };
}

export default function HousekeepingPage() {
  const { activeBranchId } = useAuth();
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);

  const [newTask, setNewTask] = useState({
    roomId: '',
    priority: HousekeepingPriority.NORMAL,
    notes: '',
  });

  const loadHousekeeping = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ tasks: HousekeepingTask[] }>(`/hotels/housekeeping${query}`);
      setTasks(res.tasks || []);

      const rRes = await apiClient<{ rooms: any[] }>(`/hotels/rooms${query}`);
      setRooms(rRes.rooms || []);
      if (rRes.rooms?.length > 0 && !newTask.roomId) {
        setNewTask((prev) => ({ ...prev, roomId: rRes.rooms[0].id }));
      }
    } catch (err) {
      console.error('Failed to load housekeeping tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHousekeeping();
  }, [activeBranchId]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await apiClient(`/hotels/housekeeping/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadHousekeeping();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/hotels/housekeeping', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...newTask,
        }),
      });
      setShowModal(false);
      setNewTask({ roomId: rooms[0]?.id || '', priority: HousekeepingPriority.NORMAL, notes: '' });
      loadHousekeeping();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const getPriorityBadge = (priority: HousekeepingPriority) => {
    switch (priority) {
      case HousekeepingPriority.URGENT:
        return 'bg-red-100 text-red-800 border-red-200';
      case HousekeepingPriority.HIGH:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case HousekeepingPriority.NORMAL:
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.housekeeping}</h1>
          <p className="text-sm text-slate-500">Room turnaround, linen refresh, and quality inspections</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadHousekeeping}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Cleaning Task
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Room</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Assigned Attendant</th>
                <th className="px-6 py-3.5">Notes</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading housekeeping tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    All rooms are clean and inspected!
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-slate-900 text-sm">
                        Room {task.room.roomNumber}
                      </span>
                      <p className="text-xs text-slate-400">{task.room.roomType.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {task.assignedTo?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {task.notes || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          task.status === 'COMPLETED' || task.status === 'INSPECTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Start Cleaning
                        </button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Mark Completed
                        </button>
                      )}
                      {task.status === 'COMPLETED' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'INSPECTED')}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Supervisor Inspect
                        </button>
                      )}
                      {task.status === 'INSPECTED' && (
                        <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Inspected
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Cleaning Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Select Room</label>
                <select
                  value={newTask.roomId}
                  onChange={(e) => setNewTask({ ...newTask, roomId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.roomType?.name}) — Status: {r.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as HousekeepingPriority })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                >
                  <option value={HousekeepingPriority.LOW}>Low</option>
                  <option value={HousekeepingPriority.NORMAL}>Normal</option>
                  <option value={HousekeepingPriority.HIGH}>High</option>
                  <option value={HousekeepingPriority.URGENT}>Urgent (VIP / Immediate)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extra towels, hypoallergenic pillows requested"
                  value={newTask.notes}
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
