import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { CheckCircle2, XCircle, Edit3, Clock, AlertCircle, Newspaper, Loader2, Search } from 'lucide-react';
import { runNewsAgent } from '../services/geminiService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const MINISTRIES = [
  "Cancelaria Prim-Ministrului",
  "Ministerul Afacerilor Interne",
  "Ministerul Afacerilor Externe",
  "Ministerul Apărării Naționale",
  "Ministerul Finanțelor",
  "Ministerul Transporturilor și Infrastructurii",
  "Ministerul Justiției",
  "Ministerul Agriculturii și Dezvoltării Rurale",
  "Ministerul Energiei",
  "Ministerul Sănătății",
  "Ministerul Investițiilor și Proiectelor Europene",
  "Ministerul Educației și Cercetării",
  "Ministerul Mediului, Apelor și Pădurilor",
  "Ministerul Muncii, Familiei, Tineretului și Solidarității Sociale",
  "Ministerul Economiei, Digitalizării, Antreprenoriatului și Turismului",
  "Ministerul Dezvoltării, Lucrărilor Publice și Administrației",
  "Ministerul Culturii"
];

export function MinisterDashboard() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editResponse, setEditResponse] = useState('');
  
  const [selectedNewsMinistry, setSelectedNewsMinistry] = useState<string>(MINISTRIES[0]);
  const [isRunningNewsAgent, setIsRunningNewsAgent] = useState(false);

  useEffect(() => {
    if (!user || (profile?.role !== 'minister' && profile?.role !== 'admin')) return;

    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'pending_minister'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching minister requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'modify') => {
    try {
      const reqRef = doc(db, 'requests', id);
      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      if (action === 'approve') {
        updateData.status = 'approved';
      } else if (action === 'reject') {
        updateData.status = 'rejected';
      } else if (action === 'modify') {
        updateData.status = 'approved';
        updateData.ministerResponse = editResponse;
      }

      await updateDoc(reqRef, updateData);
      setEditingId(null);
      setEditResponse('');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Eroare la actualizarea solicitării.');
    }
  };

  const handleRunNewsAgent = async () => {
    if (!user) return;
    setIsRunningNewsAgent(true);
    try {
      const newsResult = await runNewsAgent(selectedNewsMinistry);
      
      // Save directly as approved so it shows up on the forum immediately
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: 'Agent Analiză Presă AI',
        title: newsResult.title,
        description: newsResult.description,
        ministry: selectedNewsMinistry,
        status: 'approved',
        aiResponse: newsResult.aiResponse.text,
        legalBasis: newsResult.aiResponse.legalBasis,
        steps: newsResult.aiResponse.steps,
        deadline: newsResult.aiResponse.deadline,
        department: newsResult.aiResponse.department,
        isNews: true,
        sourceUrl: newsResult.sourceUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      alert('Știrea a fost analizată și publicată pe forum cu succes!');
    } catch (error) {
      console.error('Error running news agent:', error);
      alert('A apărut o eroare la rularea agentului de presă. Încercați din nou.');
    } finally {
      setIsRunningNewsAgent(false);
    }
  };

  if (!user || (profile?.role !== 'minister' && profile?.role !== 'admin')) {
    return <div className="text-center py-12">Acces interzis. Această secțiune este destinată funcționarilor publici.</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 sm:pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Panou Minister</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 sm:mt-2">Revizuiește, modifică sau aprobă soluțiile generate de AI pentru cetățeni.</p>
        </div>
        <Badge variant="outline" className="text-sm sm:text-lg py-1 px-3 sm:px-4 bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
          {requests.length} Solicitări în așteptare
        </Badge>
      </div>

      <Card className="border-purple-200 shadow-sm overflow-hidden bg-purple-50/30">
        <CardHeader className="border-b border-purple-100 bg-purple-50/50 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-purple-900 flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            Agent Analiză Presă AI
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-purple-700">
            Scanează cele mai recente știri și declarații pentru un minister. AI-ul va extrage o problemă majoră și va genera automat o soluție pe forumul public.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-xs sm:text-sm font-medium text-purple-900">Selectează Ministerul pentru Scanare</label>
              <Select value={selectedNewsMinistry} onValueChange={setSelectedNewsMinistry}>
                <SelectTrigger className="bg-white border-purple-200 h-11">
                  <SelectValue placeholder="Alege ministerul" />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRIES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleRunNewsAgent} 
              disabled={isRunningNewsAgent}
              className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto gap-2 h-11"
            >
              {isRunningNewsAgent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Se analizează presa...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Rulează Agentul
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Se încarcă solicitările...</div>
      ) : requests.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-400 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Toate solicitările au fost procesate</h3>
            <p className="text-sm sm:text-base text-slate-500 max-w-sm mt-2">Nu există cereri noi care necesită validare umană.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {requests.map(req => (
            <Card key={req.id} className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                  <div className="w-full">
                    <div className="flex justify-between items-start gap-2 w-full">
                      <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{req.title}</CardTitle>
                      <Badge variant="secondary" className="sm:hidden bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap shrink-0">
                        <Clock className="mr-1 h-3 w-3" /> Validare
                      </Badge>
                    </div>
                    <CardDescription className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <span className="font-medium text-slate-700">{req.ministry}</span>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-slate-500">Cetățean: {req.userName}</span>
                      <span className="text-slate-300 hidden sm:inline">•</span>
                      <span className="text-slate-500">{format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm', { locale: ro })}</span>
                      {req.referenceNumber && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="font-mono text-[10px] sm:text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{req.referenceNumber}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="hidden sm:flex bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap shrink-0">
                    <Clock className="mr-1 h-3 w-3" /> Necesită Validare
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">Solicitarea Cetățeanului</h4>
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100">
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <h4 className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-blue-900 uppercase tracking-wider">
                    <AlertCircle className="h-4 w-4" /> Soluție Propusă de AI
                  </h4>
                  
                  {editingId === req.id ? (
                    <div className="space-y-3 sm:space-y-4">
                      <Textarea 
                        value={editResponse}
                        onChange={(e) => setEditResponse(e.target.value)}
                        className="min-h-[150px] sm:min-h-[200px] font-medium text-slate-800 text-sm"
                        placeholder="Modifică răspunsul oficial..."
                      />
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditingId(null)} className="w-full sm:w-auto">Anulează</Button>
                        <Button onClick={() => handleAction(req.id, 'modify')} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                          Salvează & Aprobă
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50/50 p-4 sm:p-6 rounded-xl border border-blue-100 space-y-4">
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-medium">{req.aiResponse}</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-blue-200/60 text-xs sm:text-sm">
                        <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                          <span className="font-semibold text-blue-900 block mb-0.5">Baza Legală:</span>
                          <span className="text-slate-700">{req.legalBasis}</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                          <span className="font-semibold text-blue-900 block mb-0.5">Termen:</span>
                          <span className="text-slate-700">{req.deadline}</span>
                        </div>
                        {req.department && (
                          <div className="sm:col-span-2 bg-white/60 p-2 rounded border border-blue-100/50">
                            <span className="font-semibold text-blue-900 block mb-0.5">Departament Destinatar:</span>
                            <span className="text-slate-700">{req.department}</span>
                          </div>
                        )}
                        <div className="sm:col-span-2 bg-white/60 p-2 rounded border border-blue-100/50">
                          <span className="font-semibold text-blue-900 block mb-0.5">Pași:</span>
                          <span className="text-slate-700">{req.steps}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 pt-4 sm:pt-6">
                        <Button onClick={() => handleAction(req.id, 'approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto">
                          <CheckCircle2 className="h-4 w-4" /> Aprobă Soluția AI
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingId(req.id);
                          setEditResponse(req.aiResponse);
                        }} className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto">
                          <Edit3 className="h-4 w-4" /> Modifică Răspunsul
                        </Button>
                        <Button variant="outline" onClick={() => handleAction(req.id, 'reject')} className="gap-2 border-red-200 text-red-700 hover:bg-red-50 w-full sm:w-auto sm:ml-auto">
                          <XCircle className="h-4 w-4" /> Respinge
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
