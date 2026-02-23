function getHelp() {
  return `
*****************************************************
*           COMMAND REFERENCE - SABRE GDS            *
*****************************************************

  RETRIEVE PNR
  -LASTNAME/FIRST     Search by passenger name
  *ABCDEF             Retrieve by record locator
  *1, *2, ...         Select from name search results

  DISPLAY PNR
  *B                  Full booking display
  *I                  Itinerary only
  *N                  Passenger names only
  *P                  Phone contacts only
  *H                  PNR history log

  AVAILABILITY
  1DDMMMCCCYYY        Flight search
                      (seats/date/origin/dest)
                      Example: 125DECSFOJFK

  SELL / MODIFY
  0NCS                Sell N seats, class C, line S
                      Example: 01Y2 (1 seat, Y class,
                      availability line 2)
  XN                  Cancel segment N (e.g. X1)
  XN-M                Cancel segments N through M
  XN/M                Cancel segments N and M

  BUILD PNR
  -LASTNAME/FIRST     Add passenger name
  9NNN-NNN-NNNN-T     Add phone (T=H/B/M)
  6NAME               Received from (required)
  7TAWDDMMM/          Ticketing time limit

  TRANSACTION
  ET                  End transaction (save)
  ER                  End and redisplay
  I                   Ignore (discard changes)

  OTHER
  HELP or ?           This screen
  DEMO                Guided walkthrough
  WHY                 ...you'll see

*****************************************************
`.trim();
}

module.exports = { getHelp };
