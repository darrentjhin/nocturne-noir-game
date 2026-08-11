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

module.exports = {
  id: "the-last-reel",
  title: "The Last Reel",
  city: "Veldrose",
  year: "1987",
  actUnlockThreshold: ACT_UNLOCK_THRESHOLD,
  act1ClueTotal: ACT1_CLUE_TOTAL,

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
      hotspots: [
        {
          id: "theatre-boxoffice",
          label: "Box Office",
          type: "flavor",
          text: "A hand-lettered sign taped to the glass: \"SOLD OUT — OPENING NIGHT.\" Nobody's told the box office the opening might not happen."
        },
        {
          id: "theatre-booth",
          label: "Projection Booth",
          type: "clue",
          clueId: "A2"
        },
        {
          id: "theatre-backstage",
          label: "Backstage Rack",
          type: "clue",
          clueId: "A1"
        },
        {
          id: "theatre-seats",
          label: "House Seats",
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
      hotspots: [
        {
          id: "studio-editbay",
          label: "Edit Bay",
          type: "clue",
          clueId: "A3"
        },
        {
          id: "studio-coffee",
          label: "Coffee Station",
          type: "flavor",
          text: "Two mugs, both used, both cold. Whoever was here last wasn't alone — or didn't leave in a hurry."
        },
        {
          id: "studio-cabinet",
          label: "Filing Cabinet",
          type: "clue",
          clueId: "A4"
        },
        {
          id: "studio-closet",
          label: "Supply Closet",
          type: "locked",
          puzzleId: "supplyCloset",
          lockedHint: "Padlocked. Three-digit combination.",
          clueId: "A9"
        }
      ]
    },
    {
      id: "apartment",
      act: 1,
      name: "Renata's Apartment",
      blurb: "Fourth floor walkup. Film reels stacked like furniture. The bed hasn't been slept in.",
      hotspots: [
        {
          id: "apartment-desk",
          label: "Writing Desk",
          type: "clue",
          clueId: "A5"
        },
        {
          id: "apartment-bedroom",
          label: "Bedroom",
          type: "clue",
          clueId: "A6"
        },
        {
          id: "apartment-kitchen",
          label: "Kitchen Table",
          type: "flavor",
          text: "Half a pot of coffee, gone cold, never poured. Whatever happened, it happened before she got her morning cup."
        },
        {
          id: "apartment-firescape",
          label: "Fire Escape",
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
      hotspots: [
        {
          id: "docks-locker",
          label: "Storage Locker 114",
          type: "clue",
          clueId: "A7"
        },
        {
          id: "docks-office",
          label: "Dockmaster's Office",
          type: "flavor",
          text: "Lockers here are rented in cash, no ID required, no cameras on the row. The dockmaster hasn't seen anything — he's paid well not to."
        },
        {
          id: "docks-bar",
          label: "The Wharf Rat (bar)",
          type: "clue",
          clueId: "A8"
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
      hotspots: [
        {
          id: "victor-interview",
          label: "Interview",
          type: "clue",
          clueId: "B1"
        },
        {
          id: "victor-bank",
          label: "Bank Statement",
          type: "clue",
          clueId: "B2"
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
      hotspots: [
        {
          id: "ivy-interview",
          label: "Interview",
          type: "clue",
          clueId: "B3"
        },
        {
          id: "ivy-file",
          label: "Personnel File",
          type: "clue",
          clueId: "B4"
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
      hotspots: [
        {
          id: "sal-interview",
          label: "Interview",
          type: "clue",
          clueId: "B5"
        },
        {
          id: "sal-receipts",
          label: "Receipt Book",
          type: "clue",
          clueId: "B6"
        }
      ]
    },
    {
      id: "dane",
      act: 2,
      name: "Curtis Dane",
      role: "The Mayor's Aide",
      blurb: "Pressed suit, practiced smile. Renata's film was going to make his office look very bad.",
      hotspots: [
        {
          id: "dane-interview",
          label: "Interview",
          type: "clue",
          clueId: "B7"
        },
        {
          id: "dane-permit",
          label: "Backdated Permit",
          type: "clue",
          clueId: "B8"
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
      text: "Labeled \"LAST REEL — FINAL CUT.\" The latch was forced from the outside, fast and careless — not the work of someone who handles film for a living."
    },
    A4: {
      title: "Half-Burned Script Pages",
      docType: "note",
      text: "Margin note, half burned in an ashtray: \"D. pays $$ for the dailies — don't tell R.\" The handwriting is cramped, looping, fast — a habit of someone who writes a lot of notes, quickly, late at night."
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
      text: "Defensive about the studio's finances from the first question. At one point he blurts, \"Look, the insurance covers us either way\" — then tries to walk it back."
    },
    B2: {
      title: "Bank Statement",
      docType: "ledger",
      text: "The studio account is badly overdrawn — except for a $40,000 wire that landed two days ago, sender listed as \"C. Dane Consulting LLC.\" Amsel calls it a \"location licensing fee\" and won't say more."
    },
    B3: {
      title: "Interview: Ivy Chen",
      docType: "transcript",
      text: "Admits, eventually, that she and Renata were involved. Says she left the last reel with Renata \"like always\" around 8:45 PM. Goes visibly rigid when asked about the theatre."
    },
    B4: {
      title: "Studio Personnel File",
      docType: "form",
      text: "Sign-in log shows Ivy at the studio until 9:40 PM the night Renata vanished — nearly an hour after she claims she left. Her file lists an emergency contact: \"Voss, M. (mother).\""
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

  // Accusation options
  suspects: ["victor", "ivy", "sal", "dane"],
  accusationLocations: ["theatre", "studio", "apartment", "docks"],
  motives: [
    { id: "silence-footage", text: "To silence footage that would expose her" },
    { id: "debt", text: "Over a debt gone bad" },
    { id: "political", text: "To suppress the film's politics" },
    { id: "jealousy", text: "Out of jealousy" }
  ],

  solution: {
    suspect: "ivy",
    location: "docks",
    motive: "silence-footage"
  },

  endings: {
    correct: {
      title: "Case Closed: The Last Reel",
      text: [
        "You find Renata in locker 114, dazed, wrists rope-burned, but alive — and the last reel sitting beside her, untouched.",
        "Ivy Chen had been quietly selling raw dailies to Curtis Dane's office for months, feeding him footage to help bury a corruption story before it ever reached a screen — money the underfunded studio badly needed, and a secret she couldn't let Renata's final cut expose. When Renata found out, Ivy panicked: sabotaged the projector, took the reel, and hid Renata just long enough to figure out what to do next. She was never going to hurt her. She just ran out of ways not to.",
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
