# The Third Space — Progress Report for the Founder

_Last updated: 10 July 2026 · Branch: `feature/role-dashboards`_

This report is written in plain language. No engineering background needed. It explains **what the app is, what works today, and what's left before launch.** Diagrams are included wherever a picture makes things clearer.

---

## 1. The one-minute summary

The Third Space is a mobile app that helps people discover real-life community events near them, show up, and connect with the people they meet there.

We built the app in two stages:

- **Stage 1 — the look and feel.** Every screen was designed and built so the app *looks* finished. At this stage the screens showed **example (fake) content** so we could perfect the experience.
- **Stage 2 — making it real.** We are now replacing the fake content, one area at a time, with **live data** that flows to and from the cloud. So far **three of six areas are fully live.**

```mermaid
flowchart LR
    A["Stage 1<br/>Design & build all screens<br/>(fake sample content)"] --> B["Stage 2<br/>Connect each screen to live data<br/>(real, shared, saved)"]
    B --> C["Launch-ready app"]
```

**Where we are right now:** Stage 2 is **code-complete — all 6 of 6 areas built and connected to live data.** The everyday experience is whole: your profile, finding events, chatting, rewards for showing up, connecting with people you meet, and hosts broadcasting announcements. What remains before real users is a short, non-coding checklist (see Section 7).

---

## 2. What the app actually is

Think of The Third Space as having two kinds of people:

- **Attenders** — people who want to *find and join* events and meet others.
- **Hosters** — venues or organisers who *create and run* events.

The app shows each person a different home screen based on who they are.

```mermaid
flowchart TD
    Open["Open the app"] --> First{"First time?"}
    First -->|"Yes"| Pick["Choose your role:<br/>Attender or Hoster"]
    First -->|"No"| Remember["App remembers you<br/>and signs you in"]
    Pick --> Branch
    Remember --> Branch{"Which role?"}
    Branch -->|"Attender"| AT["Discover events →<br/>join → group chat →<br/>meet people"]
    Branch -->|"Hoster"| HO["Set up venue →<br/>post events →<br/>see who's coming"]
```

---

## 3. How the app works, at a glance

