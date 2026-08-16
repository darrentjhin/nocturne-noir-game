module.exports = {
  id: "black-sun-ledger",
  episode: "NOCTURNE · FILE 02",
  title: "The Black-Sun Ledger",
  subtitle: "A live two-detective infiltration",
  estimatedMinutes: "35–50 minutes",
  roles: {
    A: {
      name: "The Street",
      tagline: "Inside the exchange",
      brief: "You are physically inside Saint Orison Exchange. Read rooms, mechanisms, sounds, and immediate danger. Your partner cannot see what is in front of you."
    },
    B: {
      name: "The Desk",
      tagline: "On the ghost circuit",
      brief: "You are operating the stolen municipal ledger and a patched telephone circuit. Decode accounts, identities, and routing rules. Your partner cannot see your records."
    }
  },
  difficultyOptions: [
    { id: "signal", label: "Signal", description: "Clearer rejection feedback and patient pacing." },
    { id: "field", label: "Field", description: "The intended balance of pressure and deduction." },
    { id: "blackout", label: "Blackout", description: "Sparse rejection feedback. Trust exact communication." }
  ],
  briefing: {
    headline: "Three nights after The Last Reel, the black-sun stamp leads below the city.",
    body: "The scorched ledger page points to Saint Orison Telephone Exchange, condemned for twelve years but drawing power again tonight. At 1:10 a.m., the building will transmit a citywide ‘correction’ that erases a protected witness from every municipal record. The Street has gone inside. The Desk has tapped the dead switchboard. Each checkpoint gives you different facts, and every wrong joint decision raises the alarm.",
    objective: "Reach the ledger vault, identify the controller, and get the living witness out before the correction transmits."
  },
  tutorial: [
    {
      title: "Different screens, one operation",
      body: "The Street sees the building. The Desk sees the ledger and ghost circuit. Never assume your partner has the detail shown on your private dispatch."
    },
    {
      title: "Describe before you decide",
      body: "Each checkpoint asks both detectives a different question. Read your private facts aloud on the Radio Line, then ask for the exact missing fact you need. Save crucial transmissions into your private Notes when you will need them later."
    },
    {
      title: "Know what stays private",
      body: "Notes autosave to your detective role and survive reconnects, but your partner cannot read them. Anything they must act on belongs on the Radio Line; any Radio message can be saved back into your private notebook."
    },
    {
      title: "Lock independently",
      body: "Your choice stays private. Once both halves are locked, the server tests the pair together. A wrong pair resets both choices and raises the alert level."
    },
    {
      title: "Advance together",
      body: "A solved checkpoint reveals a shared field record. Both detectives must acknowledge it before the next location opens."
    },
    {
      title: "Protect the operation",
      body: "The alert meter changes the ending. You can always finish the case, but careless attempts may expose the detectives and cost the clean extraction."
    },
    {
      title: "Split the final protocol",
      body: "At the vault, The Street chooses the physical recovery plan and the records that support it. The Desk identifies the controller, the purpose, and its supporting records. Re-read all four shared Field Records; both private halves remain sealed until you lock them."
    }
  ],
  stages: [
    {
      id: "exchange-entry",
      number: "01",
      title: "The Burned Exchange",
      location: "Saint Orison · Service Arcade",
      objective: "Open the unmonitored route without waking the restored switchboard.",
      roles: {
        A: {
          label: "FIELD VIEW · LOWER ARCADE",
          facts: [
            "Three steel doors are painted IVORY, COBALT, and OCHRE.",
            "A porcelain route plate beside them reads LINE VI.",
            "Only the ivory door has a modern alarm contact; the other two use dead mechanical locks."
          ],
          request: "Ask The Desk which color protocol is assigned to Line VI.",
          prompt: "Which door do you take?",
          choices: [
            { id: "ivory-door", label: "Ivory door", detail: "Modern alarm contact" },
            { id: "cobalt-door", label: "Cobalt door", detail: "Dead mechanical lock" },
            { id: "ochre-door", label: "Ochre door", detail: "Dead mechanical lock" }
          ]
        },
        B: {
          label: "LEDGER VIEW · FACILITY INDEX",
          facts: [
            "The access index lists: Line II — IVORY; Line VI — COBALT; Line IX — OCHRE.",
            "A margin note says COBALT traffic terminates at SAINT ORISON SUBLEVEL.",
            "The building name is omitted from the numbered entries."
          ],
          request: "Ask The Street which line number is stamped beside the doors.",
          prompt: "Which facility destination do you patch into the ghost circuit?",
          choices: [
            { id: "civic-annex", label: "Civic Annex", detail: "Line II record" },
            { id: "saint-orison", label: "Saint Orison Sublevel", detail: "Line VI record" },
            { id: "north-pier", label: "North Pier Relay", detail: "Line IX record" }
          ]
        }
      },
      answers: { A: "cobalt-door", B: "saint-orison" },
      failure: {
        signal: "The door color and patched destination do not describe the same numbered line.",
        field: "The physical route and ledger destination do not resolve to one circuit.",
        blackout: "PAIR REJECTED · THE SWITCHBOARD STIRS"
      },
      outcome: {
        title: "Unmonitored access established",
        text: "The cobalt door opens into a cable stair while the ghost circuit masks the movement as dormant Line VI traffic.",
        evidence: "FIELD RECORD 01 · Saint Orison was kept operational off-book through a municipal maintenance circuit. Its emergency schematic warns that powered routes seal during a correction shutdown; the mechanical bell tunnel bypasses the circuit and reaches the storm drain."
      }
    },
    {
      id: "ghost-call",
      number: "02",
      title: "The Ghost Call",
      location: "Sublevel · Manual Switch Room",
      objective: "Follow the active call without routing it through the listening operator.",
      roles: {
        A: {
          label: "FIELD VIEW · JACK PANEL",
          facts: [
            "Four hand-labeled jacks read MOTH, CROWN, ANCHOR, and LANTERN.",
            "A warm cable arrives from dial 2:17 and disappears behind the ANCHOR jack.",
            "The CROWN jack carries a second pulse that mimics every connection half a second later."
          ],
          request: "Tell The Desk the source dial is 2:17. Ask which alias the ledger assigns to that dial.",
          prompt: "Which jack carries the real call?",
          choices: [
            { id: "moth-jack", label: "Moth", detail: "Cold line" },
            { id: "crown-jack", label: "Crown", detail: "Echo pulse" },
            { id: "anchor-jack", label: "Anchor", detail: "Warm incoming cable" },
            { id: "lantern-jack", label: "Lantern", detail: "Grounded line" }
          ]
        },
        B: {
          label: "LEDGER VIEW · DIAL REGISTER",
          facts: [
            "The register maps 1:04 to VOSS, 2:17 to MARR-17, and 3:12 to ROOK-AIDE.",
            "MARR-17 is marked ‘living entry / do not correct before transfer.’",
            "An operator note warns that CROWN is an automated listening echo, never an origin."
          ],
          request: "Ask The Street for the source dial printed beside the warm cable.",
          prompt: "Which ledger identity is on the live call?",
          choices: [
            { id: "voss", label: "VOSS", detail: "Dial 1:04" },
            { id: "marr-17", label: "MARR-17", detail: "Dial 2:17" },
            { id: "rook-aide", label: "ROOK-AIDE", detail: "Dial 3:12" }
          ]
        }
      },
      answers: { A: "anchor-jack", B: "marr-17" },
      failure: {
        signal: "One selection follows the listening echo or the wrong dial identity. Compare jack behavior with the exact source number.",
        field: "The selected jack and ledger identity are not carrying the same live call.",
        blackout: "PAIR REJECTED · AN OPERATOR LIFTS A RECEIVER"
      },
      outcome: {
        title: "The living entry answers",
        text: "The Anchor line opens for six seconds. A woman whispers, ‘Ward C. They are changing my name at 1:10.’",
        evidence: "FIELD RECORD 02 · MARR-17 is a living witness awaiting forced identity erasure, not an accounting entry."
      }
    },
    {
      id: "ward-c",
      number: "03",
      title: "The Living Entry",
      location: "Sublevel · Ward C",
      objective: "Keep the witness alive and invisible while the patrol crosses the ward.",
      roles: {
        A: {
          label: "FIELD VIEW · WITNESS ROOM",
          facts: [
            "Naomi Vey is conscious beneath a surgical lamp. Her wrist tag reads MARR-17.",
            "The oxygen bottle is mechanical and will continue without power.",
            "Bootsteps stop whenever the lamp relay clicks; the patrol is following the electrical load."
          ],
          request: "Ask The Desk which emergency protocol preserves a living entry during an audit.",
          prompt: "What do you do before the patrol reaches the door?",
          choices: [
            { id: "move-witness", label: "Move Naomi now", detail: "Cross the lit corridor" },
            { id: "blackout-room", label: "Cut the room lamp", detail: "Oxygen remains mechanical" },
            { id: "call-patrol", label: "Imitate an operator", detail: "Use the ward telephone" }
          ]
        },
        B: {
          label: "LEDGER VIEW · CORRECTION MANUAL",
          facts: [
            "Emergency rule 4: ‘Living entries remain in assigned ward under LOCAL BLACKOUT.’",
            "Ward C is isolated from the generator but its medical gas is independent.",
            "Moving an entry before the audit automatically alerts the controller."
          ],
          request: "Ask The Street which ward is printed on the witness room and whether life support needs electricity.",
          prompt: "Which protection code do you write into the audit queue?",
          choices: [
            { id: "ward-a-transfer", label: "WARD A · TRANSFER", detail: "Pre-audit relocation" },
            { id: "ward-c-blackout", label: "WARD C · LOCAL BLACKOUT", detail: "Hold in place" },
            { id: "ward-c-release", label: "WARD C · RELEASE", detail: "Open medical lock" }
          ]
        }
      },
      answers: { A: "blackout-room", B: "ward-c-blackout" },
      failure: {
        signal: "The physical action and protection code would move or expose a living entry during the audit.",
        field: "Your field action conflicts with the emergency rule entered at the Desk.",
        blackout: "PAIR REJECTED · PATROL DISTANCE CLOSING"
      },
      outcome: {
        title: "Naomi disappears from the patrol map",
        text: "The lamp dies. The Desk marks Ward C as a local blackout, and the patrol walks past the dark room without opening it.",
        evidence: "FIELD RECORD 03 · Naomi Vey, coded MARR-17, can testify that the correction system erases protected witnesses."
      }
    },
    {
      id: "ledger-vault",
      number: "04",
      title: "The Ledger Vault",
      location: "Core · Controller Archive",
      objective: "Open the controller cylinder without triggering the decoy charge.",
      roles: {
        A: {
          label: "FIELD VIEW · THREE CYLINDERS",
          facts: [
            "The left cylinder bears an intact black sun. The center sun is split by one vertical line. The right sun is crossed twice.",
            "A commissioner’s brass coat button is caught beneath the center cylinder rail.",
            "The left and right cylinders smell sharply of fresh blasting compound; the center does not."
          ],
          request: "Ask The Desk what authority level a single vertical split denotes.",
          prompt: "Which cylinder do you extract?",
          choices: [
            { id: "left-cylinder", label: "Left · intact sun", detail: "Fresh chemical odor" },
            { id: "center-cylinder", label: "Center · one split", detail: "Commissioner button" },
            { id: "right-cylinder", label: "Right · two splits", detail: "Fresh chemical odor" }
          ]
        },
        B: {
          label: "LEDGER VIEW · AUTHORITY KEY",
          facts: [
            "Intact sun means CLERK. One vertical split means CONTROLLER. Two splits means DECOY.",
            "Current controller authority was issued to Commissioner Elias Rook twelve years ago and never revoked.",
            "The vault manifest says only the controller cylinder carries original names and correction orders."
          ],
          request: "Ask The Street which cylinder carries one split and what personal trace lies beneath it.",
          prompt: "Whose authority key do you use to suspend the vault alarm?",
          choices: [
            { id: "clerk-vale", label: "Orson Vale · Clerk", detail: "Intact-sun authority" },
            { id: "commissioner-rook", label: "Elias Rook · Controller", detail: "One-split authority" },
            { id: "miriam-shaw", label: "Miriam Shaw · Auditor", detail: "Two-split review key" }
          ]
        }
      },
      answers: { A: "center-cylinder", B: "commissioner-rook" },
      failure: {
        signal: "The selected cylinder mark does not match the authority key. Two cylinders are chemically trapped.",
        field: "Cylinder mark and authority level conflict. The decoys remain live.",
        blackout: "PAIR REJECTED · VAULT CHARGE ARMED"
      },
      outcome: {
        title: "The controller ledger is in hand",
        text: "The center cylinder releases. Its pages list erased witnesses, bought officials, and twelve years of orders signed E. ROOK.",
        evidence: "FIELD RECORD 04 · Commissioner Elias Rook controls the black-sun correction network and ordered Naomi Vey erased tonight."
      }
    }
  ],
  finalProtocol: {
    headline: "The correction begins in ninety seconds.",
    body: "The vault is open, Naomi is still in Ward C, and Rook's operator is trying to restore the circuit. Each detective must seal their own half of the extraction protocol.",
    roles: {
      A: {
        label: "FIELD PROTOCOL · THE STREET",
        brief: "Use the shared field records—not instinct alone—to choose who leaves first, which route survives shutdown, and which records prove that plan.",
        fields: [
          {
            id: "priority",
            prompt: "What leaves the exchange first?",
            choices: [
              { id: "ledger-first", label: "The controller ledger" },
              { id: "rescue-witness", label: "Naomi Vey, the living witness" },
              { id: "pursue-operator", label: "The fleeing switchboard operator" }
            ]
          },
          {
            id: "exit",
            prompt: "Which extraction route survives the correction shutdown?",
            choices: [
              { id: "service-arcade", label: "Cobalt service arcade" },
              { id: "bell-tunnel", label: "Mechanical bell tunnel" },
              { id: "ward-elevator", label: "Ward elevator" }
            ]
          },
          {
            id: "support",
            prompt: "Which field records support the rescue and extraction plan?",
            choices: [
              { id: "records-01-03", label: "Records 01 + 03 · shutdown route and living witness" },
              { id: "records-02-04", label: "Records 02 + 04 · erasure process and controller" },
              { id: "records-01-04", label: "Records 01 + 04 · shutdown route and controller" }
            ]
          }
        ]
      },
      B: {
        label: "ANALYSIS PROTOCOL · THE DESK",
        brief: "Use the shared field records to identify the network's authority, its real purpose, and the record pair that proves both conclusions.",
        fields: [
          {
            id: "controller",
            prompt: "Who controls the black-sun network?",
            choices: [
              { id: "commissioner-rook", label: "Commissioner Elias Rook" },
              { id: "auditor-shaw", label: "Auditor Miriam Shaw" },
              { id: "clerk-vale", label: "Clerk Orson Vale" }
            ]
          },
          {
            id: "purpose",
            prompt: "What does a ‘correction’ actually do?",
            choices: [
              { id: "money-laundering", label: "Launders municipal money" },
              { id: "witness-erasure", label: "Erases protected witnesses from civic identity systems" },
              { id: "evidence-destruction", label: "Burns physical police evidence" }
            ]
          },
          {
            id: "support",
            prompt: "Which field records prove the controller and purpose together?",
            choices: [
              { id: "records-02-04", label: "Records 02 + 04 · witness erasure and Rook's authority" },
              { id: "records-01-03", label: "Records 01 + 03 · maintenance route and living witness" },
              { id: "records-03-04", label: "Records 03 + 04 · living witness and Rook's authority" }
            ]
          }
        ]
      }
    },
    answers: {
      A: { priority: "rescue-witness", exit: "bell-tunnel", support: "records-01-03" },
      B: { controller: "commissioner-rook", purpose: "witness-erasure", support: "records-02-04" }
    }
  },
  endings: {
    clean: {
      title: "Silent Extraction",
      body: "Naomi Vey reaches the rain through the mechanical bell tunnel while the Desk freezes the correction queue. The controller ledger follows in a canvas evidence bag. Rook does not learn which two detectives broke his system until warrants are already moving across the city."
    },
    exposed: {
      title: "The City Hears the Alarm",
      body: "Naomi and the ledger make it out, but the exchange alarm gives Rook time to disappear. His network is wounded and publicly exposed, not finished. The detectives have a witness, proof, and an enemy who now knows both their names."
    },
    partial: {
      title: "A Fractured Rescue",
      body: "The correction is interrupted, but the final protocol sacrifices part of the case. The black-sun network loses Saint Orison while its controller gains room to deny, destroy, or flee."
    },
    failed: {
      title: "The Ledger Goes Dark",
      body: "The operation breaks the exchange but not the system behind it. By dawn, official records insist Saint Orison was empty. Only two detectives and a damaged circuit remember otherwise."
    }
  },
  solution: {
    controller: "commissioner-rook",
    purpose: "witness-erasure",
    priority: "rescue-witness",
    exit: "bell-tunnel",
    truth: "Commissioner Elias Rook has used the abandoned exchange to remove protected witnesses from municipal identity systems. Naomi Vey is tonight's living entry; the ledger is the master index of the erased."
  },
  nextHook: {
    label: "NOCTURNE · FILE 03",
    title: "The City Without Rain",
    text: "At sunrise, every clock in the central precinct stops at 1:10. On The Desk's disconnected printer, one sentence appears: ‘You recovered the names. Now find the city they belong to.’",
    status: "The Street and The Desk will return."
  }
};
