import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Card Recommendation & Design Suggestions
app.post("/api/ai/suggest-card", async (req, res) => {
  try {
    const { companyName, industry, stylePreference, companyDescription } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return smart rule-based fallback if no API key
      return res.json({
        recommendedTemplateId: getFallbackTemplate(industry),
        primaryColor: "#0f172a",
        secondaryColor: "#3b82f6",
        accentColor: "#f59e0b",
        suggestedSlogan: `${companyName || "Entreprise"} - L'Excellence & L'Intégrité au Quotidien`,
        suggestedTerms: "Cette carte de service est strictement personnelle et demeure la propriété de l'entreprise. En cas de perte, veuillez la retourner au service des Ressources Humaines.",
        aiRationale: "Configuration optimale générée pour un rendu professionnel haut de gamme.",
      });
    }

    const prompt = `Tu es un directeur artistique et expert en sécurité d'identité d'entreprise pour la plateforme UNINCOMPANY.
Analyse les informations suivantes d'une entreprise :
- Nom: "${companyName || "Entreprise"}"
- Secteur d'activité: "${industry || "Corporate / Général"}"
- Préférence de style: "${stylePreference || "Moderne et Sobre"}"
- Description: "${companyDescription || ""}"

Génère une recommandation de design professionnelle pour les cartes d'employés.
Choisis parmi ces templates disponibles:
- "corporate-premium" (Grandes entreprises, multinationales, style bleu marine/ardoise)
- "executive-dark" (C-suite, directeurs, fond sombre haut de gamme, or/argent)
- "modern-grid" (Structure géométrique nette, tech/services modernes)
- "digital-id" (Style badge digital tech, cyber, statut actif)
- "security-pro" (Sécurité, gardiennage, audit, contrôle d'accès)
- "institutional" (ONG, ministères, institutions publiques, ambassades)
- "african-corporate" (Corporate panafricain moderne, motifs élégants, émeraude/or chaud)
- "technology" (Startups tech, ingénierie logicielle, fintech)
- "medical" (Hôpitaux, cliniques, laboratoires, soignants)
- "education" (Universités, écoles de commerce, facultés)
- "construction" (BTP, génie civil, architecture de chantier)
- "transport" (Logistique, fret, transport aérien/routier)
- "finance-exec" (Banques, assurances, fonds d'investissement)
- "minimal-white" (Design suisse épuré, haute lisibilité)
- "black-gold" (Luxe, VIP, club d'affaires exclusif)
- "glass-corporate" (Effet moderne vitré, hiérarchie visuelle douce)
- "vertical-exec" (Format portrait élégant pour cadres)
- "advanced-security" (Simulations guilloché sécurité, haute authentification)
- "future-id" (Style néo-technologique avec métriques avancées)
- "executive-board" (Conseil d'administration, présidence)

Réponds au format JSON strict avec les champs:
{
  "recommendedTemplateId": "string (un des identifiants ci-dessus)",
  "primaryColor": "code hex (ex: #1e3a8a)",
  "secondaryColor": "code hex (ex: #3b82f6)",
  "accentColor": "code hex (ex: #fbbf24)",
  "suggestedSlogan": "Slogan percutant adapté à l'entreprise",
  "suggestedTerms": "Texte légal et conditions d'utilisation au verso (2-3 phrases)",
  "aiRationale": "Brève explication (2 phrases) justifiant le choix esthétique"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("AI Suggestion error:", error);
    return res.status(500).json({
      error: "Erreur lors de la suggestion IA",
      details: error.message,
    });
  }
});

function getFallbackTemplate(industry?: string): string {
  const ind = (industry || "").toLowerCase();
  if (ind.includes("tech") || ind.includes("logiciel") || ind.includes("informatique")) return "technology";
  if (ind.includes("santé") || ind.includes("médic") || ind.includes("hôpital") || ind.includes("clinique")) return "medical";
  if (ind.includes("sécurité") || ind.includes("gardien") || ind.includes("surveillance")) return "security-pro";
  if (ind.includes("finance") || ind.includes("banque") || ind.includes("assurance")) return "finance-exec";
  if (ind.includes("btp") || ind.includes("construction") || ind.includes("ingénierie")) return "construction";
  if (ind.includes("transport") || ind.includes("logistique") || ind.includes("fret")) return "transport";
  if (ind.includes("éduc") || ind.includes("univ") || ind.includes("école")) return "education";
  if (ind.includes("afriq") || ind.includes("congo") || ind.includes("diaspora") || ind.includes("panafr")) return "african-corporate";
  if (ind.includes("luxe") || ind.includes("vip") || ind.includes("prestige")) return "black-gold";
  return "corporate-premium";
}

// Start Vite / Express server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UNINCOMPANY Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
