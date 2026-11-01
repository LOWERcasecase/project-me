/* =============================================================================
   PROJECT ME: ARTIFACTS
   -----------------------------------------------------------------------------
   The plan documents shown on the Artifacts tab.

   Each artifact:
     id        short name used in the link (#artifacts/<id>)
     domain    which life domain it belongs to
     title     shown on the card and page
     status    "ready" or "todo"
     summary   one line on the card
     source    optional: the original file it came from
     link      optional: the site page where you tick it off
     build     optional: a generated part (tables from data.js): "meals", "pt", "sprint", "study"
     buildFirst optional: true to show the generated part above the text
     md        the document text. Simple formatting works:
                 ## Heading   ### Smaller heading
                 - bullet     1. numbered
                 **bold**     > a highlighted note
                 | a | b |    tables (first row = header)

   To add a new plan: copy one of the "todo" entries, set status to "ready",
   and paste your plan into md.
   ========================================================================== */

window.ARTIFACTS = [
  /* ------------------------------------------------------------------ HEALTH */
  {
    id: "meal-plan", domain: "health", status: "ready",
    title: "52-Week Seasonal Meal Plan",
    summary: "1,670 kcal deficit · 20 seasonal menus · week-by-week calendar · recipe index",
    link: "#meals", build: "meals", buildFirst: true,
    md: `
## Snack room (on purpose)
The three meals on each menu add up to 1,190-1,320 kcal, leaving ~350-480 kcal a day under the 1,670 target for snacks. The four lower-protein menus (W3, SP1, SU2, A3) have a set protein snack that brings them to 89-92 g; the other menus already land at 72-96 g, so any snack works there.

## Seasons (almanac dates)
| Season | Weeks | Starts |
| Spring | 12-24 | Spring equinox (20 Mar) |
| Summer | 25-38 | Summer solstice (21 Jun) |
| Autumn | 39-51 | Fall equinox (22 Sep) |
| Winter | 52-53, 1-11 | Winter solstice (21 Dec) |

## Guidelines the plan follows (European nutritional guidelines)
- At least 25 g fibre a day: wholegrains, legumes, vegetables, fruit
- Lean protein: poultry, fish (2+ portions a week, incl. oily fish), legumes
- At least 5 portions of fruit and vegetables a day, mostly seasonal
- Wholegrain carbs: rye bread, oats, brown rice, bulgur, pearl barley, farro
- Unsaturated fats: olive oil, rapeseed oil, nuts, oily fish
- Red meat occasional; processed meat minimised
- Salt limited; herbs, spices and acids for flavour

## Recipe index
### Winter
| Meal | Dish | Source |
| B | Skyr with Stewed Rhubarb & Oats | Jamie Oliver, 5 Ingredients (Rhubarb Yoghurt variant) |
| B | Wholegrain Porridge with Poached Pear | BBC Good Food, basic porridge with fruit topping |
| B | Rye Bread with Cottage Cheese & Beetroot | Ottolenghi, Plenty (Beetroot toast) |
| B | Overnight Oats with Mandarin & Chia | BBC Good Food, overnight oats base recipe |
| B | Buckwheat Pancakes with Apple Compote | Nigella Lawson, How to Be a Domestic Goddess |
| L | Ribollita (Tuscan Bean & Kale Soup) | Marcella Hazan, Essentials of Classic Italian Cooking |
| L | Roasted Celeriac & Lentil Salad | Ottolenghi, Plenty More |
| L | Borscht with Rye Bread | Olia Hercules, Mamushka (Classic Borscht) |
| L | Scotch Broth with Pearl Barley | Delia Smith, Complete Cookery Course |
| L | Puy Lentil & Roasted Squash Tray Bake | Nigel Slater, Tender Vol. I |
| D | Baked Cod with Butter Bean & Leek Stew | Rick Stein, Fish & Shellfish |
| D | Chicken Cacciatore with Polenta | Marcella Hazan, Essentials of Classic Italian Cooking |
| D | Roasted Root Vegetable & Chickpea Tagine | Yotam Ottolenghi, Jerusalem |
| D | Slow-Cooker Turkey Ragu with Wholegrain Pasta | Jamie Oliver, 5 Ingredients |
| D | Lemon Herb Baked Salmon with Braised Cabbage | Nigel Slater, Real Cooking |
### Spring
| Meal | Dish | Source |
| B | Green Shakshuka with Spinach & Peas | Ottolenghi, Jerusalem (Shakshuka variant) |
| B | Asparagus & Soft-Boiled Egg on Rye | Nigel Slater, Tender Vol. II |
| B | Radish & Cucumber Tzatziki Flatbread | BBC Good Food, Greek flatbread base |
| B | Spinach & Ricotta Frittata | Nigella Lawson, How to Eat |
| B | Bircher Muesli with Spring Berries | Delia Smith, Summer Collection |
| L | Broad Bean & Mint Bruschetta | Ottolenghi, Plenty |
| L | Pea & Ham Hock Soup | Fergus Henderson, The Whole Beast |
| L | Griddled Chicken & Asparagus Salad | Jamie Oliver, 15-Minute Meals |
| L | Bulgur Wheat, Radish & Herb Salad | Ottolenghi, Plenty More |
| L | Spring Minestrone with Pesto | River Cafe Cook Book |
| D | Pan-Fried Trout with Pea Purée & Mint | Rick Stein, Seafood Odyssey |
| D | Spring Chicken Stew with New Potatoes | Nigel Slater, Real Food |
| D | Lamb Cutlets with Broad Beans & Feta | Ottolenghi, Jerusalem |
| D | Grilled Mackerel with Rhubarb Chutney | Nigel Slater, Tender Vol. I |
| D | Spinach & Lentil Dahl with Chapati | Meera Sodha, East |
### Summer
| Meal | Dish | Source |
| B | Tomato & Basil Bruschetta with Ricotta | Antonio Carluccio, Pasta |
| B | Courgette & Feta Fritters | Ottolenghi, Plenty |
| B | Greek Yoghurt with Peaches & Honey | BBC Good Food, summer yoghurt bowl |
| B | Smashed Avocado & Cherry Tomato Rye | Nigella Lawson, Simply Nigella |
| B | Berry & Flaxseed Overnight Oats | BBC Good Food, overnight oats with berries |
| L | Fattoush Salad with Grilled Chicken | Ottolenghi, Jerusalem |
| L | Gazpacho with Wholegrain Bread | Sam & Sam Clark, Moro |
| L | Courgette & Herb Frittata | Jamie Oliver, The Return of the Naked Chef |
| L | Grilled Corn & Black Bean Salad | Ottolenghi, Plenty More |
| L | Cold Soba Noodles with Cucumber & Edamame | Meera Sodha, Fresh India |
| D | Grilled Swordfish with Ratatouille | Rick Stein, Mediterranean Escapes |
| D | Chicken Souvlaki with Tzatziki & Salad | Ottolenghi, Jerusalem |
| D | Prawn & Mango Lettuce Wraps | Meera Sodha, Fresh India |
| D | Stuffed Peppers with Farro & Feta | Ottolenghi, Plenty More |
| D | Barbecue Chicken Thighs with Corn Slaw | Jamie Oliver, Jamie's America |
### Autumn
| Meal | Dish | Source |
| B | Apple & Walnut Overnight Oats | BBC Good Food, overnight oats (autumn) |
| B | Mushroom & Thyme Scrambled Eggs on Rye | Nigel Slater, Appetite |
| B | Pumpkin & Cinnamon Porridge | Delicious Magazine |
| B | Fig & Ricotta Rye Toast with Honey | Ottolenghi, Sweet (variant) |
| B | Pear & Hazelnut Bircher Muesli | BBC Good Food, autumn bircher |
| L | Roasted Squash & Sage Soup with Rye | Delia Smith, Winter Collection |
| L | Wild Mushroom & Chestnut Risotto | River Cafe Cook Book |
| L | Kale, Lentil & Chorizo Stew | José Pizarro, Seasonal Spanish Food |
| L | Roasted Carrot & Chickpea Salad w/ Tahini | Ottolenghi, Plenty More |
| L | Celeriac Remoulade with Smoked Trout | Nigel Slater, Tender Vol. I |
| D | Pork Tenderloin with Braised Red Cabbage | Delia Smith, Complete Cookery Course |
| D | Slow-Roast Chicken with Root Vegetables | Simon Hopkinson, Roast Chicken & Other Stories |
| D | Butternut Squash & Sage Pasta | Jamie Oliver, The Naked Chef |
| D | Baked Sea Bass with Fennel & Olives | Rick Stein, Rick Stein's Seafood |
| D | Venison Stew with Roasted Parsnips | Tom Kitchin, From Nature to Plate |
`,
  },
  {
    id: "pt-plan", domain: "health", status: "ready",
    title: "PT Test Conditioning Plan",
    summary: "17 weeks from 2 Nov 2026 · run / push-up / sit-up focus · test week 22-28 Feb 2027",
    source: "pt_test_plan_oct12_start.xlsx", link: "#training", build: "pt",
    md: `
| | |
| Start | Mon 2 Nov 2026 |
| Main plan | 16 weeks, ends Sun 21 Feb 2027 |
| Test week | Week 17, 22-28 Feb 2027 (the test is due by 28 Feb). The sprint tri plan starts the Monday after |
| Baseline | PFRA 13 Aug 2026: HRPU 36, Sit-up 37, HAMR 30, Total 83 |
| Goal | 80-85+ on every test until retirement (75 to pass) |
| Tri prep | Paused; bike/swim resume after the test, building to the Berlin Sprint, Jun 5-6 2027 |

> Testing is now twice a year for everyone (new AF PFRA; tests for the record since 1 Jul 2026). A 90+ no longer earns a year between tests.
`,
  },
  {
    id: "sprint-plan", domain: "health", status: "ready",
    title: "Sprint Triathlon Plan (Berlin)",
    summary: "14 weeks from 1 Mar 2027 · 750m swim / 20K bike / 5K run · race Jun 5-6 2027",
    source: "sprint_tri_plan_feb15_start.xlsx", link: "#training", build: "sprint",
    md: `
| | |
| Start | Mon 1 Mar 2027 (the Monday after the PT test week) |
| Race | Berlin Triathlon, Jun 5-6 2027 · Sprint: 750m swim / 20K bike / 5K run |
| Length | 14 weeks: 13 training weeks + race week. Shortened from 16 by dropping the first base week and the first recovery week, since 17 weeks of PT conditioning gives you the run base |
| Before it starts | Do the easy 750m test swim in December and line up swim lessons, so the water isn't new in March |

## Notes
- **Breathing:** runs use a 3:3 nasal rhythm; swims build from exhaling underwater to breathing every 3 strokes. Easy runs = can talk.
- **Open water:** 2-3 open-water swims in May with a buddy (never alone), ideally in a wetsuit.
- Check race rules for wetsuits; bike fitted and serviced by early May.
- Go by effort and time, not exact numbers.
- **PT upkeep:** push-ups/sit-ups stay at maintenance until the race. Next PT test ~Aug 2027.

## Wetsuit
Full-sleeve triathlon wetsuit (not a surf wetsuit), buoyancy panels at the 5mm max race rules allow, thinner (~2-3mm) at the shoulders and arms. Add a neoprene or thermal swim cap for cold water.

German lakes run roughly 6-10 C in March-April and 12-17 C in May, so keep swims in the pool until the water is ~14 C+ (usually May), as the plan does. Early-June races in Germany are usually wetsuit-legal; confirm with the race rules.

## Bike
Current bike is very similar to a Btwin hybrid, which works for a sprint. Race-prep it: rack, panniers and kickstand off; tires pumped to the top of their range; saddle height set (leg almost straight at the bottom of the pedal stroke). Optional upgrade: narrower, slicker tires if the current ones are knobbly or wide.
`,
  },
  { id: "half-marathon-plan", domain: "health", status: "todo", title: "Half-Marathon Plan", summary: "12-16 weeks before a fall 2027 race. Upload by Jun 2027.", link: "#training" },
  { id: "olympic-plan", domain: "health", status: "todo", title: "Olympic Triathlon Plan", summary: "1.5 km swim / 40 km bike / 10 km run. Write in Jan 2028 for a summer 2028 race.", link: "#training" },
  { id: "marathon-plan", domain: "health", status: "todo", title: "Marathon Plan", summary: "16-20 weeks, starting after the Olympic triathlon (fall 2028).", link: "#training" },
  { id: "half-ironman-plan", domain: "health", status: "todo", title: "Half-Ironman Plan", summary: "1.9 km / 90 km / 21.1 km. Write in Q4 2029 at the new base.", link: "#training" },
  { id: "ironman-plan", domain: "health", status: "todo", title: "Ironman Plan", summary: "3.8 km / 180 km / 42.2 km. 9-12 months; write in Q4 2030.", link: "#training" },

  /* ---------------------------------------------------------------- FINANCES */
  {
    id: "inheritance-plan", domain: "finances", status: "ready",
    title: "Estate Planning: Inheritance Plan",
    summary: "Worksheet to take to base legal: who inherits, who acts for me, military forms, TOD accounts",
    link: "#finances",
    md: `
> Fill in the blanks, then take this to base legal (free wills, POAs, DD 93 and SGLI updates in one visit). Revisit after any move, marriage, death or big purchase (house).

## 1. Who inherits
**Primary:** my wife (everything).

**If we both die:** split into shares (not a strict order, so nobody gets cut out). Percentages: still deciding.

| Share | Who | How it's held |
| ___% | The kids, split equally: Lucian and Sebastian (godsons, ~7 & 10); Jessie's kids as a group (currently Maddy, Emma, Evan, Kaylee, plus any future children) | In trust until 18; for education, health, a start in life |
| ___% | Ashley and Chris (Lucian and Sebastian's parents) | Outright |
| ___% | Allie; if she dies first, her children ("per stirpes") | Outright; trust for any minor kids |
| ___% | Dan; if he dies first, his children ("per stirpes") | Outright; trust for any minor kids |
| ___% | Donna and Larry (to the survivor if one dies first) | Outright |

### Rules to spell out
- If someone dies before me with no children, their share is split among the others.
- Jessie's kids are named as a group ("Jessie's children"), so any future children are included.
- Trustee for the kids' trust: Amanda (my wife); backups Allie, then Dan. The trust only starts if we BOTH die, so in practice Allie serves, then Dan. Consider a 3rd backup: ________
- Age each child gets their share: 18
- Survivorship rule (e.g. 30 days): ________
- Not inheriting: my parents. Jessie herself isn't a beneficiary (only her children). State both in the will.
- Ask my wife to make her will match this plan.

> Why a trust matters: most of these beneficiaries are minors, and minors can't receive money directly. Without a trust, a court appoints someone to manage it and it's handed over at 18 or 21. Ask base legal whether a will with a "testamentary trust" for the kids works now; the Pride Plans trust later.

## 2. Who acts for me
| Role | Person (+ backup) |
| Executor | Amanda / Allie |
| Financial power of attorney | ________ / ________ |
| Healthcare power of attorney | ________ / ________ |
| Dog caretaker for Stella & Taco | ________ / ________ |
| Person to handle my remains (PADD) | ________ |

## 3. Military forms (these override the will)
- [ ] **SGLI ($500,000)** in SOES: primary my wife. Contingent: ask base legal whether to name the kids' trust or my estate, so the money follows the split above instead of going straight to minors (largest single asset; get this one right)
- [ ] **TSP** (form TSP-3): same approach as SGLI
- [ ] **DD Form 93:** notification, death gratuity ($100,000), unpaid pay, PADD
- [ ] **Survivor Benefit Plan** decision at retirement (2031)

## 4. Accounts with transfer/payable-on-death beneficiaries
| Account | Primary / contingent |
| Fidelity emergency fund | wife / (trust or estate) |
| Fidelity trading | wife / (trust or estate) |
| Fidelity Stella | dog caretaker |
| Fidelity Taco | dog caretaker |
| USAA, Navy Federal, RBFCU | wife / (trust or estate) |
| Car title (after Texas registration) | wife / ________ |
| Future: down payment, parental care | |

## 5. Specific gifts and instructions
- Sentimental items (who gets what): ________
- Heirlooms & tangible assets inventory (coins, jewelry, keepsakes): item, where kept, value/appraisal, goes to. Keep photos + appraisal papers with the inventory; list these in the will's personal property list.
- Parental care fund if I die: goes to ________
- Charities (if any): ________

## 6. Healthcare and end of life
- Life support wishes (living will): ________
- Organ donation: ________
- Burial or cremation; where; military honors: ________

## 7. "Where everything is" letter
- [ ] List of every account (bank, Fidelity, TSP, SGLI, cards, car)
- [ ] Where the will and documents are kept
- [ ] Contacts: DFAS, VA, base legal, casualty assistance office
- [ ] Digital access: password manager, phone passcode, email, photos
- [ ] Where the safe / safe-deposit box is, and how to get into it
- [ ] Heirlooms inventory (section 5)
- [ ] Legacy Statement
`,
  },
  {
    id: "christmas-2026", domain: "finances", status: "ready",
    title: "Christmas 2026 Plan",
    summary: "Gift budget, hosting 7 people 17-30 Dec, menu, outings, shopping and Christmas dinner",
    md: `
> Rule: pay cash, no carried card balances (Credit Cards guardrail), and don't touch the emergency fund. Estimated total ~$2,500-3,000.

## Gifts
| Who | Budget | Plan | Ship/order by |
| Amanda | $____ | Mostly bought; maybe add Lego | |
| Allie (visiting) | $200 | Star map of her birth sky (unframed print); mushroom mug; the book she's reading (ask) | Star map by 24 Nov |
| Lucian Dake (US) | $100 | Order online, ship direct | ~1 Dec |
| Sebastian Dake (US) | $100 | Order online, ship direct | ~1 Dec |
| Maddy (US) | $100 | Order online, ship direct | ~1 Dec |
| Emma (US) | $100 | Order online, ship direct | ~1 Dec |
| Evan (US) | $100 | Order online, ship direct | ~1 Dec |
| Kaylee (US) | $100 | Order online, ship direct | ~1 Dec |
| Dan (visiting) | $200 | Coffee flight from 3 local roasters (buy 12 Dec); a tasting card I write; a Christmas market mug (keep the Wiesbaden mug, 4 Dec) | |
| Donna (visiting) | $200 | German gnome (bought 30 Oct, $14.53); tea-bag bookmark + "this is my tea" shirt (Etsy); maybe a book | Etsy by 18 Nov |
| Larry (visiting) | $200 | German mustard in tubes (Löwensenf); German spice-blend set; German cookbook in English | Cookbook by 24 Nov |
| Auntie Sue (visiting) | $200 | Nuremberg Lebkuchen in a tin; Christmas tea (Teekanne); a Käthe Wohlfahrt or market ornament | |
| Ashley & Chris | $____ | | |

**Gifts so far (excl. Amanda): $1,600.**

Packing rules for the flights home: no meat products (US customs); liquids over 100 ml in checked bags; tea, coffee, chocolate and packaged sweets are fine; keep each set under ~1 kg.

## Hosting
Allie 17-30 Dec (13 nights); Dan, Donna, Larry and Auntie Sue 22-29 Dec (7 nights). = 3 people 17-22 Dec, 7 people 22-29 Dec, 3 people 29-30 Dec (~67 person-days).

| Item | Estimate |
| Groceries | $450-600 |
| Christmas dinner for 7 | $170-280 |
| Lunches out (only if I'm paying; decide with guests) | $____ |
| Outings (markets, day trips) | $200-400 |
| Extra bedding / airbeds | $50-150 |
| Decorations / tree | $____ |
| Shipping (kids' gifts, if not ordering direct) | $____ |

## Menu, 17-30 Dec
Breakfast options, two at a time: **S** = German spread (Brötchen, butter, jam/honey, cheese, cold cuts, eggs, cucumber, tomato) · **Y** = skyr/quark bar · **P** = Rewe quick porridge. Rotation S+P → Y+P → S+Y. For Allie all week: lean options, lighter soups, rich extras on the side.

| Date | People | Breakfast | Dinner |
| Thu 17 Dec | 3 | - | Abendbrot (Allie arrives) |
| Fri 18 Dec | 3 | S + P | Christmas market dinner |
| Sat 19 Dec | 3 | Y + P | Baked potatoes + salad |
| Sun 20 Dec | 3 | S + Y | Leftovers / market |
| Mon 21 Dec | 3 | S + P | PREP DAY: leek & potato soup (for 22nd) + Ribollita to freeze (for 27th) |
| Tue 22 Dec | 7 | Y + P | Leek & potato soup + fresh bread (everyone arrives) |
| Wed 23 Dec | 7 | S + Y | Baked potato bar + big salad |
| Thu 24 Dec | 7 | S + P | Kartoffelsalat mit Würstchen (Allie: vinegar-and-broth salad + poultry Würstchen) |
| Fri 25 Dec | 7 | Brunch: S + Stollen | CHRISTMAS DINNER |
| Sat 26 Dec | 7 | Y + P | Christmas leftovers |
| Sun 27 Dec | 7 | S + Y | Ribollita (from freezer) + bread + salad |
| Mon 28 Dec | 7 | S + P | Abendbrot (bread board) |
| Tue 29 Dec | 3 | Y + P | Leftovers (group leaves) |
| Wed 30 Dec | 3 | S + P | - (Allie leaves) |

## Outings (local Christmas markets close 23 Dec)
- **Sat 19 or Sun 20 Dec:** Rüdesheim Christmas Market of Nations with Allie
- **Tue 22 Dec evening:** Wiesbaden Sternschnuppenmarkt, everyone
- **Wed 23 Dec evening:** Mainz Christmas Market at the Cathedral (after the big shop)
- **Sat 26 Dec:** German holiday: rest, leftovers, a walk
- **Sun 27 or Mon 28 Dec:** Rhine Valley (Bacharach, Loreley) or Heidelberg; Frankfurt as a shorter option

## Shops (closed Sundays 20 & 27 Dec and 25-26 Dec; 24 & 31 Dec close ~midday)
- **Sat 19 Dec:** small shop (3 people through the 21st)
- **Mon 21 Dec:** soup ingredients
- **Wed 23 Dec:** BIG SHOP through Mon 28 Dec, incl. Christmas dinner and bake-at-home rolls
- **Mon 28 Dec:** top-up

## Christmas dinner, Fri 25 Dec
Adjusted for Allie (no gallbladder; very fatty/rich food is the usual problem; ask her what bothers her).
- Bakery rolls + rosemary sea-salt butter (butter on the side)
- Mixed greens, candied pecans, dried cranberries, shaved Parmesan; warm apple cider-Dijon vinaigrette on the side
- Herb and garlic roast turkey breast (~2.5-3 kg) with port wine and cherry reduction
- Truffle mashed potatoes, made lighter
- Roasted Brussels sprouts, balsamic glaze, toasted hazelnuts; lardons on the side
- Bûche de Noël + Chantilly cream, plus port-poached pears or berries

### Make-ahead timeline
| When | What |
| By early Dec | ORDER THE TURKEY BREAST from a butcher or Rewe; pick up by 23 Dec |
| Wed 23 Dec | Shop; candy the pecans; make the vinaigrette, rosemary butter and port-cherry reduction |
| Thu 24 Dec | Bûche de Noël (or pick one up); trim the sprouts |
| Fri 25 Dec | Turkey in ~1.5-2 hrs before dinner; mash and sprouts while it rests; toss the salad; reheat the sauce; whip the cream |

## Leave
Request leave for the workdays Allie's here (17-18, 21-23, 28-30 Dec; 25 Dec is a federal holiday; check whether 24 and 31 Dec are down days). Leave balance: 42 days.

> Next year: divide the total by 12 and put that in a "family gifts & travel" mini savings envelope each month.
`,
  },
  { id: "investment-plan", domain: "finances", status: "todo", title: "Investment Plan", summary: "Strategy, risk limits, rules for buying and selling. Due Mar 2027.", link: "#finances" },

  /* ------------------------------------------------------------------ CAREER */
  { id: "resume", domain: "career", status: "todo", title: "Resume (post-AF)", summary: "Start in 2031, ahead of retirement.", link: "#career" },

  /* ------------------------------------------------------------------ DEGREE */
  {
    id: "study-plan", domain: "degree", status: "ready",
    title: "Full Study Plan (6 years)",
    summary: "Biotech & Data Science → GS Logistics Analyst, with German and ESL/CELTA as hedges",
    source: "full_study_plan.html", link: "#education", build: "study",
    md: `
## Format
- British-style terms (Autumn, Spring, Summer); two courses at a time.
- Weekly tempo: 2 hrs each weekday (1 hr per course) + 4 hrs Sunday (2 hrs per course) = 14 hrs/week.
- Half-term weeks: rest, light review, flashcards only.
- Each pair: 2 days quick review → targeted study → cumulative review and self-test.

## Running in parallel (all six years)
- German 30-60 min/day: A1 (Yr 1), A2-B1 (Yr 2), B1-B2 (Yr 3), solid B2 (Yr 4), maintenance (Yrs 5-6)
- DAWIA Life Cycle Logistics (free via DAU), start Year 1
- Light notebook: daily/weekly logs, half-term notes, end-of-year reflection, German log, certification tracker, "parking lot" page

## Year 1 notes
Free texts (OpenStax): Biology 2e, Chemistry 2e, Physics, Algebra 1, Pre-Algebra, Algebra 2e, Statistics 2e, Contemporary Math.

**Block 1 focus:** Contemporary Math ch. 1 Sets, 2 Logic, 7 Probability, 8 Statistics, 9 Measurement (most important for lab work), 10 Geometry; skip ch. 6. LIBS 150: writing process, thesis, structure, tone, critical reading, sources (CRAAP), summarize/paraphrase/quote, APA, grammar, revision (Purdue OWL, Scribbr, OpenStax Writing Guide).

**Block 2 must-haves:** functions, exponents/logs, quadratics.

## Year 2: Data literacy, analytics & data science
Lines up with going back to real classes: when classes restart, I should be in Year 2.
| Term | Pair |
| Autumn | DATA 200 + STAT 200 |
| Autumn | DATA 230 Math for Data Sciences + DATA 300 |
| Spring | DATA 320 + DATA 330 Business Intelligence & Data Mgmt |
| Spring | DATA 355 Data Visualization + CSIA 300 Cyber Security for Leaders & Managers |
| Summer | DATA 430 Foundations of Machine Learning + ARIN 450 Data Ethics |
| Summer | ARIN 440 Advanced ML + DATA 445 Advanced Data Science |
| Summer | ARIN 460 AI Solutions + DATA 490 Data Science Capstone |
Supplements: Tableau Data Literacy for All; OpenStax Data Science; a data project on a real (logistics) dataset in Spring. Stretch: DATA 610, ARIN 615, DATA 635, DATA 645.

## Year 3: Systems literacy core
GCSS-Army; advanced Excel (pivot tables, XLOOKUP, macros/VBA); Power BI; SAP (LMP is SAP-based); DAI or GFEBS; OpenStax Workplace Software and Skills + Information Systems. Biotech tools: Colab, R, GraphPad Prism, basic LIMS. Certifications in parallel: ASCM CPIM, CSCP, CLTD.

## Year 4: Reporting & communications
Core: SPCH 100, COMM 201, JOUR 201, COMM 300, COMM 302, SPCH 324, JOUR 330, COMM 400, SPCH 470, COMM 390. Stretch: Master's in Strategic Communications (MSCP 600-690). Extra: Udemy Storytelling for Science Communications; Science Communication Boot Camp. Practice reporting informally from Year 1.

## Year 5: Programming
Python (Python for Everybody and/or CS50P) → Biopython → R ("R for Data Science") → Java/C++ optional (freeCodeCamp, CS50x).

## Year 6: ESL teaching
Finish Coursera TESOL (~80% done); How to Teach ESL; Educational Psychology (OpenStax); practicum/observation hours; CELTA (online format, ~3-6 months, ~$1,400-2,500). DELTA is the advanced follow-on. Plan: CELTA after retirement (~2033) with the GI Bill, or out of pocket. CELTA runs at centers worldwide, including the US, and fully online; check for a center near JBLM/JBSA. A US-based TESOL certificate is the fallback.

## Certifications (through AF COOL where possible)
> ASCM (CPIM/CSCP/CLTD), PMP and Lean Six Sigma Green Belt are NOT on the 2S0x1 AF COOL list. The list has close substitutes.

**Free / outside AF COOL**
| Credential | When |
| DAWIA Life Cycle Logistics | Start Yr 1 (free via DAU; most tied to GS logistics analyst hiring) |
| Coursera TESOL | Any time (~80% done; out of pocket) |
| CELTA (online) | ~2033 (GI Bill or out of pocket) |

**AF COOL, Primary AFSC (2S0x1), one at a time, in order**
1. Certified Logistics Associate 4.0 (CLA), MSSC: quick win
2. Certified Logistics Technician 4.0 (CLT 4.0), MSSC
3. Certified Associate in Project Management (CAPM), PMI: no experience required; the step toward PMP
4. SCPro Level One, CSCMP: closest to ASCM; supply chain
5. If money remains: SCPro Level Two, or CPSM (ISM)

**AF COOL, other categories (each one at a time, same $4,500 cap)**
- Non-AFSC (one total): an ASCM credential (CSCP or CLTD) if the Education Office allows it
- Degree-associated (one): only after the bachelor's is finished; a data credential (e.g. Power BI or Tableau) if one qualifies
- Leadership (E-7+): check whether PMP is on the SNCO list

> Budget: $4,500 total across every category. Get a price quote for each before choosing; use the cap on the expensive ones and pay for cheap ones myself. A failed exam has to be repaid, so only sit when ready.

## Checks against the rest of the plan
- Workload: not taking classes right now, so Year 1 runs now. When classes restart, I should be in Year 2.
- Overlap fixed: DATA 200, STAT 200, DATA 300 and DATA 320 are only in Year 2.
- Course names checked against the transcript: LIBS 150 is "Introduction to Research"; STAT 200; NSCI 301; CSIA 300.
- Year 6 (~2031-32) lands on TAP and retirement; plan CELTA at a US center or online.
`,
  },

  /* ------------------------------------------------------------------ TRAVEL */
  { id: "bucket-list", domain: "travel", status: "todo", title: "Europe Bucket List", summary: "Top 10 with my wife. The live list is on the Travel page; write the full version here by Nov 2026.", link: "#travel" },

  /* ------------------------------------------------------------------ FAMILY */
  { id: "reflection-relationships", domain: "family", status: "todo", title: "Reflection on Relationships", summary: "Incl. what I'm willing to offer my parents within the Parents guardrail. Due Jun 2027.", link: "#family" },
];