The app on the phone is the part people see and touch. Everything that needs to be **saved, shared, or kept in sync between people** lives in the cloud (we use Google's Firebase, a trusted, industry-standard service). When one person sends a message or joins an event, the cloud instantly updates what everyone else sees.

```mermaid
flowchart LR
    Phone["The app on your phone<br/>(what you see & tap)"] <-->|"sends & receives<br/>in real time"| Cloud["The cloud<br/>(Google Firebase)"]
    Cloud --> Acc["Accounts & sign-in"]
    Cloud --> Prof["Profiles"]
    Cloud --> Ev["Events & sign-ups"]
    Cloud --> Chat["Chats & messages"]
```

**Why "real time" matters:** when a venue posts a new event, or someone replies in a group chat, it shows up for everyone **immediately** — no refreshing, no waiting.

---

## 4. Progress: the six areas of Stage 2

The everyday experience is made of six areas. We're building them one at a time so each is solid before moving on.

| # | Area | What it does | Status |
|---|------|--------------|--------|
| A | **Profiles & Identity** | Who you are: your photo, bio, interests, neighbourhood | ✅ **Done** |
| B | **Discover & Filters** | Finding events: search, categories, filters | ✅ **Done** |
| C | **Chat & Messaging** | Group chats for events + private messages | ✅ **Done** |
| D | **Points & Badges** | Rewards for showing up and taking part | ✅ **Done** |
| E | **Connections** | Following and connecting with people you meet | ✅ **Done** |
| F | **Venue Announcements** | Hosters broadcasting updates to attendees | ✅ **Done** |

```mermaid
flowchart LR
    subgraph Done["✅ All six built & connected"]
        A["Profiles"]
        B["Discover"]
        C["Chat"]
        D["Points & Badges"]
        E["Connections"]
        F["Announcements"]
    end
    Done --> Launch["Launch checklist<br/>(Section 7)"]
```

All six areas are the heart of the app — a person can sign up, build a profile, find an event, join it, chat with the group, earn points for showing up, connect with people they meet, and receive the host's announcements. **That full loop is built today.**

---

## 5. The six areas, area by area

### A. Profiles & Identity ✅

Every member has a real profile: a photo, a short bio, their interests, their neighbourhood, and their age. When you look at someone in an event's guest list or in a chat, you see **their real profile**, not a placeholder. Profiles update instantly — edit yours and it's reflected everywhere it appears.

### B. Discover & Filters ✅

The Discover screen now shows **real, upcoming events** as venues post them. People can:

- **Search** by event name, venue, or neighbourhood.
- **Filter** by category (Music, Wellness, Food & Drink, etc.), by date (today, this weekend, this week), by neighbourhood, and hide 21+ events.
- See a **live count** ("Show 12 events") that updates as they adjust filters.

```mermaid
flowchart LR
    V["A venue posts<br/>an event"] --> Feed["It appears in<br/>everyone's Discover feed<br/>instantly"]
    Feed --> Find["Attenders search<br/>& filter to find<br/>what fits them"]
```

### C. Chat & Messaging ✅ _(just completed)_

This area has three parts:

**1. Event group chats.** When you register for an event, you're automatically placed in that event's group chat with everyone else who's going (and the host). Cancel your spot and you leave the chat. This is where attendees coordinate before and after.

```mermaid
flowchart LR
    R["Register for<br/>an event"] --> In["You're in the<br/>event's group chat"]
    In --> Talk["Chat with everyone<br/>going + the host"]
    Cancel["Cancel your spot"] --> Out["You leave<br/>the chat"]
```

**2. Private messages with a polite gate.** You can message another member directly. To protect people from unwanted messages, the **first** message to someone new lands in their **"Requests"** folder rather than their main inbox. They choose what happens next:

```mermaid
flowchart TD
    Msg["You message<br/>someone new"] --> Req["It waits in their<br/>'Requests' folder"]
    Req --> Decide{"They decide"}
    Decide -->|"Accept"| Open["You can now message<br/>each other freely"]
    Decide -->|"Decline"| Gone["Quietly removed —<br/>they're never notified"]
```

This "ask once, then it's open" approach keeps the app friendly and safe without being annoying.

**3. Unread counts and mute.** Every chat shows an accurate unread badge, and any chat can be muted — exactly what people expect from a messaging experience.

### D. Points & Badges ✅

Members earn points for taking part — for example, joining an event. As points add up, a member moves through tiers (Newcomer → Regular → Insider), which recognises the people who show up and keep the community alive. Points and tier are stored in the cloud and update instantly, and the rules are written so points can only change in the ways we allow (no tampering).

### E. Connections ✅

Members can **follow** the people they meet. When two people follow each other, they're **connected** — turning a one-off meetup into a lasting link. A member's profile shows a real, tappable connections count, and a "Connector" badge recognises the people who bring others together.

### F. Venue Announcements ✅ _(just completed)_

A host can broadcast a text update to everyone registered for one of their events. Each announcement appears in **two places** for attenders: a pinned banner at the top of the event's page, and a highlighted note in the event's group chat. The host sees an honest summary of their last announcement — when it was sent and how many people it reached. (This is **in-app only** for now — see Section 8 on push notifications.)

---

## 6. A note on safety and privacy

Because chats and profiles involve people's personal interactions, we put **rules in the cloud** that enforce who can see and do what. In plain terms:

- You can only read an event's group chat if you've actually **registered** for that event (or you're the host).
- You can only read a private conversation you're **part of**.
- Only **you** can edit your own profile and your own read/notification settings.
- A declined message request is **silently removed** — the sender is never told, which protects the receiver.

These protections are written and in place. They switch on the moment we publish them to the live service (a quick, routine step — see the next section).

---

## 7. What's left before this can go live to real users

The code for all six areas is **complete and tested** (every automated test passes). What remains is a short, non-coding checklist:

```mermaid
flowchart LR
    Built["All six areas<br/>code complete & tested ✅"] --> Rules["Publish the cloud safety rules<br/>(routine, one command each)"]
    Rules --> Smoke["Real-device test with two accounts<br/>across all features"]
    Smoke --> Merge["Fold the work into<br/>the main line"]
    Merge --> Ready["Ready for users"]
```

1. **Publish the cloud safety rules.** A routine action that turns on the permissions in Section 6. (The announcements rules are already published; a couple of the earlier areas' rules still need this same one-step action.)
2. **Real-device test with two accounts.** The final human check: two real phones join an event, chat, earn points, connect, and receive an announcement — confirming everything behaves correctly. Automated tests already pass; this is the last hands-on pass.
3. **Fold the work into the main line.** All six areas were built on one working branch; merging it into the project's main line is the last housekeeping step.

None of these is a development task — they're standard release steps.

---

## 8. What's coming next

Stage 2 delivered the complete everyday experience. The natural next stage is about **reach and polish** rather than new core areas:

- **Push notifications** — today, announcements and messages appear **inside** the app. Push would tap someone on the shoulder — "your host posted an update," "you have a new message" — even when the app is closed. This was deliberately left for later so we could ship the in-app experience first; it's the single biggest lever for bringing people back.
- **Smaller follow-ups** — e.g. letting hosts edit or delete an announcement, and "seen by" counts.
- **Launch preparation** — app-store builds, final configuration, and a broader device-testing pass.

The exact shape of this next stage is still to be decided — it would be scoped and planned the same careful way each of the six areas was.

---

## 9. Plain-language glossary

| Term you might hear | What it means |
|---------------------|---------------|
| **Live data** | Real information that's saved and shared between people, instead of fake sample content. |
| **The cloud / Firebase** | Google's trusted online service where accounts, profiles, events, and messages are stored and kept in sync. |
| **Real time** | Updates appear for everyone instantly, with no refreshing. |
| **Attender / Hoster** | The two roles: people who join events vs. venues that run them. |
| **Request gate** | The "first message waits in Requests until accepted" safety feature for private messages. |
| **Cloud safety rules** | The cloud-side guardrails that enforce who can read and write what. |

---

_This report reflects the state of the `feature/role-dashboards` branch as of 10 July 2026: Stage 2 areas A–F all code-complete and connected to live data; remaining work is the release checklist in Section 7._
