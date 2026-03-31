# Tenta AI Setup

## Vad som ar implementerat

Det har lagts till ett forsta backend-skelett for alternativet `Hel tenta`.

Flodet ar:

1. Eleven valjer kurs och `Hel tenta` i `tenta_ai.html`.
2. Frontenden anropar `POST /api/mock-exam`.
3. Servern laser PDF-filerna i kursens mapp och extraherar text.
4. Texten skickas till OpenAI for att generera en mock-tenta och ett facit.
5. Resultatet visas direkt pa sidan och facit kan togglas fram.

## Kom igang lokalt

1. Installera Node.js om det inte redan finns.
2. Kor `npm install`.
3. Kopiera `.env.example` till `.env`.
4. Satt `OPENAI_API_KEY` i `.env`.
5. Starta servern med `npm start`.
6. Oppna `http://localhost:3000/tenta_ai.html`.

## Viktigt i denna version

- Endast `Hel tenta` stods i backend just nu.
- PDF-text trunkeras for att undvika alltfor stora requests.
- Nasta naturliga steg ar att skilja pa tenta/facit, chunka dokument och bygga ett RAG-flode for battre kvalitet.
