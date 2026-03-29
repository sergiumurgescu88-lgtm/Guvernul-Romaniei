import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Search, Building2, Scale, CalendarClock, CheckCircle2, Share2, Facebook, Twitter, Newspaper, ExternalLink, Link as LinkIcon, Loader2, Sparkles, Bot, MessageSquare, Send } from 'lucide-react';
import { Input } from '../components/ui/input';
import { CommentsSection } from '../components/CommentsSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { analyzeNewsFromUrl, NewsAgentResponse, runNewsAgent } from '../services/geminiService';

const MINISTRIES = [
  "Toate",
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

export function Home() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMinistry, setSelectedMinistry] = useState("Toate");

  const [newsUrl, setNewsUrl] = useState('');
  const [newsMinistry, setNewsMinistry] = useState(MINISTRIES[1]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedNews, setAnalyzedNews] = useState<NewsAgentResponse | null>(null);
  const [analyzingMinistryNews, setAnalyzingMinistryNews] = useState<string | null>(null);

  const handleGenerateNewsSolution = async (e: React.MouseEvent, ministry: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('Trebuie să fii autentificat pentru a genera și publica o soluție din știri.');
      return;
    }

    setAnalyzingMinistryNews(ministry);
    try {
      const newsResult = await runNewsAgent(ministry);
      
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: 'Agent Analiză Presă AI',
        title: newsResult.title,
        description: newsResult.description,
        ministry: ministry,
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

      alert(`Știrea pentru ${ministry} a fost analizată și publicată pe forum cu succes!`);
    } catch (error) {
      console.error('Error running news agent:', error);
      alert('A apărut o eroare la rularea agentului de presă. Încercați din nou.');
    } finally {
      setAnalyzingMinistryNews(null);
    }
  };

  const handleAnalyzeNews = async () => {
    if (!newsUrl) return;
    setIsAnalyzing(true);
    setAnalyzedNews(null);
    try {
      const result = await analyzeNewsFromUrl(newsUrl, newsMinistry);
      setAnalyzedNews(result);
    } catch (error) {
      console.error(error);
      alert('Eroare la analizarea știrii. Verificați link-ul și încercați din nou.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublishNews = async () => {
    if (!user || !analyzedNews) return;
    try {
      await addDoc(collection(db, 'requests'), {
        userId: user.uid,
        userName: 'Agent Analiză Presă AI',
        title: analyzedNews.title,
        description: analyzedNews.description,
        ministry: newsMinistry,
        status: 'approved',
        aiResponse: analyzedNews.aiResponse.text,
        legalBasis: analyzedNews.aiResponse.legalBasis,
        steps: analyzedNews.aiResponse.steps,
        deadline: analyzedNews.aiResponse.deadline,
        department: analyzedNews.aiResponse.department,
        isNews: true,
        sourceUrl: analyzedNews.sourceUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert('Știrea a fost publicată pe forum cu succes!');
      setAnalyzedNews(null);
      setNewsUrl('');
    } catch (error) {
      console.error('Error publishing news:', error);
      alert('Eroare la publicarea știrii.');
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching public requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.ministry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMinistry = selectedMinistry === "Toate" || r.ministry === selectedMinistry;
    return matchesSearch && matchesMinistry;
  });

  const shareOnFacebook = (req: any) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Solicitare rezolvată pe govro.online pentru ${req.ministry}: ${req.title}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank');
  };

  const shareOnTwitter = (req: any) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Solicitare rezolvată pe govro.online pentru ${req.ministry}: ${req.title}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="text-center space-y-6 max-w-3xl mx-auto py-8 sm:py-12 px-2 sm:px-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl flex flex-col items-center justify-center gap-4 sm:gap-6">
          <span>Forumul Public <span className="text-blue-600">govro.online</span></span>
          <Button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-real-minister-modal'))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all sm:scale-105 sm:hover:scale-110 gap-2 font-bold text-sm sm:text-lg px-4 py-6 sm:px-8 sm:py-6 rounded-full w-full sm:w-auto"
          >
            <Send className="h-5 w-5 shrink-0" />
            <span className="whitespace-normal text-center">Trimite direct către Ministru REAL</span>
          </Button>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 px-4 sm:px-0">
          Transparență totală. Consultă deciziile și soluțiile generate de Miniștrii AI, validate de funcționarii publici, bazate pe Constituția României.
        </p>
        <div className="relative max-w-xl mx-auto mt-6 sm:mt-8 px-4 sm:px-0">
          <Search className="absolute left-7 sm:left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            type="text" 
            placeholder="Caută subiect sau minister..." 
            className="pl-10 h-12 text-base rounded-full shadow-sm border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* News Analyzer Section */}
      <Card className="max-w-4xl mx-auto border-purple-200 shadow-md overflow-hidden bg-gradient-to-br from-purple-50 to-white mx-4 sm:mx-auto">
        <CardHeader className="border-b border-purple-100 bg-purple-50/50 pb-4 px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-purple-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
            Analizează o știre cu AI
          </CardTitle>
          <CardDescription className="text-purple-700 text-sm sm:text-base">
            Introdu link-ul unei știri sau probleme din presă. Ministrul AI va analiza situația și va propune o soluție oficială.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="https://www.digi24.ro/stiri/..." 
                className="pl-9 border-purple-200 focus:border-purple-500 focus:ring-purple-500 h-11"
                value={newsUrl}
                onChange={(e) => setNewsUrl(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={newsMinistry} onValueChange={setNewsMinistry}>
                <SelectTrigger className="bg-white border-purple-200 h-11">
                  <SelectValue placeholder="Alege ministerul" />
                </SelectTrigger>
                <SelectContent>
                  {MINISTRIES.filter(m => m !== "Toate").map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAnalyzeNews} 
              disabled={isAnalyzing || !newsUrl}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-11 w-full md:w-auto"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Se analizează...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 shrink-0" />
                  Generează Soluție
                </>
              )}
            </Button>
          </div>

          {analyzedNews && (
            <div className="mt-6 bg-white rounded-xl border border-purple-100 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">{analyzedNews.title}</h3>
                <p className="text-slate-700 text-xs sm:text-sm">{analyzedNews.description}</p>
              </div>
              
              <div className="bg-blue-50 rounded-xl p-4 sm:p-5 border border-blue-100 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0">AI</div>
                  <h4 className="font-bold text-blue-900 text-sm sm:text-base">Soluția Ministrului AI</h4>
                </div>
                <p className="text-slate-800 text-xs sm:text-sm whitespace-pre-wrap">{analyzedNews.aiResponse.text}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-blue-200/60 mt-4">
                  <div className="space-y-1">
                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                      <Scale className="h-3 w-3 shrink-0" /> Baza Legală
                    </h5>
                    <p className="text-xs text-slate-700">{analyzedNews.aiResponse.legalBasis}</p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                      <CalendarClock className="h-3 w-3 shrink-0" /> Termen & Pași
                    </h5>
                    <p className="text-xs text-slate-700 font-medium">Termen: {analyzedNews.aiResponse.deadline}</p>
                    <p className="text-xs text-slate-700">{analyzedNews.aiResponse.steps}</p>
                  </div>
                </div>
              </div>
              
              {user && (profile?.role === 'minister' || profile?.role === 'admin') && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handlePublishNews} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto" size="sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Publică pe Forum
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-8 sm:mb-12 px-4 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 text-center flex items-center justify-center gap-2">
          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" />
          Departamente Guvernamentale
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {MINISTRIES.filter(m => m !== "Toate").map((ministry) => (
            <Card key={ministry} className="h-full hover:shadow-lg transition-all hover:border-blue-400 group bg-white border-slate-200 flex flex-col overflow-hidden">
              <Link to={`/chat/${encodeURIComponent(ministry)}`} className="p-5 sm:p-6 flex flex-col items-center text-center gap-4 flex-1 cursor-pointer">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0 shadow-sm">
                  <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-blue-700 leading-snug">
                    {ministry}
                  </h3>
                  <p className="text-xs text-slate-500">Departament Oficial</p>
                </div>
              </Link>
              <div className="p-4 pt-0 mt-auto w-full space-y-2 bg-white">
                <Link to={`/chat/${encodeURIComponent(ministry)}`} className="w-full block">
                  <Button variant="outline" className="w-full text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border-none flex items-center justify-center gap-1.5 h-9">
                    <Bot className="h-4 w-4 shrink-0" />
                    Discută cu Ministrul AI
                  </Button>
                </Link>
                <Button 
                  onClick={(e) => handleGenerateNewsSolution(e, ministry)}
                  disabled={analyzingMinistryNews === ministry}
                  className="w-full text-[10px] sm:text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5 h-9"
                >
                  {analyzingMinistryNews === ministry ? (
                    <><Loader2 className="h-3 w-3 animate-spin shrink-0" /> Se analizează...</>
                  ) : (
                    <><Newspaper className="h-3 w-3 shrink-0" /> Generează Soluție din Știri</>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4 px-4 sm:px-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Decizii și Soluții Publice</h2>
        <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
          <SelectTrigger className="w-full sm:w-[280px] bg-white">
            <SelectValue placeholder="Filtrează după minister" />
          </SelectTrigger>
          <SelectContent>
            {MINISTRIES.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:gap-6 px-4 sm:px-0">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Se încarcă deciziile publice...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
            Nu există solicitări publice aprobate pentru filtrele selectate.
          </div>
        ) : (
          filteredRequests.map((req) => (
            <Card key={req.id} className={`overflow-hidden shadow-sm hover:shadow-md transition-shadow ${req.isNews ? 'border-purple-200' : 'border-slate-200'}`}>
              <CardHeader className={`${req.isNews ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100'} border-b pb-4 px-4 sm:px-6`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                  <div className="space-y-1 w-full">
                    <CardTitle className={`text-lg sm:text-xl font-bold ${req.isNews ? 'text-purple-900' : 'text-slate-900'}`}>{req.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 sm:gap-2 text-slate-600 flex-wrap text-xs sm:text-sm">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> {req.ministry}
                      <span className="text-slate-300">•</span>
                      {req.isNews ? (
                        <span className="text-purple-700 font-medium flex items-center gap-1">
                          <Newspaper className="h-3 w-3 shrink-0" /> Agent Analiză Presă AI
                        </span>
                      ) : (
                        <span>De la: {req.userName}</span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span>{format(new Date(req.createdAt), 'dd MMM yyyy', { locale: ro })}</span>
                      {req.referenceNumber && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-[10px] sm:text-xs bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded text-slate-600">{req.referenceNumber}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 gap-1 shrink-0 self-start">
                    <CheckCircle2 className="h-3 w-3" /> Soluționat
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
                    {req.isNews ? 'Contextul Știrii Analizate' : 'Solicitarea Cetățeanului'}
                  </h4>
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-lg border border-slate-100">
                    <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap">{req.description}</p>
                    {req.isNews && req.sourceUrl && (
                      <a href={req.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs sm:text-sm text-purple-600 hover:text-purple-800 mt-3 font-medium">
                        <ExternalLink className="h-3 w-3 shrink-0" /> Citește știrea completă
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-100 space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-2 sm:mb-4">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-base shrink-0">AI</div>
                    <h4 className="text-base sm:text-lg font-bold text-blue-900">Răspuns Oficial (Ministru AI)</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm sm:text-base text-slate-800 whitespace-pre-wrap">{req.ministerResponse || req.aiResponse}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-blue-200/60">
                      <div className="space-y-1 sm:space-y-2">
                        <h5 className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-blue-900">
                          <Scale className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Baza Legală
                        </h5>
                        <p className="text-xs sm:text-sm text-slate-700">{req.legalBasis}</p>
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <h5 className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-blue-900">
                          <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Termen & Pași
                        </h5>
                        <p className="text-xs sm:text-sm text-slate-700 font-medium">Termen: {req.deadline}</p>
                        <p className="text-xs sm:text-sm text-slate-700">{req.steps}</p>
                      </div>
                      {req.department && (
                        <div className="sm:col-span-2 space-y-1 sm:space-y-2">
                          <h5 className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-blue-900">
                            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Departament Destinatar
                          </h5>
                          <p className="text-xs sm:text-sm text-slate-700">{req.department}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                  <span className="text-xs sm:text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" /> Trimite către Ministru:
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 text-[#1877F2] hover:text-[#1877F2] hover:bg-blue-50" onClick={() => shareOnFacebook(req)}>
                      <Facebook className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Facebook</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2 text-[#1DA1F2] hover:text-[#1DA1F2] hover:bg-sky-50" onClick={() => shareOnTwitter(req)}>
                      <Twitter className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Twitter</span>
                    </Button>
                  </div>
                </div>

                <CommentsSection requestId={req.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
