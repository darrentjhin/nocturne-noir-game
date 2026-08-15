// NOCTURNE — Case #1: "The Last Reel"
// An original noir mystery. Two roles investigate the same disappearance
// from different angles and must share what they find to solve it.
//
// Structure: each location/person is a "scene" with several hotspots to
// examine — some are flavor (atmosphere, no clue), some hand over a real
// clue, and one is locked behind a code the OTHER detective has to find
// and relay. A second act of leads unlocks mid-case once enough has been
// found, so the map/desk grows instead of being fully visible up front.

const ACT1_CLUE_TOTAL = 12; // A1-A6 + B1-B6
const ACT_UNLOCK_THRESHOLD = 8; // combined finds needed to open Act 2
const ACCUSATION_UNLOCK_THRESHOLD = 14; // requires at least one Act 2 discovery
const REQUIRED_DEDUCTIONS = 2;
const REQUIRED_THREADS = 3;
const REQUIRED_CONFRONTATIONS = 2;

module.exports = {
  id: "the-last-reel",
  title: "The Last Reel",
  city: "Veldrose",
  year: "1987",
  actUnlockThreshold: ACT_UNLOCK_THRESHOLD,
  act1ClueTotal: ACT1_CLUE_TOTAL,
  accusationUnlockThreshold: ACCUSATION_UNLOCK_THRESHOLD,
  requiredDeductions: REQUIRED_DEDUCTIONS,
  requiredThreads: REQUIRED_THREADS,
  requiredConfrontations: REQUIRED_CONFRONTATIONS,

  briefing: {
    headline: "A filmmaker vanishes the night before her premiere.",
    body: [
      "Renata Kessler spent three years and every dollar she had on one film — a documentary cut she called \"the only honest thing this city's seen in a decade.\" It was set to premiere tomorrow night at the Ambassador Theatre.",
      "Last night, Renata Kessler didn't come home. Neither did the last reel of her film.",
      "Two detectives. One case. You'll each pull a different thread — the street and the desk. Whatever you find, you'll need each other to make sense of it. Talk. Compare notes. Somewhere in what one of you finds is the key — literally — to something the other can't get open alone."
    ]
  },

  roles: {
    A: {
      name: "The Street",
      tagline: "You knock on doors. You walk the scene. You read a room by its dust.",
      leadType: "location"
    },
    B: {
      name: "The Desk",
      tagline: "You read files. You run down paper trails. You listen for the lie under the alibi.",
      leadType: "person"
    }
  },

  // A hidden puzzle: the Studio's supply closet is locked. The code is
  // buried in a document only Detective B can find (Sal's receipt book).
  puzzles: {
    supplyCloset: {
      code: "817",
      hint: "A three-digit combination, if anyone's written it down anywhere."
    }
  },

  // ---------------- Detective A ("The Street") ----------------
  locations: [
    {
      id: "theatre",
      act: 1,
      name: "Ambassador Theatre",
      blurb: "Where the film was supposed to premiere tomorrow night. Empty seats, one working light over the stage door.",
      scenePosition: "0% 0%",
      fieldMethod: "Preserve the scene · establish access before mechanism",
      fieldOpening: "The theatre is undisturbed enough to talk. Start with what does not belong, then reconstruct who could reach the machine.",
      fieldModes: [
        { id: "access", label: "Access", prompt: "Who could reach the reel and booth?" },
        { id: "mechanism", label: "Mechanism", prompt: "How was the premiere disabled?" }
      ],
      hotspots: [
        {
          id: "theatre-boxoffice",
          label: "Box Office",
          tag: "SURVEY",
          actionLabel: "Check what opening night was supposed to look like",
          type: "flavor",
          text: "A hand-lettered sign taped to the glass: \"SOLD OUT — OPENING NIGHT.\" Nobody's told the box office the opening might not happen."
        },
        {
          id: "theatre-booth",
          label: "Projection Booth",
          tag: "RECONSTRUCT",
          actionLabel: "Reconstruct the projector failure",
          result: "The failure is too selective for wear. Once you know who had access, the loosened motor becomes deliberate sabotage.",
          type: "clue",
          clueId: "A2",
          mode: "mechanism",
          requiresClues: ["A1"],
          unlockHint: "The booth is clean at first glance. Find something that tells you whose access matters."
        },
        {
          id: "theatre-backstage",
          label: "Backstage Rack",
          tag: "SEARCH",
          actionLabel: "Inventory the empty reel canisters",
          result: "One supposedly empty canister carries a small personal marker hidden in its lining.",
          type: "clue",
          clueId: "A1",
          mode: "access"
        },
        {
          id: "theatre-seats",
          label: "House Seats",
          tag: "WITNESS",
          actionLabel: "Ask the usher who came through alone",
          type: "flavor",
          text: "An usher sweeping the aisles mentions Ivy Chen came by twice this week to check the print — once with Renata, once alone, late, after everyone else had gone home."
        }
      ]
    },
    {
      id: "studio",
      act: 1,
      name: "Kessler Film & Editing Studio",
      blurb: "A cramped two-room cutting room above a laundromat. Smells like coffee and hot celluloid.",
      scenePosition: "100% 0%",
      fieldMethod: "Compare tool marks · search with a named financial target",
      fieldOpening: "This room contains too much to search blindly. Let the theatre damage tell you which tools matter, and let the Desk give you the name worth finding.",
      fieldModes: [
        { id: "mechanism", label: "Mechanism", prompt: "Which tools match the staged damage?" },
        { id: "motive", label: "Motive", prompt: "What was someone trying to suppress?" },
        { id: "timeline", label: "Timeline", prompt: "When did the reel leave this room?" }
      ],
      hotspots: [
        {
          id: "studio-editbay",
          label: "Edit Bay",
          tag: "COMPARE",
          actionLabel: "Compare the edit tools with the theatre damage",
          result: "The staged break-in uses the narrow geometry of a film editor's own tool.",
          type: "clue",
          clueId: "A3",
          mode: "mechanism",
          requiresClues: ["A2"],
          unlockHint: "Compare this room with the damage at the theatre before disturbing it."
        },
        {
          id: "studio-coffee",
          label: "Coffee Station",
          tag: "TIMELINE",
          actionLabel: "Read the abandoned coffee service",
          type: "flavor",
          text: "Two mugs, both used, both cold. Whoever was here last wasn't alone — or didn't leave in a hurry."
        },
        {
          id: "studio-cabinet",
          label: "Filing Cabinet & Ashtray",
          tag: "TARGETED SEARCH",
          actionLabel: "Search for the company behind the payments",
          result: "A half-destroyed note connects the money, the leaked footage, and the final reel.",
          type: "clue",
          clueId: "A4",
          mode: "motive",
          requiresClues: ["B2"],
          unlockHint: "You need a financial name or company to know what you are searching for."
        },
        {
          id: "studio-closet",
          label: "Supply Closet",
          tag: "COMBINATION",
          actionLabel: "Open the padlocked supply closet",
          result: "The closet contains a courier record that destroys a precise alibi.",
          type: "locked",
          puzzleId: "supplyCloset",
          lockedHint: "Padlocked. Three-digit combination.",
          clueId: "A9",
          mode: "timeline"
        }
      ]
    },
    {
      id: "apartment",
      act: 1,
      name: "Renata's Apartment",
      blurb: "Fourth floor walkup. Film reels stacked like furniture. The bed hasn't been slept in.",
      scenePosition: "0% 100%",
      fieldMethod: "Establish voluntary entry · reconstruct the final appointment",
      fieldOpening: "No forced entry. No struggle in the main room. Treat the apartment as a timeline, not a burglary scene.",
      fieldModes: [
        { id: "timeline", label: "Timeline", prompt: "What was Renata's final known plan?" },
        { id: "relationship", label: "Relationship", prompt: "Who had personal leverage over her?" }
      ],
      hotspots: [
        {
          id: "apartment-desk",
          label: "Writing Desk",
          tag: "TIMELINE",
          actionLabel: "Reconstruct Renata's final appointment",
          result: "Her last written obligation names a lender and says the debt ended that night.",
          type: "clue",
          clueId: "A5",
          mode: "timeline"
        },
        {
          id: "apartment-bedroom",
          label: "Bedroom",
          tag: "PERSONAL",
          actionLabel: "Search the private photographs after establishing the timeline",
          result: "A damaged photograph points to intimacy turned deliberately hostile.",
          type: "clue",
          clueId: "A6",
          mode: "relationship",
          requiresClues: ["A5"],
          unlockHint: "Establish Renata's final appointment before searching her private effects."
        },
        {
          id: "apartment-kitchen",
          label: "Kitchen Table",
          tag: "ROUTINE",
          actionLabel: "Check what part of her morning never happened",
          type: "flavor",
          text: "Half a pot of coffee, gone cold, never poured. Whatever happened, it happened before she got her morning cup."
        },
        {
          id: "apartment-firescape",
          label: "Fire Escape",
          tag: "ENTRY",
          actionLabel: "Test the fire-escape entry theory",
          type: "flavor",
          text: "The window latch is intact from the inside. Nobody forced their way in here. If she left, she let them in — or she was never taken from this room at all."
        }
      ]
    },
    {
      id: "docks",
      act: 2,
      name: "The Municipal Docks",
      blurb: "Storage lockers rented by the month, mostly by people who don't want to be asked why.",
      scenePosition: "100% 100%",
      fieldMethod: "Resolve the alias · follow the locker trail",
      fieldOpening: "The row has no cameras and too many doors. A name from the Desk is the only practical way to narrow it before the tide changes.",
      fieldModes: [
        { id: "identity", label: "Identity", prompt: "Whose name opens the locker trail?" },
        { id: "staging", label: "Staging", prompt: "What at the docks was manufactured?" }
      ],
      hotspots: [
        {
          id: "docks-locker",
          label: "Storage Locker 114",
          tag: "ALIAS",
          actionLabel: "Use the personnel alias to locate the rented locker",
          result: "The paperwork inside turns a family name into the route to locker 114.",
          type: "clue",
          clueId: "A7",
          mode: "identity",
          requiresClues: ["B4"],
          unlockHint: "Hundreds of lockers, no useful names. Your partner needs to identify the alias first."
        },
        {
          id: "docks-office",
          label: "Dockmaster's Office",
          tag: "WITNESS",
          actionLabel: "Press the dockmaster about the rental system",
          type: "flavor",
          text: "Lockers here are rented in cash, no ID required, no cameras on the row. The dockmaster hasn't seen anything — he's paid well not to."
        },
        {
          id: "docks-bar",
          label: "The Wharf Rat (bar)",
          tag: "TRACE",
          actionLabel: "Follow the locker paperwork to the dockside bar",
          result: "The apparent blood trail is staged with set paint, narrowing what actually happened here.",
          type: "clue",
          clueId: "A8",
          mode: "staging",
          requiresClues: ["A7"],
          unlockHint: "Search the locker paperwork before chasing its dockside trail."
        }
      ]
    }
  ],

  // ---------------- Detective B ("The Desk") ----------------
  people: [
    {
      id: "victor",
      act: 1,
      name: "Victor Amsel",
      role: "The Producer",
      blurb: "Renata's producer. Sweats through his collar even in a cold office. The film's money problems are his money problems.",
      portraitPosition: "0% 0%",
      interrogation: {
        opening: "Amsel sits too close to the table. Every few seconds he checks the dark observation glass behind you.",
        demeanor: "Anxious · defensive about money",
        questions: [
          {
            id: "victor-where",
            tag: "TIMELINE",
            prompt: "Walk me through last night.",
            response: "I was in the cutting room until eight, then home. Renata stayed. She always stayed. You can ask the laundromat downstairs.",
            after: "He answers quickly, as if he rehearsed only this part."
          },
          {
            id: "victor-finance",
            tag: "MONEY",
            prompt: "How close was the film to running out of money?",
            response: "Close? We were over the edge. Renata kept finding miracles. Deposits, private money—she told me not to ask where it came from.",
            after: "He glances toward a locked file tray. A financial record is now available.",
            requiresQuestions: ["victor-where"]
          },
          {
            id: "victor-insurance",
            tag: "PRESS",
            prompt: "Would the insurance save you if the premiere failed?",
            response: "The insurance covers an accident, not sabotage. Read the policy. If somebody touched that projector on purpose, I get nothing.",
            after: "His fear looks real. The policy weakens the cleanest motive against him.",
            requiresQuestions: ["victor-finance"],
            clueId: "B1"
          },
          {
            id: "victor-dane",
            tag: "EVIDENCE",
            prompt: "Why is Curtis Dane's company paying your studio?",
            response: "It wasn't paying the studio. Those deposits passed through us to I.C. Post. I froze the last one when I found no staff, no equipment, and only a mailbox behind the vendor.",
            after: "He stops protecting the books and starts protecting himself.",
            requiresQuestions: ["victor-finance"],
            requiresClues: ["B2"]
          }
        ]
      },
      hotspots: [
        {
          id: "victor-interview",
          label: "Question Victor",
          type: "interview"
        },
        {
          id: "victor-bank",
          label: "Bank Statement",
          type: "clue",
          clueId: "B2",
          requiresQuestions: ["victor-finance"],
          unlockHint: "Get Victor talking about the film's finances first."
        },
        {
          id: "victor-drawer",
          label: "Desk Drawer",
          type: "flavor",
          text: "A half-written resignation letter, never sent, never signed. Whatever Victor Amsel is guilty of, he's also just tired."
        }
      ]
    },
    {
      id: "ivy",
      act: 1,
      name: "Ivy Chen",
      role: "The Editor",
      blurb: "Cut every frame of Renata's film by hand. Quiet, precise, hasn't slept in days by the look of her.",
      portraitPosition: "100% 0%",
      interrogation: {
        opening: "Ivy studies you without blinking. Her right thumb keeps rubbing a red pencil mark from her index finger.",
        demeanor: "Controlled · sleep-deprived",
        questions: [
          {
            id: "ivy-timeline",
            tag: "TIMELINE",
            prompt: "When did you last see Renata?",
            response: "Eight forty-five. I left the final reel with her in the edit bay and went home. Like always.",
            after: "The exact minute arrives too easily. Write it down."
          },
          {
            id: "ivy-relationship",
            tag: "PERSONAL",
            prompt: "You and Renata were more than coworkers.",
            response: "We were. Then the film became the only thing she could love without suspicion. Is that relevant, Detective?",
            after: "Her anger is grief, but the admission opens her personnel history.",
            requiresQuestions: ["ivy-timeline"]
          },
          {
            id: "ivy-reel",
            tag: "THE REEL",
            prompt: "Who controlled the final reel after the cut?",
            response: "Renata and me. I left it with her at eight forty-five. I did not go near the theatre that night.",
            after: "She repeats the time and adds a denial you did not ask for.",
            requiresQuestions: ["ivy-timeline"],
            clueId: "B3"
          },
          {
            id: "ivy-courier",
            tag: "CONFRONT",
            prompt: "Then explain your 9:15 courier signature.",
            response: "Her eyes drop to the receipt. ‘I picked it up. Renata asked me to move it. That's all.’ The eight-forty-five alibi is gone.",
            after: "CONTRADICTION BROKEN — Ivy lied about when she left and who held the reel.",
            requiresQuestions: ["ivy-reel"],
            requiresClues: ["A9", "B3"],
            confrontationId: "ivy-alibi"
          },
          {
            id: "ivy-voss",
            tag: "ALIAS",
            prompt: "Who is M. Voss?",
            response: "My mother. Mara Voss. Ivy is my father's name. I haven't used hers in years.",
            after: "The alias is no longer anonymous.",
            requiresQuestions: ["ivy-relationship"],
            requiresClues: ["A7", "B4"]
          }
        ]
      },
      hotspots: [
        {
          id: "ivy-interview",
          label: "Question Ivy",
          type: "interview"
        },
        {
          id: "ivy-file",
          label: "Personnel File",
          type: "clue",
          clueId: "B4",
          requiresQuestions: ["ivy-relationship"],
          unlockHint: "Establish why Ivy's personal history belongs in the case."
        },
        {
          id: "ivy-bag",
          label: "Handbag",
          type: "flavor",
          text: "A prescription bottle for anxiety, refilled twice this month. Not evidence of anything except how badly she's been holding it together."
        }
      ]
    },
    {
      id: "sal",
      act: 1,
      name: "Salvatore \"Sal\" Bruno",
      role: "The Lender",
      blurb: "Financed Renata's film off the books when the banks wouldn't. Keeps a receipt book like other men keep a rosary.",
      portraitPosition: "0% 100%",
      interrogation: {
        opening: "Sal folds his hands and waits. Unlike the others, he seems almost relieved someone finally asked.",
        demeanor: "Calm · values directness",
        questions: [
          {
            id: "sal-renata",
            tag: "RAPPORT",
            prompt: "What was Renata to you?",
            response: "A borrower who paid late and told the truth about it. Better than most family. I wanted the picture finished.",
            after: "Direct questions earn direct answers."
          },
          {
            id: "sal-debt",
            tag: "MONEY",
            prompt: "Did she still owe you when she vanished?",
            response: "Not a cent. Nine o'clock, cash, my office. She said: ‘Paid in full. We're square.’ I wrote it down.",
            after: "His wording matches Renata's appointment book exactly.",
            requiresQuestions: ["sal-renata"],
            clueId: "B5"
          },
          {
            id: "sal-records",
            tag: "VERIFY",
            prompt: "Let me see the receipt book.",
            response: "He slides it across without hesitation. ‘Page eighty-one. Check every number if it helps you sleep.’",
            after: "Sal releases the ledger for examination.",
            requiresQuestions: ["sal-debt"]
          },
          {
            id: "sal-threat",
            tag: "PRESS",
            prompt: "People say your loans come with consequences.",
            response: "People say that so they can borrow without admitting they asked. Renata paid. Hurting her after that would be bad business and worse manners.",
            after: "Pressure gives you posture, not evidence."
          }
        ]
      },
      hotspots: [
        {
          id: "sal-interview",
          label: "Question Sal",
          type: "interview"
        },
        {
          id: "sal-receipts",
          label: "Receipt Book",
          type: "clue",
          clueId: "B6",
          requiresQuestions: ["sal-records"],
          unlockHint: "Sal will not hand over his records until you establish the debt."
        }
      ]
    },
    {
      id: "dane",
      act: 2,
      name: "Curtis Dane",
      role: "The Mayor's Aide",
      blurb: "Pressed suit, practiced smile. Renata's film was going to make his office look very bad.",
      portraitPosition: "100% 100%",
      interrogation: {
        opening: "Dane sits perfectly centered beneath the lamp. His smile is calibrated for a camera that is not there.",
        demeanor: "Polished · carefully literal",
        questions: [
          {
            id: "dane-renata",
            tag: "OPEN",
            prompt: "How well did you know Renata Kessler?",
            response: "By reputation. She made an activist picture and mistook access for persecution. We never met personally.",
            after: "A broad denial leaves him less room later."
          },
          {
            id: "dane-gala",
            tag: "ALIBI",
            prompt: "Where were you last night?",
            response: "City Hall gala. Seven until after one. Two hundred guests and a sign-in sheet. I may be unpopular, Detective, but I am not invisible.",
            after: "His physical alibi is strong enough to verify.",
            requiresQuestions: ["dane-renata"],
            clueId: "B7"
          },
          {
            id: "dane-permit",
            tag: "PREMIERE",
            prompt: "Why was the theatre permit revoked?",
            response: "Routine public safety. My office processes hundreds. If you want the form, request it.",
            after: "The permit record is now available—and he wants distance from it.",
            requiresQuestions: ["dane-renata"]
          },
          {
            id: "dane-ivy",
            tag: "MONEY",
            prompt: "Your consulting company paid Ivy's shell vendor forty thousand dollars.",
            response: "It paid a post-production vendor. If Miss Chen hid behind a company name, that is a matter for your fraud desk.",
            after: "He abandons ‘never met’ for ‘ordinary vendor’ without acknowledging the shift.",
            requiresQuestions: ["dane-renata"],
            requiresClues: ["B2", "B4"]
          },
          {
            id: "dane-note",
            tag: "CONFRONT",
            prompt: "Renata put your paid footage leak in the final reel.",
            response: "The smile disappears. ‘I paid for information, not a kidnapping. Ivy said she would stop the screening. Whatever she did after that was not my instruction.’",
            after: "CONTRADICTION BROKEN — Dane admits the payment and places the plan with Ivy.",
            requiresQuestions: ["dane-ivy"],
            requiresClues: ["A4", "B2"],
            confrontationId: "dane-payments"
          }
        ]
      },
      hotspots: [
        {
          id: "dane-interview",
          label: "Question Dane",
          type: "interview"
        },
        {
          id: "dane-permit",
          label: "Backdated Permit",
          type: "clue",
          clueId: "B8",
          requiresQuestions: ["dane-permit"],
          unlockHint: "Make Dane put the permit process on the record first."
        },
        {
          id: "dane-guestlist",
          label: "Gala Guest List",
          type: "flavor",
          text: "Curtis Dane signed in at 7:12 PM and out at 1:20 AM, per City Hall's own sign-in sheet, corroborated by two hundred witnesses. Wherever Renata is, he wasn't the one who put her there."
        }
      ]
    }
  ],

  // ---------------- Clue text (referenced by hotspots above) ----------------
  clueText: {
    A1: {
      title: "Torn Ticket Stub",
      docType: "ticket",
      text: "Tucked in the felt lining of an empty film canister backstage: a torn ticket stub with the initials \"I.C.\" scrawled on the back in eyeliner pencil."
    },
    A2: {
      title: "Sabotaged Projector",
      docType: "evidence",
      text: "The platter motor in the booth was deliberately loosened, not worn down. Whoever did it knew this exact machine — only the projectionist and the film's editor were ever trained on it."
    },
    A3: {
      title: "Empty Reel Canister",
      docType: "evidence",
      text: "Labeled \"LAST REEL — FINAL CUT.\" The latch was forced to look like a smash-and-grab, but the narrow pry mark matches an editor's splicing knife. A streak of the same red grease pencil used throughout the edit bay is caught inside the hinge."
    },
    A4: {
      title: "Half-Burned Script Pages",
      docType: "note",
      text: "A margin note, half burned in an ashtray: \"D. pays for the dailies — don't tell R. She put the leak in the final reel. If it screens, I'm finished.\" The cramped, looping hand is distinctive, but there is no signature."
    },
    A5: {
      title: "Appointment Book",
      docType: "note",
      text: "Last entry, underlined twice: \"S.B. — 9:00 PM — final payment. Paid in full. We're square.\""
    },
    A6: {
      title: "Torn Photograph",
      docType: "photo",
      text: "Renata and another woman at what looks like a studio holiday party. The other woman's face has been scratched out of the print — deliberately, just her half."
    },
    A7: {
      title: "Storage Locker 114",
      docType: "form",
      text: "Rental paperwork inside is signed \"M. Voss.\" Nobody on this case goes by that name — yet."
    },
    A8: {
      title: "Matchbook & Stained Rag",
      docType: "evidence",
      text: "A matchbook from a dockside bar called The Wharf Rat. A rag stained dark red — a lab tag stapled to it reads \"SET PAINT, NOT BLOOD — confirmed.\""
    },
    A9: {
      title: "Courier Receipt",
      docType: "form",
      text: "Behind the padlocked door: a courier slip dated the night Renata vanished. \"Reel picked up 9:15 PM — signed I.C.\" Half an hour after Ivy Chen says she'd already gone home."
    },
    B1: {
      title: "Interview: Victor Amsel",
      docType: "transcript",
      text: "Defensive about the studio's finances from the first question. At one point he blurts, \"Look, the insurance covers us either way\" — then produces the policy. Its sabotage exclusion means a deliberate projector failure would pay him nothing."
    },
    B2: {
      title: "Bank Statement",
      docType: "ledger",
      text: "The studio account is badly overdrawn. Its ledger shows repeated deposits from \"C. Dane Consulting LLC\" routed to a vendor called \"I.C. Post Services.\" A final $40,000 transfer landed two days ago. The vendor registration ends at a rented mailbox and the signatory is recorded only as \"I.C.\""
    },
    B3: {
      title: "Interview: Ivy Chen",
      docType: "transcript",
      text: "Admits, eventually, that she and Renata were involved. Says she left the last reel with Renata \"like always\" around 8:45 PM. Goes visibly rigid when asked about the theatre."
    },
    B4: {
      title: "Studio Personnel File",
      docType: "form",
      text: "Sign-in log shows Ivy at the studio until 9:40 PM the night Renata vanished — nearly an hour after she claims she left. Her file lists an emergency contact, \"Voss, M. (mother),\" and its handwritten change form matches the looping note found in the edit bay."
    },
    B5: {
      title: "Interview: Sal Bruno",
      docType: "transcript",
      text: "Confirms Renata owed him for financing the film — and says she paid the last installment \"in full, cash, like always,\" that same night. Offers his receipt book without being asked twice."
    },
    B6: {
      title: "Receipt Book",
      docType: "ledger",
      text: "An entry dated the night Renata vanished matches, almost word for word, the line in her apartment appointment book: paid in full. Square. In the margin, almost an afterthought, in Sal's cramped hand: \"told studio guy — closet combo's 8-1-7, don't lose it again.\""
    },
    B7: {
      title: "Interview: Curtis Dane",
      docType: "transcript",
      text: "Denies ever meeting Renata personally. Gets cagey about \"consulting fees\" when pushed. Says he was at a City Hall gala the night she vanished — in front of two hundred witnesses."
    },
    B8: {
      title: "Backdated Permit",
      docType: "form",
      text: "A forged safety-violation permit, dated to quietly revoke the Ambassador Theatre's screening license \"for public safety.\" Paper trail, not proof of a kidnapping — but proof somebody wanted that premiere stopped."
    }
  },

  // Multi-evidence threads ask players to build a structured theory rather
  // than discover the answer by trying every possible pair on the board.
  investigationThreads: [
    {
      id: "timeline",
      title: "The Missing Forty-Five Minutes",
      question: "What disproves Ivy's claim that she left at 8:45?",
      slots: [
        { id: "claim", label: "The original claim", prompt: "Choose the statement that establishes 8:45.", clueId: "B3" },
        { id: "contradiction", label: "The 9:15 contradiction", prompt: "Choose the record that places the reel with someone later.", clueId: "A9" },
        { id: "verification", label: "Independent verification", prompt: "Choose the record that extends the timeline to 9:40.", clueId: "B4" }
      ],
      result: "Ivy's 8:45 departure is impossible: she signed for the reel at 9:15 and remained logged inside the studio until 9:40."
    },
    {
      id: "money-trail",
      title: "The Paid Insider",
      question: "How did Dane's money reach someone inside Renata's studio?",
      slots: [
        { id: "payment", label: "Payment route", prompt: "Choose the financial record that names the shell vendor.", clueId: "B2" },
        { id: "warning", label: "Insider's warning", prompt: "Choose the private note describing the paid footage leak.", clueId: "A4" },
        { id: "identity", label: "Identity bridge", prompt: "Choose the record that connects the handwriting and initials to a person.", clueId: "B4" }
      ],
      result: "Dane funded I.C. Post; the burned warning describes the same leak, and Ivy's personnel writing identifies the studio insider behind it."
    },
    {
      id: "reel-route",
      title: "How the Reel Disappeared",
      question: "What sequence removed the reel and carried it to the docks?",
      slots: [
        { id: "distraction", label: "The staged failure", prompt: "Choose the evidence proving the projector failure was deliberate.", clueId: "A2" },
        { id: "removal", label: "The removal method", prompt: "Choose the physical trace left while opening the reel canister.", clueId: "A3" },
        { id: "transfer", label: "The transfer", prompt: "Choose the document recording who took the reel and when.", clueId: "A9" },
        { id: "destination", label: "The destination", prompt: "Choose the docks record identifying where the trail ends.", clueId: "A7" },
        { id: "alias", label: "The alias", prompt: "Choose the personnel record that resolves the renter's family name.", clueId: "B4" }
      ],
      result: "The projector was disabled, the canister was opened with an editor's tool, and I.C. transferred the reel toward locker 114—rented under Ivy's family alias, M. Voss."
    }
  ],

  // These two board links eliminate the strongest alternative suspects.
  deductions: [
    {
      id: "victor-cleared",
      clueIds: ["A2", "B1"],
      title: "Sabotage Doesn't Pay",
      text: "The projector was deliberately sabotaged, but Victor's policy excludes sabotage—destroying his insurance motive."
    },
    {
      id: "sal-cleared",
      clueIds: ["A5", "B6"],
      title: "The Debt Was Settled",
      text: "Renata's appointment book and Sal's receipt ledger independently agree that the debt was paid before she vanished."
    }
  ],

  // Accusation options
  suspects: ["victor", "ivy", "sal", "dane"],
  accusationLocations: ["theatre", "studio", "apartment", "docks"],
  motives: [
    { id: "silence-footage", text: "To hide that she sold footage to Dane" },
    { id: "debt", text: "Over a debt gone bad" },
    { id: "political", text: "To suppress the film's politics" },
    { id: "jealousy", text: "Out of jealousy" }
  ],
  methods: [
    { id: "staged-sabotage", text: "Staged the projector sabotage and moved the reel through the studio" },
    { id: "debt-collection", text: "Used the debt meeting to force Renata into a waiting car" },
    { id: "official-seizure", text: "Used the forged permit to seize Renata and the film" },
    { id: "theatre-accident", text: "A theatre accident was covered up after the reel disappeared" }
  ],

  solution: {
    suspect: "ivy",
    location: "docks",
    motive: "silence-footage",
    method: "staged-sabotage"
  },

  solutionEvidence: [
    {
      title: "Who — Ivy Chen",
      clueIds: ["B3", "B4", "A9"],
      text: "Her interview, the studio log, and the courier receipt place her with the reel after the time she claimed she left."
    },
    {
      title: "Where — The Municipal Docks",
      clueIds: ["A7", "B4"],
      text: "Locker 114 was rented as M. Voss, the emergency-contact name in Ivy's personnel file."
    },
    {
      title: "Why — The Paid Leak",
      clueIds: ["A4", "B2", "B4"],
      text: "Dane's payments reached I.C. Post; Ivy's personnel handwriting identifies the insider who feared Renata exposed the leak."
    },
    {
      title: "How — Staged Sabotage",
      clueIds: ["A2", "A3"],
      text: "The projector required editor access, and the reel canister carried marks from an editor's tool and Ivy's grease pencil."
    },
    {
      title: "Why Not Victor",
      clueIds: ["A2", "B1"],
      text: "The sabotage exclusion means the deliberate projector damage would not rescue Victor's finances."
    },
    {
      title: "Why Not Sal",
      clueIds: ["A5", "B6"],
      text: "Two independent records say Renata paid Sal in full before she disappeared."
    }
  ],

  endings: {
    correct: {
      title: "Case Closed: The Last Reel",
      text: [
        "You find Renata in locker 114, dazed, wrists rope-burned, but alive — and the last reel sitting beside her, untouched.",
        "Ivy Chen had been quietly selling raw dailies to Curtis Dane's office for months, feeding him footage to help bury a corruption story before it ever reached a screen. Renata discovered the payments and put the leak in her final reel. Faced with public exposure, Ivy panicked: sabotaged the projector, took the reel, and hid Renata just long enough to figure out what to do next. She was never going to hurt her. She just ran out of ways not to.",
        "The premiere runs one week late, to a packed house. Renata insists on buying you both a drink at The Wharf Rat. You take it."
      ]
    },
    partial: {
      title: "Case Closed: A Costly Win",
      text: [
        "You had the right name, but not the full picture — and it cost you time you didn't have.",
        "By the time you find Locker 114, Ivy Chen has already panicked and burned the last reel to cover her tracks. Renata is found alive nearby, shaken but unhurt. Her masterpiece, though, exists now only in scraps of scorched celluloid and the memory of everyone who worked on it.",
        "A win. Just not the one anyone wanted."
      ]
    },
    wrong: {
      title: "Case Closed: Unsolved",
      text: [
        "Your accusation doesn't survive a defense attorney's first cross-examination. Whoever you named walks free by Friday.",
        "Somewhere in Veldrose, Ivy Chen packs a bag. Renata Kessler is never found. The Ambassador Theatre's marquee stays dark.",
        "Some cases don't close. They just stop being anyone's job."
      ]
    }
  }
};
