// Interface translations: English, Spanish, Portuguese. Puzzle CONTENT
// (prompts, hints, answers) stays in the adventure's authored language —
// only the surrounding interface localizes. Server error messages also
// arrive in English.
'use strict';

const MESSAGES = {
  en: {
    'join.title': 'Join a game',
    'join.codeLabel': 'Game code',
    'join.nameLabel': 'Your name',
    'join.teamLabel': 'Your team',
    'join.teamHint': '(your host tells you which)',
    'join.button': 'Join',
    'join.pickTeam': '“{0}” — pick your team:',
    'join.enterName': 'enter your name',
    'host.title': 'Host a game',
    'host.desc': 'For the event host only — creates a new game and opens the host console.',
    'host.setup': 'Set up a game…',
    'host.adventure': 'Adventure',
    'host.teams': 'Team names (2–3 teams)',
    'host.team1': 'Team 1 name',
    'host.team2': 'Team 2 name',
    'host.team3': 'Team 3 name (optional)',
    'host.key': 'Host key',
    'host.keyHint': '(leave blank if not configured)',
    'host.create': 'Create game',
    'host.noAdventures': 'no adventures installed yet',
    'host.advOption': '{0} — {1} puzzles',
    'host.presets': 'Quick setup',
    'host.preset': '{0} puzzles · {1} min',
    'host.duration': 'Duration (minutes)',
    'host.puzzles': 'Puzzles',
    'host.puzzlesHint': 'Only a full-length game reaches the finale; a shorter one stops at the puzzle you pick.',
    'play.waiting': 'Waiting for your host to start the game…',
    'play.paused': '⏸ Game paused',
    'play.pausedDesc': 'Your host has paused the clock. Stretch!',
    'play.unlocked': 'Unlocked so far',
    'play.escaped': '🎉 You escaped!',
    'play.waitOthers': 'Waiting for the other teams — watch the final ranking on the call.',
    'play.gameOver': '⏱ Game over',
    'play.answerLabel': 'Your answer',
    'play.answerPlaceholder': 'type your answer…',
    'play.submit': 'Submit',
    'play.correct': '✔ Correct!',
    'play.lastOne': '🎉 That was the last one!',
    'play.wrong': '✘ Not it — keep going.',
    'play.revealHint': 'Reveal hint {0} (+{1}s penalty)',
    'play.confirmHint': 'Reveal hint {0}? Your team takes a {1}-second penalty.',
    'play.hintN': '💡 Hint {0}: {1}',
    'play.hostAssist': '(host assist)',
    'play.penalty': '+{0} penalty',
    'play.puzzlesCount': '{0}/{1} puzzles',
    'play.escapedIn': 'escaped in {0}',
    'play.inclPenalties': '(incl. {0} penalties)',
    'play.hiccup': 'connection hiccup: {0}',
    'play.fiveMin': '⏰ 5 minutes left!',
    'play.oneMin': '⏰ Final minute!',
    'play.offTab': '👀 {0}s off-tab',
    'solo.title': 'Play solo',
    'solo.desc': 'A room built for you on the spot — a different one every time. Six puzzles and a way out, in about fifteen minutes. No host, no team, no waiting.',
    'solo.nameLabel': 'Your name (optional)',
    'solo.start': 'Start a run',
    'solo.clockNote': 'The clock starts when you press the button.',
    'solo.backHome': '← hosted games',
    'solo.best': 'Your best so far: {0} — {1}/{2} puzzles.',
    'solo.escaped': '🎉 You got out in {0}',
    'solo.ranOut': '⏱ Time ran out — {0} of {1} puzzles solved',
    'solo.newBest': '⭐ A new personal best.',
    'solo.toBeat': 'Your best: {0}',
    'solo.again': 'Play another run',
    'ui.theme': 'Day / night',
    'ui.language': 'Language',
    'team.default1': 'Red Herrings',
    'team.default2': 'Locked Legends',
    'team.default3': 'Cryptic Crew',
  },
  es: {
    'join.title': 'Unirse a una partida',
    'join.codeLabel': 'Código de la partida',
    'join.nameLabel': 'Tu nombre',
    'join.teamLabel': 'Tu equipo',
    'join.teamHint': '(tu anfitrión te dirá cuál)',
    'join.button': 'Unirse',
    'join.pickTeam': '“{0}” — elige tu equipo:',
    'join.enterName': 'escribe tu nombre',
    'host.title': 'Organizar una partida',
    'host.desc': 'Solo para el anfitrión — crea una partida nueva y abre la consola del anfitrión.',
    'host.setup': 'Preparar una partida…',
    'host.adventure': 'Aventura',
    'host.teams': 'Nombres de los equipos (2–3 equipos)',
    'host.team1': 'Nombre del equipo 1',
    'host.team2': 'Nombre del equipo 2',
    'host.team3': 'Nombre del equipo 3 (opcional)',
    'host.key': 'Clave del anfitrión',
    'host.keyHint': '(déjala en blanco si no está configurada)',
    'host.create': 'Crear partida',
    'host.noAdventures': 'aún no hay aventuras instaladas',
    'host.advOption': '{0} — {1} enigmas',
    'host.presets': 'Configuración rápida',
    'host.preset': '{0} enigmas · {1} min',
    'host.duration': 'Duración (minutos)',
    'host.puzzles': 'Enigmas',
    'host.puzzlesHint': 'Solo una partida completa llega al final; una más corta termina en el enigma que elijas.',
    'play.waiting': 'Esperando a que tu anfitrión inicie la partida…',
    'play.paused': '⏸ Partida en pausa',
    'play.pausedDesc': 'Tu anfitrión ha pausado el reloj. ¡Estira las piernas!',
    'play.unlocked': 'Desbloqueado hasta ahora',
    'play.escaped': '🎉 ¡Habéis escapado!',
    'play.waitOthers': 'Esperando a los demás equipos — mirad la clasificación final en la llamada.',
    'play.gameOver': '⏱ Fin de la partida',
    'play.answerLabel': 'Tu respuesta',
    'play.answerPlaceholder': 'escribe tu respuesta…',
    'play.submit': 'Enviar',
    'play.correct': '✔ ¡Correcto!',
    'play.lastOne': '🎉 ¡Ese era el último!',
    'play.wrong': '✘ No es eso — seguid intentando.',
    'play.revealHint': 'Revelar pista {0} (+{1}s de penalización)',
    'play.confirmHint': '¿Revelar la pista {0}? Tu equipo recibe una penalización de {1} segundos.',
    'play.hintN': '💡 Pista {0}: {1}',
    'play.hostAssist': '(ayuda del anfitrión)',
    'play.penalty': '+{0} de penalización',
    'play.puzzlesCount': '{0}/{1} enigmas',
    'play.escapedIn': 'escapó en {0}',
    'play.inclPenalties': '(incl. {0} de penalizaciones)',
    'play.hiccup': 'problema de conexión: {0}',
    'play.offTab': '👀 {0}s fuera de la pestaña',
    'play.fiveMin': '⏰ ¡Quedan 5 minutos!',
    'play.oneMin': '⏰ ¡Último minuto!',
    'solo.title': 'Jugar en solitario',
    'solo.desc': 'Una sala creada para ti en el momento — distinta cada vez. Seis enigmas y una salida, en unos quince minutos. Sin anfitrión, sin equipo, sin esperas.',
    'solo.nameLabel': 'Tu nombre (opcional)',
    'solo.start': 'Empezar una partida',
    'solo.clockNote': 'El reloj arranca al pulsar el botón.',
    'solo.backHome': '← partidas con anfitrión',
    'solo.best': 'Tu mejor marca: {0} — {1}/{2} enigmas.',
    'solo.escaped': '🎉 Saliste en {0}',
    'solo.ranOut': '⏱ Se acabó el tiempo — {0} de {1} enigmas resueltos',
    'solo.newBest': '⭐ Nueva marca personal.',
    'solo.toBeat': 'Tu mejor marca: {0}',
    'solo.again': 'Jugar otra partida',
    'ui.theme': 'Día / noche',
    'ui.language': 'Idioma',
    'team.default1': 'Pistas Falsas',
    'team.default2': 'Leyendas Bajo Llave',
    'team.default3': 'Mentes Enigmáticas',
  },
  pt: {
    'join.title': 'Entrar em um jogo',
    'join.codeLabel': 'Código do jogo',
    'join.nameLabel': 'Seu nome',
    'join.teamLabel': 'Sua equipe',
    'join.teamHint': '(o anfitrião diz qual é a sua)',
    'join.button': 'Entrar',
    'join.pickTeam': '“{0}” — escolha sua equipe:',
    'join.enterName': 'digite seu nome',
    'host.title': 'Organizar um jogo',
    'host.desc': 'Somente para o anfitrião — cria um novo jogo e abre o console do anfitrião.',
    'host.setup': 'Preparar um jogo…',
    'host.adventure': 'Aventura',
    'host.teams': 'Nomes das equipes (2–3 equipes)',
    'host.team1': 'Nome da equipe 1',
    'host.team2': 'Nome da equipe 2',
    'host.team3': 'Nome da equipe 3 (opcional)',
    'host.key': 'Chave do anfitrião',
    'host.keyHint': '(deixe em branco se não estiver configurada)',
    'host.create': 'Criar jogo',
    'host.noAdventures': 'nenhuma aventura instalada ainda',
    'host.advOption': '{0} — {1} enigmas',
    'host.presets': 'Configuração rápida',
    'host.preset': '{0} enigmas · {1} min',
    'host.duration': 'Duração (minutos)',
    'host.puzzles': 'Enigmas',
    'host.puzzlesHint': 'Só um jogo completo chega ao final; um mais curto termina no enigma que você escolher.',
    'play.waiting': 'Aguardando o anfitrião iniciar o jogo…',
    'play.paused': '⏸ Jogo pausado',
    'play.pausedDesc': 'O anfitrião pausou o relógio. Estique as pernas!',
    'play.unlocked': 'Desbloqueado até agora',
    'play.escaped': '🎉 Vocês escaparam!',
    'play.waitOthers': 'Aguardando as outras equipes — vejam a classificação final na chamada.',
    'play.gameOver': '⏱ Fim de jogo',
    'play.answerLabel': 'Sua resposta',
    'play.answerPlaceholder': 'digite sua resposta…',
    'play.submit': 'Enviar',
    'play.correct': '✔ Correto!',
    'play.lastOne': '🎉 Esse era o último!',
    'play.wrong': '✘ Não é isso — continuem tentando.',
    'play.revealHint': 'Revelar dica {0} (+{1}s de penalidade)',
    'play.confirmHint': 'Revelar a dica {0}? Sua equipe recebe uma penalidade de {1} segundos.',
    'play.hintN': '💡 Dica {0}: {1}',
    'play.hostAssist': '(ajuda do anfitrião)',
    'play.penalty': '+{0} de penalidade',
    'play.puzzlesCount': '{0}/{1} enigmas',
    'play.escapedIn': 'escapou em {0}',
    'play.inclPenalties': '(incl. {0} de penalidades)',
    'play.hiccup': 'problema de conexão: {0}',
    'play.fiveMin': '⏰ Faltam 5 minutos!',
    'play.oneMin': '⏰ Último minuto!',
    'play.offTab': '👀 {0}s fora da aba',
    'solo.title': 'Jogar sozinho',
    'solo.desc': 'Uma sala criada para você na hora — diferente a cada vez. Seis enigmas e uma saída, em cerca de quinze minutos. Sem anfitrião, sem equipe, sem espera.',
    'solo.nameLabel': 'Seu nome (opcional)',
    'solo.start': 'Começar uma partida',
    'solo.clockNote': 'O relógio começa quando você aperta o botão.',
    'solo.backHome': '← jogos com anfitrião',
    'solo.best': 'Sua melhor marca: {0} — {1}/{2} enigmas.',
    'solo.escaped': '🎉 Você saiu em {0}',
    'solo.ranOut': '⏱ O tempo acabou — {0} de {1} enigmas resolvidos',
    'solo.newBest': '⭐ Novo recorde pessoal.',
    'solo.toBeat': 'Sua melhor marca: {0}',
    'solo.again': 'Jogar outra partida',
    'ui.theme': 'Dia / noite',
    'ui.language': 'Idioma',
    'team.default1': 'Pistas Falsas',
    'team.default2': 'Lendas Trancadas',
    'team.default3': 'Turma do Enigma',
  },
};

const LANGS = { en: 'English', es: 'Español', pt: 'Português' };

function detectLang() {
  const saved = localStorage.getItem('escape:lang');
  if (saved && MESSAGES[saved]) return saved;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return MESSAGES[nav] ? nav : 'en';
}

let LANG = detectLang();

function t(key, ...args) {
  let s = MESSAGES[LANG]?.[key] ?? MESSAGES.en[key] ?? key;
  args.forEach((a, i) => { s = s.replaceAll(`{${i}}`, a); });
  return s;
}

// Static markup translation: elements carry data-i18n (textContent) or
// data-i18n-placeholder attributes with a message key.
function applyI18n() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
}

// Resolve an adventure's localized title/intro; puzzle content is never
// localized, so this only ever consults the adventure's i18n block.
function advText(adv, field) {
  return adv?.i18n?.[LANG]?.[field] ?? adv?.[field] ?? '';
}

function setLang(l) {
  if (!MESSAGES[l]) return;
  LANG = l;
  localStorage.setItem('escape:lang', l);
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange'));
}
