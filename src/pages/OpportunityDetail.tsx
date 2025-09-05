// src/pages/OpportunityDetail.tsx


import * as React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import LotsAndItems from '@/components/LotsAndItems';
import DocumentUpload from '@/components/DocumentUpload';
import OpinionManagement from '@/components/OpinionManagement';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Save, Plus, Trash2, Pencil } from 'lucide-react';

import { useOpportunity, useOpportunities } from '@/hooks/useOpportunities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------- Utils ----------
const normalize = (s?: string | null) =>
  s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

const getStatusColor = (name?: string) => {
  const s = normalize(name);
  if (s.includes('andamento')) return 'bg-green-500 text-white';
  if (s.includes('analise')) return 'bg-amber-500 text-white';
  if (s.includes('parecer')) return 'bg-yellow-500 text-white';
  if (s.includes('proposta')) return 'bg-purple-500 text-white';
  if (s.includes('final')) return 'bg-blue-500 text-white';
  if (s.includes('cancel')) return 'bg-red-500 text-white';
  return 'bg-gray-500 text-white';
};

const safeDateForInput = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return format(dt, 'yyyy-MM-dd');
};
const safeDateBadge = (d?: string | null) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return format(dt, 'dd/MM/yyyy', { locale: ptBR });
};

// ---------- Tipos p/ listas de parâmetros ----------
type Orgao = { id: number; nome: string; sigla?: string | null };
type Modalidade = { id: number; nome: string };
type Status = { id: number; nome: string };
type Fase = { id: number; nome: string; sequencia?: number | null };
type Categoria = { id: number; nome: string };

// ---------- Tipos p/ CRUD de Grupo ----------
type Grupo = {
  id: number;
  oportunidade_id: number;
  nome: string;
  descricao: string;
};

// ---------- Hooks utilitários p/ parâmetros ----------
function useList(url: string) {
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const res = await api.get(url);
      return res?.data ?? [];
    },
  });
}

