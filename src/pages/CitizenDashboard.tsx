import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getMinisterAIResponse } from '../services/geminiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Loader2, Plus, Clock, CheckCircle2, XCircle, AlertCircle, User } from 'lucide-react';

const MINISTRY_CATEGORIES = {
  "Guvernare & Administrație": [
    "Cancelaria Prim-Ministrului",
    "Ministerul Afacerilor Interne",
    "Ministerul Afacerilor Externe",
    "Ministerul Apărării Naționale",
    "Ministerul Justiției",
    "Ministerul Dezvoltării, Lucrărilor Publice și Administrației"
  ],
  "Economie & Finanțe": [
    "Ministerul Finanțelor",
    "Ministerul Economiei, Digitalizării, Antreprenoriatului și Turismului",
    "Ministerul Investițiilor și Proiectelor Europene",
    "Ministerul Energiei"
  ],
  "Infrastructură & Mediu": [
    "Ministerul Transporturilor și Infrastructurii",
    "Ministerul Agriculturii și Dezvoltării Rurale",
    "Ministerul Mediului, Apelor și Pădurilor"
  ],
  "Social & Educație": [
    "Ministerul Sănătății",
    "Ministerul Educației și Cercetării",
    "Ministerul Muncii, Familiei, Tineretului și Solidarității Sociale",
    "Ministerul Culturii"
  ]
};

export function CitizenDashboard() {
  const { user, profile, updateCnp } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ministry, setMinistry] = useState('');
  
  const [cnpInput, setCnpInput] = useState('');
  const [cnpError, setCnpError] = useState('');
  const [isUpdatingCnp, setIsUpdatingCnp] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching citizen requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCnpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[1-9]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{6}$/.test(cnpInput)) {
      setCnpError('CNP invalid. Trebuie să conțină 13 cifre valide.');
      return;
    }
    
    setCnpError('');
    setIsUpdatingCnp(true);
    try {
      await updateCnp(cnpInput);
    } catch (error) {
      setCnpError('Eroare la salvarea CNP-ului.');
    } finally {
      setIsUpdatingCnp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !profile.cnp || !title || !description || !ministry) return;

    setSubmitting(true);
    try {
      // 1. Create the request as pending_ai
      const newRequestRef = await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: profile.name,
        title,
        description,
        ministry,
        status: 'pending_ai',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 2. Call Gemini API to get the AI Minister response
      const aiResponse = await getMinisterAIResponse(ministry, title, description);

      // 3. Update the request with the AI response and move to pending_minister
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const refNumber = `SAL/${ministry.substring(0, 4).toUpperCase()}/2026/${Math.floor(1000 + Math.random() * 9000)}`;
      
      await updateDoc(doc(db, 'requests', newRequestRef.id), {
        status: 'pending_minister',
        aiResponse: aiResponse.text,
        legalBasis: aiResponse.legalBasis,
        steps: aiResponse.steps,
        deadline: aiResponse.deadline,
        department: aiResponse.department,
        referenceNumber: refNumber,
        updatedAt: new Date().toISOString(),
      });

      setTitle('');
      setDescription('');
      setMinistry('');
      
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('A apărut o eroare la trimiterea solicitării. Vă rugăm să încercați din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_ai':
        return <Badge variant="secondary" className="bg-slate-100 text-slate-800"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Procesare AI</Badge>;
      case 'pending_minister':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="mr-1 h-3 w-3" /> În Așteptare Aprobare</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Aprobat & Publicat</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200"><XCircle className="mr-1 h-3 w-3" /> Respins</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user) return <div className="text-center py-12">Vă rugăm să vă autentificați.</div>;

  if (!profile?.cnp) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Verificare Identitate (eID / CNP)
            </CardTitle>
            <CardDescription>
              Pentru a trimite solicitări oficiale către ministere, este necesară validarea identității cu CNP. Aceasta este o cerință legală.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCnpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnp">Cod Numeric Personal (CNP)</Label>
                <Input
                  id="cnp"
                  placeholder="Ex: 1900101123456"
                  value={cnpInput}
                  onChange={(e) => setCnpInput(e.target.value)}
                  maxLength={13}
                  className={cnpError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {cnpError && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-4 w-4" /> {cnpError}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={isUpdatingCnp || cnpInput.length !== 13} className="w-full bg-blue-600 hover:bg-blue-700">
                {isUpdatingCnp ? 'Se validează...' : 'Validează și Continuă'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-slate-200 shadow-sm sticky top-24">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Plus className="h-5 w-5 text-blue-600" /> Solicitare Nouă
            </CardTitle>
            <CardDescription>
              Adresează o întrebare sau o problemă unui Ministru AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ministry">Ministerul vizat</Label>
                <Select value={ministry} onValueChange={setMinistry} required>
                  <SelectTrigger id="ministry" className="w-full">
                    <SelectValue placeholder="Selectează ministerul" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MINISTRY_CATEGORIES).map(([category, ministries]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="font-bold text-blue-900 bg-slate-50">{category}</SelectLabel>
                        {ministries.map(m => (
                          <SelectItem key={m} value={m} className="pl-6">{m}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Subiectul solicitării</Label>
                <Input 
                  id="title" 
                  placeholder="Ex: Obținere autorizație..." 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrierea detaliată</Label>
                <Textarea 
                  id="description" 
                  placeholder="Descrie situația ta în detaliu..." 
                  className="min-h-[120px] sm:min-h-[150px]"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  maxLength={5000}
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11" disabled={submitting || !title || !description || !ministry}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se procesează...</>
                ) : (
                  'Trimite Solicitarea'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Statusul Meu</h2>
          <Badge variant="outline" className="text-slate-500">{requests.length} solicitări</Badge>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Se încarcă solicitările...</div>
        ) : requests.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center px-4">
              <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-slate-400 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Nicio solicitare</h3>
              <p className="text-sm sm:text-base text-slate-500 max-w-sm mt-2">Nu ai trimis nicio solicitare încă. Folosește formularul pentru a începe.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <Card key={req.id} className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="w-full">
                      <div className="flex justify-between items-start gap-2 w-full">
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{req.title}</CardTitle>
                        <div className="sm:hidden shrink-0">{getStatusBadge(req.status)}</div>
                      </div>
                      <CardDescription className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <span className="font-medium text-slate-700">{req.ministry}</span>
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
                    <div className="hidden sm:block shrink-0">{getStatusBadge(req.status)}</div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100 mb-4">
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
                  </div>

                  {req.status !== 'pending_ai' && (
                    <div className="space-y-3 sm:space-y-4 border-t border-slate-100 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-slate-900">Răspuns Generat</h4>
                      <div className="bg-blue-50/50 p-3 sm:p-4 rounded-lg border border-blue-100">
                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap mb-4">
                          {req.ministerResponse || req.aiResponse}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                          <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                            <span className="font-semibold text-blue-900 block mb-0.5">Baza Legală:</span>
                            <span className="text-slate-600">{req.legalBasis}</span>
                          </div>
                          <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                            <span className="font-semibold text-blue-900 block mb-0.5">Termen:</span>
                            <span className="text-slate-600">{req.deadline}</span>
                          </div>
                          {req.department && (
                            <div className="sm:col-span-2 bg-white/60 p-2 rounded border border-blue-100/50">
                              <span className="font-semibold text-blue-900 block mb-0.5">Departament Destinatar:</span>
                              <span className="text-slate-600">{req.department}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
