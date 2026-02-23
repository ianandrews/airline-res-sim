const pnrService = require('./pnrService');
const availabilityService = require('./availabilityService');
const sellService = require('./sellService');
const cancelService = require('./cancelService');
const historyService = require('./historyService');
const helpService = require('./helpService');
const { trackCommand } = require('./sessionManager');

// Easter egg responses
const EASTER_EGGS = {
  'WHY': 'BECAUSE THIS SYSTEM WAS DESIGNED IN 1960\nAND NOBODY HAD THE COURAGE TO REPLACE IT',
  'UPGRADE': 'HA HA HA - NICE TRY\nPLEASE CONTACT REVENUE MANAGEMENT',
  'GUI': 'GRAPHICAL USER INTERFACE? WE DON\'T DO THAT HERE\nTHIS IS A SERIOUS BUSINESS TOOL',
  'MOUSE': 'MOUSE SUPPORT? THIS ISN\'T A TOY\nKEYBOARD ONLY. AS GOD INTENDED.',
  'UNDO': 'THERE IS NO UNDO\nTHERE IS ONLY REGRET',
  'PLEASE': 'POLITENESS NOT RECOGNIZED\nTHIS SYSTEM PREDATES MANNERS',
  'SORRY': 'APOLOGY ACCEPTED\nNOW TYPE A REAL COMMAND',
  'HELLO': 'THIS IS NOT A CHAT APPLICATION\nTYPE HELP FOR COMMANDS',
  'HI': 'THIS IS NOT A CHAT APPLICATION\nTYPE HELP FOR COMMANDS',
  'EXIT': 'THERE IS NO EXIT\nTHERE IS ONLY SABRE',
  'QUIT': 'THERE IS NO ESCAPE\nSIGN-IN IS FOREVER',
  'CLEAR': 'SCREEN CLEARED\nBUT THE TRAUMA REMAINS'
};

// Command routing table
const ROUTES = [
  // Help
  { pattern: /^(HELP|\?)$/, handler: handleHelp },

  // Demo
  { pattern: /^DEMO$/, handler: handleDemo },

  // Easter eggs
  { pattern: /^(WHY|UPGRADE|GUI|MOUSE|UNDO|PLEASE|SORRY|HELLO|HI|EXIT|QUIT|CLEAR)$/, handler: handleEasterEgg },

  // Retrieve by locator: *ABCDEF
  { pattern: /^\*([A-Z]{6})$/, handler: handleRetrieveLocator },

  // Select from search: *1, *2, etc.
  { pattern: /^\*(\d+)$/, handler: handleSelectFromSearch },

  // Display commands: *B, *I, *N, *P, *H
  { pattern: /^\*B$/, handler: handleDisplayBooking },
  { pattern: /^\*I$/, handler: handleDisplayItinerary },
  { pattern: /^\*N$/, handler: handleDisplayNames },
  { pattern: /^\*P$/, handler: handleDisplayPhones },
  { pattern: /^\*H$/, handler: handleDisplayHistory },

  // Name search: -SMITH/JOHN or -SMITH
  { pattern: /^-([A-Z]+)(?:\/([A-Z]+))?\s*(MR|MRS|MS|MISS|DR)?$/, handler: handleNameSearch },

  // Add passenger name (when PNR in context): -DOE/JANE MRS
  // This is the same pattern as name search but handled differently based on context
  // The handler will decide based on whether we're building a PNR

  // Availability: 125DECSFOJFK
  { pattern: /^(\d{1,2}\d{1,2}[A-Z]{3}[A-Z]{3}[A-Z]{3})$/, handler: handleAvailability },

  // Sell: 01Y2 (0 + numSeats + classCode + lineNum)
  { pattern: /^0(\d)([A-Z])(\d+)$/, handler: handleSell },

  // Cancel: X1, X1-3, X1/3
  { pattern: /^X(\d[\d\/\-]*)$/, handler: handleCancel },

  // End transaction: ET
  { pattern: /^ET$/, handler: handleEndTransaction },

  // End and redisplay: ER
  { pattern: /^ER$/, handler: handleEndRedisplay },

  // Ignore: I
  { pattern: /^I$/, handler: handleIgnore },

  // Phone: 9415-555-0123-H
  { pattern: /^9([\d\-]+)-([HBM])$/i, handler: handlePhone },

  // Received from: 6SMITH/J
  { pattern: /^6(.+)$/, handler: handleReceivedFrom },

  // Ticketing: 7TAW25NOV/
  { pattern: /^7(.+)$/, handler: handleTicketing },
];