// ---------- Aba Categorização (vínculo oportunidade-categoria) ----------
function CategorizationTab({ opportunityId }: { opportunityId: number }) {
  const qc = useQueryClient();

  const { data: categorias = [] } = useList('/categorias');

  // Lista vínculos atuais
  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ['oportunidade_categoria', opportunityId],
    queryFn: async () => {
      const res = await api.get('/oportunidade_categoria', { params: { oportunidade_id: opportunityId } });
      return res?.data ?? [];
    },
  });

  const addVinc = useMutation({
    mutationFn: async (categoria_id: number) => {
      const res = await api.post('/oportunidade_categoria', {
        oportunidade_id: opportunityId,
        categoria_id,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      toast.success('Categoria vinculada');
      qc.invalidateQueries({ queryKey: ['oportunidade_categoria', opportunityId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao vincular categoria'),
  });

  const removeVinc = useMutation({
    // Ajuste a estratégia de remoção conforme seu backend:
    // Se for por id do vínculo: DELETE /oportunidade-categoria/:id
    // Se aceitar delete por composite: envia { oportunidade_id, categoria_id } no body
    mutationFn: async (vinc: any) => {
      if (vinc?.id) {
        await api.delete(`/oportunidade_categoria/${vinc.id}`);
      } else {
        await api.delete(`/oportunidade_categoria`, { data: { oportunidade_id: opportunityId, categoria_id: vinc.categoria_id } });
      }
      return true;
    },
    onSuccess: () => {
      toast.success('Categoria desvinculada');
      qc.invalidateQueries({ queryKey: ['oportunidade_categoria', opportunityId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao desvincular categoria'),
  });

  const vincCategoriaIds = new Set<number>(vinculos.map((v: any) => v.categoria_id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorização</CardTitle>
        <CardDescription>Vincule ou desvincule categorias da oportunidade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground">Carregando categorias vinculadas...</div>
        ) : (
          <>
            <div>
              <Label className="mb-2 block">Categorias vinculadas</Label>
              <div className="flex flex-wrap gap-2">
                {vinculos.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Nenhuma categoria vinculada.</span>
                ) : (
                  vinculos.map((v: any) => {
                    const cat = categorias.find((c: Categoria) => c.id === v.categoria_id);
                    return (
                      <Badge key={v.id ?? v.categoria_id} variant="secondary" className="flex items-center gap-2">
                        {cat?.nome ?? `ID ${v.categoria_id}`}
                        <button
                          className="ml-1 text-xs underline"
                          onClick={() => removeVinc.mutate(v)}
                          title="Remover"
                        >
                          remover
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Adicionar categoria</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(val) => addVinc.mutate(Number(val))}
                >
                  <SelectTrigger className="w-80">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias
                      .filter((c: Categoria) => !vincCategoriaIds.has(c.id))
                      .map((c: Categoria) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Aba de GRUPOS com CRUD (vinculado a oportunidade) ----------
function GroupsTab({ opportunityId }: { opportunityId: number }) {
  const qc = useQueryClient();

  const { data: grupos = [], isLoading } = useQuery({
    queryKey: ['grupos', opportunityId],
    queryFn: async () => {
      const res = await api.get(`/grupo`, { params: { oportunidade_id: opportunityId } });
      return res?.data ?? [];
    },
  });

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Grupo | null>(null);
  const [form, setForm] = React.useState<{ nome: string; descricao: string }>({ nome: '', descricao: '' });

  React.useEffect(() => {
    if (editing) setForm({ nome: editing.nome, descricao: editing.descricao ?? '' });
    else setForm({ nome: '', descricao: '' });
  }, [editing]);

  const createGrupo = useMutation({
    mutationFn: async (payload: Omit<Grupo, 'id'>) => {
      const res = await api.post('/grupo', payload);
      return res?.data ?? res;
    },
    onSuccess: () => {
      toast.success('Grupo criado');
      qc.invalidateQueries({ queryKey: ['grupos', opportunityId] });
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao criar grupo'),
  });

  const updateGrupo = useMutation({
    mutationFn: async (g: Grupo) => {
      const res = await api.put(`/grupo/${g.id}`, {
        nome: g.nome,
        descricao: g.descricao,
        oportunidade_id: g.oportunidade_id,
      });
      return res?.data ?? res;
    },
    onSuccess: () => {
      toast.success('Grupo atualizado');
      qc.invalidateQueries({ queryKey: ['grupos', opportunityId] });
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao atualizar grupo'),
  });

  const deleteGrupo = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/grupo/${id}`);
      return true;
    },
    onSuccess: () => {
      toast.success('Grupo excluído');
      qc.invalidateQueries({ queryKey: ['grupo', opportunityId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Erro ao excluir grupo'),
  });

  const onSubmit = () => {
    if (!form.nome.trim()) {
      toast.error('Informe o nome do grupo');
      return;
    }
    if (editing) {
      updateGrupo.mutate({
        id: editing.id,
        oportunidade_id: opportunityId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
      });
    } else {
      createGrupo.mutate({
        oportunidade_id: opportunityId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div>
          <CardTitle>Grupos</CardTitle>
          <CardDescription>Gerencie os grupos vinculados à oportunidade</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex.: Grupo A"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={onSubmit} className="flex-1">
                  {editing ? 'Salvar alterações' : 'Criar Grupo'}
                </Button>
                <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando grupos...</div>
        ) : grupos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">Nenhum grupo cadastrado.</div>
        ) : (
          <div className="space-y-2">
            {grupos.map((g: Grupo) => (
              <div key={g.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-medium">{g.nome}</div>
                  {g.descricao && <div className="text-sm text-muted-foreground">{g.descricao}</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditing(g); setOpen(true); }}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => {
                      if (confirm('Remover este grupo?')) deleteGrupo.mutate(g.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Página principal ----------
export default function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const opportunityId = Number(params.id);

  // Oportunidade (snake_case com joins opcionais)
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { updateOpportunity } = useOpportunities();

  // Parâmetros (relacionamentos)
  const { data: orgaos = [] } = useList('/orgaos_publicos');
  const { data: modalidades = [] } = useList('/modalidades');
  const { data: statusList = [] } = useList('/status_oportunidade');
  const { data: fases = [] } = useList('/fases_pipeline');

  // Form de edição
  const [isEditing, setIsEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    numero_processo: '',
    objeto: '',
    valor_estimado: '',
    observacoes: '',
    data_abertura: '',
    data_entrega: '',
    orgao_id: '' as string | number,
    modalidade_id: '' as string | number,
    status_id: '' as string | number,
    fase_pipeline_id: '' as string | number,
  });

  React.useEffect(() => {
    if (!opportunity) return;
    setForm({
      numero_processo: opportunity.numero_processo || '',
      objeto: opportunity.objeto || '',
      valor_estimado:
        opportunity.valor_estimado != null ? String(opportunity.valor_estimado) : '',
      // @ts-ignore pode existir no back
      observacoes: (opportunity as any).observacoes ?? '',
      data_abertura: safeDateForInput(opportunity.data_abertura),
      data_entrega: safeDateForInput(opportunity.data_entrega),

      orgao_id: opportunity.orgao_id ?? '',
      modalidade_id: opportunity.modalidade_id ?? '',
      status_id: opportunity.status_id ?? '',
      fase_pipeline_id: opportunity.fase_pipeline_id ?? '',
    });
  }, [opportunity]);

  const handleSave = async () => {
    if (!opportunity) return;
    try {
      await updateOpportunity.mutateAsync({
        id: opportunity.id,
        numero_processo: form.numero_processo || undefined,
        objeto: form.objeto || undefined,
        valor_estimado: form.valor_estimado !== '' ? Number(form.valor_estimado) : undefined,
        // @ts-ignore
        observacoes: form.observacoes || undefined,
        data_abertura: form.data_abertura || undefined,
        data_entrega: form.data_entrega || undefined,

        orgao_id: form.orgao_id ? Number(form.orgao_id) : undefined,
        modalidade_id: form.modalidade_id ? Number(form.modalidade_id) : undefined,
        status_id: form.status_id ? Number(form.status_id) : undefined,
        fase_pipeline_id: form.fase_pipeline_id ? Number(form.fase_pipeline_id) : undefined,
      });
      setIsEditing(false);
      toast.success('Oportunidade atualizada');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar oportunidade');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!opportunity) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Oportunidade não encontrada</h1>
            <p className="text-gray-600 mt-2">A oportunidade solicitada não existe ou foi removida.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const organName = opportunity.orgao?.nome ?? '—';
  const organSigla = opportunity.orgao?.sigla ?? '';
  const modalidadeNome = opportunity.modalidade?.nome ?? '—';
  const statusNome = opportunity.status_oportunidade?.nome ?? '—';
  const faseNome = opportunity.fase_pipeline?.nome ?? '—';

  return (
    <Layout>
      <div className="container mx-auto py-6">
   
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {opportunity.numero_processo || 'Sem título'}
            </h1>
            <p className="text-muted-foreground">{organName}</p>
            <div className="flex items-center gap-2 mt-2">
             
              <Badge className={getStatusColor(statusNome)} title="Status do certame">
                {statusNome}
              </Badge>
             
              <Badge variant="secondary" title="Fase do pipeline">
                {faseNome}
              </Badge>
              {opportunity.created_at && (
                <span className="text-sm text-gray-500">
                  Criado em {safeDateBadge(opportunity.created_at)}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing((v) => !v)}>
              <Edit className="mr-2 h-4 w-4" />
              {isEditing ? 'Cancelar' : 'Editar'}
            </Button>
            {isEditing && (
              <Button onClick={handleSave} disabled={updateOpportunity.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateOpportunity.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </div>
        </div>

        
        <Tabs defaultValue="identification" className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="identification">Identificação</TabsTrigger>
            <TabsTrigger value="object">Objeto</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
            <TabsTrigger value="lots">Lotes/Itens</TabsTrigger>
            <TabsTrigger value="categorization">Categorização</TabsTrigger>
            <TabsTrigger value="opinions">Pareceres</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
            <TabsTrigger value="intelligence">Inteligência</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

         
          <TabsContent value="identification">
            <Card>
              <CardHeader>
                <CardTitle>Dados Básicos</CardTitle>
                <CardDescription>Informações gerais do processo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Número do Processo</Label>
                      <Input
                        value={form.numero_processo}
                        onChange={(e) => setForm((p) => ({ ...p, numero_processo: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                      />
                    </div>

                    <div>
                      <Label>Órgão Responsável</Label>
                      <Select
                        value={String(form.orgao_id ?? '')}
                        onValueChange={(v) => setForm((p) => ({ ...p, orgao_id: Number(v) }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className={!isEditing ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Selecione o órgão" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgaos.map((o: Orgao) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.sigla ? `${o.sigla} — ${o.nome}` : o.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Modalidade</Label>
                      <Select
                        value={String(form.modalidade_id ?? '')}
                        onValueChange={(v) => setForm((p) => ({ ...p, modalidade_id: Number(v) }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className={!isEditing ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Selecione a modalidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {modalidades.map((m: Modalidade) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Status do Certame</Label>
                      <Select
                        value={String(form.status_id ?? '')}
                        onValueChange={(v) => setForm((p) => ({ ...p, status_id: Number(v) }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className={!isEditing ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusList.map((s: Status) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Fase do Pipeline</Label>
                      <Select
                        value={String(form.fase_pipeline_id ?? '')}
                        onValueChange={(v) => setForm((p) => ({ ...p, fase_pipeline_id: Number(v) }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className={!isEditing ? 'bg-muted' : ''}>
                          <SelectValue placeholder="Selecione a fase" />
                        </SelectTrigger>
                        <SelectContent>
                          {fases
                            .slice()
                            .sort((a: Fase, b: Fase) => (a.sequencia ?? 9999) - (b.sequencia ?? 9999))
                            .map((f: Fase) => (
                              <SelectItem key={f.id} value={String(f.id)}>
                                {f.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Data de Abertura</Label>
                      <Input
                        type="date"
                        value={form.data_abertura}
                        onChange={(e) => setForm((p) => ({ ...p, data_abertura: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label>Prazo Final</Label>
                      <Input
                        type="date"
                        value={form.data_entrega}
                        onChange={(e) => setForm((p) => ({ ...p, data_entrega: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label>Valor Estimado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.valor_estimado}
                        onChange={(e) => setForm((p) => ({ ...p, valor_estimado: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                      />
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={form.observacoes}
                        onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

      
          <TabsContent value="object">
            <Card>
              <CardHeader>
                <CardTitle>Objeto da Licitação</CardTitle>
                <CardDescription>Descrição detalhada</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.objeto}
                  onChange={(e) => setForm((p) => ({ ...p, objeto: e.target.value }))}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-muted' : ''}
                  rows={8}
                />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="groups">
            <GroupsTab opportunityId={opportunityId} />
          </TabsContent>

         
          <TabsContent value="lots">
            <LotsAndItems opportunityId={opportunityId} />
          </TabsContent>

         
          <TabsContent value="categorization">
            <CategorizationTab opportunityId={opportunityId} />
          </TabsContent>

       
          <TabsContent value="opinions">
            <OpinionManagement opportunityId={opportunityId} />
          </TabsContent>

        
          <TabsContent value="documents">
            <DocumentUpload opportunityId={opportunityId} />
          </TabsContent>

         
          <TabsContent value="intelligence">
            <Card>
              <CardHeader>
                <CardTitle>Inteligência de Negócios</CardTitle>
                <CardDescription>Dados estratégicos e análise competitiva</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Funcionalidade em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

        
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
                <CardDescription>Histórico básico</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {opportunity.created_at && (
                    <div>• Oportunidade criada em {safeDateBadge(opportunity.created_at)}</div>
                  )}
                  {opportunity.updated_at && (
                    <div>• Última atualização em {safeDateBadge(opportunity.updated_at)}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

