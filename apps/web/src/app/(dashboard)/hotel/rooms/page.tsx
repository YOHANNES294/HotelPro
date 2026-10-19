'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/auth-context';
import { useLanguage } from '../../../../context/language-context';
import { apiClient } from '../../../../lib/api';
import { BedDouble, CheckCircle2, AlertTriangle, Sparkles, Plus, RefreshCw } from 'lucide-react';
import { RoomStatus } from '@hotelpro/shared';

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  status: RoomStatus;
  roomType: {
    name: string;
    code: string;
    basePrice: string;
  };
}

export default function RoomsPage() {
  const { activeBranchId, user } = useAuth();
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [newRoomData, setNewRoomData] = useState({
    roomNumber: '',
    floor: 1,
    roomTypeId: '',
  });

  const loadRooms = async () => {
    try {
      setLoading(true);
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';
      const res = await apiClient<{ rooms: Room[] }>(`/hotels/rooms${query}`);
      setRooms(res.rooms || []);

      const rtRes = await apiClient<{ roomTypes: any[] }>(`/hotels/room-types${query}`);
      setRoomTypes(rtRes.roomTypes || []);
      if (rtRes.roomTypes?.length > 0 && !newRoomData.roomTypeId) {
        setNewRoomData((prev) => ({ ...prev, roomTypeId: rtRes.roomTypes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [activeBranchId]);

  const updateStatus = async (roomId: string, status: RoomStatus) => {
    try {
      await apiClient(`/hotels/rooms/${roomId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to update room status');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/hotels/rooms', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranchId,
          ...newRoomData,
        }),
      });
      setShowAddModal(false);
      setNewRoomData({ roomNumber: '', floor: 1, roomTypeId: roomTypes[0]?.id || '' });
      loadRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    }
  };

  const filteredRooms = selectedFilter === 'ALL'
    ? rooms
    : rooms.filter((r) => r.status === selectedFilter);

  const getStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case RoomStatus.AVAILABLE:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case RoomStatus.OCCUPIED:
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case RoomStatus.DIRTY:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case RoomStatus.CLEANING:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case RoomStatus.INSPECTED:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case RoomStatus.OUT_OF_SERVICE:
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.navigation.rooms}</h1>
          <p className="text-sm text-slate-500">Live room inventory, cleaning status, and assignments</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadRooms}
            className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {['ALL', RoomStatus.AVAILABLE, RoomStatus.OCCUPIED, RoomStatus.DIRTY, RoomStatus.CLEANING, RoomStatus.OUT_OF_SERVICE].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedFilter === status
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading rooms inventory...</div>
      ) : filteredRooms.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <BedDouble className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No rooms found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-extrabold text-slate-900">Room {room.roomNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide uppercase ${getStatusBadge(
                      room.status
                    )}`}
                  >
                    {room.status}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-700">{room.roomType.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Floor {room.floor} • {room.roomType.code}</p>
                <p className="text-sm font-bold text-sky-600 mt-2">
                  {room.roomType.basePrice} {user?.organization?.currency || 'ETB'} / night
                </p>
              </div>

              {/* Status Action Controls */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {room.status === RoomStatus.DIRTY && (
                  <button
                    onClick={() => updateStatus(room.id, RoomStatus.CLEANING)}
                    className="w-full py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg transition"
                  >
                    Start Cleaning
                  </button>
                )}
                {room.status === RoomStatus.CLEANING && (
                  <button
                    onClick={() => updateStatus(room.id, RoomStatus.AVAILABLE)}
                    className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg transition"
                  >
                    Mark Clean & Available
                  </button>
                )}
                {room.status === RoomStatus.AVAILABLE && (
                  <button
                    onClick={() => updateStatus(room.id, RoomStatus.OUT_OF_SERVICE)}
                    className="text-slate-400 hover:text-rose-600 font-medium"
                  >
                    Set Out of Service
                  </button>
                )}
                {room.status === RoomStatus.OUT_OF_SERVICE && (
                  <button
                    onClick={() => updateStatus(room.id, RoomStatus.AVAILABLE)}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                  >
                    Restore to Available
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Room to Inventory</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  value={newRoomData.roomNumber}
                  onChange={(e) => setNewRoomData({ ...newRoomData, roomNumber: e.target.value })}
                  placeholder="e.g. 401"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Floor</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newRoomData.floor}
                  onChange={(e) => setNewRoomData({ ...newRoomData, floor: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Room Type</label>
                <select
                  value={newRoomData.roomTypeId}
                  onChange={(e) => setNewRoomData({ ...newRoomData, roomTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} ({rt.code}) — {rt.basePrice} ETB
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  {t.common.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