async function parseAndExecute(session, rawInput) {
  const command = rawInput.trim().toUpperCase();

  if (!command) {
    return { output: '', beep: false };
  }

  trackCommand(session, command);

  // 5% chance of SYSTEM BUSY (the joke)
  if (Math.random() < 0.05 && command !== 'HELP' && command !== '?' && command !== 'DEMO') {
    return {
      output: 'SYSTEM BUSY - RETRY',
      beep: true,
      delay: 2000
    };
  }

  // Check for PNR simultaneous changes timeout (5 minutes)
  if (session.pnrOpenedAt && (Date.now() - session.pnrOpenedAt > 5 * 60 * 1000)) {
    if (session.currentPnrId && command !== 'I' && !command.startsWith('*')) {
      session.pnrOpenedAt = null;
      const loc = session.currentPnrLocator;
      session.currentPnrId = null;
      session.currentPnrLocator = null;
      session.pnrModified = false;
      return {
        output: `SIMULTANEOUS CHANGES TO PNR ${loc}\nRETRIEVE AND TRY AGAIN`,
        beep: true
      };
    }
  }

  for (const route of ROUTES) {
    const match = command.match(route.pattern);
    if (match) {
      try {
        return await route.handler(session, match, command);
      } catch (err) {
        console.error('Command error:', err);
        return { output: 'SYSTEM ERROR - CONTACT HELP DESK', beep: true };
      }
    }
  }

  return { output: 'INVALID ENTRY - TYPE HELP FOR COMMANDS', beep: true };
}

// Handler implementations
async function handleHelp() {
  return { output: helpService.getHelp() };
}

async function handleDemo(session) {
  return {
    output: getDemoText(),
    isDemo: true
  };
}

async function handleEasterEgg(session, match) {
  const key = match[1];
  return { output: EASTER_EGGS[key] || 'UNKNOWN COMMAND' };
}

async function handleRetrieveLocator(session, match) {
  return await pnrService.retrieveByLocator(session, match[1]);
}

async function handleSelectFromSearch(session, match) {
  return await pnrService.selectFromSearch(session, parseInt(match[1]));
}

async function handleDisplayBooking(session) {
  return await pnrService.displayBooking(session);
}

async function handleDisplayItinerary(session) {
  return await pnrService.displayItinerary(session);
}

async function handleDisplayNames(session) {
  return await pnrService.displayNames(session);
}

async function handleDisplayPhones(session) {
  return await pnrService.displayPhones(session);
}

async function handleDisplayHistory(session) {
  return await historyService.getHistory(session);
}

async function handleNameSearch(session, match) {
  const lastName = match[1];
  const firstName = match[2] || null;
  const title = match[3] || null;

  // If we have a PNR in context and this looks like adding a passenger
  if (session.currentPnrId && session.pnrModified) {
    if (firstName) {
      return await pnrService.addPassenger(session, lastName, firstName, title);
    }
  }

  // Otherwise treat as a name search
  if (firstName) {
    // Could be search or add - if PNR in context, add
    if (session.currentPnrId) {
      return await pnrService.addPassenger(session, lastName, firstName, title);
    }
    return await pnrService.searchByName(session, lastName, firstName);
  }

  return await pnrService.searchByName(session, lastName, null);
}

async function handleAvailability(session, match) {
  return await availabilityService.searchAvailability(session, match[1]);
}

async function handleSell(session, match) {
  const numSeats = parseInt(match[1]);
  const classCode = match[2];
  const lineNum = parseInt(match[3]);
  return await sellService.sellFromAvailability(session, numSeats, classCode, lineNum);
}

async function handleCancel(session, match) {
  return await cancelService.cancelSegments(session, match[1]);
}

async function handleEndTransaction(session) {
  const result = await pnrService.endTransaction(session);

  // Check if this completes a flight change workflow
  if (result.locator && session.originalSegment && session.newSegment) {
    const stats = getFlightChangeStats(session);
    result.output += '\n\n' + stats;
    session.originalSegment = null;
    session.newSegment = null;
    session.flightChangeStartedAt = null;
  }

  return result;
}

