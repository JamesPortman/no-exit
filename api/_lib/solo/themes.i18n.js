// Spanish and Portuguese vocabulary for the Solo themes.
//
// Kept beside themes.js rather than inside it so the English definitions stay
// readable. `spots` and `props` must be in the SAME ORDER as their English
// counterparts: the generator picks an index once, with the seed, and then
// indexes every language with it — so a run reads as the same room whichever
// language it is displayed in.
//
// Entries carry their article ("el mostrador", "a estufa"). The templates
// supply prepositions and the contract() helper in lang.js fixes the
// resulting "de el" → "del", "de a" → "da", and friends.
module.exports = {
  'drowned-library': {
    es: {
      keeper: 'Wren',
      spots: ['las estanterías inundadas', 'el fichero', 'un registro hinchado',
              'la mesa de la sala de lectura', 'el carrito de devoluciones', 'un estante alabeado'],
      props: ['una marca de tiza', 'una papeleta a lápiz', 'una ficha',
              'un ex libris', 'una nota al margen'],
    },
    pt: {
      keeper: 'Wren',
      spots: ['as estantes alagadas', 'o fichário', 'um registro inchado',
              'a mesa da sala de leitura', 'o carrinho de devoluções', 'uma prateleira empenada'],
      props: ['uma marca de giz', 'uma papeleta a lápis', 'uma ficha',
              'um ex-líbris', 'uma nota na margem'],
    },
  },
  'night-market': {
    es: {
      keeper: 'el vendedor de especias',
      spots: ['el puesto de especias', 'un mostrador cerrado', 'la mesa de pesaje',
              'el carro de flores', 'una pila de cajones', 'la garita del portero'],
      props: ['una etiqueta de precio', 'una pizarra escrita', 'un cucurucho de papel',
              'una pesa de latón', 'un recibo doblado'],
    },
    pt: {
      keeper: 'o vendedor de especiarias',
      spots: ['a barraca de especiarias', 'um balcão fechado', 'a mesa de pesagem',
              'o carrinho de flores', 'uma pilha de caixotes', 'a guarita do porteiro'],
      props: ['uma etiqueta de preço', 'uma lousa escrita', 'um cone de papel',
              'um peso de latão', 'um recibo dobrado'],
    },
  },
  'frozen-station': {
    es: {
      keeper: 'el jefe de estación',
      spots: ['la ventanilla de billetes', 'la caseta de señales', 'la sala de espera',
              'el reloj del andén', 'un horario escarchado', 'el estante de objetos perdidos'],
      props: ['una nota clavada', 'un billete picado', 'una raya de tiza',
              'una etiqueta de equipaje', 'una placa rayada'],
    },
    pt: {
      keeper: 'o chefe da estação',
      spots: ['a bilheteria', 'a cabine de sinais', 'a sala de espera',
              'o relógio da plataforma', 'um horário coberto de geada', 'a prateleira de achados e perdidos'],
      props: ['um bilhete preso', 'uma passagem picotada', 'um risco de giz',
              'uma etiqueta de bagagem', 'uma placa riscada'],
    },
  },
  'orrery-room': {
    es: {
      keeper: 'el cuidador',
      spots: ['la armadura de latón', 'un cajón de engranajes', 'el escritorio de cálculo',
              'el armario de los planetas', 'una efeméride polvorienta', 'el pozo del contrapeso'],
      props: ['una placa grabada', 'una cifra a lápiz', 'una etiqueta de engranaje',
              'una hoja de papel vegetal', 'un disco estampado'],
    },
    pt: {
      keeper: 'o guardião',
      spots: ['a armação de latão', 'uma gaveta de engrenagens', 'a escrivaninha de cálculo',
              'o armário dos planetas', 'uma efeméride empoeirada', 'o poço do contrapeso'],
      props: ['uma placa gravada', 'um número a lápis', 'uma etiqueta de engrenagem',
              'uma folha de papel vegetal', 'um disco estampado'],
    },
  },
  glasshouse: {
    es: {
      keeper: 'la jardinera jefe',
      spots: ['la mesa de propagación', 'una fila de macetas de barro', 'las tuberías de nebulización',
              'los cajones de semillas', 'un cristal empañado', 'el compostero'],
      props: ['una etiqueta atada', 'un sobre de semillas', 'una estaca escrita a lápiz',
              'una etiqueta de cobre', 'una hoja prensada'],
    },
    pt: {
      keeper: 'a jardineira-chefe',
      spots: ['a bancada de propagação', 'uma fileira de vasos de barro', 'os canos de nebulização',
              'as gavetas de sementes', 'uma vidraça embaçada', 'a baia de composto'],
      props: ['uma etiqueta amarrada', 'um pacote de sementes', 'uma estaca escrita a lápis',
              'uma etiqueta de cobre', 'uma folha prensada'],
    },
  },
  'bell-foundry': {
    es: {
      keeper: 'el fundidor',
      spots: ['el molde que se enfría', 'el banco de afinación', 'un soporte de badajos',
              'el estante de los crisoles', 'el tablón de cuentas', 'un suelo de arena'],
      props: ['una cifra escrita con tiza', 'una banda estampada', 'la marca del fundidor',
              'una cuenta rayada', 'una etiqueta de enfriado'],
    },
    pt: {
      keeper: 'o fundidor',
      spots: ['o molde esfriando', 'a bancada de afinação', 'um suporte de badalos',
              'a prateleira dos cadinhos', 'o quadro de contagens', 'um chão de areia'],
      props: ['um número escrito a giz', 'uma faixa estampada', 'a marca do fundidor',
              'uma contagem riscada', 'uma etiqueta de resfriamento'],
    },
  },
  'salt-mine': {
    es: {
      keeper: 'el capataz',
      spots: ['una galería agotada', 'la carcasa de la bomba', 'la puerta de la jaula',
              'un pilar de sal gema', 'el nicho de las herramientas', 'la estaca de topografía'],
      props: ['una marca de cera', 'una placa rayada', 'una etiqueta de topografía',
              'una flecha de tiza', 'una ficha estampada'],
    },
    pt: {
      keeper: 'o encarregado',
      spots: ['uma galeria esgotada', 'a carcaça da bomba', 'a porta da gaiola',
              'um pilar de sal-gema', 'o nicho das ferramentas', 'a estaca de topografia'],
      props: ['uma marca de cera', 'uma placa riscada', 'uma etiqueta de topografia',
              'uma seta de giz', 'uma ficha estampada'],
    },
  },
  'paper-mill': {
    es: {
      keeper: 'el capataz',
      spots: ['el secadero', 'una tina de pasta', 'la platina de la prensa',
              'el almacén de trapos', 'una pila de formas', 'la cuba de encolado'],
      props: ['una filigrana', 'una hoja clavada', 'una esquina escrita a lápiz',
              'una prueba de imprenta', 'un borde estampado'],
    },
    pt: {
      keeper: 'o encarregado',
      spots: ['o secadouro', 'uma tina de pasta', 'a mesa da prensa',
              'o depósito de trapos', 'uma pilha de formas', 'a tina de colagem'],
      props: ['uma marca-d’água', 'uma folha presa', 'um canto escrito a lápis',
              'uma prova de impressão', 'uma borda estampada'],
    },
  },
};
