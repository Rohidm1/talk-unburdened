# AnonTalk: Admin panel, live monitoring en chat

Stack ter info: React 19 + TypeScript op TanStack Start (server functions in plaats van losse API-server), Tailwind, Lovable Cloud (Postgres + RLS + realtime), Twilio Voice, Stripe.

Vastgelegde keuzes: chat rekent per minuut dat de sessie actief is, tarief EUR 0,65/min (bellen blijft EUR 1,30/min), een agent mag maximaal 2 chats tegelijk, admin kan alleen stil meeluisteren.

## 1. Admin panel: status en accounts

Het admin panel wordt een eigen sectie met drie blokken: agents, live gesprekken, klanten.

- Live status per agent komt uit de bestaande presence-tabel, aangevuld met een hartslag elke 20 seconden. Wie langer dan 60 seconden stil is, telt als offline. Het overzicht luistert via realtime mee, dus het ververst zichzelf.
- Accountformulier: gebruikersnaam, wachtwoord, schermnaam. De server maakt de login aan, geeft de rol medewerker en zet de agent direct op offline.
- Profielkoppeling: naast het formulier een lijst met alle fictieve profielen en selectievakjes. Bij opslaan worden de koppelingen weggeschreven en wordt de online/offline status van elk profiel opnieuw berekend.
- Alles loopt via bestaande admin-server-functies; die controleren eerst de adminrol voordat ze verhoogde rechten gebruiken.

## 2. Live call monitoring en klantstatistieken

- Live gesprekken: overzicht van alle gesprekken zonder eindtijd, met profiel, agent, klant-alias, starttijd en meelopende teller. Realtime-updates op de gesprekstabel.
- Stil meeluisteren: elk gesprek wordt voortaan opgezet als een Twilio-conferentie in plaats van een directe verbinding. Klant en agent komen in dezelfde conferentie; de admin krijgt een knop "meeluisteren" die een token maakt en hem als coach-deelnemer zonder spraak toevoegt. De admin hoort iedereen, niemand hoort de admin, en de deelnemerslijst van klant en agent verandert niet zichtbaar. Elke meeluistersessie wordt gelogd (wie, welk gesprek, hoe lang) zodat het controleerbaar blijft.
- Klantstatistieken: per klant totaal aantal gesprekken, totale gespreksduur, totale chatduur, verbruikte gratis seconden, betaalde seconden en omzet. Dit wordt afgeleid uit de bestaande gespreks- en transactieregels, plus de nieuwe chatsessies.

## 3. Live chat met gedeelde credits

- Klantzijde: op elk profiel komt naast bellen een knop chatten. Bij starten wordt een chatsessie aangemaakt met dezelfde routeringsregels als bellen (vaste agent indien bekend, anders een vrije agent aan dat profiel). De agent moet accepteren; pas daarna begint de teller.
- Agentzijde: in het medewerkersdashboard een chatpaneel met een lijst openstaande gesprekken links en het berichtenvenster rechts. Maximaal twee actieve chats; bij twee actieve chats krijgt de agent geen nieuwe toewijzingen.
- Afrekenen: dezelfde hartslag-aanpak als bij bellen. De klant stuurt elke 15 seconden een teken van leven; de server berekent verstreken tijd sinds acceptatie en schrijft af tegen het chattarief. Eerst gratis seconden, daarna credits. Op nul credits sluit de sessie netjes en verschijnt het bijkoopvenster. Bij 45 seconden stilte van de klant sluit de sessie automatisch en wordt afgerekend tot het laatste levensteken.
- Gratis minuten zijn gedeeld met bellen: dezelfde pot van drie minuten.
- Berichten worden live doorgegeven via realtime; alleen de klant, de toegewezen agent en de admin kunnen ze lezen.

## 4. Externe koppelingen

- Twilio: Voice blijft de basis, maar met conferenties zodat meeluisteren mogelijk wordt. Twilio Conversations of Flex is niet nodig; chat draait op de eigen database met realtime, wat goedkoper is, geen extra dienst toevoegt en de anonimiteit volledig in eigen hand houdt. Wil je later toch sms of WhatsApp, dan kan Conversations er los naast.
- Stripe: de pakketten blijven ongewijzigd en universeel. Credits worden in seconden geboekt en zijn niet gelabeld als bel- of chattegoed; alleen het verbruikstarief verschilt. Aan elk pakket wordt metadata meegegeven met het aantal seconden, zodat de webhook precies dat aantal bijschrijft. De bestaande dubbele-verwerking-bescherming en prijscontrole blijven staan.

## Technische details

Nieuwe tabellen en velden:

```text
chat_sessions
  id, client_id, listener_id, agent_user_id,
  status (ringing | active | ended), mode (free | paid),
  started_at, answered_at, ended_at, last_heartbeat_at,
  duration_seconds, free_seconds_used, billed_seconds, cost_cents

chat_messages
  id, session_id -> chat_sessions, sender_role (client | agent),
  sender_user_id, body, created_at

call_monitor_sessions
  id, call_id -> calls, admin_user_id, started_at, ended_at

calls        + conference_name, agent_call_sid
agent_presence + active_chat_count
```

Relaties: profiles 1-n chat_sessions, listeners 1-n chat_sessions, chat_sessions 1-n chat_messages, calls 1-n call_monitor_sessions, listeners n-m agents via de bestaande koppeltabel.

Toegangsregels: klant ziet eigen sessies en berichten, agent ziet sessies die aan hem zijn toegewezen, admin ziet alles. Schrijven van berichten mag alleen in een actieve sessie waar je deelnemer van bent. Monitorlogs zijn alleen voor admin.

Databasefuncties (met verhoogde rechten, alleen aanroepbaar vanaf de server):
- `settle_chat(session_id, tarief, eindtijd)` — spiegelbeeld van de bestaande afrekenfunctie voor gesprekken, deelt dezelfde creditpot.
- `settle_stale_chats(user_id, tarief)` — ruimt vastgelopen sessies op.
- `assign_chat_agent(listener_id, client_id)` — vaste agent eerst, anders vrije agent met minder dan twee actieve chats.

Server-functies (nieuw):
- admin: `listAgentsLive`, `listActiveCalls`, `listClientStats`, `startMonitor`, `stopMonitor`
- chat klant: `startChat`, `sendChatMessage`, `chatHeartbeat`, `endChat`
- chat agent: `acceptChat`, `declineChat`, `sendAgentMessage`, `listMyChats`

Alle admin- en agentfuncties controleren eerst de rol via de bestaande rolcontrole voordat ze verhoogde rechten inzetten.

Volgorde van uitvoeren:
1. Database: chattabellen, monitorlog, extra velden, toegangsregels en afrekenfuncties.
2. Admin panel herbouwen: agents, accountformulier met profielkoppeling, live gesprekken, klantstatistieken.
3. Twilio omzetten naar conferenties en de meeluisterknop toevoegen.
4. Chat aan klantzijde en het chatpaneel in het medewerkersdashboard.
5. Bijkoopvenster en gedeelde credits doortrekken naar chat, en de teksten in Nederlands en Engels aanvullen.
