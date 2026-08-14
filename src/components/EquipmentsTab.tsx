import React, { useEffect, useState } from 'react';
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers
} from 'lucide-react';
import { EquipmentItem } from '../types';

export const EquipmentsTab: React.FC = () => {
  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentItem | null>(null);
  const [code, setCode] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchEquipments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/equipments');
      if (res.ok) {
        const data = await res.json();
        setEquipments(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar equipamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleOpenAddModal = () => {
    setEditingEquipment(null);
    setCode('');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (eq: EquipmentItem) => {
    setEditingEquipment(eq);
    setCode(eq.code);
    setDescription(eq.description);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setCode('');
    setDescription('');
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError('O código do equipamento é obrigatório.');
      return;
    }
    if (!description.trim()) {
      setFormError('A descrição do equipamento é obrigatória.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingEquipment) {
        // PUT update
        const res = await fetch(`/api/equipments/${editingEquipment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, description })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao atualizar equipamento.');
        }
        showToast(`Equipamento "${code}" atualizado com sucesso!`);
      } else {
        // POST create
        const res = await fetch('/api/equipments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, description })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao criar equipamento.');
        }
        showToast(`Equipamento "${code}" cadastrado com sucesso!`);
      }

      handleCloseModal();
      fetchEquipments();
    } catch (err: any) {
      setFormError(err.message || 'Erro de comunicação ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/equipments/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Equipamento removido com sucesso!');
        fetchEquipments();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao remover equipamento.');
      }
    } catch (err) {
      console.error('Erro ao deletar equipamento:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEquipments = equipments.filter((eq) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      eq.code.toLowerCase().includes(query) ||
      eq.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-3 border border-emerald-400/50 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Server className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Cadastro de Equipamentos
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie os códigos e descrições dos equipamentos integrados no LIS
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchEquipments}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all flex items-center justify-center"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Equipamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Equipamentos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total de Equipamentos</span>
            <span className="text-2xl font-bold text-white font-mono mt-1 block">
              {equipments.length}
            </span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Filtrados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Equipamentos Visíveis</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
              {filteredEquipments.length}
            </span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/50 text-emerald-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Search Input Filter */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Equipment Table List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Código</th>
                <th className="py-3.5 px-5">Descrição do Equipamento</th>
                <th className="py-3.5 px-5 hidden sm:table-cell">Última Atualização</th>
                <th className="py-3.5 px-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-sans">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Carregando lista de equipamentos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Server className="w-8 h-8 text-slate-600 mb-1" />
                      <p className="font-semibold text-slate-300">Nenhum equipamento encontrado</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery ? 'Tente alterar o termo da busca.' : 'Clique em "Novo Equipamento" para realizar o primeiro cadastro.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEquipments.map((eq) => (
                  <tr
                    key={eq.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Código */}
                    <td className="py-3.5 px-5 font-mono">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-all">
                        {eq.code}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-5 text-slate-200 font-medium">
                      {eq.description}
                    </td>

                    {/* Data */}
                    <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px] hidden sm:table-cell">
                      {eq.updatedAt
                        ? new Date(eq.updatedAt).toLocaleString('pt-BR')
                        : eq.createdAt
                        ? new Date(eq.createdAt).toLocaleString('pt-BR')
                        : '-'}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(eq)}
                          className="p-1.5 bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 border border-slate-700/60 hover:border-indigo-500/40 rounded-lg transition-all"
                          title="Editar Equipamento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingId(eq.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/40 rounded-lg transition-all"
                          title="Excluir Equipamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Equipment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>{editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Campo Código */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Código <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: MINDRAY-BC5480"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 block">
                  Identificador único do equipamento ou protocolo.
                </span>
              </div>

              {/* Campo Descrição */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Descrição <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Analisador Hematológico Mindray BC-5480"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[10px] text-slate-500 block">
                  Nome amigável ou setor do equipamento no laboratório.
                </span>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{saving ? 'Salvando...' : editingEquipment ? 'Atualizar' : 'Salvar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Excluir Equipamento</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja remover este equipamento? Esta ação removerá o cadastro do banco de dados MySQL.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