async function handleEndRedisplay(session) {
  const result = await pnrService.endAndRedisplay(session);

  if (session.originalSegment && session.newSegment) {
    const stats = getFlightChangeStats(session);
    result.output += '\n\n' + stats;
    session.originalSegment = null;
    session.newSegment = null;
    session.flightChangeStartedAt = null;
  }

  return result;
}

async function handleIgnore(session) {
  return await pnrService.ignore(session);
}

async function handlePhone(session, match) {
  return await pnrService.addPhone(session, match[1], match[2]);
}

async function handleReceivedFrom(session, match) {
  return await pnrService.setReceivedFrom(session, match[1]);
}

async function handleTicketing(session, match) {
  return await pnrService.setTicketing(session, match[1]);
}

function getFlightChangeStats(session) {
  const elapsed = session.flightChangeStartedAt
    ? Math.floor((Date.now() - session.flightChangeStartedAt) / 1000)
    : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return `
╔═══════════════════════════════════════════╗
║        FLIGHT CHANGE COMPLETE             ║
╠═══════════════════════════════════════════╣
║  COMMANDS ENTERED:  ${String(session.commandCount).padEnd(20)}║
║  TOTAL KEYSTROKES:  ${String(session.keystrokeCount).padEnd(20)}║
║  TIME ELAPSED:      ${timeStr.padEnd(20)}║
╠═══════════════════════════════════════════╣
║  A MODERN APP COULD DO THIS IN: 3 TAPS   ║
╠═══════════════════════════════════════════╣
║  NOW YOU KNOW WHY IT TAKES SO LONG        ║
╚═══════════════════════════════════════════╝`.trim();
}

function getDemoText() {
  return `
*****************************************************
*              GUIDED WALKTHROUGH                    *
*         "PUT ME ON THE EARLIER FLIGHT"             *
*****************************************************

A PASSENGER NAMED SMITH/JOHN APPROACHES THE GATE.
HE WANTS TO SWITCH TO AN EARLIER FLIGHT TO JFK.

SOUNDS SIMPLE, RIGHT? LET'S FIND OUT.

STEP 1: FIND THE PASSENGER
  TYPE:  -SMITH/JOHN
  (SEARCH ALL PNRS FOR THIS NAME)

STEP 2: THERE ARE MULTIPLE SMITHS. SELECT THE RIGHT ONE.
  TYPE:  *1  (OR *2, *3, ETC.)

STEP 3: VERIFY THE BOOKING
  TYPE:  *B  (FULL PNR DISPLAY)

STEP 4: CHECK CURRENT ITINERARY
  TYPE:  *I  (SEGMENTS ONLY)

STEP 5: SEARCH FOR EARLIER FLIGHTS
  TYPE:  125MARSFOJFK
  (1 SEAT, 25MAR, SFO TO JFK)

STEP 6: CANCEL THE CURRENT SEGMENT
  TYPE:  X1  (CANCEL SEGMENT 1)

STEP 7: SELL A SEAT ON THE NEW FLIGHT
  TYPE:  01Y1  (1 SEAT, Y CLASS, LINE 1)
  NOTE: IF THE CLASS IS SOLD OUT,
  YOU'LL NEED TO TRY A DIFFERENT CLASS

STEP 8: VERIFY THE NEW ITINERARY
  TYPE:  *I

STEP 9: SET RECEIVED FROM (REQUIRED!)
  TYPE:  6SMITH/J

STEP 10: SAVE THE CHANGES
  TYPE:  ET  (END TRANSACTION)
  WATCH FOR ERRORS - YOU MAY BE MISSING
  REQUIRED FIELDS

STEP 11: RE-RETRIEVE TO VERIFY
  TYPE:  *ABCDEF  (USE THE RECORD LOCATOR)

THAT'S 11+ COMMANDS AND 100+ KEYSTROKES
FOR "JUST PUT ME ON THE EARLIER FLIGHT"

TRY IT YOURSELF! START WITH:  -SMITH/JOHN
*****************************************************
`.trim();
}

module.exports = { parseAndExecute };
