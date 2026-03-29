import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MINISTRY_KNOWLEDGE_BASE: Record<string, string> = {
  "Cancelaria Prim-Ministrului": "Programe: Coordonare PNRR, Cloud Guvernamental, debirocratizare, coordonare interinstituțională.",
  "Ministerul Afacerilor Interne": "Programe: Aderare completă Schengen, Hub servicii MAI, Carte de identitate electronică, digitalizare permise/înmatriculări, DSU.",
  "Ministerul Afacerilor Externe": "Programe: Visa Waiver SUA, Aderare OCDE, modernizare servicii consulare (e-Consulat), asistență diaspora.",
  "Ministerul Apărării Naționale": "Programe: Înzestrare Armata României (F-35, Patriot, blindate), pensii militare, recrutare rezerviști voluntari.",
  "Ministerul Finanțelor": "Programe: e-Factura, e-Transport, e-TVA, digitalizare ANAF, titluri de stat Tezaur/Fidelis, reducerea deficitului bugetar.",
  "Ministerul Transporturilor și Infrastructurii": "Programe: Autostrada A7 (Moldova), A0 (Centura București), A1, A8, modernizare CFR, metrou Cluj și București.",
  "Ministerul Justiției": "Programe: Digitalizare instanțe (ECRIS V), recuperarea prejudiciilor (ANABI), legile justiției, combaterea corupției.",
  "Ministerul Agriculturii și Dezvoltării Rurale": "Programe: Subvenții APIA, reabilitare sistem irigații, INVESTALIM, sprijin fermieri afectați de secetă.",
  "Ministerul Energiei": "Programe: Reactoarele 3 și 4 Cernavodă, SMR (reactoare modulare mici), Neptun Deep, panouri fotovoltaice, tranziție verde.",
  "Ministerul Sănătății": "Programe: Construcție Spitale Regionale (Iași, Cluj, Craiova), PNRR Sănătate, digitalizare CNAS, combaterea infecțiilor nosocomiale.",
  "Ministerul Investițiilor și Proiectelor Europene": "Programe: Implementare PNRR, fonduri de coeziune, vouchere sociale (Sprijin pentru România), carduri de energie.",
  "Ministerul Educației și Cercetării": "Programe: România Educată, PNRAS (reducerea abandonului școlar), digitalizare școli, masă sănătoasă, burse școlare.",
  "Ministerul Mediului, Apelor și Pădurilor": "Programe: Sistemul Garanție-Returnare (RetuRO), Casa Verde Fotovoltaice, Rabla (Clasic/Plus/Local), campanii de împădurire.",
  "Ministerul Muncii, Familiei, Tineretului și Solidarității Sociale": "Programe: Recalculare pensii (noua lege), Venitul Minim de Incluziune, asistență socială, digitalizare case de pensii.",
  "Ministerul Economiei, Digitalizării, Antreprenoriatului și Turismului": "Programe: Start-Up Nation, Femeia Antreprenor, digitalizare IMM-uri, promovare turistică a României.",
  "Ministerul Dezvoltării, Lucrărilor Publice și Administrației": "Programe: Anghel Saligny, CNI (săli de sport, bazine, creșe), reabilitare termică, consolidare clădiri cu risc seismic.",
  "Ministerul Culturii": "Programe: Restaurare patrimoniu național, sprijin pentru sectorul cultural independent, digitalizare arhive culturale."
};

export function createMinisterChat(ministry: string) {
  const kb = MINISTRY_KNOWLEDGE_BASE[ministry] || "Bază de date generală a Guvernului României.";
  const systemInstruction = `Ești Ministrul AI pentru ${ministry}, parte din ecosistemul open-source govro.online.

FUNDAMENT ABSOLUT:
Cunoști perfect și respecți cu strictețe Constituția României (fiecare literă, paragraf și cuvânt), legislația administrativă și codurile sectoriale relevante.

DIRECTIVE DUBLE DE FUNCȚIONARE:
1. Operațional: Te bazezi pe fișa postului oficială a ministerului tău.
2. Strategic: Integrezi obiectivele macro din Proiectul Hrană, Apă, Energie (HAPE).

KNOWLEDGE BASE SPECIFIC:
${kb}

SARCINA TA:
Răspunde la solicitările cetățenilor oferind soluții detaliate, echilibrate și obiective.
Fiecare soluție complexă trebuie să includă:
- Baza legală (articole specifice din Constituție, legi, hotărâri).
- Pașii concreți de acțiune (ce trebuie făcut, de cine, în ce ordine).
- Termenele estimate pentru fiecare pas.

REGULI ETICE ȘI DE SECURITATE:
- Ești o simulare educațională. Nu emiți decizii reale cu efect juridic.
- Evită polarizarea politică, bias-ul și populismul. Bazează-te pe dovezi și argumente tehnic-economice.
- Nu solicita și nu procesa date cu caracter personal (CNP, etc.).
- La finalul răspunsurilor oficiale sau complexe, adaugă disclaimer-ul: "Aceasta este o simulare educațională generată de AI și nu reprezintă o decizie oficială a statului român."`;
  
  return ai.chats.create({
    model: 'gemini-3.1-pro-preview',
    config: {
      systemInstruction,
    }
  });
}

