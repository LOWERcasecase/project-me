/* =============================================================================
   PROJECT ME: PLAN DATA
   -----------------------------------------------------------------------------
   This file is your plan. The site reads it and draws everything from it.
   Ticks, check-ins, measurements and new finance snapshots you enter on the
   site are NOT stored here; they're saved to your Cloudflare database, so
   editing this file never wipes them.

   Editing tips
   - Task format:  T("What to do", "Due as shown", "YYYY-MM-DD used for sorting", "flag")
       flag: "x" = done   "~" = started / waiting   "o" = ongoing habit   "" = to do
     Use "" for the sort date when there's no real date yet (e.g. "after PCS").
   - Add new tasks at the END of a project's list. Ticks are matched by
     position, so inserting in the middle shifts them.
   - Ticking a task on the site overrides the flag written here.
   ========================================================================== */

const T = (t, due = "", d = "", f = "") => ({ t, due, d, f });

window.PLAN = {
  owner: "Casey",
  title: "Project Me",

  keyDates: {
    paydt: "2011-12-06",
    arrived: "2026-06-16",
    deros: "2029-06-16",
    retire: "2031-12-06",
    hyt: "2033-12-06",
    rank: "E-6 / TSgt",
    dor: "2024-09-01",
  },

  horizons: [
    { n: 1, name: "Active-Duty AF Career", years: "2011 - 2032", ages: "24-45", start: "2011-12-06", end: "2031-12-06" },
    { n: 2, name: "Post AF Career", years: "2032 - 2052", ages: "45-65", start: "2032-01-01", end: "2052-01-01" },
    { n: 3, name: "Full Retirement", years: "2052 - 2072", ages: "65-85", start: "2052-01-01", end: "2072-01-01" },
    { n: 4, name: "Legacy", years: "2072 - ", ages: "85+", start: "2072-01-01", end: null },
  ],

  // Colors follow a colorblind-checked palette. Each domain keeps its color everywhere.
  domains: [
    { id: "family",    name: "Family & Found Family",     short: "Family",    color: "#e87ba4" },
    { id: "health",    name: "Health, Wellness & Fitness", short: "Health",    color: "#eb6834" },
    { id: "finances",  name: "Finances",                  short: "Finances",  color: "#1baf7a" },
    { id: "career",    name: "Career",                    short: "Career",    color: "#2a78d6" },
    { id: "degree",    name: "Degree & Education",        short: "Education", color: "#6250d6" },
    { id: "travel",    name: "Travel & Experiences",      short: "Travel",    color: "#eda100" },
    { id: "community", name: "Community & Giving Back",   short: "Community", color: "#008300" },
  ],

  guardrails: [
    ["Work vs. family", "If a job or duty station starts costing the relationships that matter, change something. Don't push through."],
    ["Credit cards", "No balance carried past one billing cycle."],
    ["Parents", "Help within reason. The Parental Care Fund is the boundary, not a blank check."],
    ["Health", "Don't defer health \"until later.\""],
    ["Horizon 2 career", "Don't lock in a post-AF career before I need to."],
    ["Joy", "Keep at least one thing that's just for enjoyment."],
  ],

  /* ---------------------------------------------------------------------------
     HORIZON 1 PROJECTS AND TASKS
     ------------------------------------------------------------------------ */
  projects: [
    // ---------------- FAMILY ----------------
    { id: "home", domain: "family", title: "Turn our house into a true home", target: "Q2 2027", targetDate: "2027-06-30", tasks: [
      T("Sit down with my wife: list what makes a place feel like home to each of us", "Oct 2026", "2026-10-31"),
      T("Walk the house together; pick the 3 spaces that matter most", "Nov 2026", "2026-11-30"),
      T("Set a home budget (fund it from a mini savings envelope)", "Nov 2026", "2026-11-30"),
      T("Finish one space a month: unpacked, art and photos up, annoyances fixed (see Home spaces)", "Jan-Jun 2027", "2027-06-30"),
      T("Start one household ritual that's ours (Sunday dinner, a walk with the dogs...)", "Jan 2027", "2027-01-31"),
      T("Make a \"portable home\" list: what travels with us every PCS", "Jun 2027", "2027-06-30"),
    ]},
    { id: "circle", domain: "family", title: "Be intentional about relationships with our circle", target: "Ongoing", targetDate: "", tasks: [
      T("Build the Contact List: everyone in our circle, birthdays, last time we talked", "Nov 2026", "2026-11-30"),
      T("Pick a check-in rhythm for each person (Allie weekly, close friends monthly...)", "Nov 2026", "2026-11-30"),
      T("Host something at our place once a month", "from Jan 2027", "2027-01-31", "o"),
      T("Plan at least one visit or trip with Allie a year", "Yearly", "", "o"),
      T("Write \"Reflection on Relationships\", incl. what I'll offer my parents within the Parents guardrail", "Jun 2027", "2027-06-30"),
      T("Before the 2029 PCS, decide which friendships from here I'll actively keep, and how", "Mar 2029", "2029-03-31"),
    ]},

    // ---------------- HEALTH ----------------
    { id: "pt", domain: "health", title: "Pass the PT test (aim 80-85+)", target: "Feb 2027", targetDate: "2027-02-28", tasks: [
      T("Build the 18-week conditioning plan", "Oct 2026", "2026-10-10", "x"),
      T("Start the plan", "12 Oct 2026", "2026-10-12"),
      T("Confirm the exact test date with my unit", "Dec 2026", "2026-12-31"),
      T("Full practice HAMR (week 15)", "22 Jan 2027", "2027-01-22"),
      T("Take the test; record scores on the Training page", "by 28 Feb 2027", "2027-02-28"),
    ]},
    { id: "sprint", domain: "health", title: "Complete a sprint triathlon (Berlin)", target: "Jun 2027", targetDate: "2027-06-06", tasks: [
      T("Choose the race and register (popular races fill early)", "Nov 2026", "2026-11-30"),
      T("Find a pool; test whether I can swim 750m continuously (easy test swim)", "Dec 2026", "2026-12-31"),
      T("If not, line up swim lessons or a masters group for right after the PT test", "Jan 2027", "2027-01-31"),
      T("Upload the sprint tri plan (16 weeks, starts 15 Feb 2027)", "Oct 2026", "2026-10-31", "x"),
      T("Bike check: confirm with a photo of my actual bike that no new bike is needed", "Oct 2026", "2026-10-31", "~"),
      T("Race-prep the hybrid: rack/panniers/kickstand off, tires pumped, saddle height set", "Jan 2027", "2027-01-31"),
      T("Optional: narrower, slicker tires (cheapest real speed gain)", "Feb 2027", "2027-02-28"),
      T("After choosing the race: check wetsuit rules and which day the sprint runs", "After race pick", ""),
      T("Get a full-sleeve tri wetsuit", "Apr 2027", "2027-04-30"),
      T("Bike serviced: brakes, gears, chain, tires", "Early May 2027", "2027-05-07"),
      T("At least 2 open-water swims (with a buddy) and practice transitions", "May 2027", "2027-05-31"),
    ]},
    { id: "halfmar", domain: "health", title: "Complete a half-marathon", target: "Fall 2027", targetDate: "2027-10-31", tasks: [
      T("Pick a fall 2027 half-marathon nearby and register", "Jun 2027", "2027-06-30"),
      T("Upload the half-marathon plan; start it 12-16 weeks before race day", "Jun 2027", "2027-06-30"),
      T("Follow the plan and log every session", "Jul - race day", "", "o"),
    ]},
    { id: "olympic", domain: "health", title: "Complete an Olympic triathlon", target: "Summer 2028", targetDate: "2028-08-31", tasks: [
      T("Decide whether to buy an entry-level road bike for the 40K; budget it as an envelope", "After the sprint", "2027-07-31"),
      T("Register for a 2028 race", "Dec 2027", "2027-12-31"),
      T("Write the Olympic training plan", "Jan 2028", "2028-01-31"),
      T("Build the swim to 1,500m in open water", "May 2028", "2028-05-31"),
    ]},
    { id: "marathon", domain: "health", title: "Complete a marathon", target: "Fall 2028", targetDate: "2028-10-31", tasks: [
      T("Register for a fall 2028 marathon", "Mar 2028", "2028-03-31"),
      T("Write a 16-20 week plan that starts after the Olympic triathlon", "May 2028", "2028-05-31"),
    ]},
    { id: "halfim", domain: "health", title: "Complete a half-Ironman", target: "2030", targetDate: "2030-09-30", tasks: [
      T("After the PCS, find pools, routes and races near the new base", "Q3 2029", "2029-09-30"),
      T("Register for a 2030 race", "Q4 2029", "2029-12-31"),
      T("Write the half-Ironman training plan", "Q4 2029", "2029-12-31"),
    ]},
    { id: "ironman", domain: "health", title: "Complete an Ironman", target: "2031", targetDate: "2031-09-30", tasks: [
      T("Check the training load against work demands (Work vs. Family guardrail)", "Q3 2030", "2030-09-30"),
      T("Budget for entry fee, travel and gear", "Q3 2030", "2030-09-30"),
      T("Register; write the 9-12 month Ironman plan", "Q4 2030", "2030-12-31"),
    ]},
    { id: "meals", domain: "health", title: "Establish a macro-compliant 52-week meal plan", target: "Q1 2027", targetDate: "2027-03-31", tasks: [
      T("Draft a full-year seasonal plan", "Oct 2026", "2026-10-15", "x"),
      T("Finish \"How to Calculate Macros\"; confirm My Macros are the right targets", "Nov 2026", "2026-11-30"),
      T("Cook through the autumn rotation; swap out recipes we don't like", "Nov 2026", "2026-11-30"),
      T("Repeat the review at the start of each season", "Quarterly", "", "o"),
      T("Adjust macros during heavy training blocks", "Ongoing", "", "o"),
    ]},
    { id: "bmi", domain: "health", title: "Reach and maintain a healthy BMI", target: "Ongoing", targetDate: "", tasks: [
      T("Get a baseline with my PCM (weight, body composition, labs); agree a target range", "Nov 2026", "2026-11-30"),
      T("Ask for a dietitian referral", "Nov 2026", "2026-11-30"),
      T("Check in monthly (Body page); review with my PCM once a year", "Ongoing", "", "o"),
    ]},
    { id: "therapy", domain: "health", title: "Establish a consistent routine with a therapist", target: "Q1 2027", targetDate: "2027-03-31", tasks: [
      T("Choose a route: Behavioral Health, Military OneSource counseling, or an MFLC", "Oct 2026", "2026-10-31"),
      T("Book the first appointment", "Nov 2026", "2026-11-30"),
      T("Set a standing recurring appointment", "Jan 2027", "2027-01-31"),
      T("Before the PCS, arrange a handoff so care isn't interrupted", "Mar 2029", "2029-03-31"),
    ]},
    { id: "meds", domain: "health", title: "Maintain consistency with prescribed medications", target: "Ongoing", targetDate: "", tasks: [
      T("Set up a daily system (pill organizer + phone alarm)", "Oct 2026", "2026-10-31"),
      T("Set refill reminders; learn how refills work here", "Oct 2026", "2026-10-31"),
      T("Carry a 90-day supply and records through every PCS, TDY and deployment", "Ongoing", "", "o"),
    ]},

    // ---------------- FINANCES ----------------
    { id: "debt", domain: "finances", title: "Eliminate all debts (Step 1)", target: "Dec 2026", targetDate: "2026-12-01", tasks: [
      T("List every debt: balance, interest rate, minimum payment", "Oct 2026", "2026-10-06", "x"),
      T("Pay off the Apple Card ($457.08) and USAA card ($244.63)", "Oct 2026", "2026-10-29", "x"),
      T("Pay Amanda my half of Allie's flight ($1,088.40)", "29 Oct 2026", "2026-10-29", "x"),
      T("Extra car payment: $495.88, then $6,400 from the back pay", "30 Oct 2026", "2026-10-30", "x"),
      T("Pay off the new Apple Card balance ($481.06) from the 13 Nov check", "13 Nov 2026", "2026-11-13"),
      T("Final car payment (~$320 payoff quote); cancel the 16 Nov scheduled payment; request the title", "13 Nov 2026", "2026-11-13"),
      T("Ask the lender how extra payments are applied (principal, not future payments)", "Nov 2026", "2026-11-12"),
      T("Confirm the car payment amount ($247.94 vs $250) and due date", "Nov 2026", "2026-11-12"),
      T("LES debt: $585.00 (1 Nov) and final $584.10 (1 Dec)", "1 Dec 2026", "2026-12-01"),
      T("Confirm the budget can carry $1,500/month to savings", "Dec 2026", "2026-12-31"),
      T("Redirect the full $1,500/month down the funding order (mini savings, then emergency fund)", "Dec 2026", "2026-12-31"),
    ]},
    { id: "oha", domain: "finances", title: "Overseas Housing Allowance & pay checks", target: "Nov 2026", targetDate: "2026-11-30", tasks: [
      T("Check my LES and my wife's LES for OHA; confirm rent split (JTR 1/2 and 1/2)", "Oct 2026", "2026-10-20", "x"),
      T("My OHA started: back pay in the 28 Oct check", "Oct 2026", "2026-10-28", "x"),
      T("Confirm on the Oct LES: monthly OHA amount, back-pay period, MIHA", "Nov 2026", "2026-11-15"),
      T("Amanda: ask finance about a repayment schedule and a DD 2789 waiver", "Nov 2026", "2026-11-30"),
      T("Ask finance: is \"SPOUSE\" dependency right for dual-military? Does it affect OHA or COLA?", "Oct 2026", "2026-10-31"),
      T("Pay my half of the rent from my OHA, not base pay", "Monthly", "", "o"),
    ]},
    { id: "texas", domain: "finances", title: "Establish legal residency in Texas", target: "During 2027", targetDate: "2027-12-31", tasks: [
      T("Confirm current requirements with base legal and finance", "Nov 2026", "2026-11-30"),
      T("Plan leave in Texas (physical presence is required)", "Q1 2027", "2027-03-31"),
      T("While in Texas: TX driver's license, register to vote, other ties legal advises", "On leave", ""),
      T("Submit DD Form 2058 (State of Legal Residence) to finance", "Right after", ""),
      T("Confirm state tax withholding stops on the next LES (saves ~$280/month)", "Next LES", ""),
      T("File everything in Texas Residency Requirements", "Right after", ""),
      T("Car: register it in Texas on PCS leave, before reporting to the new base", "2029 PCS", "2029-06-16"),
    ]},
    { id: "credit", domain: "finances", title: "Maintain a credit score between 650-700", target: "Ongoing", targetDate: "", tasks: [
      T("Turn on autopay for every card; pay the full statement balance each month", "Oct 2026", "2026-10-31"),
      T("Pull free reports from all three bureaus; dispute any errors", "Nov 2026", "2026-11-30"),
      T("Check the score once a quarter", "Quarterly", "", "o"),
    ]},
    { id: "mini", domain: "finances", title: "Fund mini savings accounts ($10,000)", target: "Jun 2027", targetDate: "2027-06-30", tasks: [
      T("Name each envelope's purpose and target amount", "Nov 2026", "2026-11-30"),
      T("Set a monthly amount for the envelopes", "Nov 2026", "2026-11-30"),
    ]},
    { id: "ef", domain: "finances", title: "Fund main emergency fund ($30,781.80)", target: "Nov 2027", targetDate: "2027-11-30", tasks: [
      T("Set the target: 6x base pay = $30,781.80", "Oct 2026", "2026-10-06", "x"),
      T("Track actual monthly expenses for 3 months (spending log)", "Oct 2026 - Jan 2027", "2027-01-31"),
      T("Automate a set amount from the Fidelity allotment", "Jan 2027", "2027-01-31"),
    ]},
    { id: "pets", domain: "finances", title: "Fund Stella & Taco emergency savings ($20,000 each)", target: "Sep 2028", targetDate: "2028-09-30", tasks: [
      T("Write down what each fund covers", "Oct 2026", "2026-10-15", "x"),
      T("Decide who would take the dogs (and a backup)", "Nov 2026", "2026-11-30"),
      T("Name that person as TOD beneficiary on the Stella and Taco accounts", "Nov 2026", "2026-11-30"),
      T("Put the same person in the pet care directive / will", "Nov 2026", "2026-11-30"),
      T("Set a monthly contribution once debts are cleared", "After debt", "2026-12-31"),
    ]},
    { id: "parental", domain: "finances", title: "Parental care contingency fund ($20,000)", target: "Feb 2029", targetDate: "2029-02-28", tasks: [
      T("Write the rules: when it's used, how much, and when the answer is no", "Jun 2027", "2027-06-30"),
      T("Open the Fidelity Cash Management TOD account", "When funding starts", ""),
    ]},
    { id: "trading", domain: "finances", title: "Fund trading portfolio ($30,000)", target: "Aug 2029", targetDate: "2029-08-31", tasks: [
      T("Write the Investment Plan: strategy, risk limits, buy/sell rules", "Mar 2027", "2027-03-31"),
      T("Set a monthly contribution", "After debt", "2026-12-31"),
    ]},
    { id: "downpay", domain: "finances", title: "Save for a house down payment ($100,000)", target: "Jun 2031", targetDate: "2031-06-30", tasks: [
      T("Decide which house this is for first: the US house or the one outside the US", "2027 review", "2027-12-31"),
      T("Open the Fidelity Cash Management TOD account", "When funding starts", ""),
    ]},
    { id: "estate", domain: "finances", title: "Estate basics", target: "Dec 2026", targetDate: "2026-12-31", tasks: [
      T("Free wills, financial + healthcare POAs, advance directives for BOTH of us via base legal (ask about hospital visitation and a pet care directive)", "Nov 2026", "2026-11-30"),
      T("Add TOD/POD beneficiaries to every account (Fidelity emergency fund is the one missing)", "Dec 2026", "2026-12-31"),
      T("After the move stateside and TX residency: Pride Plans trust-based estate plan ($1,450), before buying a house", "After PCS", "2029-09-30"),
      T("Monthly money check-in with my wife: balances, progress on each goal", "Monthly", "", "o"),
    ]},

    // ---------------- CAREER ----------------
    { id: "msgt", domain: "career", title: "Make MSgt", target: "By 2029", targetDate: "2029-01-01", tasks: [
      T("Confirm current E-7 eligibility requirements (TIG/TIS, PME, testing)", "Oct 2026", "2026-10-31"),
      T("Ask my supervisor directly what's missing from my record for E-7", "Nov 2026", "2026-11-30"),
      T("Ask the UTM for an NCOA class date (Kapaun). Emailed 7 Oct; waiting on reply", "Nov 2026", "2026-11-30", "~"),
      T("Attend NCOA in residence (~6 weeks TDY); schedule around PT test, Berlin Sprint, terms", "TBD", ""),
      T("If testing applies, build a study plan", "TBD", ""),
      T("Keep a monthly accomplishments log for the EPB", "Monthly", "", "o"),
      T("Look for a role that shows SNCO-level leadership", "2027", "2027-12-31"),
      T("Review each promotion cycle's results and adjust", "Each cycle", "", "o"),
      T("Confirm the service commitment that comes with MSgt still fits retiring at 20", "2027", "2027-12-31"),
    ]},
    { id: "maintain", domain: "career", title: "Maintain MSgt 2029-2032 and retire at 20", target: "Dec 2031", targetDate: "2031-12-06", tasks: [
      T("Complete Course 700 (SNCOA prerequisite) after sew-on", "TBD", ""),
      T("Attend SNCOA; confirm it doesn't add a commitment past Dec 2031", "TBD", ""),
      T("2029 PCS: ask her branch manager which bases have 2029 openings; apply via joint spouse (targets JBLM or JBSA)", "Q3 2028", "2028-09-30"),
      T("Backup list of bases with Army Cyber/MI billets and an AF base nearby", "Q3 2028", "2028-09-30"),
      T("Start TAP (up to 24 months before retirement)", "Jan 2030", "2030-01-31"),
      T("Confirm the retirement application window; submit for retirement at 20", "2030", "2030-12-31"),
      T("Start the resume", "2031", "2031-06-30"),
      T("Keep the Horizon 2 decision open (Horizon 2 Career guardrail)", "Until needed", "", "o"),
    ]},

    // ---------------- DEGREE ----------------
    { id: "biotech", domain: "degree", title: "Finish Biotechnology degree (25 credits left)", target: "End 2028", targetDate: "2028-12-31", tasks: [
      T("Meet my UMGC advisor; map the remaining 25 credits term by term", "Oct 2026", "2026-10-31"),
      T("Biotechnology Techniques (7 cr, in person): find an approved school near Wiesbaden or plan around leave; get PTE approval in writing", "Dec 2026", "2026-12-31"),
      T("Learn the internship (BIOL 486A/B) process and deadlines; look for lab placements", "Jan 2027", "2027-01-31"),
      T("Take BIOL 350, BIOL 357 and the Data Science minor course", "2027", "2027-12-31"),
      T("Do the internship", "2027-2028", "2028-06-30"),
      T("Take BIOL 495 Capstone (within the last 15 credits)", "2028", "2028-12-31"),
      T("Request TA through AFVEC before every term", "Each term", "", "o"),
      T("Apply to graduate", "2028", "2028-12-31"),
    ]},
    { id: "selfstudy", domain: "degree", title: "Finish self-study program (6 years)", target: "~2032", targetDate: "2032-06-30", tasks: [
      T("Define the program (6-year Full Study Plan)", "Oct 2026", "2026-10-15", "x"),
      T("Start Year 1 now; be in Year 2 when classes restart (see Study plan)", "Oct 2026", "2026-11-02"),
      T("DAWIA Life Cycle Logistics: check CAPPMIS/DATMS, cross-check the DAU catalog", "Year 1", "2027-09-30"),
      T("AF COOL rules: $4,500 cap; one credential at a time per category", "Oct 2026", "2026-10-15", "x"),
      T("Set up the AFVEC credentialing goal for credential #1 (supervisor approval + quote)", "Nov 2026", "2026-11-30"),
      T("Ask the Education Office: is an ASCM credential (CSCP or CLTD) allowed as my non-AFSC one?", "Nov 2026", "2026-11-30"),
      T("Work through the AF COOL order one at a time; submit results within 120 days", "2026-2031", "2031-12-01"),
      T("After sewing on MSgt: ask whether PMP is on the SNCO leadership list", "2029", "2029-06-30"),
      T("German 30-60 min/day (daily check-in)", "Daily", "", "o"),
      T("Finish Coursera TESOL (~80% done)", "Flexible", ""),
      T("CELTA, online (GI Bill or out of pocket)", "~2033", "2033-06-30"),
    ]},

    // ---------------- TRAVEL ----------------
    { id: "bucket", domain: "travel", title: "Develop a bucket list for Europe", target: "Dec 2026", targetDate: "2026-12-31", tasks: [
      T("Brainstorm with my wife; rank the top 10 (Travel page)", "Nov 2026", "2026-11-30"),
      T("Write it up", "Nov 2026", "2026-11-30"),
      T("Set a travel budget and fund it as an envelope", "Dec 2026", "2026-12-31"),
    ]},
    { id: "countries", domain: "travel", title: "Travel to as many countries as possible from Wiesbaden", target: "Jun 2029", targetDate: "2029-06-16", tasks: [
      T("Map out the ~32 months until DEROS; match trips to long weekends and leave; one trip a quarter", "Dec 2026", "2026-12-31"),
      T("Look into Space-A flights for longer trips", "Q1 2027", "2027-03-31"),
      T("Include at least one trip with Allie", "TBD", ""),
      T("Visit Poland", "TBD", ""),
      T("Visit Czechia", "TBD", ""),
      T("Keep the country tracker up to date (Travel page)", "Ongoing", "", "o"),
    ]},
  ],

  later: {
    2: [
      ["finances", "Increase emergency funds to cover 6-12 months of expenses"],
      ["finances", "Open a civilian Roth IRA and max it every year"],
      ["finances", "Grow the trading portfolio toward $2,000/month in dividends"],
      ["finances", "Start a small heirloom bucket (~5-10% of savings) once Horizon 1 funds are full"],
      ["finances", "Raise TSP contributions from 15% to 25% if continuing a DoD job"],
      ["career", "Figure out whether I want to continue a DoD job"],
      ["degree", "Complete a second degree using the GI Bill"],
      ["community", "Donate to at least 3 non-profits a year once established"],
    ],
    3: [["finances", "Reach $2,000/month ($24,000/year) in dividend income"]],
  },

  /* ---------------------------------------------------------------------------
     ENDURANCE ROADMAP
     Run races ride along with the triathlons (website notes): the 5K comes with
     the sprint, the 10K with the Olympic, the half-marathon distance with the
     half-Ironman, the marathon distance with the Ironman. Your plan also has
     standalone half-marathon and marathon races, so both are shown.
     ------------------------------------------------------------------------ */
  endurance: [
    { id: "pttest",   name: "PT test",            when: "Feb 2027",         date: "2027-02-14", project: "pt",       detail: "Goal 80-85+ (75 to pass). Baseline 83." },
    { id: "sprint",   name: "Sprint triathlon",   when: "5-6 Jun 2027",     date: "2027-06-05", project: "sprint",   detail: "750m swim · 20 km bike · 5 km run (Berlin)", includes: "5K" },
    { id: "halfmar",  name: "Half-marathon",      when: "Fall 2027",        date: "2027-10-15", project: "halfmar",  detail: "21.1 km" },
    { id: "olympic",  name: "Olympic triathlon",  when: "Summer 2028",      date: "2028-07-15", project: "olympic",  detail: "1.5 km swim · 40 km bike · 10 km run", includes: "10K" },
    { id: "marathon", name: "Marathon",           when: "Fall 2028",        date: "2028-10-15", project: "marathon", detail: "42.2 km" },
    { id: "halfim",   name: "Half-Ironman",       when: "2030",             date: "2030-07-15", project: "halfim",   detail: "1.9 km swim · 90 km bike · 21.1 km run", includes: "half-marathon distance" },
    { id: "ironman",  name: "Ironman",            when: "2031",             date: "2031-07-15", project: "ironman",  detail: "3.8 km swim · 180 km bike · 42.2 km run", includes: "marathon distance" },
  ],

  ptBaseline: { date: "2026-08-13", hrpu: 36, situp: 37, hamr: 30, total: 83 },

  /* ---------------------------------------------------------------------------
     TRAINING PROGRAMS (modules = blocks/phases; sessions are ticked daily)
     ------------------------------------------------------------------------ */
  programs: [
    {
      id: "pt", name: "PT Test Conditioning Plan", project: "pt",
      start: "2026-10-12", // Monday of week 1
      skeleton: { Mon: "Base run", Tue: "Push-up strength + short easy run", Wed: "Quality run", Thu: "Sit-up/core + short easy run", Fri: "Easy run or HAMR", "Sat/Sun": "Rest" },
      modules: [
        { name: "A · Foundation", weeks: [1, 3], note: "Ramp-up, HAMR turns" },
        { name: "B · Build", weeks: [4, 8], note: "Volume up, tempo and hills" },
        { name: "C · Sharpen", weeks: [9, 13], note: "Near-max reps, intervals" },
        { name: "D · Peak & Taper", weeks: [14, 16], note: "Volume down ~30%" },
        { name: "Test window", weeks: [17, 18], note: "Light maintenance; unit sets the date" },
      ],
      weeks: [
        { Mon: "2.5 mi easy", Tue: "Push-ups: 5 sets (~5x15)", Wed: "2.5 mi: easy + 4x20 sec relaxed strides", Thu: "Sit-ups: 5x15 + forearm plank 3x30 sec", Fri: "2.5 mi easy" },
        { Mon: "2.75 mi easy", Tue: "Push-ups: 5 sets (~5x17)", Wed: "2.75 mi: easy + 5x20 sec strides", Thu: "Sit-ups: 5x17 + forearm plank 3x35 sec", Fri: "HAMR technique: 10-15 min easy 20m shuttle turns" },
        { Mon: "3.0 mi easy", Tue: "Push-ups: 5 sets (~5x18)", Wed: "3.0 mi: easy + 6x20 sec strides", Thu: "Sit-ups: 5x18 + forearm plank 3x40 sec", Fri: "3.0 mi easy" },
        { Mon: "3.25 mi easy", Tue: "Push-ups: 5x20, 90s rest", Wed: "3.25 mi: tempo, 10 min comf. hard in the middle", Thu: "Sit-ups: 5x20 + forearm plank 3x45 sec", Fri: "HAMR intervals: 8-10 x 20m shuttles, building pace" },
        { Mon: "3.25 mi easy", Tue: "Push-ups: 5x20, 90s rest", Wed: "3.0 mi: hill repeats 6x30 sec hard uphill, walk/jog down", Thu: "Sit-ups: 5x20 + forearm plank 3x45 sec", Fri: "3.25 mi easy" },
        { Mon: "3.5 mi easy", Tue: "Push-ups: 6x18, 3-sec slow negative on last set", Wed: "3.5 mi: tempo, 12 min comf. hard", Thu: "Sit-ups: 6x18 + leg raises 3x15", Fri: "HAMR intervals: 8-10 x 20m shuttles, building pace" },
        { Mon: "3.75 mi easy", Tue: "Push-ups: 6x20, 90s rest", Wed: "3.5 mi: tempo, 15 min comf. hard", Thu: "Sit-ups: 6x20 + forearm plank 3x50 sec", Fri: "3.75 mi easy" },
        { Mon: "3.75 mi easy", Tue: "Push-ups: 6x20, 90s rest", Wed: "3.25 mi: hill repeats 6x45 sec hard uphill, walk/jog down", Thu: "Sit-ups: 6x20 + forearm plank 3x50 sec", Fri: "HAMR intervals: 8-10 x 20m shuttles, building pace" },
        { Mon: "4.0 mi easy", Tue: "Push-ups: 6x20 + 1 timed 1-min max set", Wed: "3.5 mi: intervals 4x400m fast", Thu: "Sit-ups: 6x20 + plank 3x60 sec + 1 timed 1-min max set", Fri: "4.0 mi easy + 4x20 sec relaxed strides" },
        { Mon: "4.0 mi easy", Tue: "Push-ups: 6x20 + 1 timed 1-min max set", Wed: "3.75 mi: tempo, 18-20 min comf. hard", Thu: "Sit-ups: 6x20 + plank 3x60 sec + 1 timed 1-min max set", Fri: "HAMR simulation: 5-8 min continuous, progressive pace" },
        { Mon: "4.0 mi easy", Tue: "Push-ups: pyramid 10-15-20-15-10", Wed: "3.5 mi: intervals 5x400m fast", Thu: "Sit-ups: pyramid 10-15-20-15-10 + plank hold to finish", Fri: "4.0 mi easy + 4x20 sec relaxed strides" },
        { Mon: "4.0 mi easy", Tue: "Push-ups: pyramid 10-15-20-15-10", Wed: "4.0 mi: tempo, 20 min comf. hard", Thu: "Sit-ups: pyramid 10-15-20-15-10 + plank hold to finish", Fri: "HAMR simulation: 5-8 min continuous, progressive pace" },
        { Mon: "3.75 mi easy", Tue: "Push-ups: 5 sets of max reps, 2 min rest", Wed: "3.25 mi: intervals 3x800m at strong effort", Thu: "Sit-ups: 5 sets of max reps, 2 min rest", Fri: "3.75 mi easy + 4x20 sec relaxed strides" },
        { Mon: "3.0 mi easy", Tue: "Push-ups: ~4x15, crisp form/speed", Wed: "3.0 mi: easy + 4x20 sec strides", Thu: "Sit-ups: ~4x15 + plank 3x30 sec", Fri: "3.0 mi easy shakeout" },
        { Mon: "2.75 mi easy", Tue: "Push-ups: ~4x15, crisp form/speed", Wed: "2.5 mi: easy + 3x20 sec strides", Thu: "Sit-ups: ~4x15 + plank 3x30 sec", Fri: "FULL PRACTICE HAMR at test protocol" },
        { Mon: "2.5 mi easy", Tue: "Push-ups: ~4x15, crisp form/speed", Wed: "2.0 mi: very easy shakeout + relaxed strides", Thu: "Sit-ups: ~4x15 + plank 3x30 sec", Fri: "2.5 mi easy shakeout" },
        { Mon: "2.5 mi easy, stay loose", Tue: "Push-ups: 3x12 crisp reps", Wed: "2 mi easy + 3x20 sec strides", Thu: "Sit-ups: 3x15 + plank 2x30 sec, then 5 min easy shuttles", Fri: "2 mi very easy" },
        { Mon: "2.5 mi easy, stay loose", Tue: "Push-ups: 3x12 crisp reps", Wed: "15-20 min easy shakeout jog", Thu: "Light mobility only (test may fall this week)", Fri: "Rest if test is next week; otherwise 15 min easy" },
      ],
    },
    {
      id: "sprint", name: "Sprint Triathlon Plan (Berlin)", project: "sprint",
      start: "2027-02-15",
      skeleton: { Mon: "Easy run", Tue: "Bike (bricks from wk 8)", Wed: "Quality run", Thu: "Main swim + PT upkeep", Fri: "Technique swim", "Sat/Sun": "Rest" },
      modules: [
        { name: "1 · Base", weeks: [1, 4], note: "Water comfort, bike base" },
        { name: "Recovery", weeks: [5, 5] },
        { name: "2 · Build", weeks: [6, 9], note: "Longer rides/swims, first bricks" },
        { name: "Recovery", weeks: [10, 10] },
        { name: "3 · Race-specific", weeks: [11, 14], note: "Full 750m swim, 20K benchmark, open water" },
        { name: "Taper", weeks: [15, 15] },
        { name: "Race week", weeks: [16, 16] },
      ],
      weeks: [
        { Mon: "Run 3.0 mi easy", Tue: "Bike 30 min easy, flat, high cadence", Wed: "Run 3 mi easy + 4x20 sec strides", Thu: "Swim ~200m: 8x25m, 30s rest; exhale underwater + PT upkeep", Fri: "Swim ~150m: kick with board, bubble-blowing, bobbing" },
        { Mon: "Run 3.0 mi easy", Tue: "Bike 35 min easy, flat", Wed: "Run 3 mi fartlek 5x(1 min faster / 1 min easy)", Thu: "Swim ~250m: 10x25m; side-breathing drill + PT upkeep", Fri: "Swim ~200m: kick with board, catch-up drill" },
        { Mon: "Run 3.25 mi easy", Tue: "Bike 40 min easy/steady", Wed: "Run 3.25 mi tempo, 10 min comf. hard", Thu: "Swim ~300m: 6x50m; breathe every 3 + PT upkeep", Fri: "Swim ~250m: fingertip drag, bilateral breathing" },
        { Mon: "Run 3.5 mi easy", Tue: "Bike 45 min steady (~8-9 mi)", Wed: "Run 3.5 mi tempo, 12 min comf. hard", Thu: "Swim ~350m: 7x50m, 25s rest + PT upkeep", Fri: "Swim ~250m: catch-up drill, 25m repeats" },
        { Mon: "Run 2.5 mi easy", Tue: "Bike 30 min easy", Wed: "Run 2.5 mi easy", Thu: "Swim ~250m easy technique + PT upkeep", Fri: "Swim ~200m very easy" },
        { Mon: "Run 3.5 mi easy", Tue: "Bike 50 min incl. 4x2 min moderate", Wed: "Run 3.5 mi hill repeats 6x45 sec", Thu: "Swim ~400m: 8x50m, 20s rest + PT upkeep", Fri: "Swim ~300m: drills 4x25m, 4x50m easy" },
        { Mon: "Run 3.75 mi easy", Tue: "Bike 55 min incl. 5x2 min moderate", Wed: "Run 3.5 mi tempo, 15 min comf. hard", Thu: "Swim ~450m: 3x100m + 3x50m; sighting + PT upkeep", Fri: "Swim ~350m: drills + 25m repeats" },
        { Mon: "Run 4.0 mi easy", Tue: "Bike 60 min steady + BRICK 10 min run", Wed: "Run 3.75 mi intervals 4x400m at 5K effort", Thu: "Swim ~500m: 5x100m, 20s rest + PT upkeep", Fri: "Swim ~350m: sighting every 6-8 strokes" },
        { Mon: "Run 4.0 mi easy", Tue: "Bike 65 min incl. 3x5 min moderate + BRICK 10 min", Wed: "Run 3.75 mi tempo, 18 min comf. hard", Thu: "Swim ~550m: 4x100m + 3x50m + PT upkeep", Fri: "Swim ~400m: 4x100m easy, long strokes" },
        { Mon: "Run 3.0 mi easy", Tue: "Bike 40 min easy", Wed: "Run 3 mi easy", Thu: "Swim ~400m easy + PT upkeep", Fri: "Swim ~250m very easy" },
        { Mon: "Run 4.0 mi easy", Tue: "Bike 70 min incl. 20 min race effort + BRICK 10 min", Wed: "Run 3.5 mi intervals 5x400m at 5K effort", Thu: "Swim ~600m: 3x200m + PT upkeep", Fri: "Swim ~400m: 8x50m easy/steady" },
        { Mon: "Run 4.25 mi easy", Tue: "Bike BENCHMARK 20K at race effort (note time) + BRICK 10 min", Wed: "Run 4 mi: 2x1 mile at goal 5K effort", Thu: "Swim ~700m: 2x300m + 100m + PT upkeep", Fri: "Swim ~450m: open-water skills in pool" },
        { Mon: "Run 4.0 mi easy", Tue: "Bike 60 min incl. 20K race effort + BRICK 15 min", Wed: "Run 3.75 mi: 3x1 mile at goal 5K effort", Thu: "Swim 750m FULL DISTANCE (note time) + PT upkeep", Fri: "Swim ~450m: 6x75m steady" },
        { Mon: "Run 3.5 mi easy", Tue: "Bike 50 min incl. 2x10 min race effort + BRICK 10 min", Wed: "Run 3.25 mi: 2x1 mile at goal race pace", Thu: "Swim ~800m: 750m steady + 50m easy", Fri: "Swim ~400m: race-pace breathing 4x100m" },
        { Mon: "Run 3.0 mi easy", Tue: "Bike 35 min easy + 3x1 min brisk", Wed: "Run 2.5 mi easy + 4x20 sec strides", Thu: "Swim ~500m easy", Fri: "Swim ~300m easy, relaxed rhythm" },
        { Mon: "Run 20 min easy + 4 strides", Tue: "Bike 20 min easy spin; check bike", Wed: "Rest: lay out race gear", Thu: "Swim ~200m easy", Fri: "10 min jog + 10 min spin; pack bag", Sat: "RACE (Sat or Sun)", Sun: "RACE (if Sunday)" },
      ],
    },
  ],
  futurePrograms: [
    { name: "Half-marathon plan", note: "12-16 weeks before a fall 2027 race. Upload in Jun 2027." },
    { name: "Olympic triathlon plan", note: "Write in Jan 2028 for a summer 2028 race." },
    { name: "Marathon plan", note: "16-20 weeks, starting after the Olympic tri." },
    { name: "Half-Ironman plan", note: "Write in Q4 2029 at the new base." },
    { name: "Ironman plan", note: "9-12 months; write in Q4 2030." },
  ],

  /* ---------------------------------------------------------------------------
     52/53-WEEK SEASONAL MEAL PLAN
     Each menu: [meal, name, kcal, protein, carbs, fat]
     ------------------------------------------------------------------------ */
  macros: { kcal: 1670, protein: 87, carbs: 216, fat: 58 },
  menus: {
    W1: [["B","Skyr with Stewed Rhubarb & Oats",380,22,55,8],["L","Ribollita (Tuscan Bean & Kale Soup)",430,20,62,10],["D","Baked Cod with Butter Bean & Leek Stew",480,42,46,11]],
    W2: [["B","Wholegrain Porridge with Poached Pear",370,12,62,8],["L","Roasted Celeriac & Lentil Salad",420,22,52,11],["D","Chicken Cacciatore with Polenta",510,44,52,12]],
    W3: [["B","Rye Bread with Cottage Cheese & Beetroot",340,20,48,7],["L","Borscht with Rye Bread",390,16,56,8],["D","Roasted Root Vegetable & Chickpea Tagine",470,20,68,11],["S","Skyr (300 g) with Cinnamon & 1/2 Pear",240,33,26,1]],
    W4: [["B","Overnight Oats with Mandarin & Chia",360,14,58,8],["L","Scotch Broth with Pearl Barley",420,28,50,9],["D","Slow-Cooker Turkey Ragu with Wholegrain Pasta",500,46,52,10]],
    W5: [["B","Buckwheat Pancakes with Apple Compote",390,14,64,8],["L","Puy Lentil & Roasted Squash Tray Bake",440,24,56,11],["D","Lemon Herb Baked Salmon with Braised Cabbage",490,42,38,16]],
    SP1: [["B","Bircher Muesli with Spring Berries",370,14,58,8],["L","Spring Minestrone with Pesto",410,18,58,10],["D","Spinach & Lentil Dahl with Chapati",470,24,66,10],["S","Cottage Cheese (200 g), Radishes, 2 Rye Crispbreads & 1 Egg",350,34,20,15]],
    SP2: [["B","Green Shakshuka with Spinach & Peas",390,22,42,13],["L","Broad Bean & Mint Bruschetta",390,18,54,9],["D","Pan-Fried Trout with Pea Purée & Mint",480,44,32,16]],
    SP3: [["B","Asparagus & Soft-Boiled Egg on Rye",350,20,38,12],["L","Pea & Ham Hock Soup",400,32,44,8],["D","Spring Chicken Stew with New Potatoes",500,44,46,12]],
    SP4: [["B","Radish & Cucumber Tzatziki Flatbread",360,16,48,9],["L","Griddled Chicken & Asparagus Salad",420,36,28,14],["D","Lamb Cutlets with Broad Beans & Feta",510,42,30,22]],
    SP5: [["B","Spinach & Ricotta Frittata",380,24,22,18],["L","Bulgur Wheat, Radish & Herb Salad",380,14,56,9],["D","Grilled Mackerel with Rhubarb Chutney",490,38,32,22]],
    SU1: [["B","Greek Yoghurt with Peaches & Honey",340,18,50,6],["L","Courgette & Herb Frittata",390,24,22,20],["D","Prawn & Mango Lettuce Wraps",460,34,42,13]],
    SU2: [["B","Smashed Avocado & Cherry Tomato Rye",390,12,44,16],["L","Grilled Corn & Black Bean Salad",400,18,58,9],["D","Stuffed Peppers with Farro & Feta",480,22,64,12],["S","Skyr (350 g) with Raspberries (100 g)",273,40,26,1]],
    SU3: [["B","Berry & Flaxseed Overnight Oats",360,14,54,8],["L","Cold Soba Noodles with Cucumber & Edamame",410,20,58,10],["D","Barbecue Chicken Thighs with Corn Slaw",490,42,38,16]],
    SU4: [["B","Tomato & Basil Bruschetta with Ricotta",360,14,46,11],["L","Fattoush Salad with Grilled Chicken",420,36,34,13],["D","Grilled Swordfish with Ratatouille",500,42,34,18]],
    SU5: [["B","Courgette & Feta Fritters",370,18,36,14],["L","Gazpacho with Wholegrain Bread",350,10,52,9],["D","Chicken Souvlaki with Tzatziki & Salad",510,44,38,16]],
    A1: [["B","Apple & Walnut Overnight Oats",380,14,58,9],["L","Roasted Squash & Sage Soup with Rye",390,14,58,9],["D","Pork Tenderloin with Braised Red Cabbage",490,44,38,16]],
    A2: [["B","Mushroom & Thyme Scrambled Eggs on Rye",370,22,34,14],["L","Wild Mushroom & Chestnut Risotto",440,18,66,10],["D","Slow-Roast Chicken with Root Vegetables",510,46,40,14]],
    A3: [["B","Pumpkin & Cinnamon Porridge",380,14,60,8],["L","Kale, Lentil & Chorizo Stew",430,28,46,12],["D","Butternut Squash & Sage Pasta",470,18,68,12],["S","Cottage Cheese (250 g), 1/2 Apple & Cinnamon",292,32,19,11]],
    A4: [["B","Fig & Ricotta Rye Toast with Honey",360,16,50,10],["L","Roasted Carrot & Chickpea Salad w/ Tahini",410,18,54,12],["D","Baked Sea Bass with Fennel & Olives",490,42,28,18]],
    A5: [["B","Pear & Hazelnut Bircher Muesli",370,14,56,9],["L","Celeriac Remoulade with Smoked Trout",400,30,28,18],["D","Venison Stew with Roasted Parsnips",500,46,42,14]],
  },
  // ISO week 1..53 -> menu
  mealCalendar: [null,
    "W1","W2","W3","W4","W5","W1","W2","W3","W4","W5","W1",
    "SP1","SP2","SP3","SP4","SP5","SP1","SP2","SP3","SP4","SP5","SP1","SP2","SP3",
    "SU1","SU2","SU3","SU4","SU5","SU1","SU2","SU3","SU4","SU5","SU1","SU2","SU3","SU4",
    "A1","A2","A3","A4","A5","A1","A2","A3","A4","A5","A1","A2","A3",
    "W1","W2"],

  /* ---------------------------------------------------------------------------
     SELF-STUDY PROGRAM (British terms, two courses at a time, 14 hrs/week)
     Year 1 dates are worked out from the start date you set on the Study page.
     ------------------------------------------------------------------------ */
  studyYear1: [
    { term: "Autumn", block: 1, weeks: 4, courses: "MATH 103 College Mathematics + LIBS 150 Intro to Research" },
    { term: "Autumn", block: 2, weeks: 3, courses: "MATH 107 College Algebra + WRTG 112" },
    { term: "Autumn", half: true, weeks: 1, courses: "Half-term: flashcards only" },
    { term: "Autumn", block: 3, weeks: 4, courses: "BIOL 101 Concepts of Biology + CHEM 103" },
    { term: "Autumn", block: 4, weeks: 4, courses: "BIOL 105 Principles of Biology + CHEM 113" },
    { term: "Spring", block: 5, weeks: 4, courses: "BIOL 222 Genetics + PHYS 121 Physics I" },
    { term: "Spring", block: 6, weeks: 3, courses: "BIOL 224 Genetics Lab + PHYS 122 Physics II" },
    { term: "Spring", half: true, weeks: 1, courses: "Half-term: flashcards only" },
    { term: "Spring", block: 7, weeks: 4, courses: "BIOL 230 Microbiology + BIOL 325 Inquiries in Biological Sciences" },
    { term: "Summer", block: 8, weeks: 4, courses: "WRTG 391 Advanced Research Writing + NSCI 301 Lab Management & Safety" },
    { term: "Summer", half: true, weeks: 1, courses: "Half-term: flashcards only" },
    { term: "Summer", block: 9, weeks: 7, courses: "Flex: revisit the 2 weakest courses; push DAWIA and German" },
    { term: "Summer", block: 10, weeks: 4, courses: "Flex: rest, or start Year 2 early" },
  ],
  studyYears: [
    { year: 1, name: "Biotech refresher", detail: "16 courses, refreshed (not retaken). Free OpenStax texts." },
    { year: 2, name: "Data literacy, analytics & data science", detail: "DATA 200 + STAT 200 · DATA 230 + DATA 300 · DATA 320 + DATA 330 · DATA 355 + CSIA 300 · DATA 430 + ARIN 450 · ARIN 440 + DATA 445 · ARIN 460 + DATA 490" },
    { year: 3, name: "Systems literacy + ASCM certifications", detail: "GCSS-Army, advanced Excel, Power BI, SAP, DAI/GFEBS; CPIM, CSCP, CLTD" },
    { year: 4, name: "Reporting & communications", detail: "SPCH 100, COMM 201, JOUR 201, COMM 300/302, SPCH 324, JOUR 330, COMM 400, SPCH 470, COMM 390" },
    { year: 5, name: "Programming", detail: "Python -> Biopython -> R -> Java/C++ optional" },
    { year: 6, name: "ESL teaching", detail: "Finish Coursera TESOL, then CELTA (~2033)" },
  ],
  certifications: [
    "Certified Logistics Associate (CLA), MSSC: quick win",
    "Certified Logistics Technician (CLT 4.0), MSSC",
    "CAPM, PMI (step toward PMP)",
    "SCPro Level One, CSCMP",
    "If money remains: SCPro Level Two or CPSM",
  ],
  germanLevels: ["Yr 1: A1", "Yr 2: A2-B1", "Yr 3: B1-B2", "Yr 4: solid B2", "Yrs 5-6: maintain"],

  /* ---------------------------------------------------------------------------
     FINANCES
     Snapshots here are the ones from your plan. New monthly snapshots you add
     on the site are saved to your database and appear after these.
     ------------------------------------------------------------------------ */
  finance: {
    basePay: 5130.30,          // E-6; emergency fund target = 6x base pay
    tspMonthly: 769.55,        // Roth TSP
    retirementTarget: 0.15,
    funds: [
      // order = suggested funding order
      { id: "mini",     name: "Mini savings (envelopes)", goal: 10000,    eta: "Jun 2027" },
      { id: "ef",       name: "Main emergency fund",      goal: 30781.80, eta: "Nov 2027" },
      { id: "stella",   name: "Stella fund",              goal: 20000,    eta: "Sep 2028" },
      { id: "taco",     name: "Taco fund",                goal: 20000,    eta: "Sep 2028" },
      { id: "parental", name: "Parental care fund",       goal: 20000,    eta: "Feb 2029" },
      { id: "trading",  name: "Trading portfolio",        goal: 30000,    eta: "Aug 2029" },
      { id: "down",     name: "House down payment",       goal: 100000,   eta: "Jun 2031" },
    ],
    debtsMeta: {
      car:   { name: "Car loan (2018 Rogue)", rate: "14.89%" },
      les:   { name: "LES debt" },
      apple: { name: "Apple Card" },
      usaa:  { name: "USAA card" },
    },
    snapshots: [
      { date: "2026-10-06", label: "Baseline",
        funds: { ef: 3414.16, trading: 17308.28, stella: 2326.81, taco: 0.43, mini: 0, down: 0, parental: 0 },
        cash: 1560.91,
        debts: { car: 7141.10, les: 1169.10, apple: 457.08, usaa: 244.63 },
        credit: 700 },
      { date: "2026-10-30", label: "After the OHA back pay",
        funds: { ef: 4414.16, trading: 17471.33, stella: 2326.81, taco: 0.43, mini: 0, down: 0, parental: 0 },
        cash: 748.91,
        debts: { car: 314.82, les: 584.10, apple: 481.06, usaa: 14.99 },
        credit: 700 },
    ],
    // Planned payoffs from the 30 Oct snapshot
    payoffPlan: [
      { date: "2026-11-13", debt: "apple", amount: 481.06, note: "Pay in full from the 13 Nov check" },
      { date: "2026-11-13", debt: "car",   amount: 314.82, note: "Payoff quote ~$320; request the title" },
      { date: "2026-11-16", debt: "usaa",  amount: 14.99,  note: "Autopay" },
      { date: "2026-12-01", debt: "les",   amount: 584.10, note: "Final deduction, 1 Dec check" },
    ],
    // A normal month from Dec 2026 (estimates from your LES; OHA amount still to confirm)
    monthly: {
      income: [
        ["Base pay, BAS, COLA (Sep LES)", 6818.80],
        ["OHA (estimate, confirm on Oct LES)", 1900],
      ],
      out: [
        ["Taxes, FICA & SGLI", 1250.00, "fixed"],
        ["Roth TSP (15%)", 769.55, "save"],
        ["Allotment to emergency fund", 1000, "save"],
        ["Rent (my half, from OHA)", 1400, "fixed"],
        ["Car insurance", 149.31, "fixed"],
        ["Phone", 150, "fixed"],
        ["Savings push (funding order)", 1500, "save"],
      ],
    },
    sevenSteps: [
      "Pay off all debts",
      "Save $1,000 starter emergency fund",
      "Save 3-6 months of expenses (fully funded emergency fund)",
      "Invest 15% of household income into retirement",
      "Save for kids' college fund",
      "Pay off home early",
      "Build wealth & give",
    ],
  },

  // Starting values for things you can edit on the site
  defaults: {
    homeSpaces: [
      { name: "Space 1 (pick in Nov)", month: "2027-01", tasks: ["Fully unpacked", "Art and photos up", "Small annoyances fixed"] },
      { name: "Space 2 (pick in Nov)", month: "2027-02", tasks: ["Fully unpacked", "Art and photos up", "Small annoyances fixed"] },
      { name: "Space 3 (pick in Nov)", month: "2027-03", tasks: ["Fully unpacked", "Art and photos up", "Small annoyances fixed"] },
    ],
    rule222Start: "2026-11-07",
    studyStart: "2026-11-02",
    bucket: [],
    countries: [],
  },
};
