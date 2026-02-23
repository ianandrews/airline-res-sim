# ✈️ SABRE GDS Simulator

### "Now You Know Why It Takes So Long"

A web-based simulator of the actual airline reservation systems (GDS — Global Distribution Systems) that gate agents use every day. Experience firsthand why "just put me on the earlier flight" requires **11+ cryptic commands** and **100+ keystrokes**.

<img width="700" alt="CRT terminal screenshot" src="https://img.shields.io/badge/INTERFACE-GREEN%20SCREEN%20CRT-33FF33?style=for-the-badge&labelColor=0a0a0a">

## The Joke

A passenger walks up to the gate and says: *"Can you just put me on the earlier flight?"*

The gate agent then proceeds to:

1. **`-SMITH/JOHN`** — Search for the passenger (multiple matches, of course)
2. **`*1`** — Select the correct Smith
3. **`*B`** — Display the full booking
4. **`*I`** — Check the current itinerary
5. **`125DECSFOJFK`** — Search for earlier flights
6. **`X1`** — Cancel the current segment
7. **`01Y2`** — Sell a seat on the new flight (hope it's not sold out!)
8. **`*I`** — Verify the new itinerary
9. **`6SMITH/J`** — Set "received from" (it's required)
10. **`ET`** — End transaction (might fail if you missed a field)
11. **`*ABCDEF`** — Re-retrieve to confirm it saved

**Minimum 11 commands. Typically 15+ with errors. A modern app could do this in 3 taps.**

That's the joke.

## Features

- **Authentic CRT terminal** — Green phosphor text, scanlines, screen flicker, vignette effect, no mouse cursor
- **Sabre-inspired command set** — Real GDS syntax for PNR retrieval, availability search, sell, cancel, and more
- **Processing delays** — Because waiting 2 seconds for a flight search is part of the experience
- **5% random "SYSTEM BUSY"** — Just like the real thing
- **Error beep** — Square wave through Web Audio API
- **Name collisions** — Multiple SMITH/JOHNs in the system, naturally
- **Fare class scarcity** — Cheap classes sold out, forcing expensive rebookings
- **Flight change stats** — Shows your command count, keystrokes, and elapsed time after completing a change
- **Easter eggs** — Try typing `WHY`, `UPGRADE`, or `GUI`

## Command Reference

| Command | Example | What it does |
|---------|---------|-------------|
| `-NAME/FIRST` | `-SMITH/JOHN` | Search by passenger name |
| `*ABCDEF` | `*ABCDEF` | Retrieve PNR by record locator |
| `*B` / `*I` / `*N` / `*P` / `*H` | `*B` | Display booking / itinerary / names / phones / history |
| `1DDMMMCCCYYY` | `125DECSFOJFK` | Search flight availability |
| `0NCS` | `01Y2` | Sell N seats, class C, from availability line S |
| `XN` | `X1` | Cancel segment N |
| `6NAME` | `6SMITH/J` | Set received-from |
| `7TAW...` | `7TAW25DEC/` | Set ticketing time limit |
| `9NUM-T` | `9415-555-0123-H` | Add phone (H/B/M) |
| `ET` / `ER` | `ET` | End transaction / end and redisplay |
| `I` | `I` | Ignore (discard changes) |
| `HELP` | `HELP` | Command reference |
| `DEMO` | `DEMO` | Guided walkthrough |

## Tech Stack

- **Frontend:** Single HTML page, vanilla JS terminal emulator, CSS CRT effects
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **No auth** — it's a joke app

## Run Locally

```bash
# Clone
git clone https://github.com/ianandrews/airline-res-sim.git
cd airline-res-sim

# Install
npm install

# Set up PostgreSQL and point to it
export DATABASE_URL="postgresql://user:pass@localhost:5432/airline_res_sim"

# Start (auto-migrates and seeds on first run)
npm start
```

## Deploy to Replit

1. Import from GitHub
2. Add a PostgreSQL database (Replit managed, free tier)
3. `DATABASE_URL` is set automatically
4. Click **Run** — migrations and seeding happen on startup

## Why This Exists

Because someone watched a gate agent type for 4 minutes to make a "simple" flight change, and thought: *everyone should experience this.*

These systems (Sabre, Amadeus, SHARES) were designed in the 1960s. They're still in use today. The commands are cryptic, there's no undo, and every modification requires a precise sequence of inputs. This simulator is an educational (and comedic) window into that world.

## License

MIT