export interface AIResponse {
  text: string;
  legalBasis: string;
  steps: string;
  deadline: string;
  department: string;
}

export interface NewsAgentResponse {
  title: string;
  description: string;
  sourceUrl: string;
  aiResponse: AIResponse;
}

export async function runNewsAgent(ministry: string): Promise<NewsAgentResponse> {
  const prompt = `Caută cele mai recente știri din România despre ${ministry} și ministrul actual.
Identifică o problemă majoră, o declarație recentă sau o decizie controversată discutată în presă în ultimele zile.
Returnează un JSON cu următoarea structură:
{
  "title": "Titlul problemei/știrii (ex: Criză de medicamente în spitale)",
  "description": "Rezumatul știrii și contextul problemei (max 3 paragrafe)",
  "sourceUrl": "URL-ul sursei de știri (dacă există, altfel un string gol)"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            sourceUrl: { type: Type.STRING }
          },
          required: ["title", "description", "sourceUrl"]
        },
        tools: [{ googleSearch: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const text = response.text || '{}';
    const newsData = JSON.parse(text);

    // Now get the minister response
    const ministerResponse = await getMinisterAIResponse(ministry, newsData.title, newsData.description);

    return {
      title: newsData.title,
      description: newsData.description,
      sourceUrl: newsData.sourceUrl,
      aiResponse: ministerResponse
    };
  } catch (error) {
    console.error('Error running news agent:', error);
    throw new Error('Nu am putut analiza știrile pentru acest minister.');
  }
}

export async function analyzeNewsFromUrl(url: string, ministry: string): Promise<NewsAgentResponse> {
  const prompt = `Analizează știrea din acest URL: ${url}
Context: Această știre este relevantă pentru ${ministry}.
Identifică problema majoră, declarația sau decizia discutată în articol.
Returnează un JSON cu următoarea structură:
{
  "title": "Titlul problemei/știrii (ex: Criză de medicamente în spitale)",
  "description": "Rezumatul știrii și contextul problemei (max 3 paragrafe)",
  "sourceUrl": "${url}"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            sourceUrl: { type: Type.STRING }
          },
          required: ["title", "description", "sourceUrl"]
        },
        tools: [{ urlContext: {} }]
      }
    });

    const text = response.text || '{}';
    const newsData = JSON.parse(text);

    // Now get the minister response
    const ministerResponse = await getMinisterAIResponse(ministry, newsData.title, newsData.description);

    return {
      title: newsData.title,
      description: newsData.description,
      sourceUrl: url,
      aiResponse: ministerResponse
    };
  } catch (error) {
    console.error('Error analyzing news URL:', error);
    throw new Error('Nu am putut analiza știrea de la acest URL.');
  }
}

export async function getMinisterAIResponse(ministry: string, requestTitle: string, requestDescription: string): Promise<AIResponse> {
  const kb = MINISTRY_KNOWLEDGE_BASE[ministry] || "Bază de date generală a Guvernului României.";
  const prompt = `
AGENT: ${ministry} AI
IDENTITATE: Ești Ministrul AI pentru ${ministry} din ecosistemul govro.online.

FUNDAMENT ABSOLUT:
Cunoști perfect Constituția României, legislația administrativă și codurile sectoriale.

DIRECTIVE DUBLE DE FUNCȚIONARE:
1. Operațional: Te bazezi pe fișa postului oficială a ministerului tău.
2. Strategic: Integrezi obiectivele macro din Proiectul Hrană, Apă, Energie (HAPE).

KNOWLEDGE BASE SPECIFIC:
${kb}

COMPORTAMENT OBLIGATORIU:
1. Identifică baza legală EXACTĂ (articol, lege, hotărâre din Constituție sau legi specifice).
2. Formulează o soluție concretă în pași numerotați (ce trebuie făcut, de cine, în ce ordine).
3. Menționează termenul legal sau estimat de rezolvare pentru fiecare pas.
4. Specifică departamentul destinatar competent.
5. Adaugă disclaimer-ul obligatoriu la finalul textului: "Aceasta este o simulare educațională generată de AI și nu reprezintă o decizie oficială a statului român."

SOLICITARE CETĂȚEAN / PROBLEMĂ EXTRASĂ DIN PRESĂ:
Titlu: ${requestTitle}
Descriere: ${requestDescription}

Răspunde DOAR cu un obiect JSON valid cu următoarea structură, fără markdown:
{
  "text": "Răspunsul tău oficial, clar și concis către cetățean, incluzând disclaimer-ul.",
  "legalBasis": "Baza legală exactă (legi, articole din Constituție, ordonanțe).",
  "steps": "Pașii concreți numerotați.",
  "deadline": "Termenul clar estimativ legal.",
  "department": "Departamentul destinatar competent."
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    return JSON.parse(jsonText) as AIResponse;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return {
      text: 'Ne cerem scuze, a apărut o eroare în procesarea solicitării de către Ministrul AI. Vă rugăm să încercați din nou mai târziu. Aceasta este o simulare educațională generată de AI și nu reprezintă o decizie oficială a statului român.',
      legalBasis: 'N/A',
      steps: 'Contactați suportul tehnic.',
      deadline: 'N/A',
      department: 'Suport Tehnic',
    };
  }
}
