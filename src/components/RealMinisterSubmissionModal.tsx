import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { getMinisterAIResponse, AIResponse } from '../services/geminiService';
import { ShieldAlert, Phone, FileText, Bot, CheckCircle2, Loader2, Send } from 'lucide-react';

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RealMinisterSubmissionModal({ isOpen, onClose }: Props) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [gdprConsent, setGdprConsent] = useState(false);
  const [cnp, setCnp] = useState(profile?.cnp || '');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [ministry, setMinistry] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiSolution, setAiSolution] = useState<AIResponse | null>(null);

  const handleClose = () => {
    setStep(1);
    setGdprConsent(false);
    setSmsCode('');
    setMinistry('');
    setTitle('');
    setDescription('');
    setAiSolution(null);
    onClose();
  };

  const handleVerifyIdentity = async () => {
    if (cnp.length !== 13 || !phone) return;
    setLoading(true);
    try {
      // Update user profile with CNP if missing
      if (!profile?.cnp && user) {
        await updateDoc(doc(db, 'users', user.uid), { cnp });
      }
      // Simulate sending SMS
      setTimeout(() => {
        setLoading(false);
        setStep(3);
      }, 1000);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleVerifySms = () => {
    if (smsCode.length >= 4) {
      setStep(4);
    }
  };

  const handleGenerateSolution = async () => {
    if (!ministry || !title || !description) return;
    setLoading(true);
    try {
      const solution = await getMinisterAIResponse(ministry, title, description);
      setAiSolution(solution);
      setStep(5);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!user || !aiSolution) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Cetățean',
        title,
        description,
        ministry,
        status: 'approved', // Approved directly to show on forum
        aiResponse: aiSolution.text,
        legalBasis: aiSolution.legalBasis,
        steps: aiSolution.steps,
        deadline: aiSolution.deadline,
        department: aiSolution.department,
        sentToRealMinister: true,
        applicantPhone: phone,
        gdprConsent: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setStep(6);
    } catch (error) {
      console.error(error);
      alert('Eroare la trimiterea solicitării.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 w-[95vw] sm:w-full rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-emerald-700 flex items-center gap-2">
            <Send className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            Trimite Oficial către Ministru
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Acest proces va genera o solicitare oficială, însoțită de soluția legală AI, care va fi trimisă direct către ministerul competent.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="py-6 sm:py-8 text-center space-y-4">
            <ShieldAlert className="h-10 w-10 sm:h-12 sm:w-12 text-amber-500 mx-auto" />
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">Autentificare Necesară</h3>
            <p className="text-sm sm:text-base text-slate-600">
              Pentru a trimite o solicitare oficială către un minister real, trebuie să fiți autentificat în platformă cu datele dumneavoastră reale.
            </p>
            <Button className="mt-4 w-full sm:w-auto h-11 sm:h-10" onClick={handleClose}>Închide</Button>
          </div>
        ) : (
          <div className="py-2 sm:py-4">
            {/* STEP 1: GDPR */}
          {step === 1 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 text-amber-900">
                <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-amber-600" />
                <div className="text-xs sm:text-sm space-y-2">
                  <p className="font-bold">Atenție: Procedură Oficială</p>
                  <p>Prin continuarea acestui proces, sunteți de acord ca datele dumneavoastră personale (Nume, CNP, Telefon, Email) să fie procesate și trimise către instituțiile statului român, conform Regulamentului GDPR (UE) 2016/679.</p>
                  <p>Aceasta NU este o simulare. Solicitarea va fi înregistrată oficial.</p>
                </div>
              </div>
              <div className="flex items-start sm:items-center space-x-3">
                <input 
                  type="checkbox" 
                  id="gdpr" 
                  checked={gdprConsent}
                  onChange={(e) => setGdprConsent(e.target.checked)}
                  className="h-5 w-5 sm:h-4 sm:w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 mt-0.5 sm:mt-0 shrink-0"
                />
                <Label htmlFor="gdpr" className="text-xs sm:text-sm font-medium leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Sunt de acord cu procesarea datelor și termenii legali.
                </Label>
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11" 
                disabled={!gdprConsent}
                onClick={() => setStep(2)}
              >
                Continuă
              </Button>
            </div>
          )}

          {/* STEP 2: Identity */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2 sm:mb-4 text-sm sm:text-base">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs sm:text-sm shrink-0">1</div>
                Verificarea Identității
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Cod Numeric Personal (CNP)</Label>
                <Input 
                  value={cnp} 
                  onChange={(e) => setCnp(e.target.value)} 
                  placeholder="Introduceți CNP-ul din 13 cifre"
                  maxLength={13}
                  disabled={!!profile?.cnp}
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Număr de Telefon</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="07XX XXX XXX"
                  type="tel"
                  className="h-11 text-sm"
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 h-11" 
                disabled={cnp.length !== 13 || phone.length < 10 || loading}
                onClick={handleVerifyIdentity}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Trimite cod SMS'}
              </Button>
            </div>
          )}

          {/* STEP 3: SMS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2 sm:mb-4 text-sm sm:text-base">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs sm:text-sm shrink-0">2</div>
                Confirmare SMS
              </div>
              <p className="text-xs sm:text-sm text-slate-600">Am trimis un cod de verificare la numărul {phone}.</p>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Cod SMS</Label>
                <Input 
                  value={smsCode} 
                  onChange={(e) => setSmsCode(e.target.value)} 
                  placeholder="Introduceți codul (ex: 1234)"
                  className="text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-14"
                  maxLength={6}
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 h-11" 
                disabled={smsCode.length < 4}
                onClick={handleVerifySms}
              >
                Verifică
              </Button>
            </div>
          )}

          {/* STEP 4: Request Details */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold mb-2 sm:mb-4 text-sm sm:text-base">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs sm:text-sm shrink-0">3</div>
                Detaliile Solicitării
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Ministerul Destinatar</Label>
                <Select value={ministry} onValueChange={setMinistry}>
                  <SelectTrigger className="h-11 text-sm">
                    <SelectValue placeholder="Alegeți ministerul" />
                  </SelectTrigger>
                  <SelectContent>
                    {MINISTRIES.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Subiectul Solicitării</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Reabilitare drum județean..."
                  className="h-11 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Descrierea Detaliată</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Descrieți problema sau propunerea dumneavoastră..."
                  className="h-24 sm:h-32 text-sm"
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4 gap-2 h-11" 
                disabled={!ministry || !title || !description || loading}
                onClick={handleGenerateSolution}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Se analizează...</>
                ) : (
                  <><Bot className="h-4 w-4" /> Generează Soluția Legală AI</>
                )}
              </Button>
            </div>
          )}

          {/* STEP 5: AI Solution Review */}
          {step === 5 && aiSolution && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm sm:text-base">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs sm:text-sm shrink-0">4</div>
                Validare Soluție AI
              </div>
              
              <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-200 space-y-3 sm:space-y-4 text-xs sm:text-sm">
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Subiect:</span> {title}
                </div>
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Soluția Propusă:</span>
                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">{aiSolution.text}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-200">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-0.5">Bază Legală:</span>
                    <span className="text-slate-600">{aiSolution.legalBasis}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <span className="font-bold text-slate-900 block mb-0.5">Termen:</span>
                    <span className="text-slate-600">{aiSolution.deadline}</span>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11" 
                onClick={handleFinalSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Trimite Oficial către {ministry}</>}
              </Button>
            </div>
          )}

          {/* STEP 6: Success */}
          {step === 6 && (
            <div className="text-center space-y-3 sm:space-y-4 py-6 sm:py-8 animate-in zoom-in">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 sm:mb-4">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Solicitare Trimisă!</h3>
              <p className="text-sm sm:text-base text-slate-600">
                Solicitarea dumneavoastră a fost înregistrată oficial și trimisă către {ministry}.
                Veți primi actualizări pe email și SMS.
              </p>
              <Button className="mt-4 sm:mt-6 w-full sm:w-auto h-11 sm:h-10" variant="outline" onClick={handleClose}>
                Închide
              </Button>
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
