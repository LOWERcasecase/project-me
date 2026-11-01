/* =============================================================================
   PROJECT ME: FIXED CALENDAR DATES
   -----------------------------------------------------------------------------
   Dates from your plan that show on the Calendar under "Key dates".
   Events you create on the site itself are saved to your database instead,
   so you only edit this file for dates that belong to the plan.

   Format:
     { date: "YYYY-MM-DD", title: "...", end: "YYYY-MM-DD" (optional, multi-day) }
     { title: "...", repeat: "monthly", day: 15, from: "YYYY-MM-DD" }   repeats every month
     { title: "...", repeat: "quarterly", day: 1, from: "YYYY-MM-DD" }  Jan/Apr/Jul/Oct
     { title: "...", repeat: "yearly", date: "YYYY-MM-DD" }              same day every year
   Add  time: "HH:MM"  for a timed event, and  note: "..."  for details.
   ========================================================================== */

window.CALENDAR_DATES = [
  // Pay (actual deposit can land earlier when the 1st or 15th is a weekend)
  { title: "Payday (end-of-month pay)", repeat: "monthly", day: 1, from: "2026-11-01", note: "Rent (my half) + bills from this check." },
  { title: "Payday (mid-month pay)", repeat: "monthly", day: 15, from: "2026-11-15", note: "Paying things down / saving." },

  // Reviews
  { title: "Quarterly review: re-date tasks", repeat: "quarterly", day: 1, from: "2027-01-01", note: "Re-check task dates and the fund timeline (Part 4D)." },
  { title: "Yearly review & realignment", repeat: "yearly", date: "2026-12-28", note: "Re-run the savings math; set next year's focus (Part 5)." },

  // Debt payoff
  { date: "2026-11-13", title: "Pay off car + Apple Card (13 Nov check)", note: "Car payoff quote ~$320; Apple Card $481.06. Request the car title." },
  { date: "2026-12-01", title: "Last LES debt deduction ($584.10): debt-free", note: "Step 1 done." },

  // Health
  { date: "2027-02-22", end: "2027-02-28", title: "PT test week (week 17)", note: "Test is due by 28 Feb. Goal 80-85+. Sprint tri plan starts Mon 1 Mar." },
  { date: "2027-02-28", title: "PT test due (latest)" },
  { date: "2027-06-05", end: "2027-06-06", title: "Berlin Triathlon (sprint)", note: "750m swim / 20 km bike / 5 km run. Sprint runs Sat or Sun." },

  // Career / service
  { date: "2029-06-16", title: "DEROS: leave Germany (2029 PCS)" },
  { date: "2031-12-06", title: "20 years of service: retire" },

  // Christmas 2026 plan
  { date: "2026-11-18", title: "Order Donna's Etsy gifts" },
  { date: "2026-11-24", title: "Order Allie's star map + Larry's cookbook" },
  { date: "2026-12-01", title: "Ship the kids' gifts (US)", note: "Order online and ship direct: Lucian, Sebastian, Maddy, Emma, Evan, Kaylee." },
  { date: "2026-12-04", title: "Wiesbaden Christmas market: buy Dan's mug" },
  { date: "2026-12-07", title: "Order the turkey breast (~2.5-3 kg)", note: "Butcher or Rewe; pick up by 23 Dec." },
  { date: "2026-12-12", title: "Buy Dan's coffee flight (3 local roasters)" },
  { date: "2026-12-17", end: "2026-12-30", title: "Allie visiting" },
  { date: "2026-12-22", end: "2026-12-29", title: "Dan, Donna, Larry & Auntie Sue visiting" },
  { date: "2026-12-21", title: "Prep day: leek & potato soup + Ribollita to freeze" },
  { date: "2026-12-22", time: "18:00", title: "Wiesbaden Sternschnuppenmarkt, everyone" },
  { date: "2026-12-23", title: "BIG SHOP + Mainz Christmas market (evening)", note: "Everything through Mon 28 Dec; candy pecans, make vinaigrette, butter and port-cherry sauce." },
  { date: "2026-12-25", title: "Christmas dinner", note: "Turkey in ~1.5-2 hrs before dinner." },
];

/* =============================================================================
   DAILY RHYTHM: the week-view time blocks (like recurring events in Google
   Calendar). Change the times to match your real day.
     days:  any of Mon Tue Wed Thu Fri Sat Sun
     kind:  "workout" = today's session from the training plan that's running
            "study"   = today's study from the self-study program
            "habit"   = ticks the daily check-in item named in habit
            "block"   = a plain time block (work, meals, sleep)
   ========================================================================== */
window.DAILY_RHYTHM = [
  // google: true = this block is already in your Google Calendar. It shows here only
  // until Google Calendar is connected, then the real Google event takes its place.
  { title: "Wake up / Morning routine · meds", start: "06:00", end: "07:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "habit", habit: "meds", color: "#7E97A0", google: true },
  { title: "Drive to work", start: "07:15", end: "07:45", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#7E97A0", google: true },
  { title: "Work", start: "08:00", end: "12:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#D49C64", dark: true, google: true },
  { title: "German (lunch break)", start: "12:40", end: "13:10", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "habit", habit: "german", color: "#5E7A8C" },
  { title: "Work", start: "13:15", end: "15:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#D49C64", dark: true, google: true },
  { title: "PT", start: "15:00", end: "16:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#1F3E4A", google: true },
  { title: "Workout", start: "16:00", end: "16:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "workout" },
  { title: "Drive home", start: "16:45", end: "17:15", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#7E97A0", google: true },
  { title: "Study", start: "17:15", end: "19:15", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "study" },
  { title: "Dinner", start: "19:15", end: "20:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], kind: "block", color: "#7E97A0" },
  { title: "Bedtime routine · read", start: "20:00", end: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], kind: "habit", habit: "read", color: "#7E97A0", google: true },
  { title: "Bed time", start: "21:00", end: "21:30", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], kind: "block", color: "#7E97A0", google: true },
  // Weekends
  { title: "Wake up / Morning routine · meds", start: "07:00", end: "08:00", days: ["Sat", "Sun"], kind: "habit", habit: "meds", color: "#7E97A0", google: true },
  { title: "Study", start: "09:00", end: "13:00", days: ["Sun"], kind: "study" },
  { title: "German", start: "10:00", end: "10:45", days: ["Sat"], kind: "habit", habit: "german", color: "#5E7A8C" },
  { title: "German", start: "14:00", end: "14:45", days: ["Sun"], kind: "habit", habit: "german", color: "#5E7A8C" },
];
