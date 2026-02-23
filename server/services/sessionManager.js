const { v4: uuidv4 } = require('uuid');

// In-memory session store
const sessions = new Map();

function createSession() {
  const id = uuidv4();
  const session = {
    id,
    currentPnrId: null,
    currentPnrLocator: null,
    lastAvailability: null,      // cached availability results for sell reference
    nameSearchResults: null,     // cached name search results for selection
    pnrModified: false,          // track unsaved changes
    pnrOpenedAt: null,           // for "simultaneous changes" timeout joke
    commandCount: 0,
    keystrokeCount: 0,
    sessionStartedAt: Date.now(),
    flightChangeStartedAt: null, // track flight-change workflow
    originalSegment: null,       // for stats tracking
    newSegment: null,
  };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id) || null;
}

function clearPnrContext(session) {
  session.currentPnrId = null;
  session.currentPnrLocator = null;
  session.lastAvailability = null;
  session.nameSearchResults = null;
  session.pnrModified = false;
  session.pnrOpenedAt = null;
}

function trackCommand(session, command) {
  session.commandCount++;
  session.keystrokeCount += command.length;
}

module.exports = { createSession, getSession, clearPnrContext, trackCommand };
