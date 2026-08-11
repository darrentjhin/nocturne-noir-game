// NOCTURNE — Case #1: "The Last Reel"
// An original noir mystery. Two roles investigate the same disappearance
// from different angles and must share what they find to solve it.

module.exports = {
  id: "the-last-reel",
  title: "The Last Reel",
  city: "Veldrose",
  year: "1987",

  briefing: {
    headline: "A filmmaker vanishes the night before her premiere.",
    body: [
      "Renata Kessler spent three years and every dollar she had on one film — a documentary cut she called \"the only honest thing this city's seen in a decade.\" It was set to premiere tomorrow night at the Ambassador Theatre.",
      "Last night, Renata Kessler didn't come home. Neither did the last reel of her film.",
      "Two detectives. One case. You'll each pull a different thread — the street and the desk. Whatever you find, you'll need each other to make sense of it. Talk. Compare notes. The city won't give up the truth to just one of you."
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

  // Detective A ("The Street") — four locations, two clues each.
  locations: [
    {
      id: "theatre",
      name: "Ambassador Theatre",
      blurb: "Where the film was supposed to premiere tomorrow night. Empty seats, one working light over the stage door.",
      clues: [
        {
          id: "A1",
          title: "Torn Ticket Stub",
          text: "Tucked in the felt lining of an empty film canister backstage: a torn ticket stub with the initials \"I.C.\" scrawled on the back in eyeliner pencil."
        },
        {
          id: "A2",
          title: "Sabotaged Projector",
          text: "The platter motor in the booth was deliberately loosened, not worn down. Whoever did it knew this exact machine — only the projectionist and the film's editor were ever trained on it."
        }
      ]
    },
    {
      id: "studio",
      name: "Kessler Film & Editing Studio",
      blurb: "A cramped two-room cutting room above a laundromat. Smells like coffee and hot celluloid.",
      clues: [
        {
          id: "A3",
          title: "Empty Reel Canister",
          text: "Labeled \"LAST REEL — FINAL CUT.\" The latch was forced from the outside, fast and careless — not the work of someone who handles film for a living."
        },
        {
          id: "A4",
          title: "Half-Burned Script Pages",
          text: "Margin note, half burned in an ashtray: \"D. pays $$ for the dailies — don't tell R.\" The handwriting is cramped, looping, fast — a habit of someone who writes a lot of notes, quickly, late at night."
        }
      ]
    },
    {
      id: "apartment",
      name: "Renata's Apartment",
      blurb: "Fourth floor walkup. Film reels stacked like furniture. The bed hasn't been slept in.",
      clues: [
        {
          id: "A5",
          title: "Appointment Book",
          text: "Last entry, underlined twice: \"S.B. — 9:00 PM — final payment. Paid in full. We're square.\""
        },
        {
          id: "A6",
          title: "Torn Photograph",
          text: "Renata and another woman at what looks like a studio holiday party. The other woman's face has been scratched out of the print — deliberately, just her half."
        }
      ]
    },
    {
      id: "docks",
      name: "The Municipal Docks",
      blurb: "Storage lockers rented by the month, mostly by people who don't want to be asked why.",
      clues: [
        {
          id: "A7",
          title: "Storage Locker 114",
          text: "Rental paperwork inside is signed \"M. Voss.\" Nobody on this case goes by that name — yet."
        },
        {
          id: "A8",
          title: "Matchbook & Stained Rag",
          text: "A matchbook from a dockside bar called The Wharf Rat. A rag stained dark red — a lab tag stapled to it reads \"SET PAINT, NOT BLOOD — confirmed.\""
        }
      ]
    }
  ],

  // Detective B ("The Desk") — four people, two clues each (interview + document).
  people: [
    {
      id: "victor",
      name: "Victor Amsel",
      role: "The Producer",
      blurb: "Renata's producer. Sweats through his collar even in a cold office. The film's money problems are his money problems.",
      clues: [
        {
          id: "B1",
          title: "Interview: Victor Amsel",
          text: "Defensive about the studio's finances from the first question. At one point he blurts, \"Look, the insurance covers us either way\" — then tries to walk it back."
        },
        {
          id: "B2",
          title: "Bank Statement",
          text: "The studio account is badly overdrawn — except for a $40,000 wire that landed two days ago, sender listed as \"C. Dane Consulting LLC.\" Amsel calls it a \"location licensing fee\" and won't say more."
        }
      ]
    },
    {
      id: "ivy",
      name: "Ivy Chen",
      role: "The Editor",
      blurb: "Cut every frame of Renata's film by hand. Quiet, precise, hasn't slept in days by the look of her.",
      clues: [
        {
          id: "B3",
          title: "Interview: Ivy Chen",
          text: "Admits, eventually, that she and Renata were involved. Says she left the last reel with Renata \"like always\" around 8:45 PM. Goes visibly rigid when asked about the theatre."
        },
        {
          id: "B4",
          title: "Studio Personnel File",
          text: "Sign-in log shows Ivy at the studio until 9:40 PM the night Renata vanished — nearly an hour after she claims she left. Her file lists an emergency contact: \"Voss, M. (mother).\""
        }
      ]
    },
    {
      id: "sal",
      name: "Salvatore \"Sal\" Bruno",
      role: "The Lender",
      blurb: "Financed Renata's film off the books when the banks wouldn't. Keeps a receipt book like other men keep a rosary.",
      clues: [
        {
          id: "B5",
          title: "Interview: Sal Bruno",
          text: "Confirms Renata owed him for financing the film — and says she paid the last installment \"in full, cash, like always,\" that same night. Offers his receipt book without being asked twice."
        },
        {
          id: "B6",
          title: "Receipt Book",
          text: "An entry dated the night Renata vanished matches, almost word for word, the line in her apartment appointment book: paid in full. Square."
        }
      ]
    },
    {
      id: "dane",
      name: "Curtis Dane",
      role: "The Mayor's Aide",
      blurb: "Pressed suit, practiced smile. Renata's film was going to make his office look very bad.",
      clues: [
        {
          id: "B7",
          title: "Interview: Curtis Dane",
          text: "Denies ever meeting Renata personally. Gets cagey about \"consulting fees\" when pushed. Says he was at a City Hall gala the night she vanished — in front of two hundred witnesses."
        },
        {
          id: "B8",
          title: "Backdated Permit",
          text: "A forged safety-violation permit, dated to quietly revoke the Ambassador Theatre's screening license \"for public safety.\" Paper trail, not proof of a kidnapping — but proof somebody wanted that premiere stopped."
        }
      ]
    }
  ],

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
