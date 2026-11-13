// Modifica facilmente nomi, battute e domande della tua festa di laurea!
// Ogni NPC corrisponde agli sprite ritagliati da npcs.png (amico_1..4, prof_1..4).

export const GAME_CONFIG = {
  laureandoNome: 'Dottore',
  titoloTesi: 'Sistemi Distribuiti e Intelligenza Artificiale',
  votoFinale: '110 e Lode',
  corsoDiLaurea: 'Ingegneria Informatica',
};

export const DIALOGUES = {
  // === ZONA 1: CORTILE ESTERNO & ATRIO (4 AMICI) ===
  friends: [
    {
      id: 'amico_1',
      spriteKey: 'npc_amico_1',
      name: 'Marco',
      role: 'Compagno di Corso',
      tileX: 5,
      tileY: 11,
      facing: 'down',
      emote: '!',
      linesBeforeTesi: [
        'Ehi campione! Ce l\'hai fatta finalmente!',
        'Sembra ieri che studiavamo Analisi 1 alle 2 di notte a suon di caffè.',
        'Sbrigati a recuperare la Tesi da Giulia qui vicino, la commissione ti aspetta in Aula!',
      ],
      linesAfterTesi: [
        'Con quella copertina rossa fiammante sei già pronto per il 110 e Lode!',
        'Entra dalle porte blu qui sopra, noi ti raggiungiamo tra poco per il brindisi!',
      ],
    },
    {
      id: 'amico_2',
      spriteKey: 'npc_amico_2',
      name: 'Giulia',
      role: 'Custode della Tesi',
      tileX: 11,
      tileY: 9,
      facing: 'down',
      emote: '!',
      givesTesi: true,
      linesAlreadyHasTesi: [
        'Hai già la tua Tesi di Laurea nello zaino!',
        'Fai un bel respiro ed entra dalle porte blu per la discussione!',
      ],
      questIntro: [
        'Eccoti! Sono passata in copisteria stamattina presto per ritirare la tua copia!',
        'Ma prima di consegnartela, dimmi: qual è la regola d\'oro di ogni laureando?',
      ],
      questQuestion: {
        prompt: 'Cosa non deve MAI mancare il giorno della laurea?',
        options: [
          {
            label: 'La Tesi rilegata e tanta grinta!',
            isCorrect: true,
            reply: [
              'Risposta esatta da vero 110 e Lode!',
              'Ecco a te la tua TESI DI LAUREA rilegata in rosso!',
            ],
          },
          {
            label: 'Un altro esame a sorpresa!',
            isCorrect: false,
            reply: [
              'Haha, per fortuna gli esami sono finiti tutti!',
              'Dai, riproviamo... cosa ti serve per discutere oggi?',
            ],
          },
        ],
      },
    },
    {
      id: 'amico_3',
      spriteKey: 'npc_amico_3',
      name: 'Luca',
      role: 'Amico Storico',
      tileX: 15,
      tileY: 12,
      facing: 'down',
      emote: '!',
      linesBeforeTesi: [
        'Ohhh, ma quanto sei elegante con quel completo?!',
        'Ho già messo in fresco lo spumante nello zaino, appena esci con l\'alloro stappiamo!',
      ],
      linesAfterTesi: [
        'Tesi recuperata! Ora vai lì dentro e spacca tutto!',
      ],
    },
    {
      id: 'amico_4',
      spriteKey: 'npc_amico_4',
      name: 'Sara',
      role: 'Collega di Laboratorio',
      tileX: 6,
      tileY: 13,
      facing: 'down',
      emote: 'heart',
      linesBeforeTesi: [
        'Tutto il gruppo tifa per te oggi!',
        'Ricorda: parla chiaro, guarda la commissione e goditi il momento.',
      ],
      linesAfterTesi: [
        'Sii fiero di tutto il percorso fatto. In bocca al lupo per la discussione!',
      ],
    },
  ],

  // === ZONA 2: AULA DELLA DISCUSSIONE (COMMISSIONE) ===
  commission: [
    {
      id: 'prof_1',
      spriteKey: 'npc_prof_1',
      name: 'Prof. Rossi',
      role: 'Presidente di Commissione',
      isPresident: true,
      tileX: 9.5,
      tileY: 5,
      facing: 'down',
      emote: '...',
      linesWithoutTesi: [
        'Buongiorno candidato! La commissione è pronta per ascoltare la sua esposizione.',
        'Però non vedo la sua Tesi... Torni nel cortile esterno a recuperarla da Giulia!',
      ],
      linesReadyForDefense: [
        'Benvenuto in Aula della Discussione! Vedo che ha portato la Tesi rilegata.',
        'È tutto pronto. Diamo inizio alla sua discussione di laurea!',
      ],
    },
    {
      id: 'prof_2',
      spriteKey: 'npc_prof_2',
      name: 'Prof.ssa Bianchi',
      role: 'Relatrice',
      tileX: 8.0,
      tileY: 5,
      facing: 'down',
      emote: '...',
      lines: [
        'Ottimo lavoro durante questi mesi di ricerca e sviluppo.',
        'Quando si sente pronto, si rivolga al Presidente al centro della cattedra!',
      ],
    },
    {
      id: 'prof_3',
      spriteKey: 'npc_prof_3',
      name: 'Prof. Verdi',
      role: 'Commissario',
      tileX: 11.0,
      tileY: 5,
      facing: 'down',
      emote: '...',
      lines: [
        'Ho letto con interesse la sua introduzione e i risultati sperimentali.',
        'Parli con il Presidente di Commissione per iniziare la discussione.',
      ],
    },
  ],

  // === SEQUENZA FINALE / PROCLAMAZIONE ===
  proclamation: {
    introText: 'La Commissione di Laurea ti sfida alla DISCUSSIONE FINALE!',
    questionPrompt: 'Come presenti i risultati della tua tesi alla Commissione?',
    moves: [
      {
        name: 'ESPOSIZIONE BRILLANTE',
        detail: 'Spieghi architettura e risultati con padronanza',
        effective: true,
        reaction: 'È superefficace! La Commissione annuisce colpita dalla chiarezza!',
      },
      {
        name: 'DEMO LIVE PERFETTA',
        detail: 'Il codice gira al primo colpo senza bug',
        effective: true,
        reaction: 'Colpo critico! Applauso spontaneo in tutta l\'aula!',
      },
    ],
    proclamationLines: [
      'PRESIDENTE: "La Commissione, valutati i meriti del candidato e l\'eccellente discussione..."',
      'PRESIDENTE: "...la proclama DOTTORE con la votazione di 110 e LODE!"',
      'Hai ricevuto la CORONA D\'ALLORO! Congratulazioni, Dottore!',
    ],
  },
};
