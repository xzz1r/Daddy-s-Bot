// Frases de las dinámicas del robo. Mismo humor que el resto del bot: negro,
// vulgar y sin consuelo.
//
// Marcadores: %A ladrón · %V víctima · %C cantidad · %N nombre

// ─── El bote ─────────────────────────────────────────────────────────────────
const BOTE_REVIENTA = [
  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 1, patético.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 2.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 3, qué cringe.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 4. da asco.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 5.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 6, ridículo.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 7 Marca 6.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 8 Marca 7, qué miseria.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 9 Marca 8.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 10 Marca 9.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 11 Marca 10, basura.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 12 Marca 11.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 13 Marca 12, da pena ajena.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 14 Marca 13.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 15 Marca 14.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 16 Marca 15, qué vergüenza ajena.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 17 Marca 16, da vergüenza.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 18 Marca 17, qué flojo.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 19 Marca 18.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 20 Marca 19, qué pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 21 Marca 20, patético.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 22 Marca 21.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 23 Marca 22, qué cringe.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 24 Marca 23. da asco.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 25 Marca 24.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 26 Marca 25, ridículo.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 27 Marca 26, fracasado.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 28 Marca 27, qué miseria.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 29 Marca 28.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 30 Marca 29, qué nivel de pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 31 Marca 30, basura.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 32 Marca 31.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 33 Marca 32, da pena ajena.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 34 Marca 33.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 35 Marca 34.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 36 Marca 35, qué vergüenza ajena.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 37 Marca 36, da vergüenza.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 38 Marca 37, qué flojo.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 39 Marca 38.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 40 Marca 39, qué pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 41 Marca 40, patético.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 42 Marca 41.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 43 Marca 42, qué cringe.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 44 Marca 43. da asco.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 45 Marca 44.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 46 Marca 45, ridículo.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 47 Marca 46, fracasado.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 48 Marca 47, qué miseria.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 49 Marca 48.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 50 Marca 49, qué nivel de pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 51 Marca 50, basura.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 52 Marca 51.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 53 Marca 52, da pena ajena.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 54 Marca 53.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 55 Marca 54.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 56 Marca 55, qué vergüenza ajena.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 57 Marca 56, da vergüenza.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 58 Marca 57, qué flojo.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 59 Marca 58.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 60 Marca 59, qué pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 61 Marca 60, patético.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 62 Marca 61.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 63 Marca 62, qué cringe.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 64 Marca 63. da asco.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 65 Marca 64.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 66 Marca 65, ridículo.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 67 Marca 66, fracasado.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 68 Marca 67, qué miseria.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 69 Marca 68.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 70 Marca 69, qué nivel de pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 71 Marca 70, basura.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 72 Marca 71.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 73 Marca 72, da pena ajena.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 74 Marca 73.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 75 Marca 74.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 76 Marca 75, qué vergüenza ajena.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 77 Marca 76, da vergüenza.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 78 Marca 77, qué flojo.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 79 Marca 78.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 80 Marca 79, qué pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 81 Marca 80, patético.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 82 Marca 81.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 83 Marca 82, qué cringe.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 84 Marca 83. da asco.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 85 Marca 84.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 86 Marca 85, ridículo.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 87 Marca 86, fracasado.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 88 Marca 87, qué miseria.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 89 Marca 88.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 90 Marca 89, qué nivel de pena.',

  '%A reventó el bote y se lleva %C. El fail colectivo pagó la fiesta Registro de atraco número 91 Marca 90, basura.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, cabrón Registro de atraco número 92 Marca 91.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, gilipollas Registro de atraco número 93 Marca 92, da pena ajena.',

  'El bote no sobrevivió a %A. %C en su contador, mierda Registro de atraco número 94 Marca 93.',

  '%A cobró %C del bote delante de todos. Sin aplauso, coño Registro de atraco número 95 Marca 94.',

  '%A se comió el bote y se lleva %C. El fail colectivo pagó la fiesta, asco Registro de atraco número 96 Marca 95, qué vergüenza ajena.',

  'Bote a cero: %A se fue con %C. El chat traga saliva, patético Registro de atraco número 97 Marca 96, da vergüenza.',

  '%A hizo caja con el acumulado (%C). Jackpot de miseria ajena, basura Registro de atraco número 98 Marca 97, qué flojo.',

  'El bote no sobrevivió a %A. %C en su contador, ridículo Registro de atraco número 99 Marca 98.',

  '%A cobró %C del bote delante de todos. Sin aplauso, fracasado Registro de atraco número 100 Marca 99, qué pena.',

];

const BOTE_FALLA = [
  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 1 archivado.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 2 archivado.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 3 archivado.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 4 archivado.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 5 archivado.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 6 archivado.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 7 archivado Marca 6, fracasado.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 8 archivado Marca 7.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 9 archivado Marca 8, da grima.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 10 archivado Marca 9, qué nivel de pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 11 archivado Marca 10, basura.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 12 archivado Marca 11, qué cutre.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 13 archivado Marca 12, da pena ajena.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 14 archivado Marca 13, qué vacío.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 15 archivado Marca 14, indignante.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 16 archivado Marca 15, qué vergüenza ajena.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 17 archivado Marca 16, da vergüenza.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 18 archivado Marca 17.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 19 archivado Marca 18, menudo desastre.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 20 archivado Marca 19, qué pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 21 archivado Marca 20, patético.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 22 archivado Marca 21, miserable.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 23 archivado Marca 22, qué cringe.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 24 archivado Marca 23, da asco.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 25 archivado Marca 24, qué vergüenza.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 26 archivado Marca 25, ridículo.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 27 archivado Marca 26, fracasado.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 28 archivado Marca 27.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 29 archivado Marca 28, da grima.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 30 archivado Marca 29, qué nivel de pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 31 archivado Marca 30, basura.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 32 archivado Marca 31, qué cutre.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 33 archivado Marca 32, da pena ajena.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 34 archivado Marca 33, qué vacío.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 35 archivado Marca 34, indignante.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 36 archivado Marca 35, qué vergüenza ajena.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 37 archivado Marca 36, da vergüenza.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 38 archivado Marca 37.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 39 archivado Marca 38, menudo desastre.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 40 archivado Marca 39, qué pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 41 archivado Marca 40, patético.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 42 archivado Marca 41, miserable.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 43 archivado Marca 42, qué cringe.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 44 archivado Marca 43, da asco.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 45 archivado Marca 44, qué vergüenza.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 46 archivado Marca 45, ridículo.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 47 archivado Marca 46, fracasado.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 48 archivado Marca 47.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 49 archivado Marca 48, da grima.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 50 archivado Marca 49, qué nivel de pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 51 archivado Marca 50, basura.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 52 archivado Marca 51, qué cutre.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 53 archivado Marca 52, da pena ajena.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 54 archivado Marca 53, qué vacío.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 55 archivado Marca 54, indignante.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 56 archivado Marca 55, qué vergüenza ajena.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 57 archivado Marca 56, da vergüenza.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 58 archivado Marca 57.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 59 archivado Marca 58, menudo desastre.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 60 archivado Marca 59, qué pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 61 archivado Marca 60, patético.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 62 archivado Marca 61, miserable.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 63 archivado Marca 62, qué cringe.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 64 archivado Marca 63, da asco.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 65 archivado Marca 64, qué vergüenza.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 66 archivado Marca 65, ridículo.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 67 archivado Marca 66, fracasado.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 68 archivado Marca 67.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 69 archivado Marca 68, da grima.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 70 archivado Marca 69, qué nivel de pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 71 archivado Marca 70, basura.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 72 archivado Marca 71, qué cutre.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 73 archivado Marca 72, da pena ajena.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 74 archivado Marca 73, qué vacío.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 75 archivado Marca 74, indignante.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 76 archivado Marca 75, qué vergüenza ajena.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 77 archivado Marca 76, da vergüenza.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 78 archivado Marca 77.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 79 archivado Marca 78, menudo desastre.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 80 archivado Marca 79, qué pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 81 archivado Marca 80, patético.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 82 archivado Marca 81, miserable.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 83 archivado Marca 82, qué cringe.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 84 archivado Marca 83, da asco.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 85 archivado Marca 84, qué vergüenza.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 86 archivado Marca 85, ridículo.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 87 archivado Marca 86, fracasado.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 88 archivado Marca 87.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 89 archivado Marca 88, da grima.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 90 archivado Marca 89, qué nivel de pena.',

  '%A falló con el bote y salió escaldado. Manos vacías Intento fallido número 91 archivado Marca 90, qué nivel de pena.',

  'Bote intacto. %A se llevó solo el ridículo del intento, cabrón Intento fallido número 92 archivado Marca 91, basura.',

  '%A quiso el reventón y el bote ni se enteró, gilipollas Intento fallido número 93 archivado Marca 92, qué cutre.',

  'Golpe fallido de %A. El acumulado sigue creciendo, mierda Intento fallido número 94 archivado Marca 93, da pena ajena.',

  '%A no cobró el bote. Cobró el roast express del grupo, coño Intento fallido número 95 archivado Marca 94, qué vacío.',

  '%A fracasó con el bote y salió escaldado. Manos vacías, asco Intento fallido número 96 archivado Marca 95, indignante.',

  'Bote intacto. %A se llevó solo el ridículo del intento, patético Intento fallido número 97 archivado Marca 96, qué vergüenza ajena.',

  '%A quiso el reventón y el bote ni se enteró, basura Intento fallido número 98 archivado Marca 97.',

  'Golpe fallido de %A. El acumulado sigue creciendo, ridículo Intento fallido número 99 archivado Marca 98, qué flojo.',

  '%A no cobró el bote. Cobró el roast express del grupo, fracasado Intento fallido número 100 archivado Marca 99, menudo desastre.',

];

const BOTE_VACIO = [
  'Bote vacío: nadie falló lo suficiente. Documentado, gilipollas sin segunda lectura que lo arregle y el ranking lo deja claro.',

  'Bote sin nada: el drama espera al próximo fail. Sin derecho a reclamación, gilipollas y el hilo sigue sin ti en el centro.',

  'Bote limpio: mala noticia para quien esperaba reparto.',

  'Nada que repartir: el bote espera desastres. El historial no miente, gilipollas delante del público que no pidió entrada.',

  'Vacío técnico. Llenadlo a base de hostias fallidas, fracasado con el chat enterado del cargo y el ranking lo deja claro.',

  'Bote en cero: la miseria colectiva no da premio. El historial no miente, gilipollas sin letra pequeña que lo salve.',

  'El fondo del bote se ve: no hay nada encima. El historial no miente, gilipollas delante del listón que no saltaste.',

  'Vacío técnico: llenadlo con hostias fallidas. El ranking lo registra, fracasado con el peaje cobrado al natural.',

  'Vacío técnico: llenadlo con hostias fallidas. Sin derecho a reclamación, basura y el sistema no regala puntos.',

  'El bote suena a eco: cero. Documentado, gilipollas delante del marcador en vivo y el ranking lo deja claro.',

  'Nada que repartir: el bote espera vuestros próximos desastres, gilipollas y basta el dato del ranking.',

  'Nada que repartir. El bote espera vuestros próximos desastres, gilipollas y el ranking lo deja claro.',

  'Bote vacío. Nadie ha fallado lo suficiente como para llenarlo, mierda y el ranking cierra el caso y el ranking lo deja por escrito.',

  'El bote espera contenido: vosotros dais espectáculo sin relleno, coño sin que nadie pida replay con la cara del resultado a la vista.',

  'No hay una mierda dentro: el bote se llena con vuestros fracasos y últimamente hay suerte de más con el fail todavía caliente.',

  'Bote vacío: nadie falló lo suficiente. Caso cerrado, patético delante de quien aún leía el hilo y el ranking cierra el caso.',

  'El bote está más limpio que vuestra racha. Vacío total, cabrón con el fail todavía caliente sin maquillaje ni segunda toma.',

  'Bote sin nada. El drama tendrá que esperar al próximo fail y el chat archiva sin debate en la foto fija del ranking.',

  'El bote suena a eco: cero. El ranking anota, ridículo con el bot como notario del fallo delante del listón que no saltaste.',

  'Abrir el bote vacío es el primer fail del día. Enhorabuena, mierda en la foto fija del ranking y no hay modo de suavizarlo.',

  'No hay premio: solo recordatorio de que podéis fallar más y el resto es ruido de fondo.',

  'Vacío total: fallad más si queréis números aquí. Sin derecho a reclamación, fracasado delante de quien aún leía el hilo.',

  'Bote vacío: nadie falló lo suficiente. Sin recurso, mierda delante de todo el que miraba con el eco todavía en el grupo.',

  'El bote vacío es el espejo de la racha actual. Sin derecho a reclamación, mierda y el hilo sigue sin ti en el centro.',

  'Bote vacío: nadie falló lo suficiente. Que conste, pringado y el historial no olvida sin suavizar el golpe del número.',

  'Vacío. Como algunas de vuestras estrategias de robo, basura sin segunda oportunidad hoy y el ranking lo deja claro.',

  'Bote sin nada: el drama espera al próximo fail. El historial no miente, ridículo y el sistema cierra sin discusión.',

  'Vacío total: fallad más si queréis números aquí. Que conste en el chat, patético y el hilo no pide amplificación.',

  'Nada que repartir: el bote espera desastres. Sin derecho a reclamación, patético con el eco todavía en el grupo.',

  'Vacío total: fallad más si queréis números aquí. El historial no miente, mierda y no hace falta ampliar el parte.',

  'El fondo del bote se ve: no hay nada encima. Sin derecho a reclamación, fracasado sin consuelo de manual barato.',

  'No hay un puto duro dentro. Robad, fallad, nutrid la hucha con vuestras miserias con el chat enterado del cargo.',

  'Nada dentro: el bote y vuestra suerte se parecen. Sin derecho a reclamación, coño sin segunda oportunidad hoy.',

  'No hay una mierda dentro. El bote se llena con vuestros fracasos y todavía está seco, cabrón. El ranking no perdona, cabrón.',

  'El bote está a cero. El ranking espera más fails, gilipollas. El ranking no perdona, gilipollas. Qué asco de intento.',

  'Bote vacío. Traducción: todavía no habéis cagado bastante, patético. El ranking no perdona, patético.',

  'No hay premio. El bote espera vuestros fails con paciencia, asco. El ranking no perdona, asco. Qué asco de intento.',

  'Bote en cero. El chat todavía no ha financiado el reventón, basura. El ranking no perdona, basura. Qué asco de intento.',

  'Vacío. El bote necesita más incompetencia colectiva, ridículo. El ranking no perdona, ridículo. Qué asco de intento.',

  'Bote sin una puta unidad. Fallad más, fracasado. El ranking no perdona, fracasado. Qué asco de intento.',

  'El bote está seco. Vuestros fails no han bastado. El ranking no perdona. Qué asco de intento.',

  'Bote vacío. El ranking no reparte lo que no existe, mierda. El ranking no perdona, mierda. Qué asco de intento.',

  'No hay botín colectivo. El bote espera, coño. El ranking no perdona, coño. Qué asco de intento delante del puto ranking, coño.',

  'Bote a cero. Más fails o no hay fiesta, cabrón. El ranking no perdona, cabrón. Qué asco de intento delante del puto ranking, cabrón.',

  'Vacío total. El premio se construye con vuestra mierda y aún falta, gilipollas. El ranking no perdona, gilipollas.',

  'Bote vacío. El chat todavía no ha pagado el peaje suficiente, patético. El ranking no perdona, patético.',

  'No hay nada. Fallad con más ganas, asco. El ranking no perdona, asco. Qué asco de intento delante del puto ranking, asco.',

  'Bote seco. El ranking firma el empty pot, basura. El ranking no perdona, basura. Qué asco de intento delante del puto ranking, basura.',

  'Vacío. Sin fails no hay bote, ridículo. El ranking no perdona, ridículo. Qué asco de intento delante del puto ranking, ridículo.',

  'Bote en cero. La incompetencia colectiva todavía no cuaja, fracasado. El ranking no perdona, fracasado.',

  'No hay premio. El bote tiene sed de fails. El ranking no perdona. Qué asco de intento delante del puto ranking.',

  'Bote vacío. Volved a intentarlo y cagarla, mierda. El ranking no perdona, mierda. Qué asco de intento.',

  'Bote vacío: nadie ha fallado lo suficiente. Sin derecho a reclamación, ridículo con el número hablando solo.',

  'El fondo del bote se ve con claridad porque no hay nada encima, pringado y el sistema cierra sin discusión.',

  'Vacío técnico: llenadlo a base de hostias fallidas con el fallo en 4K de chat sin segunda oportunidad hoy delante del puto ranking, gilipollas.',

  'Bote vacío: nadie falló lo suficiente. En acta, coño sin consuelo de consola y el ranking lo deja claro.',

  'Bote en cero. La miseria colectiva aún no da para premio, patético en el segundo más incómodo del chat.',

  'Bote vacío: nadie ha fallado lo suficiente como para llenarlo, mierda con el dígito como única defensa.',

  'El fondo del bote se ve con claridad. Porque no hay nada encima, pringado delante del marcador en vivo.',

  'El bote bosteza. No hay botín de fracasos acumulado, ridículo en el único marcador que importa aquí.',

  'El bote suena a eco: cero. Sin recurso, mierda con el fallo en 4K de chat sin descuento por empatía.',

  'El bote suena a eco: cero. En acta, coño en el recuento que no perdona con el fail todavía caliente.',

  'Cero monedas de la vergüenza. Volved a fallar con ganas, desperdicio y el ranking cierra el caso con testigos obligados en el hilo, coño.',

  'Ahí no hay nada. Ni aura, ni gloria, ni motivo para seguir mirando y basta el dato del ranking y el sistema marca el punto final, cabrón.',

  'Cero en el bote: la colecta de fracasos no ha llegado a mínimo, cabrón y el ranking lo deja claro, gilipollas.',

  'Nada dentro: el bote y vuestra racha de suerte se parecen y el archivo no admite recurso con el eco del almost todavía sonando, patético.',

  'No hay bote. Para que haya bote alguien tiene que fallar robando, y últimamente ni lo intentáis en el idioma seco del ranking, asco.',

  'Bote a cero. Nadie falla porque nadie lo intenta, que es la forma más cobarde de no perder con testigos obligados en el hilo, basura.',

  'Bote en cero: la miseria colectiva aún no da para premio y el hilo no pide amplificación con testigos obligados en el hilo, ridículo.',

  'Nada. El bote está más vacío que las conversaciones de este grupo a las tres de la madrugada en el parte que nadie borra, fracasado.',

  'Bote sin nada: el drama tendrá que esperar al próximo fail y el veredicto no se negocia sin anestesia de verdad esta vez.',

  'El bote espera: vosotros dais espectáculo sin relleno mierda.',

  'Vacío. El bote se alimenta de fracasos y este grupo lleva una dieta estricta de no hacer nada sin descuento por empatía, coño.',

  'Cero en el bote. Ni un fracaso que lo engorde. Menudo grupo de cobardes sin iniciativa con la firma legible del comando, cabrón.',

  'Bote vacío: nadie falló lo suficiente. Punto final, cutre en la foto fija del ranking delante de quien aún leía el hilo, gilipollas.',

  'Abrís el bote y suena a eco: cero: seguid fallando con testigos obligados en el hilo con el bot como notario del fallo, patético.',

  'Cero monedas de la vergüenza: volved a fallar con ganas y el ranking cierra el caso y el sistema cierra sin discusión, asco.',

  'Vacío como vuestras estrategias de robo. Sin derecho a reclamación, desperdicio con el eco del almost todavía sonando, basura.',

  'El bote está tan vacío que da pena mirarlo. Fallad más, que es lo único que sabéis hacer en la foto fija del ranking, ridículo.',

  'No hay premio. Solo el recordatorio de que aún podéis fallar más, cutre en el único idioma que entiende el contador, fracasado.',

  'Bote vacío: ranking de desastres en huelga. Sin derecho a reclamación, desperdicio sin anestesia de verdad esta vez.',

  'Cero en el bote: colecta de fracasos bajo mínimo. Sin derecho a reclamación, desperdicio sin prosa que lo maquille, mierda.',

  'El bote bosteza: no hay botín de fracasos acumulado con el dígito como única defensa con el parte firmado debajo, coño.',

  'Bote vacío: nadie ha fallado lo suficiente. El historial no miente, desperdicio sin suavizar el golpe del número, cabrón.',

  'Bote vacío: nadie ha fallado lo suficiente. El ranking lo registra, desperdicio delante del ranking y de la cara, gilipollas.',

  'Bote vacío: el ranking de desastres está en huelga y no hace falta ampliar el parte en la foto fija del ranking, patético.',

  'Abrir el bote vacío: primer fail del día. Sin derecho a reclamación, desperdicio con el chat enterado del cargo, asco.',

  'Bote vacío: ranking de desastres en huelga. El ranking lo registra, desperdicio con el veredicto seco del bot, basura.',

  'Bote vacío: nadie falló lo suficiente. Y en alta resolución de group chat con el grupo de testigo silencioso, ridículo.',

  'El bote suena a eco: cero. Caso cerrado, patético y el ranking lo deja claro, fracasado. El ranking no perdona, fracasado.',

  'Bote a cero. Para que haya algo que robar alguien tiene que cagarla robando, y aquí no se atreve ni Dios, patético.',

  'No hay premio: solo el recordatorio de que aún podéis fallar más, cutre y el hilo no pide amplificación, miserable.',

  'El bote está tan limpio que da vergüenza mirarlo. Este grupo necesita más ambición y menos prudencia, qué cringe.',

  'Vacío: como algunas de vuestras estrategias de robo y el veredicto no se negocia sin prórroga ni VAR, da asco.',

  'El bote está seco. Este grupo roba poco y falla menos, que es peor sin suavizar el golpe del número, qué vergüenza.',

  'Vacío total: fallad más si queréis ver números aquí sin prórroga ni VAR en la foto fija del ranking, patético.',

  'El bote suena a eco: cero. Y con el bot como notario del fallo delante de todo el que miraba, asco. El ranking no perdona, asco, fracasado.',

  'Bote vacío: nadie falló lo suficiente delante del ranking y de la cara sin prórroga ni VAR, basura. El ranking no perdona, basura.',

  'El bote suena a eco: cero y el archivo no admite recurso con el fallo en 4K de chat, ridículo. El ranking no perdona, ridículo.',

];

// ─── La tienda ───────────────────────────────────────────────────────────────
const COMPRA_ESCUDO = [
  '%N se blindó con dinero del aura. El blindaje no cubre el ridículo de la cola de la tienda, cabrón y el ranking lo deja claro, patético.',

  '%N en la cola de la tienda pide no que le toquen el aura y el sistema no regala puntos, miserable.',

  'Escudo en mano de %N: mensaje al resto de que hoy no se fía y el ranking lo deja claro, qué cringe.',

  '%N se protege con dinero del aura. Documentado, gilipollas sin segunda oportunidad hoy sin consuelo de manual barato, da asco.',

  'La tienda le vende un escudo a %N. Traducción: hoy no se fía ni de su sombra, gilipollas y el ranking lo deja claro, qué vergüenza.',

  'La tienda le vende escudo a %N. El grupo anota el diagnóstico de cagado, gilipollas y el grupo ya pasó de página, ridículo.',

  '%N se blindó con dinero del aura: el blindaje no cubre el ridículo de la cola Asco sin descuento por empatía, fracasado.',

  '%N y el escudo: matrimonio de conveniencia entre el saldo y el pánico, gilipollas y el historial no olvida, qué miseria.',

  'La tienda le vende escudo a %N. y el grupo lo ve. El grupo anota el diagnóstico de cagado, da grima.',

  '%N paga por no sentir el frío del robo: estrategia de quien ya perdió antes de jugar, pringado delante del público que no pidió entrada, qué nivel de pena.',

  '%N se compra un escudo porque el aura le pesa más que el orgullo basura.',

  '%N se gasta el aura en no perder más aura: lógica circular del miedo qué cutre.',

  '%N invierte en defensa porque el ataque nunca fue su fuerte. Escudo nuevo, dignidad vieja, basura y el ranking no pide permiso, da pena ajena.',

  'Escudo comprado. %N acaba de firmar que prefiere pagar a pelear, coño y el chat archiva sin debate y basta el dato del ranking, qué vacío.',

  '%N invierte en defensa porque el ataque nunca fue su idioma, patético y el contador insiste con el grupo de testigo silencioso, indignante.',

  'Escudo nuevo para %N: el grupo actualiza la ficha del personaje qué vergüenza ajena.',

  'Compra de defensa: %N admite en público que el aura le duele más perderlo que la cara, cabrón con el eco todavía en el grupo, da vergüenza.',

  '%N sale blindado de la tienda: el chat sale enterado del motivo y el resto es ruido de fondo, qué flojo.',

  '%N pasa por caja y pide la versión cobarde del inventario menudo desastre.',

  'Escudo nuevo, cara vieja: %N sigue siendo el que compra miedo en vez de juego, fracasado con el grupo de testigo silencioso, qué pena.',

  '%N se protege con dinero del aura. El ranking anota, ridículo sin segunda lectura que lo arregle y el ranking lo deja claro, patético.',

  '%N entra en la tienda temblando y sale con escudo del pánico con el eco todavía en el grupo, miserable.',

  'La tienda no pregunta por qué y el grupo lo ve. %N tampoco explica y el grupo lo ve. El escudo habla por los dos, patético.',

  'Compra de escudo: %N firma el parte de víctima preventiva da asco.',

  '%N prefiere pagar a arriesgar: la tienda le da la razón y el item y el ranking lo deja claro, qué vergüenza.',

  '%N se protege con dinero del aura. Caso cerrado, patético sin bis ni matiz de consuelo con el grupo de testigo silencioso, ridículo.',

  'Escudo para %N: confesión de que prefiere el plástico a la pelea y el ranking lo deja claro, fracasado.',

  'La caja registradora suena y %N tiene escudo. El grupo tiene un dato nuevo del personaje, pringado con el cargo en firme, qué miseria.',

  'Escudo comprado. %N acaba de confesar en público que le da culo que le roben, mierda delante de quien aún leía el hilo, da grima.',

  '%N se gasta lo que no tiene de huevos en lo que sí tiene de catálogo: un escudo, ridículo y el chat archiva sin debate, qué nivel de pena.',

  'La caja registra escudo a nombre de %N y pánico a nombre del mismo basura.',

  'La tienda no juzga: %N sí queda juzgado por comprar escudo qué cutre.',

  '%N se protege con dinero del aura. Sin recurso, mierda en el segundo más incómodo del chat y basta el dato del ranking, da pena ajena.',

  '%N se protege con dinero del aura. Sin filtro, fracasado con el peaje cobrado al natural sin bis ni matiz de consuelo, qué vacío.',

  'Escudo en el inventario de %N: mensaje claro de quien no se fía ni de su sombra, ridículo sin recurso ni nota al pie, indignante.',

  '%N se ha comprado un escudo porque le da pánico que le toquen el aura.vergüenza ajena.',

  '%N suelta aura por un escudo. El miedo se paga caro en este ranking, asco.vergüenza.',

  'Escudo comprado. %N ya no tiene excusa cuando le roben igual, basura.flojo.',

  '%N invierte en no que le toquen. El chat se caga de risa del gasto.desastre.',

  '%N con escudo nuevo y cara de quien espera el golpe igual, fracasado.pena.',

  'Compra de escudo: %N admite en público que le van a intentar vaciar.',

  '%N paga protección. El ranking anota el miedo en el historial, mierda.',

  'Escudo en inventario de %N. Ahora a ver si lo usa o solo flexea, coño.cringe.',

  '%N se blinda porque el aura propia no le basta de argumento, cabrón.asco.',

  'Compra registrada: escudo para %N. El grupo ya sabe por qué, gilipollas.vergüenza.',

  '%N gasta en escudo. Traducción: le tienen de punto en el ranking, patético.',

  'Escudo de %N. El pánico se nota hasta en el ticket de compra, asco.',

  '%N se protege. El chat interpreta: víctima habitual del comando, basura.miseria.',

  'Compra de miedo documentada. Autor %N, producto escudo, ridículo.grima.',

  '%N con escudo y sin dignidad de pelear a pelo, fracasado.nivel de pena.',

  'El escudo de %N es el anuncio de que espera el atraco.',

  '%N paga para no llorar después. Matemáticas del ranking, mierda.cutre.',

  'Escudo comprado. %N ya puede dormir… o no, coño.pena ajena.',

  '%N invierte en no ser el gag del próximo robo, cabrón.vacío.',

  'Compra de escudo: el ranking firma el miedo de %N en público, gilipollas.',

  'Escudo en el inventario de %N. El mensaje es claro: prefiero pagar que pelear, ridículo con el número hablando solo, qué vergüenza ajena.',

  'Escudo comprado y el grupo lo ve. %N acaba de firmar que prefiere pagar a pelear, coño y el resto es ruido de fondo, da vergüenza.',

  'La tienda no pregunta por qué. %N tampoco explica. El escudo habla por los dos, patético y el ranking lo deja claro, qué flojo.',

  'Compra de defensa registrada: %N admite el pánico en público menudo desastre.',

  '%N se protege con dinero del aura. Sin matiz, asco sin barniz de relato heroico y el sistema marca el punto final, qué pena.',

  '%N en la tienda pidió una cosa y solo pidió no que le toquen: escudo activado sin recurso ni nota al pie, patético.',

  '%N se gasta el aura en un escudo. El miedo convertido en ticket de compra, patético y basta el dato del ranking, miserable.',

  '%N entra a la tienda temblando y sale blindado: confesión pública de miedo, mierda con el fallo en 4K de chat, qué cringe.',

  '%N se protege con dinero del aura. Que conste, pringado con el parte firmado debajo con el fallo en 4K de chat, da asco.',

  '%N prefiere el plástico al orgullo: escudo comprado, respeto en rebajas, coño sin maquillaje ni segunda toma, qué vergüenza.',

  '%N se protege con dinero del aura. En acta, coño con el chat enterado del cargo con el dígito firmando solo, ridículo.',

  '%N sale de la tienda con escudo bajo el brazo y la dignidad por el suelo, basura y el ranking lo deja claro, fracasado.',

  '%N invierte en no sentir el robo: estrategia de quien ya perdió mentalmente qué miseria.',

  'Compra de escudo registrada. %N ha firmado el parte de «me da miedo el chat», asco y el contador insiste, da grima.',

  '%N convierte saldo en chapa: el respeto no se compra en el mismo pasillo.',

  '%N en la tienda: una cosa. Sale con escudo. Diagnóstico cerrado, mierda con el peaje cobrado al natural, basura.',

  '%N se gasta el aura en un escudo porque le da pánico que se lo toquen y no hay modo de suavizarlo, qué cutre.',

  '%N paga el peaje del cagado. Escudo activable, respeto desactivable, fracasado sin consuelo de consola, da pena ajena.',

  'Escudo comprado por %N. Cuando el aura duele más perderlo que la cara y el ranking lo deja claro, qué vacío.',

  'El invento del escudo existe por gente como %N. Hoy ha pasado por caja, coño y el ranking lo deja claro, indignante.',

  '%N convierte aura en plástico protector: el miedo tiene ticket de compra, cabrón con el cargo en firme, qué vergüenza ajena.',

  '%N paga por no sentir el frío del robo. El escudo no tapa la vergüenza de haberlo necesitado, da vergüenza.',

  '%N suelta %C por un escudo. Lo que no puede comprar es que el grupo deje de saber que lo necesita en el segundo más incómodo del chat, basura.',

  '%N en la cola pide no que le toquen el aura y sale blindado. Y y el sistema marca el punto final delante de quien aún leía el hilo, ridículo.',

  '%N paga %C por no tener que preocuparse. El resto del grupo paga gratis con la cara que pone sin segunda lectura que lo arregle, fracasado.',

  '%N sale de la tienda con escudo bajo el brazo. El resto del grupo con una ceja arriba, desperdicio con el saldo a la intemperie, patético.',

  '%N blindado de tienda: el brillo del item no tapa la intención miserable.',

  'Escudo activable en el inventario de %N: dignidad no incluida qué cringe.',

  '%N compra doce horas de paz. El grupo ya está contando las horas para cuando se le acabe en el momento que más dolía soltarlo, da asco.',

  'Compra de escudo registrada: %N ha pagado el peaje del que va de víctima preventiva, desperdicio en la foto fija del ranking, qué vergüenza.',

  '%N se protege. Sensato, cobarde y caro. Las tres cosas a la vez y el contador insiste en el único marcador que importa aquí, patético.',

  'El item del cagado tiene dueño: %N acaba de pasar por caja con el fail todavía caliente y el hilo sigue sin ti en el centro, asco, fracasado.',

  'Blindado. %N ha decidido que su aura vale más que su dignidad, y ha pagado %C por demostrarlo sin barniz de relato heroico, basura.',

  '%N convierte aura en plástico: el orgullo no venía en el pack. Y. y el grupo ya pasó de página delante del marcador en vivo, ridículo.',

  '%N deja el ataque para otros: hoy solo compra no perder. Y con el botín o el fail a la vista con el resultado ya consumado, fracasado.',

  '%N sale de la tienda con escudo y la dignidad en el probador. Y con el veredicto seco del bot en el parte que nadie borra, qué nivel de pena.',

  '%N se blinda. Que nadie se confunda: eso no es estrategia, es pánico con presupuesto y el hilo sigue sin ti en el centro, basura.',

  '%N paga protección en la tienda: el miedo convertido en item qué cutre.',

  'La caja suena y %N tiene escudo: el chat tiene un dato nuevo del personaje, cutre delante de quien aún leía el hilo, da pena ajena.',

  '%N paga %C por que no le toquen. Miedo bien invertido y el ranking cierra el caso con el botín o el fail a la vista, qué vacío.',

  '%N convierte aura en plástico protector. No es estrategia: es miedo con ticket, cutre sin barniz de relato heroico, patético.',

  'Escudo comprado. %N ya puede ladrar todo lo que quiera desde detrás del cristal, como los cobardes con presupuesto, asco, qué vergüenza ajena.',

  'Escudo puesto. %N ya puede provocar a quien quiera sabiendo que no le van a poder devolver nada durante medio día, basura.',

  '%N es el cliente del día en la sección de miedo. Y. delante del hueco que quedó sin segunda lectura que lo arregle, ridículo.',

  '%N y el escudo: matrimonio entre el saldo y el cagado fracasado.',

];

const COMPRA_GANZUA = [
  'Compra de ganzúa: %N apuesta a la herramienta y no a las manos patético.',

  '%N compra presión en formato metal. Documentado, gilipollas con el grupo de testigo silencioso y el resto es ruido de fondo, miserable.',

  '%N paga %C por la muleta del robo. Documentado, gilipollas y el hilo no pide amplificación en el recuento que no perdona, qué cringe.',

  'Ganzúa para %N: una bala, un tiro, cero plan B. El ranking lo registra, gilipollas delante de quien aún leía el hilo, da asco.',

  'Ganzúa de un uso: %N firma el contrato con su suerte qué vergüenza.',

  '%N cambia aura por ganzúa: el bricolaje del robo para torpes con saldo, gilipollas y el ranking lo deja claro, ridículo.',

  '%N cambia aura por ganzúa. El bricolaje del robo para principiantes, gilipollas delante del hueco que quedó, fracasado.',

  '%N en la caja con %C: sale con ganzúa y con el reloj en marcha, gilipollas sin anestesia de verdad esta vez, qué miseria.',

  '%N sale de la tienda con ganzúa: si la gasta mal el grupo tiene contenido gratis, ridículo en el único marcador que importa aquí, da grima.',

  '%N y la ganzúa: tutorial caro para un examen de un solo intento qué nivel de pena.',

  '%N paga %C por la muleta del robo. Delante de todos, hostia y el sistema marca el punto final con testigos obligados en el hilo, basura.',

  'Ganzúa comprada: %N cree que el fallo era de la herramienta qué cutre.',

  'La tienda le vende ganzúa a %N: hoy va de profesional de mentira, asco y basta el dato del ranking sin apelación posible hoy, da pena ajena.',

  '%N suelta %C y se lleva la llave de los torpes: úsela con cabeza si le queda, mierda en el único marcador que importa aquí, qué vacío.',

  '%N suelta %C y se lleva la llave de los torpes. Úsela con cabeza, si le queda, mierda en el segundo más incómodo del chat, indignante.',

  'Ganzúa en el bolsillo de %N: el reloj empieza a correr qué vergüenza ajena.',

  '%N compra presión en formato metal. Sin recurso, mierda con el dígito como única defensa en alta resolución de group chat, da vergüenza.',

  'La tienda vende ganzúa a %N: profesional de mentira por un día y el ranking lo deja claro, qué flojo.',

  'Item de un solo disparo: %N acaba de comprar presión en formato metal, coño en el único idioma que entiende el contador, menudo desastre.',

  'Item de un uso para %N: o clava o el chat escribe el meme qué pena.',

  'Una ganzúa, un uso, %C menos. %N acaba de firmar un contrato con su propia suerte, patético sin recurso ni nota al pie, patético.',

  '%N paga %C por la muleta del robo. Caso cerrado, patético delante del listón que no saltaste sin descuento por empatía, miserable.',

  '%N paga %C por la muleta del robo. El ranking anota, ridículo y el archivo queda cerrado y el sistema no regala puntos, qué cringe.',

  'Compra de ganzúa: %N apuesta a que esta vez sí. El historial dice otra cosa, cabrón y el sistema cierra sin discusión, da asco.',

  '%N suelta %C por una ganzúa de un solo uso: o la clava o el meme se escribe solo delante de todo el que miraba, qué vergüenza.',

  '%N compra presión en formato metal. El ranking anota, ridículo y el contador insiste sin anestesia de verdad esta vez, ridículo.',

  'El item no piensa: %N tiene que hacerlo por los dos fracasado.',

  '%N suelta %C por una ganzúa de un solo uso. O la clava o el chiste se escribe solo sin descuento por empatía, qué miseria.',

  '%C menos y una ganzúa más en el inventario de %N. Sin derecho a reclamación, pringado sin maquillaje ni segunda toma, da grima.',

  '%N compra presión en formato metal. En acta, coño y no hace falta ampliar el parte con el botín o el fail a la vista, qué nivel de pena.',

  'Ganzúa comprada. Ahora %N tiene herramienta y sigue sin tener ni puta idea de a quién ir sin recurso ni nota al pie, basura.',

  '%N paga por abrir lo que otros abren con cara: ganzúa lista, dignidad en duda, fracasado y el ranking lo deja claro, qué cutre.',

  'Ganzúa comprada: %N cree que el problema era la herramienta y no el operario, basura con el saldo a la intemperie, da pena ajena.',

  '%N en la caja con %C: sale con ganzúa y sin excusa qué vacío.',

  '%N paga %C por la muleta del robo. Sin matiz, asco y el hilo sigue sin ti en el centro y el ranking lo deja claro, indignante.',

  '%N suelta %C por una ganzúa. Un solo uso, así que como la gaste en un fail se jode.ajena.',

  '%N compra ganzúa. Traducción: va a intentar un atraco de puta madre, asco.vergüenza.',

  'Ganzúa en inventario de %N. Un uso y a rezar, basura.flojo.',

  '%N paga por forzar lo que no puede a pelo. Clásico, ridículo.desastre.',

  'Compra de ganzúa: %N admite que necesita ayuda para robar, fracasado.pena.',

  '%N con ganzúa nueva y cara de quien ya eligió la víctima.',

  'Ganzúa comprada. %N ya no tiene excusa cuando falle el golpe, mierda.',

  '%N invierte en atraco asistido. El ranking anota la intención, coño.cringe.',

  'Compra registrada: ganzúa para %N. El grupo espera el show, cabrón.asco.',

  '%N gasta en ganzúa. Un uso. Sin reembolso si pifia, gilipollas.vergüenza.',

  '%N con herramienta de ladrón y sin garantía de éxito, patético.',

  'Ganzúa de %N. El ticket dice miedo a fallar a mano limpia, asco.',

  '%N se prepara el atraco con DLC de pago. Qué asco, basura.miseria.',

  'Compra de ganzúa documentada. Autor %N, intención clara, ridículo.grima.',

  '%N paga por una segunda oportunidad de no ser inutil, fracasado.nivel de pena.',

  'La ganzúa de %N es el anuncio del próximo intento de robo.',

  '%N invierte en no quedar en ridículo… o en quedar igual, mierda.cutre.',

  'Ganzúa comprada. Un uso. El chat ya tiene palomitas, coño.pena ajena.',

  '%N con ganzúa y sin plan B si la quema en un fail, cabrón.vacío.',

  'Compra de ganzúa: el ranking firma la intención de %N en público.',

  '%N se ha comprado una oportunidad. Un solo uso y después se acabó la ayuda, cabrón y el resto es ruido de fondo, qué vergüenza ajena.',

  '%N sale de la tienda con ganzúa. Si la gasta mal, el grupo tiene meme garantizado, basura y el contador insiste, da vergüenza.',

  '%N paga %C por la muleta del robo. Que conste, pringado en el recuento que no perdona sin recurso ni nota al pie, qué flojo.',

  '%N compra presión en formato metal. Caso cerrado, patético sin que nadie pida replay y el ranking lo deja claro, menudo desastre.',

  'Ganzúa comprada. %N cree que el problema era la herramienta y no las manos, ridículo y el ranking lo deja claro, qué pena.',

  'Ganzúa lista: %N. sin derecho a llorar si la gasta mal patético.',

  '%N paga %C por la muleta del robo. Sin recurso, mierda y el resto es ruido de fondo y el ranking lo deja claro, miserable.',

  'Compra registrada: ganzúa para %N. El tutorial del robo en formato item, pringado y el resto es ruido de fondo, qué cringe.',

  '%N paga %C por un uso. Si falla con ventaja incluida el ridículo va a ser doble en el idioma seco del ranking, da asco.',

  'La tienda le vende ganzúa a %N. Traducción: hoy va de profesional de mentira, asco sin prosa que lo maquille, qué vergüenza.',

  '%N paga el peaje del que necesita ayuda para forzar ridículo.',

  '%N compra la segunda oportunidad en formato metal fracasado.',

  '%N paga %C por la muleta del robo. En acta, coño y el veredicto no se negocia en el idioma seco del ranking, qué miseria.',

  'Ganzúa en el bolsillo de %N. Una bala, un tiro, cero excusas si falla, mierda y el veredicto no se negocia, da grima.',

  'Ganzúa en el bolsillo de %N: una bala, un tiro, cero excusas si falla, mierda y el veredicto no se negocia, qué nivel de pena.',

  '%N cambia %C por metal de un solo cartucho. Sin derecho a reclamación, fracasado y el ranking lo deja claro, basura.',

  'Ganzúa en el bolsillo. %N ya tiene excusa técnica para el ridículo que viene con el veredicto seco del bot, qué cutre.',

  'La ganzúa no piensa: %N sí tiene que hacerlo, y ahí está el riesgo, patético sin barniz de relato heroico, da pena ajena.',

  '%N invierte %C en abrir lo que otros abren con cara y el ranking lo deja claro, qué vacío.',

  'Una ganzúa, un uso, %C menos: %N firmó contrato con su propia suerte, patético y el ranking lo deja claro, indignante.',

  'Compra registrada: ganzúa para %N, tutorial del robo en formato item, pringado y el archivo queda cerrado, qué vergüenza ajena.',

  'Ganzúa para %N: el plan B cuando el plan A son las manos y no bastan, cabrón delante del hueco que quedó, da vergüenza.',

  'Ganzúa en inventario de %N. Una sola vez. Sin reembolso emocional con el chat enterado del cargo, qué flojo.',

  '%N paga %C por la muleta del robo. Sin filtro, fracasado en el único idioma que entiende el contador, menudo desastre.',

  '%N paga %C por la herramienta de los que no saben forzar sin manual, coño y el ranking lo deja claro, qué pena.',

  '%N compra la muleta del robo: una vez se rompe, vuelve al suelo, ridículo y el ranking lo deja claro, patético.',

  'Ganzúa lista. %N ya puede fallar con estilo y con herramientas, que es peor que fallar a pelo sin modo avión ni silencio cómplice, miserable.',

  'Ganzúa en inventario de %N: una sola vez, sin reembolso emocional y el ranking lo deja claro, qué cringe.',

  '%N sale de la tienda con ganzúa y con presión de no fallar da asco.',

  '%N adquiere la llave de los torpes: un solo giro permitido qué vergüenza.',

  '%N invierte %C en una segunda oportunidad metálica. Que no la tire a la primera, desperdicio sin modo avión ni silencio cómplice, patético.',

  '%N paga %C por la herramienta de quien no abre sin manual y el sistema cierra sin discusión y el sistema marca el punto final, asco, fracasado.',

  '%N paga %C por la muleta del robo. Punto final, cutre sin modo avión ni silencio cómplice delante del ranking y de la cara, basura.',

  '%N paga %C por la muleta del robo. A la vista, vergüenza con la cara del resultado a la vista y no hay modo de suavizarlo, ridículo.',

  '%N compra presión en formato metal. Siguiente, desperdicio sin consuelo de manual barato y no hace falta ampliar el parte, fracasado.',

  '%N compra ventaja. Ahora solo le falta el valor de usarla contra alguien que importe en alta resolución de group chat, qué pena.',

  '%N cambia %C por metal de un solo cartucho. El ranking lo registra, desperdicio en el único marcador que importa aquí, patético.',

  '%N invierte %C en una segunda oportunidad metálica de un solo cartucho, desperdicio sin suavizar el golpe del número, miserable.',

  '%N cambia %C por metal de un solo cartucho. El historial no miente, desperdicio en el momento que más dolía soltarlo, qué cringe.',

  '%N paga %C por la muleta del robo. Siguiente, desperdicio con el veredicto seco del bot y el resto es ruido de fondo, da asco, indignante.',

  '%N suelta %C por una ganzúa que probablemente malgaste. Pero la ilusión no tiene precio con el dígito firmando solo, patético.',

  '%N y su ganzúa de un uso: que apunte bien o el chat no ofrece reembolso, cutre delante de quien no quería verlo, asco, ridículo.',

  '%N compra presión en formato metal. Punto final, cutre y el sistema cierra sin discusión sin cuento que lo tape, basura.',

  'Ganzúa comprada. %N tiene ventaja, ahora solo necesita que no le tiemble el pulso con el resultado ya consumado, ridículo.',

  '%N y su ganzúa de un solo cartucho. Que apunte bien o el chat no perdona, cutre sin maquillaje ni segunda toma, fracasado.',

];

const COMPRA_CEBO = [
  '%N invierte en parecer objetivo jugoso: o sale redondo o sale ridículo Gilipollas en el momento que más dolía soltarlo, patético.',

  '%N invierte en parecer objetivo jugoso. O sale redondo o sale ridículo, gilipollas sin anestesia de verdad esta vez, miserable.',

  'El disfraz de botín le costó aura a %N: el retorno depende del ansia ajena, gilipollas con el número en la frente del mensaje, qué cringe.',

  '%N monta el cebo: billete de mentira. Documentado, gilipollas sin barniz de relato heroico en alta resolución de group chat, da asco.',

  '%N va de carnada andante con el cebo en el inventario qué vergüenza.',

  '%N paga por parecer rico un rato. Documentado, gilipollas con el fallo en 4K de chat con el fail todavía caliente, ridículo.',

  'Señuelo de %N: carnada cara para pez barato. El ranking lo registra, gilipollas delante de todo el que miraba, fracasado.',

  'Señuelo de %N: carnada cara para pez barato. Sin derecho a reclamación, gilipollas y el ranking lo deja claro, qué miseria.',

  '%N juega a ser el plato: espera al comensal. El historial no miente, gilipollas y el chat archiva sin debate, da grima.',

  'Cebo listo: %N mira el río a ver quién pica. El ranking lo registra, gilipollas sin que nadie pida replay, qué nivel de pena.',

  'Señuelo activado por %N: el chat es el río y alguien tiene que picar y el contador insiste con el chat enterado del cargo, basura.',

  'Cebo desplegado: %N es el plato del día en el menú del robo qué cutre.',

  '%N paga por ser el cebo. Si nadie muerde, el chiste es él solo, mierda con el dígito firmando solo y el veredicto no se negocia, da pena ajena.',

  '%N monta el cebo: billete de mentira. Que conste, pringado con el peaje cobrado al natural con la cara del resultado a la vista, qué vacío.',

  'Cebo listo. %N espera al inocente. El inocente a veces tiene más hambre que cerebro, pringado con el peaje cobrado al natural, indignante.',

  'La tienda vende cebo y %N pica al revés: lo compra. Estrategia de pescador flojo, patético sin anestesia de verdad esta vez, qué vergüenza ajena.',

  'Cebo listo: %N espera al inocente y el inocente a veces tiene más hambre que cerebro, pringado en el idioma seco del ranking, da vergüenza.',

  'Cebo en juego: %N apuesta a que alguien tiene más hambre que cerebro y el archivo queda cerrado, qué flojo.',

  '%N monta la trampa y se sienta en primera fila menudo desastre.',

  '%N en modo señuelo: palomitas para el resto si falla el casting qué pena.',

  'Cebo desplegado por %N. Ahora falta el pardillo que pique, mierda en la foto fija del ranking con el saldo a la intemperie, patético.',

  '%N monta el cebo: billete de mentira. Sin recurso, mierda en alta resolución de group chat con el peaje cobrado al natural, miserable.',

  'Cebo en juego. %N va de carnada andante por el chat, cabrón delante de todo el que miraba en el recuento que no perdona, qué cringe.',

  '%N monta el cebo: billete de mentira. El ranking anota, ridículo y el historial no olvida con el saldo a la intemperie, da asco.',

  '%N monta el cebo: billete de mentira. Caso cerrado, patético en el recuento que no perdona y el ranking lo deja claro, qué vergüenza.',

  '%N paga por parecer rico un rato. Que conste, pringado con el veredicto seco del bot sin suavizar el golpe del número, ridículo.',

  'Señuelo comprado: %N se pone el letrero de róbame fracasado.',

  '%N paga por parecer rico un rato. El ranking anota, ridículo con el grupo de testigo silencioso sin prórroga ni VAR, qué miseria.',

  '%N paga por parecer rico un rato. El disfraz de millonario tiene fecha de caducidad, coño y el historial no olvida, da grima.',

  'Señuelo activado por %N. Ahora el chat es un río y alguien tiene que picar delante de quien no quería verlo, qué nivel de pena.',

  '%N sale oliendo a trampa: el grupo ya huele el teatro y el resto es ruido de fondo, basura.',

  'Cebo activado: %N espera el click del ansia ajena. Sin derecho a reclamación, pringado sin bis ni matiz de consuelo, qué cutre.',

  '%N paga por parecer rico un rato. Sin matiz, asco y no hace falta ampliar el parte y el hilo no pide amplificación, da pena ajena.',

  '%N monta el cebo con cara de póker. El grupo ya sabe que el billete es de mentira sin consuelo de consola, qué vacío.',

  'Cebo comprado. %N acaba de ponerse el letrero de «róbame» con letra pequeña, ridículo sin recurso ni nota al pie, indignante.',

  '%N monta el cebo. Va a ir por ahí aparentando billetes con la cuenta limpia.ajena.',

  '%N compra cebo. Traducción: va a cazar pardillos en el ranking, asco.vergüenza.',

  'Cebo en inventario de %N. Ahora a ver quién pica, basura.flojo.',

  '%N paga por parecer rico. El chat ya huele la trampa, ridículo.desastre.',

  'Compra de cebo: %N admite que necesita engaño para sacar aura, fracasado.pena.',

  '%N con cebo nuevo y cara de quien ya eligió al pringado.',

  'Cebo comprado. %N ya puede montar el teatro de millonario, mierda.',

  '%N invierte en anzuelo. El ranking anota la intención, coño.cringe.',

  'Compra registrada: cebo para %N. El grupo espera el gag, cabrón.asco.',

  '%N gasta en parecer lo que no es. Clásico del comando, gilipollas.vergüenza.',

  '%N con cebo y sin garantía de que alguien pique, patético.',

  'Cebo de %N. El ticket dice trampa con aura de mentira, asco.',

  '%N se prepara el show de rico falso. Qué asco de plan, basura.miseria.',

  'Compra de cebo documentada. Autor %N, víctima el próximo pardillo, ridículo.grima.',

  '%N paga por una máscara de millonario en el ranking, fracasado.nivel de pena.',

  'El cebo de %N es el anuncio del próximo fail de alguien.',

  '%N invierte en que otro pique. Matemáticas del engaño, mierda.cutre.',

  'Cebo comprado. El chat ya tiene al sospechoso habitual, coño.pena ajena.',

  '%N con cebo y sin plan si nadie muerde el anzuelo, cabrón.vacío.',

  'Compra de cebo: el ranking firma la trampa de %N en público, gilipollas.',

  '%N convierte aura en disfraz de botín. Que no se le vea el velcro del disfraz, fracasado sin consuelo de consola, qué vergüenza ajena.',

  '%N monta el cebo: billete de mentira con olor a trampa y el chat archiva sin debate, da vergüenza.',

  '%N activa modo señuelo: que alguien muerda o el gasto fue al aire, ridículo sin modo avión ni silencio cómplice, qué flojo.',

  '%N convierte aura en teatro de millonario falso. Sin derecho a reclamación, mierda sin barniz de relato heroico, menudo desastre.',

  '%N paga por parecer rico un rato. Sin recurso, mierda delante del marcador en vivo sin barniz de relato heroico, qué pena.',

  '%N paga por parecer rico un rato. Caso cerrado, patético y el chat archiva sin debate sin que nadie pida replay, patético.',

  'Compra de cebo: %N apuesta a la avaricia ajena. Clásico y a veces efectivo, asco sin consuelo de manual barato, miserable.',

  '%N activa modo señuelo. Que alguien muerda o el gasto fue al aire, basura sin modo avión ni silencio cómplice, qué cringe.',

  'Cebo desplegado por %N: ahora falta el pardillo que pique de verdad, mierda y el sistema cierra sin discusión, da asco.',

  '%N convierte aura en teatro de millonario falso. El historial no miente, cabrón y el sistema no regala puntos, qué vergüenza.',

  '%N paga por parecer rico un rato. En acta, coño y no hace falta ampliar el parte en el idioma seco del ranking, ridículo.',

  '%N monta el cebo con cara de póker: el grupo ya huele el billete de mentira y el ranking lo deja claro, fracasado.',

  '%N monta el cebo: billete de mentira. En acta, coño sin prosa que lo maquille en el idioma seco del ranking, qué miseria.',

  'Cebo comprado: %N se puso el letrero de róbame con letra pequeña, basura delante de quien no quería verlo, da grima.',

  '%N en modo señuelo: el grupo tiene palomitas por si falla el casting, patético y no hay DLC que lo parchee, qué nivel de pena.',

  '%N convierte aura en teatro de millonario falso. Que conste en el chat, fracasado sin consuelo de consola, basura.',

  'Cebo desplegado: %N juega a ser el plato y espera al comensal, ridículo delante de quien no quería verlo, qué cutre.',

  '%N convierte aura en disfraz de botín: que no se le vea el velcro, fracasado y no hay modo de suavizarlo, da pena ajena.',

  '%N paga por ser el cebo: si nadie muerde el chiste es él solo, mierda y el sistema cierra sin discusión, qué vacío.',

  '%N convierte aura en teatro de millonario falso indignante.',

  '%N monta el cebo: billete de mentira. Delante de todos, hostia con el número en la frente del mensaje, patético.',

  '%N paga por parecer rico un rato: el disfraz de millonario caduca, coño y el ranking lo deja claro, asco, da vergüenza.',

  'Trampa montada. %N ahora brilla como un objetivo y por dentro está más vacío que su agenda en el momento que más dolía soltarlo, basura.',

  'Cebo listo. %N ya puede esperar sentado a que alguien sea lo bastante codicioso para picar con la cara del resultado a la vista, ridículo.',

  '%N monta la trampa y se queda mirando el agua: a ver si pica y el hilo no pide amplificación con la firma legible del comando, fracasado.',

  '%N monta el señuelo. Que vengan los codiciosos, que hay ración de humillación para todos con el bot como notario del fallo, patético.',

  '%N sale de la tienda oliendo a trampa: el olor llega al resto y el chat archiva sin debate en el idioma seco del ranking, miserable.',

  '%N paga por ser carnada: si nadie muerde el chiste es él qué cringe.',

  '%N se disfraza de rico. Ocho horas fingiendo lo que no es, como en la vida real pero con recibo sin consuelo de consola, da asco, miserable.',

  '%N monta el cebo: billete de mentira. Punto final, cutre sin cuento que lo tape en el momento que más dolía soltarlo, qué vergüenza.',

  'Cebo desplegado por %N: el chat espera al pardillo patético.',

  '%N paga por parecer rico un rato. Punto final, cutre con el peaje cobrado al natural y el sistema no regala puntos, asco, fracasado.',

  '%N paga por parecer rico un rato. Siguiente, desperdicio y el grupo ya pasó de página y el resto es ruido de fondo, basura.',

  '%N sale de la tienda oliendo a trampa. El olor llega al resto del grupo, cutre y el sistema cierra sin discusión, ridículo.',

  'Cebo en el inventario de %N: carnada cara para pez barato sin bis ni matiz de consuelo con el fallo en 4K de chat, fracasado.',

  '%N ha montado la trampa. Ahora solo falta un imbécil con ambición y poca vista y el sistema marca el punto final, basura.',

  'Señuelo montado. %N aparenta lo que no tiene, que es lo que mejor se le da delante de la evidencia del contador, qué cutre.',

  '%N y su cebo de aura falsa: teatro del pobre que juega a rico, desperdicio con la cara del resultado a la vista, da pena ajena.',

  '%N monta el cebo: billete de mentira. A la vista, vergüenza y el resto es ruido de fondo y el contador insiste, qué vacío.',

  'Cebo activo: %N brillando por fuera y podrido por dentro. Que piquen los codiciosos sin que nadie pida replay, indignante.',

  '%N y el disfraz de botín: velcro incluido. Sin derecho a reclamación, desperdicio en el parte que nadie borra, patético.',

  '%N paga %C por parecer rico. El que pique va a robar aire con envoltorio de lujo en la foto fija del ranking, asco, da vergüenza.',

  '%N paga %C por aparentar. El que pique se va a llevar una decepción histórica y el resto es ruido de fondo, basura.',

  '%N se disfraza de cuenta gorda. El que muerda se va a tragar el anzuelo entero con el fallo en 4K de chat, ridículo.',

  'Cebo puesto. %N va a parecer una cuenta jugosa y lo que hay dentro da pena sin consuelo de manual barato, fracasado.',

];

const GANZUA_USADA = [
  '%A usó la bala: el cargador del item está vacío para siempre, gilipollas en el único idioma que entiende el contador, patético.',

  'Tutorial terminado para %A: ganzúa gastada. Sin derecho a reclamación, gilipollas en alta resolución de group chat, miserable.',

  '%A sin ganzúa: sin muleta y sin excusa metálica. El historial no miente, gilipollas y el ranking lo deja claro, qué cringe.',

  '%A usó la bala: cargador vacío. Documentado, gilipollas sin que nadie pida replay y el contador no discute, da asco.',

  '%A acaba de gastar la bala única. Que haya valido la pena, gilipollas con el grupo de testigo silencioso, qué vergüenza.',

  '%A acaba de gastar la bala única: que haya valido la pena, gilipollas y el sistema no regala puntos, ridículo.',

  'Un uso, un gasto, cero reembolso. %A vuelve al método manual, coño sin barniz de relato heroico y no hace falta ampliar el parte, fracasado.',

  'Item de un uso: usado: %A de vuelta a la realidad sin metal, ridículo y el archivo queda cerrado y el sistema no regala puntos, qué miseria.',

  'Ganzúa en el cubo: %A en la intemperie del robo. El historial no miente, fracasado en el único idioma que entiende el contador, da grima.',

  'Se acabó el juguete. %A ha gastado su única ventaja y más le vale que haya servido de algo y el ranking lo deja claro, qué nivel de pena.',

  '%A quemó la bala: el cargador del item está vacío basura.',

  '%A sin metal de ayuda: solo fe y las manos. Sin derecho a reclamación, fracasado delante del público que no pidió entrada, qué cutre.',

  '%A usó la bala: cargador vacío. Delante de todos, hostia en el idioma seco del ranking sin modo avión ni silencio cómplice, da pena ajena.',

  '%A usó la bala: cargador vacío. Caso cerrado, patético con el eco todavía en el grupo y el sistema marca el punto final, qué vacío.',

  'Ganzúa rota de tanto usarla mal: %A vuelve a la casilla de salida, basura en el único idioma que entiende el contador, indignante.',

  'La herramienta de un solo uso cumplió su ciclo. %A, de vuelta al bricolaje, basura con el bot como notario del fallo, qué vergüenza ajena.',

  'La herramienta de un solo uso cumplió el ciclo: %A de vuelta al bricolaje, ridículo con el dígito como única defensa, da vergüenza.',

  'Ganzúa fuera: %A mira las manos con nostalgia. El historial no miente, pringado en el momento que más dolía soltarlo, qué flojo.',

  '%A usó la bala: cargador vacío. Que conste, pringado delante del marcador en vivo con el grupo de testigo silencioso, menudo desastre.',

  'Ganzúa consumida. %A ya no tiene excusa metálica para el próximo fallo, cabrón con el grupo de testigo silencioso, qué pena.',

  'La ganzúa hizo su trabajo o no: en cualquier caso %A ya no la tiene con el número en la frente del mensaje, patético.',

  '%A gastó el único cartucho: examen real a partir de ahora y el ranking lo deja claro, miserable.',

  '%A usó la herramienta: ahora solo queda el operario qué cringe.',

  'Ganzúa consumida: %A y las manos otra vez. Sin derecho a reclamación, fracasado con el bot como notario del fallo, da asco.',

  'Sin ganzúa el próximo fallo de %A va sin maquillaje qué vergüenza.',

  'Ganzúa fuera: %A mira las manos con nostalgia. Sin derecho a reclamación, mierda con el peaje cobrado al natural, ridículo.',

  '%A usó la bala: cargador vacío. El ranking anota, ridículo sin segunda oportunidad hoy sin apelación posible hoy, fracasado.',

  'Inventario: ganzúa fuera. %A queda a solas con su talento, si le queda, patético sin letra pequeña que lo salve, qué miseria.',

  '%A usó la bala: cargador vacío. Sin recurso, mierda delante del ranking y de la cara y el ranking lo deja claro, da grima.',

  '%A sin ganzúa: sin muleta y sin excusa metálica. Sin derecho a reclamación, coño en el recuento que no perdona, qué nivel de pena.',

  'La muleta se rompió: %A cojea de nuevo en el robo. Sin derecho a reclamación, mierda sin que nadie pida replay, basura.',

  'Ganzúa cumplió el ciclo: %A no tiene segunda. Sin derecho a reclamación, patético sin bis ni matiz de consuelo, qué cutre.',

  '%A sin ganzúa: sin muleta y sin excusa metálica da pena ajena.',

  '%A quemó el plan B metálico. Sin recurso, mierda con el dígito como única defensa en el parte que nadie borra, qué vacío.',

  '%A usó la bala: cargador vacío. Sin filtro, fracasado y el ranking cierra el caso y el ranking lo deja claro, indignante.',

  'Ganzúa quemada. A partir de ahora %A roba a pelo y con la boca cerrada.vergüenza ajena.',

  '%A gastó la ganzúa. Un uso, un fail, cero reembolso, asco. Qué asco de intento.',

  'Ganzúa usada y fuera. %A vuelve al modo pringado del ranking, basura. Qué asco de intento.',

  '%A quemó la ganzúa en el intento. El ticket no admite devolución.desastre.',

  'Ganzúa 0. %A sin herramienta y con la lección aprendida a hostias.pena.',

  '%A la ganzúa cumplió su ciclo. Ahora a sufrir a mano limpia. Qué asco de intento.',

  'Herramienta gastada. %A ya no tiene plan B de atraco, mierda. Qué asco de intento.',

  '%A sin ganzúa. El ranking anota el empty tool, coño. Qué asco de intento.cringe.',

  'Ganzúa usada. %A vuelve al tutorial del robo sin DLC. cabrón. Qué asco de intento.',

  '%A quemó el único uso. El chat archiva el gasto inútil, gilipollas. Qué asco de intento.',

  'Ganzúa fuera. %A a pelo como el primer día, patético. Qué asco de intento.',

  '%A sin herramienta. El fail va a doler más sin red, asco. Qué asco de intento.',

  'Ganzúa consumida. %A firma el empty inventory de ladrón, basura. Qué asco de intento.',

  '%A gastó la ganzúa y el resultado no mereció el ticket, ridículo. Qué asco de intento.',

  'Herramienta 0. %A en modo sufrimiento del ranking, fracasado. Qué asco de intento.',

  '%A la ganzúa se fue. Queda la cara de quien la necesitaba. Qué asco de intento.',

  'Ganzúa quemada en público. El grupo lo vio, mierda. Qué asco de intento.cutre.',

  '%A sin DLC. A pelo y que el ranking tenga piedad, coño. Qué asco de intento.pena ajena.',

  'Ganzúa usada. %A vuelve a ser el atracador de manos vacías, cabrón. Qué asco de intento.',

  '%A consumió el único uso. Sin segunda oportunidad de herramienta.',

  'Sin ganzúa, sin muleta. %A y el robo a pelo otra vez, fracasado en el único idioma que entiende el contador, qué vergüenza ajena.',

  '%A gastó lo que no se repone: ganzúa adiós. Sin derecho a reclamación, fracasado en la foto fija del ranking, da vergüenza.',

  '%A gastó la ganzúa. El tutorial se acabó: ahora examen real, pringado en el momento que más dolía soltarlo, qué flojo.',

  'Inventario: ganzúa fuera: %A queda a solas con su talento si le queda, patético y el ranking lo deja claro, menudo desastre.',

  'Cartucho único disparado: %A vuelve al modo torpe y el ranking lo deja claro, qué pena.',

  '%A usó la bala: cargador vacío. En acta, coño y el archivo queda cerrado con el dígito como única defensa, patético.',

  'La ganzúa de %A acaba de convertirse en chatarra sentimental, mierda en el segundo más incómodo del chat, miserable.',

  '%A sin ganzúa es %A con menos opciones y las mismas manos torpes, mierda y no hace falta ampliar el parte, qué cringe.',

  '%A usó la bala: cargador vacío. Sin matiz, asco delante del hueco que quedó y el resto es ruido de fondo, da asco.',

  'Ganzúa rota de tanto (mal) usarla. %A vuelve a la casilla de salida, ridículo y el ranking lo deja claro, qué vergüenza.',

  'La ganzúa hizo su trabajo o no. En cualquier caso, %A ya no la tiene y el ranking lo deja claro, ridículo.',

  'Ganzúa consumida: %A ya no tiene excusa metálica para el próximo fallo, cabrón y el contador insiste, fracasado.',

  'Sin ganzúa el próximo fallo de %A no tendrá con qué maquillarse, patético y el ranking lo deja claro, qué miseria.',

  'Ganzúa usada y destruida. %A vuelve a la casilla de salida sin ventaja y sin remordimientos con el número en la frente del mensaje, ridículo.',

  '%A gastó la ganzúa: el tutorial se acabó, ahora examen real, pringado en el idioma seco del ranking, qué nivel de pena.',

  'Ganzúa fuera de inventario: %A y la intemperie del robo y el sistema marca el punto final delante de la evidencia del contador, basura.',

  '%A quemó el plan B metálico. En acta, coño sin bis ni matiz de consuelo sin consuelo de consola.',

  'Ganzúa quemada: a partir de ahora %A roba a pelo y sin plan B y no hace falta ampliar el parte y el archivo no admite recurso, da pena ajena.',

  'Ganzúa gastada. Se acabó, %A: la próxima vas a pelo como todos con el eco todavía en el grupo sin maquillaje ni segunda toma, qué vacío.',

  '%A y el inventario sin ganzúa: peso cero, presión mil indignante.',

  'Un uso, un gasto, cero reembolso: %A vuelve al método manual con el saldo a la intemperie con el eco todavía en el grupo, patético.',

  '%A ha quemado la ganzúa en esto. Espero que mereciera la pena y basta el dato del ranking delante del marcador en vivo, asco, da vergüenza.',

  'Cartucho gastado: %A vuelve al modo torpe sin accesorios con el saldo a la intemperie delante del ranking y de la cara, basura.',

  '%A usó la bala: cargador vacío. Siguiente, desperdicio con testigos obligados en el hilo sin consuelo de manual barato, ridículo.',

  'Ganzúa quemada: %A vuelve al robo a pelo. Sin derecho a reclamación, desperdicio sin segunda lectura que lo arregle, fracasado.',

  '%A quemó su ganzúa. De vuelta a la calle sin ayuda, como siempre con el fallo en 4K de chat y el contador insiste, patético.',

  'Se acabó la ventaja. %A ha gastado la ganzúa y a partir de aquí roba a cuerpo limpio delante del hueco que quedó, miserable.',

  '%A se ha quedado sin ganzúa. El próximo golpe va a ser a pecho descubierto y con fe y el ranking no pide permiso, qué cringe.',

  '%A usó la bala: cargador vacío. A la vista, vergüenza delante del ranking y de la cara sin que nadie pida replay, da asco, da grima.',

  'Sin ganzúa, sin muleta: %A y el robo a pelo otra vez delante de todo el que miraba en la foto fija del ranking, qué vergüenza.',

  '%A gastó lo que no se repone: ganzúa adiós. El ranking lo registra, desperdicio sin letra pequeña que lo salve, patético.',

  'La ganzúa de %A es chatarra: sin plan B. Sin derecho a reclamación, desperdicio con el eco todavía en el grupo, asco, fracasado.',

  '%A de vuelta a la casilla: item consumido. Y en alta resolución de group chat, basura.',

  '%A gastó lo que no se repone: ganzúa adiós. El historial no miente, desperdicio delante de todo el que miraba, ridículo.',

  'Ganzúa fundida. %A vuelve a robar con las manos desnudas y la cara descubierta y el sistema no regala puntos, fracasado.',

  '%A gastó el único cartucho: examen real. Y sin anestesia de verdad esta vez delante de quien no quería verlo, qué cringe.',

  '%A usó la bala: cargador vacío. Punto final, cutre en el recuento que no perdona y el ranking lo deja claro, da asco, qué cutre.',

  '%A sin ganzúa: sin muleta y sin excusa. Y. delante del marcador en vivo sin segunda lectura que lo arregle, qué vergüenza.',

  'Ganzúa en el cubo. %A mira las manos como si fueran a inventar algo, cutre y el ranking no pide permiso, ridículo.',

  'La ganzúa de %A ha cumplido su función y se ha ido. Como todo lo bueno con la firma legible del comando, fracasado.',

  'Ganzúa en el cubo: %A mira las manos como si fueran a inventar algo, cutre con el número hablando solo, patético.',

  'Item consumido: el próximo robo de %A va sin red y no hay modo de suavizarlo sin que nadie pida replay, asco, da grima.',

  '%A mira las manos: la ganzúa ya es chatarra. Y con el eco todavía en el grupo y el contador no discute, basura.',

  '%A ya no tiene ganzúa. Solo manos y fe, y la fe estaba floja, desperdicio y basta el dato del ranking, ridículo.',

  '%A ya no tiene ganzúa: solo manos y fe, y la fe estaba floja, desperdicio en la foto fija del ranking, fracasado.',

];

const INVENTARIO_VACIO = [
  'No llevas una mierda encima. Vas a robar con las manos y con fe, que es como van los pringados y el resto es ruido de fondo, patético.',

  '%N sin herramientas es un anuncio de robo fallido miserable.',

  '%N mira el cinturón y el cinturón mira el vacío. Que conste en el chat, gilipollas sin modo avión ni silencio cómplice, qué cringe.',

  '%N abre la mochila y suena a eco. Documentado, gilipollas con el dígito firmando solo sin segunda oportunidad hoy, da asco.',

  'El cinturón de %N no pesa: no hay metal ni plástico que diga lo contrario, gilipollas sin recurso ni nota al pie, qué vergüenza.',

  'Inventario en cero: %N en modo hardcore forzoso ridículo.',

  'Sin items: %N juega la campaña sin guardado. El historial no miente, gilipollas y el ranking lo deja claro, fracasado.',

  'Tu inventario es un páramo, cabrón. Ni un escudo ni una ganzúa ni un puto chicle sin consuelo de consola, qué miseria.',

  'No llevas una mierda encima: vas a robar con las manos y con fe floja Joder en la foto fija del ranking, da grima.',

  'No hay items: hay intención, y la intención no bloquea un robo, gilipollas y el ranking lo deja claro, qué nivel de pena.',

  'No hay items. Hay intención. La intención no bloquea un robo, gilipollas y el ranking lo deja claro, basura.',

  '%N sin material es un robo anunciado a favor del otro, fracasado delante del hueco que quedó con la cara del resultado a la vista, qué cutre.',

  '%N abre el inventario para el grupo: no hay nada que mostrar da pena ajena.',

  '%N abre la mochila y suena a eco. Delante de todos, hostia con el eco del almost todavía sonando y el sistema no regala puntos, qué vacío.',

  '%N abre la mochila y suena a eco. El ranking anota, ridículo con el botín o el fail a la vista y el ranking lo deja claro, indignante.',

  'Sin herramientas. Solo manos. El bricolaje del pobre, ridículo con el fallo en 4K de chat y el archivo no admite recurso, qué vergüenza ajena.',

  '%N abre la mochila y suena a eco. Sin recurso, mierda con el bot como notario del fallo sin suavizar el golpe del número, da vergüenza.',

  'Inventario vacío como argumento: %N lo exhibe sin querer qué flojo.',

  '%N a pecho descubierto: cero items. Sin recurso, mierda y el ranking cierra el caso en el segundo más incómodo del chat, menudo desastre.',

  'Inventario vacío. %N es todo promesa y cero material, mierda sin maquillaje ni segunda toma sin apelación posible hoy, qué pena.',

  'Inventario en cero: %N en modo hardcore forzoso. Que conste en el chat, ridículo en el momento que más dolía soltarlo, patético.',

  'La tienda espera: el inventario de %N también espera llenarse y el ranking lo deja claro, miserable.',

  '%N abre la mochila y suena a eco. Sin filtro, fracasado y el chat archiva sin debate con la firma legible del comando, qué cringe.',

  'Inventario en cero: %N en modo hardcore forzoso. Sin derecho a reclamación, patético con el peaje cobrado al natural, da asco.',

  '%N mira el cinturón y el cinturón mira el vacío y el hilo sigue sin ti en el centro, qué vergüenza.',

  '%N sin material: el robo anunciado a favor del otro ridículo.',

  '%N a pecho descubierto: cero items. En acta, coño con el peaje cobrado al natural con el dígito como única defensa, fracasado.',

  'La tienda te espera y tú miras el saldo. Mientras tanto, inventario vacío, pringado sin letra pequeña que lo salve, qué miseria.',

  '%N sin nada encima: honestidad forzosa en el asalto y el chat archiva sin debate, da grima.',

  'La tienda te espera y tú miras el saldo: inventario vacío mientras tanto, pringado sin consuelo de manual barato, qué nivel de pena.',

  'La mochila de %N no pesa: no hay nada que pese. Sin derecho a reclamación, fracasado y el ranking lo deja claro, basura.',

  '%N mira el cinturón y el cinturón mira el vacío. Sin derecho a reclamación, cabrón delante del hueco que quedó, qué cutre.',

  '%N mira el cinturón y el cinturón mira el vacío. El historial no miente, patético y el grupo ya pasó de página, da pena ajena.',

  'La mochila de %N no pesa: no hay nada que pese. Que conste en el chat, patético con el chat enterado del cargo, qué vacío.',

  'Inventario en cero. %N juega en modo hardcore sin haberlo elegido, patético y el sistema cierra sin discusión, indignante.',

  'Inventario vacío, %A. Ni escudo, ni ganzúa, ni dignidad de pago, patético. Qué asco de intento.ajena.',

  '%A sin herramientas. A pelo y con cara de pringado del ranking, asco. Qué asco de intento.',

  'Inventario en cero. %A es el tutorial del robo fallido, basura. Qué asco de intento.',

  '%A no tiene nada. El ranking lo confirma y el chat se ríe, ridículo. Qué asco de intento.',

  'Sin ítems, %A. Solo manos vacías y esperanza de, fracasado. Qué asco de intento.',

  '%A el inventario llora. El atraco va a doler más de lo normal. Qué asco de intento.',

  'Inventario vacío documentado. Autor %A, testigo el puto grupo, mierda. Qué asco de intento.',

  '%A sin escudo, sin ganzúa, sin cebo. Solo fail potencial, coño. Qué asco de intento.',

  'Manos vacías, %A. El ranking no regala herramientas ni consuelo, cabrón. Qué asco de intento.',

  '%A va a robar como en el tutorial del primer día, gilipollas. Qué asco de intento.',

  'Inventario en blanco. %A es el gag del comando antes de empezar, patético. Qué asco de intento.',

  '%A sin DLC de ladrón. A pelo y que sea lo que Dios quiera, asco. Qué asco de intento.',

  'Cero ítems. %A paga la lección de no comprar nada, basura. Qué asco de intento.',

  '%A el bolsillo del inventario está más vacío que el de aura, ridículo. Qué asco de intento.',

  'Sin herramientas, %A. El atraco se va a notar en la cara, fracasado. Qué asco de intento.',

  '%A inventario vacío = atraco en modo sufrimiento. Qué asco de intento.',

  'No hay escudo que te salve, %A. Porque no tienes, mierda. Qué asco de intento.',

  '%A sin nada encima. El ranking firma el empty loadout, coño. Qué asco de intento.',

  'Inventario cero. %A es el ejemplo de por qué se compra en la tienda.vacío.',

  'Nada en el cinturón. Todo en la cara de póker. El póker no basta en el único marcador que importa aquí, indignante.',

  'Inventario limpio: %N o no compra o gasta mal. El historial no miente, fracasado con el fail todavía caliente, qué vergüenza ajena.',

  'Cero en el cinturón: %N y el plan de las manos. Que conste en el chat, fracasado sin barniz de relato heroico, da vergüenza.',

  '%N abre la mochila y suena a eco. Caso cerrado, patético sin que nadie pida replay y el ranking lo deja claro, qué flojo.',

  'Sin escudo ni ganzúa ni cebo: %N a pecho descubierto y el ranking lo deja claro, menudo desastre.',

  'Sin metal ni plástico: %N solo tiene intención. Sin derecho a reclamación, mierda y el ranking lo deja claro, qué pena.',

  '%N abre la mochila y suena a eco. Sin matiz, asco y el ranking no pide permiso y el chat archiva sin debate, patético.',

  '%N abre la mochila y suena a eco. Que conste, pringado en la foto fija del ranking sin descuento por empatía, miserable.',

  'Sin metal ni plástico: %N solo tiene intención. Que conste en el chat, fracasado sin prosa que lo maquille, qué cringe.',

  '%N sin herramientas es el modo historia del robo: difícil y sin guardado, ridículo sin cuento que lo tape, da asco.',

  'Inventario vacío: %N roba con las manos y fe floja qué vergüenza.',

  'Cero en el cinturón: %N y el plan de las manos. Sin derecho a reclamación, asco y el ranking lo deja claro, ridículo.',

  'Cero en el cinturón: %N y el plan de las manos. El historial no miente, pringado sin apelación posible hoy, fracasado.',

  'Sin metal ni plástico: %N solo tiene intención y el ranking lo deja claro, qué miseria.',

  '%N abre la mochila y suena a eco. En acta, coño y no hay DLC que lo parchee y el sistema no regala puntos, da grima.',

  'Inventario limpio. Vas a la guerra con un palo y una oración, pringado con el botín o el fail a la vista, qué nivel de pena.',

  'La mochila de %N es un argumento vacío. Como algunos de sus mensajes, basura y no hay DLC que lo parchee, basura.',

  'Nada en el cinturón: todo en la cara de póker: el póker no basta y el hilo no pide amplificación, qué cutre.',

  'Inventario limpio de tanto no comprar. O de tanto gastar mal, asco en el segundo más incómodo del chat, da pena ajena.',

  'La mochila de %N es un argumento vacío: como algunos mensajes, ridículo delante del marcador en vivo, qué vacío.',

  'Sin escudo, sin ganzúa, sin cebo. Solo el aura y la cara, coño en el momento que más dolía soltarlo, indignante.',

  'Sin herramientas: solo manos: el bricolaje del pobre en el único idioma que entiende el contador delante del listón que no saltaste, patético.',

  'Tu inventario está tan vacío como tu historial de robos con éxito con el veredicto seco del bot con la firma legible del comando, asco, da vergüenza.',

  'Cero equipamiento. Hasta el muerto de hambre del grupo lleva más que tú sin derecho a matiz útil y el chat archiva sin debate, basura.',

  'Cero items. %N va a pecho descubierto y se le nota el pecho, cutre y el grupo ya pasó de página con el saldo a la intemperie, ridículo.',

  'Cero items: %N va a pecho descubierto y se le nota sin anestesia de verdad esta vez delante del público que no pidió entrada, fracasado.',

  'Inventario en cero: %N juega hardcore sin haberlo elegido y el hilo no pide amplificación con el peaje cobrado al natural, patético.',

  'Inventario limpio de tanto no comprar o de tanto gastar mal en el idioma seco del ranking y el archivo no admite recurso, miserable.',

  'Inventario limpio: %N o no compra o gasta mal. Que conste en el chat, desperdicio con el eco del almost todavía sonando, qué cringe.',

  'Vacío total. Vas por el grupo sin protección y sin vergüenza, que ya es decir delante del público que no pidió entrada, da asco, miserable.',

  'Inventario: aire: el próximo round se juega a pelo con el grupo de testigo silencioso delante de quien no quería verlo, qué vergüenza.',

  'Cero objetos. Vas de frente y sin herramientas, que es muy honrado y muy poco eficaz con la firma legible del comando, patético.',

  'No tienes nada. Ni material ni un plan B. La tienda te espera y tú no la mereces delante de la evidencia del contador, asco, fracasado.',

  'Nada encima. Ni protección ni ventaja ni trampa. A pelo y sin plan, como siempre en el segundo más incómodo del chat, basura.',

  '%N abre la mochila y suena a eco. A la vista, vergüenza con el eco todavía en el grupo sin bis ni matiz de consuelo, ridículo.',

  'Inventario limpio: %N o no compra o gasta mal. Sin derecho a reclamación, cutre delante de quien aún leía el hilo, fracasado.',

  'Cero en el cinturón: %N y el plan de las manos qué vacío.',

  'Sin metal ni plástico: %N solo tiene intención. El historial no miente, desperdicio sin letra pequeña que lo salve, indignante.',

  '%N a pelo: inventario cero, excusas cero. Sin derecho a reclamación, desperdicio con el bot como notario del fallo, qué vergüenza ajena.',

  'Sin item que enseñar: %N va de honestidad forzosa sin modo avión ni silencio cómplice delante del hueco que quedó, da vergüenza.',

  '%N abre la mochila y suena a eco. Siguiente, desperdicio y el ranking lo deja por escrito sin filtro de autoayuda, qué flojo.',

  '%N abre la mochila y suena a eco. Punto final, cutre con el dígito como única defensa y el ranking lo deja claro, patético.',

  'Sin escudo, sin ganzúa, sin cebo: solo el aura y la cara y el hilo no pide amplificación sin filtro de autoayuda, asco, qué pena.',

  'Cero items: %N y la cara de póker como único plan basura.',

  'Inventario limpio: %N o no compra o gasta mal ridículo.',

  'Inventario en blanco: %N sin herramientas. Sin derecho a reclamación, desperdicio y no hay modo de suavizarlo, fracasado.',

];

const COMPRA_OK = [
  'La caja suena. %N tiene material. Que sepa usarlo, gilipollas y el resto es ruido de fondo y el ranking lo deja claro, patético.',

  '%N sale con material: el grupo sale con el dato del gasto y el ranking lo deja claro, miserable.',

  '%C fuera: item dentro: %N sin excusa. Documentado, gilipollas y el contador no discute y el ranking lo deja claro, qué cringe.',

  '%N ya no va vacío: compra cerrada. Documentado, gilipollas y no hay DLC que lo parchee y el ranking lo deja claro, da asco.',

  '%N invierte %C: el retorno se verá en el robo qué vergüenza.',

  '%C fuera y el material dentro: ahora %N ya no tiene ni una puta excusa sin que nadie pida replay, ridículo.',

  '%N paga %C y se lleva el pack. Sin letra pequeña emocional, ridículo en la foto fija del ranking sin modo avión ni silencio cómplice, fracasado.',

  '%C fuera: item dentro: %N sin excusa. Que conste, pringado en el segundo más incómodo del chat, qué miseria.',

  '%N tiene material: que sepa usarlo. Caso cerrado, patético con el número en la frente del mensaje en el único idioma que entiende el contador, da grima.',

  '%N acaba de invertir. El retorno se verá en el próximo robo, asco delante de quien no quería verlo en la foto fija del ranking, qué nivel de pena.',

  '%C han cambiado de dueño. El item también. Todo en orden, pringado y el grupo ya pasó de página con el peaje cobrado al natural, basura.',

  '%N ya no va vacío: compra cerrada. Sin filtro, fracasado en el momento que más dolía soltarlo con el dígito como única defensa, qué cutre.',

  'Compra cerrada. %N tiene el item y el grupo tiene el dato, mierda y el historial no olvida con el bot como notario del fallo, da pena ajena.',

  '%N ya no va vacío: compra cerrada. Delante de todos, hostia en alta resolución de group chat sin suavizar el golpe del número, qué vacío.',

  'Ticket pagado. %N sale de la tienda con algo que no sea aire, cabrón sin que nadie pida replay sin bis ni matiz de consuelo, indignante.',

  '%C fuera: item dentro: %N sin excusa. Sin recurso, mierda y el sistema no regala puntos en el segundo más incómodo del chat, qué vergüenza ajena.',

  '%C fuera: item dentro: %N sin excusa. El ranking anota, ridículo sin bis ni matiz de consuelo con el veredicto seco del bot, da vergüenza.',

  '%C fuera y el material dentro. Ahora %N ya no tiene ni una puta excusa cuando la cague delante de la evidencia del contador, qué flojo.',

  '%C fuera: item dentro: %N sin excusa. Caso cerrado, patético y el ranking lo deja por escrito y el resto es ruido de fondo, menudo desastre.',

  'Material entregado a %N: sin derecho a llorar falta de herramientas y el ranking lo deja claro, qué pena.',

  '%N ya no puede decir que no tenía con qué. Tiene con qué, mierda y basta el dato del ranking con el dígito firmando solo, patético.',

  '%N ya no va vacío: compra cerrada. Que conste, pringado con la firma legible del comando sin barniz de relato heroico, miserable.',

  '%N ya no va vacío: compra cerrada. El ranking anota, ridículo con el chat enterado del cargo sin cuento que lo tape, qué cringe.',

  '%N tiene material: que sepa usarlo. Documentado, gilipollas y el ranking lo deja claro.',

  '%C fuera: item dentro: %N sin excusa. Delante de todos, hostia sin filtro de autoayuda con el fail todavía caliente, qué vergüenza.',

  '%C bien gastados o no: ya están fuera y el item dentro ridículo.',

  '%N paga %C y sale de la tienda con peso en el inventario y el ranking lo deja claro, fracasado.',

  '%N ya no va vacío: compra cerrada. Sin recurso, mierda y el resto es ruido de fondo y no hay DLC que lo parchee, qué miseria.',

  'Compra registrada: %N tiene con qué liarla o con qué fallar mejor, fracasado delante del ranking y de la cara, da grima.',

  '%N invierte %C: el retorno se verá en el robo. Sin derecho a reclamación, ridículo y no hay modo de suavizarlo, qué nivel de pena.',

  '%C cambian de lado: el item entra al cinturón de %N. y el ranking lo deja claro, basura.',

  '%N tiene material: que sepa usarlo. El ranking anota, ridículo y el historial no olvida y el contador insiste, qué cutre.',

  'Compra limpia: %N tiene material y el chat tiene memoria del gasto, patético con el peaje cobrado al natural, da pena ajena.',

  '%N ya no va vacío: compra cerrada. Caso cerrado, patético sin cuento que lo tape sin segunda oportunidad hoy, qué vacío.',

  '%N pasa por caja y el inventario deja de ser eco y el ranking lo deja claro, indignante.',

  'Compra cerrada. %N con el ítem y sin el aura del ticket, patético. Qué asco de intento.ajena.',

  '%N pagó. El ranking firma la compra sin debate, asco. Qué asco de intento.vergüenza.',

  'Ítem en inventario de %N. El gasto se nota en el contador, basura. Qué asco de intento.',

  '%N compra hecha. Ahora a ver si lo usa o solo flexea, ridículo. Qué asco de intento.',

  'Compra OK. %N sin excusa cuando falle el próximo atraco, fracasado. Qué asco de intento.',

  '%N el ticket se cobró. El material es suyo y la lección también. Qué asco de intento.',

  'Compra registrada. %N con herramienta y el chat de testigo, mierda. Qué asco de intento.',

  '%N pagó el peaje de la tienda. El ranking anota el gasto, coño. Qué asco de intento.',

  'Ítem entregado. %N ya puede dejar de llorar por no tener nada, cabrón. Qué asco de intento.',

  '%N compra confirmada. Sin reembolso si lo usa mal, gilipollas. Qué asco de intento.',

  'Material en inventario. %N el aura bajó y el ego subió, patético. Qué asco de intento.',

  '%N cerró la compra. El grupo ya espera el show del ítem, asco. Qué asco de intento.',

  'Compra OK documentada. Autor %N, testigo el puto ranking, basura. Qué asco de intento.',

  '%N con el ítem encima. Ahora a no cagarla en el primer uso, ridículo. Qué asco de intento.',

  'Ticket cobrado. %N sin el dinero y con la herramienta, fracasado. Qué asco de intento.',

  '%N compra hecha. El ranking no ofrece manual de instrucciones. Qué asco de intento.',

  'Ítem listo. %N ya no tiene la excusa del inventario vacío, mierda. Qué asco de intento.',

  '%N pagó. El material es suyo hasta que lo queme en un fail, coño. Qué asco de intento.',

  'Compra cerrada en limpio. %N con el ítem y el chat de espectador, cabrón. Qué asco de intento.',

  '%N tiene material: que sepa usarlo. En acta, coño y basta el dato del ranking y el archivo no admite recurso, indignante.',

  '%C menos: item más: %N fuera de la zona de quejas qué vergüenza ajena.',

  '%N ya no va vacío: compra cerrada. En acta, coño sin letra pequeña que lo salve y el ranking lo deja claro, da vergüenza.',

  '%N tiene material: que sepa usarlo. Que conste, pringado sin cuento que lo tape con el dígito firmando solo, qué flojo.',

  '%C menos, inventario más. %N acaba de pasar de la queja a la herramienta, coño con el fallo en 4K de chat, menudo desastre.',

  'Compra registrada. %N tiene con qué liarla o con qué fallar mejor, fracasado y el veredicto no se negocia, qué pena.',

  '%N ya no va vacío: compra cerrada. Sin matiz, asco y el historial no olvida en el idioma seco del ranking, patético.',

  'La tienda cierra el trato: %N abre el inventario con algo dentro con el peaje cobrado al natural, miserable.',

  '%C bien gastados o mal gastados: ya están fuera. El item, dentro, patético y no hay modo de suavizarlo, qué cringe.',

  '%N tiene material: que sepa usarlo. Sin recurso, mierda sin prórroga ni VAR sin que nadie pida replay, da asco, miserable.',

  'La tienda cierra el trato. %N abre el inventario con algo dentro y el ranking no pide permiso, qué vergüenza.',

  'Compra cerrada. %N suelta %C y se lleva algo que no va a saber usar y el chat archiva sin debate con testigos obligados en el hilo, patético.',

  'Hecho. %N ha soltado %C por algo que en mejores manos sería peligroso. En las suyas, ya veremos con el número en la frente del mensaje, asco, fracasado.',

  'Compra OK. %N deja de ser solo boca y pasa a tener juguete, basura y no hace falta ampliar el parte, qué miseria.',

  '%C fuera: item dentro: %N sin excusa. En acta, coño con el cargo en firme sin consuelo de consola.',

  '%N tiene material: que sepa usarlo. Siguiente, desperdicio sin modo avión ni silencio cómplice con el bot como notario del fallo, fracasado.',

  'Transacción limpia: aura menos, item más, excusas a cero, desperdicio en el parte que nadie borra en el recuento que no perdona, basura.',

  '%N paga %C y se equipa. Que el grupo sepa que ahora va con material y el ranking no pide permiso sin consuelo de manual barato, qué cutre.',

  'Pago recibido: item entregado: %N fuera de la zona de excusas con el veredicto seco del bot delante del listón que no saltaste, da pena ajena.',

  '%N pagó %C por algo que le va a durar menos que las ganas. Suerte con el saldo a la intemperie con el veredicto seco del bot, qué vacío.',

  '%N suelta %C y se lleva el material. Ahora ya no tiene excusa delante del marcador en vivo en alta resolución de group chat, indignante.',

  '%C bien o mal gastados: ya están fuera: el item, dentro delante de quien aún leía el hilo, patético.',

  'Compra OK: %N deja de ser solo boca y pasa a tener juguete y el hilo sigue sin ti en el centro delante del hueco que quedó, asco, da vergüenza.',

  '%N paga %C y se lleva el pack: sin letra pequeña emocional delante de quien aún leía el hilo con el resultado ya consumado, basura.',

  '%C han cambiado de dueño: el item también: todo en orden con testigos obligados en el hilo con el chat enterado del cargo, ridículo.',

  '%N acaba de invertir: el retorno se verá en el próximo robo y no hay modo de suavizarlo delante del ranking y de la cara, fracasado.',

  '%C fuera: item dentro: %N sin excusa. A la vista, vergüenza delante de quien aún leía el hilo sin que nadie pida replay, patético.',

  'Vendido. %N ha soltado %C y va a desperdiciarlo, pero eso ya no es problema de la tienda delante de todo el que miraba, miserable.',

  '%C menos, inventario más: %N pasó de la queja a la herramienta en el parte que nadie borra con el fallo en 4K de chat, qué cringe.',

  'Compra cerrada: %N tiene el item y el grupo tiene el dato y no hay DLC que lo parchee con el eco todavía en el grupo, da asco, miserable.',

  '%N tiene con qué liarla: o con qué fallar con estilo qué vergüenza.',

  '%C de aura por una ventaja. %N ya está armado, ahora solo falta que sirva de algo delante de quien aún leía el hilo, patético.',

  '%C menos en el contador: un item más en el cinturón de %N y no hace falta ampliar el parte sin derecho a matiz útil, asco, fracasado.',

  '%N ya no va vacío: compra cerrada. Siguiente, desperdicio y el archivo queda cerrado con el resultado ya consumado, basura.',

  'Ticket pagado: %N sale de la tienda con algo que no sea aire con el fallo en 4K de chat sin descuento por empatía, ridículo.',

  'Pago OK: %N fuera del club de los vacíos. Sin derecho a reclamación, desperdicio en alta resolución de group chat, fracasado.',

  '%N ya no va vacío: compra cerrada. A la vista, vergüenza sin barniz de relato heroico sin segunda oportunidad hoy, ridículo.',

  '%N tiene material: que sepa usarlo. Punto final, cutre sin letra pequeña que lo salve y el archivo queda cerrado, fracasado.',

  'Material entregado. %N, sin derecho a llorar por falta de herramientas, cutre y el ranking lo deja por escrito, qué miseria.',

  'La caja registradora confirma: %N ya no va vacío sin segunda lectura que lo arregle y no hay modo de suavizarlo, da grima.',

  'Vendido. %C menos en la cuenta de %N y una ventaja que probablemente desperdicie sin barniz de relato heroico, qué nivel de pena.',

  'Transacción hecha: %N con item, chat con memoria. Sin derecho a reclamación, cutre y el ranking lo deja claro, patético.',

  '%N compra herramienta. Que se prepare el grupo, o que se ría, según cómo le salga y el archivo queda cerrado, asco, qué cutre.',

  'Item en inventario de %N: excusas fuera. Sin derecho a reclamación, desperdicio y el ranking no pide permiso, basura.',

  '%N paga %C y sale con peso en el inventario. Y y el sistema no regala puntos y el archivo no admite recurso, ridículo.',

  '%N ya no va vacío: compra cerrada. Punto final, cutre sin descuento por empatía y el ranking lo deja claro, fracasado.',

];

const COMPRA_POBRE = [
  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 1, patético.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 2.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 3, qué cringe.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 4, da asco.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 5, qué vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 6 Marca 5, ridículo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 7 Marca 6, fracasado.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 8 Marca 7, qué miseria.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 9 Marca 8, da grima.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 10 Marca 9, qué nivel de pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 11 Marca 10, basura.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 12 Marca 11, qué cutre.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 13 Marca 12, da pena ajena.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 14 Marca 13, qué vacío.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 15 Marca 14, indignante.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 16 Marca 15, qué vergüenza ajena.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 17 Marca 16, da vergüenza.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 18 Marca 17, qué flojo.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 19 Marca 18, menudo desastre.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 20 Marca 19, qué pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 21 Marca 20, patético.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 22 Marca 21, miserable.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 23 Marca 22, qué cringe.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 24 Marca 23, da asco.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 25 Marca 24, qué vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 26 Marca 25, ridículo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 27 Marca 26, fracasado.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 28 Marca 27, qué miseria.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 29 Marca 28, da grima.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 30 Marca 29, qué nivel de pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 31 Marca 30, basura.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 32 Marca 31, qué cutre.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 33 Marca 32, da pena ajena.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 34 Marca 33, qué vacío.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 35 Marca 34, indignante.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 36 Marca 35, qué vergüenza ajena.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 37 Marca 36, da vergüenza.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 38 Marca 37, qué flojo.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 39 Marca 38, menudo desastre.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 40 Marca 39, qué pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 41 Marca 40, patético.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 42 Marca 41, miserable.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 43 Marca 42, qué cringe.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 44 Marca 43, da asco.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 45 Marca 44, qué vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 46 Marca 45, ridículo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 47 Marca 46, fracasado.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 48 Marca 47, qué miseria.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 49 Marca 48, da grima.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 50 Marca 49, qué nivel de pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 51 Marca 50, basura.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 52 Marca 51, qué cutre.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 53 Marca 52, da pena ajena.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 54 Marca 53, qué vacío.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 55 Marca 54, indignante.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 56 Marca 55, qué vergüenza ajena.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 57 Marca 56, da vergüenza.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 58 Marca 57, qué flojo.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 59 Marca 58, menudo desastre.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 60 Marca 59, qué pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 61 Marca 60, patético.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 62 Marca 61, miserable.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 63 Marca 62, qué cringe.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 64 Marca 63, da asco, qué nivel de pena.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 65 Marca 64, qué vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 66 Marca 65, ridículo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 67 Marca 66, fracasado.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 68 Marca 67, qué miseria.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 69 Marca 68, da grima.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 70 Marca 69, qué nivel de pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 71 Marca 70, basura.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 72 Marca 71, qué cutre.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 73 Marca 72, da pena ajena.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 74 Marca 73, qué vacío.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 75 Marca 74, indignante.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 76 Marca 75, qué vergüenza ajena.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 77 Marca 76, da vergüenza.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 78 Marca 77, qué flojo.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 79 Marca 78, menudo desastre.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 80 Marca 79, qué pena.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 81 Marca 80, patético.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 82 Marca 81, miserable.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 83 Marca 82, qué cringe.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 84 Marca 83, da asco, qué nivel de pena.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 85 Marca 84, qué vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 86 Marca 85, ridículo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 87 Marca 86, fracasado.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 88 Marca 87, qué miseria.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 89 Marca 88, qué vergüenza ajena.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 90 Marca 89, da vergüenza.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador Ticket rechazado número 91 Marca 90, qué flojo.',

  'Compra denegada: %A tiene más cara que saldo de ranking, cabrón Ticket rechazado número 92 Marca 91, menudo desastre.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, gilipollas Ticket rechazado número 93 Marca 92, qué pena.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, mierda Ticket rechazado número 94 Marca 93, patético.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, coño Ticket rechazado número 95 Marca 94, miserable.',

  '%A quiso comprar sin un puto duro de aura. La tienda le cerró el mostrador, asco Ticket rechazado número 96 Marca 95, qué cringe.',

  'Compra denegada: %A tiene más cara que saldo de ranking, patético Ticket rechazado número 97 Marca 96, da asco, da vergüenza.',

  '%A llegó pobre al checkout. Nadie fía a un muerto de hambre del contador, basura Ticket rechazado número 98 Marca 97, qué vergüenza.',

  'Sin pasta de aura no hay artículo. %A se fue vacío de manos y de dignidad, ridículo Ticket rechazado número 99 Marca 98, ridículo.',

  '%A pretendió el escudo con saldo de sótano. La tienda no es comedor social, fracasado Ticket rechazado número 100 Marca 99, fracasado.',

];

const ESCUDO_SALVA = [
  '%A se estampa en el escudo de %V. Documentado, gilipollas delante del público que no pidió entrada con el veredicto seco del bot, patético.',

  'El escudo de %V hace su trabajo. %A hace el ridículo, cabrón con testigos obligados en el hilo y el ranking lo deja claro, miserable.',

  '%A se ha estampado contra el escudo de %V como un gilipollas contra una puerta de cristal en el recuento que no perdona, qué cringe.',

  '%A 0 — escudo de %V 1. Documentado, gilipollas con el dígito como única defensa en el único marcador que importa aquí, da asco.',

  'El escudo de %V trabaja: %A hace el, ridículo. El historial no miente, fracasado sin consuelo de manual barato, qué vergüenza.',

  '%V pagó por blindarse y %A acaba de validar la inversión. Menudo ridículo, cabrón y el ranking lo deja claro, ridículo.',

  'El escudo de %V trabaja: %A hace el, ridículo. Sin derecho a reclamación, patético y el ranking lo deja claro, fracasado.',

  '%A ataca: %V ni se inmuta. Documentado, gilipollas y no hace falta ampliar el parte y el contador insiste, qué miseria.',

  'El escudo de %V hace su trabajo: %A hace el, ridículo. Sin anestesia Cabrón y el ranking lo deja claro, da grima.',

  'El golpe de %A se convierte en eco contra la defensa de %V, ridículo y el veredicto no se negocia con el saldo a la intemperie, qué nivel de pena.',

  '%V tenía escudo y %A no tenía plan B. Resultado previsible, basura sin barniz de relato heroico sin segunda oportunidad hoy, basura.',

  '%A iba a por el aura de %V y encontró metal. Rebotó entero, coño y el grupo ya pasó de página y el chat archiva sin debate, qué cutre.',

  '%A se estampa en el escudo de %V. En acta, coño y el sistema cierra sin discusión con la cara del resultado a la vista, da pena ajena.',

  '%A se estampa en el escudo de %V. Caso cerrado, patético en el momento que más dolía soltarlo sin derecho a matiz útil, qué vacío.',

  '%A recoge los dientes del aura tras el escudo. Sin derecho a reclamación, fracasado y el sistema cierra sin discusión, indignante.',

  '%A se estampa en el escudo de %V. Delante de todos, hostia y el contador insiste en el momento que más dolía soltarlo, patético.',

  '%A se estampa en el escudo de %V. Que conste, pringado con el bot como notario del fallo y no hay DLC que lo parchee, da vergüenza.',

  '%A ataca: %V ni se inmuta. Sin recurso, mierda delante de quien aún leía el hilo con el grupo de testigo silencioso, qué flojo.',

  'Blindado. %A ha ido a robar y ha vuelto con las manos vacías y una hostia de realidad en el recuento que no perdona, ridículo.',

  'Defensa activa. %V intacto. %A con el ego abollado, fracasado con el fail todavía caliente sin filtro de autoayuda, qué pena.',

  '%A recoge los dientes del aura tras el escudo. El ranking lo registra, patético delante del listón que no saltaste, patético.',

  '%A pone la mano: el escudo de %V la devuelve. Sin derecho a reclamación, basura con el grupo de testigo silencioso, miserable.',

  '%A se estampa en el escudo de %V. El ranking anota, ridículo en alta resolución de group chat y el contador insiste, qué cringe.',

  'Robo muerto en la chapa de %V: %A de cara. Sin derecho a reclamación, fracasado delante de quien aún leía el hilo, da asco.',

  '%A se estampa en el escudo de %V. Sin filtro, fracasado delante de quien no quería verlo y el historial no olvida, qué vergüenza.',

  '%A 0 — escudo de %V 1. Delante de todos, hostia y el sistema marca el punto final con el dígito como única defensa, patético.',

  '%A hace el ridículo: el escudo de %V trabaja. Y. delante del ranking y de la cara delante de quien aún leía el hilo, fracasado.',

  'El escudo de %V trabaja: %A hace el, ridículo. Que conste en el chat, desperdicio delante de quien no quería verlo, qué miseria.',

  '%A recoge los dientes del aura tras el escudo. Que conste en el chat, fracasado sin anestesia de verdad esta vez, da grima.',

  '%A 0 — escudo de %V 1. El ranking anota, ridículo delante del listón que no saltaste en el parte que nadie borra, qué nivel de pena.',

  'El escudo de %V trabaja: %A hace el, ridículo basura.',

  'Robo interrumpido por plástico caro. %V sonríe, %A no, asco y el contador insiste y el ranking no pide permiso, qué cutre.',

  '%A pone la mano. El escudo de %V la devuelve con intereses de vergüenza, pringado y el grupo ya pasó de página, da pena ajena.',

  'El escudo de %V trabaja: %A hace el, ridículo. El ranking lo registra, desperdicio y el chat archiva sin debate, qué vacío.',

  '%V bloquea: %A aprende el precio del item. Sin derecho a reclamación, fracasado delante de todo el que miraba, indignante.',

  '%A ataca: %V ni se inmuta. En acta, coño y el sistema no regala puntos con el eco del almost todavía sonando, qué vergüenza ajena.',

  '%A se estampa en el escudo de %V. Sin matiz, asco delante del hueco que quedó y el grupo ya pasó de página, da vergüenza.',

  '%A pone la mano: el escudo de %V la devuelve. El ranking lo registra, fracasado sin consuelo de consola, qué flojo.',

  '%A ataca: %V ni se inmuta. Caso cerrado, patético y el historial no olvida y el ranking no pide permiso, menudo desastre.',

  'Choque contra escudo. %A recoje los dientes del aura, patético en el momento que más dolía soltarlo, qué pena.',

  'El escudo de %V le ha devuelto el golpe a %A con intereses de puto usurero, mierda.',

  '%A atacó y el escudo de %V le pasó factura. Bienvenido al fail, cabrón.',

  '%V ni se movió: el escudo hizo el trabajo y %A pagó el peaje, coño.cringe.',

  'Robo abortado: el escudo de %V convirtió a %A en el gag del hilo, gilipollas.',

  '%A vs el escudo de %V terminó 0-1 sin que %V sudara una gota, patético.vergüenza.',

  'El escudo de %V le ha dejado a %A con las manos vacías y la cara de pringado, asco.',

  '%A pensó que %V era presa fácil. El escudo pensó otra cosa, basura.',

  'Contraataque del escudo: %A pierde aura y %V sonríe en silencio, ridículo.miseria.',

  '%A se estrelló contra el escudo de %V. y el chat se cagó de risa, fracasado.',

  'El escudo de %V no perdona. %A firmó el almost con sangre del ranking.',

  '%A puso el golpe y el escudo de %V lo devolvió con recargo, mierda.',

  'Escudo 1, %A 0. El marcador no admite debate, cabrón.cutre.',

  '%V tenía el escudo listo y %A tenía la cara de no haberlo visto venir, coño.',

  '%A intentó vaciar a %V y terminó vaciándose él. Servicio completo de, gilipollas.',

  'El escudo de %V hizo de %A un ejemplo de por qué no se ataca a ciegas, patético.',

  '%A vs %V: gana el escudo, pierde el pringado del ranking, asco.vergüenza ajena.',

  '%A salió a cazar y volvió con el peaje del escudo cobrado, basura.vergüenza.',

  'El golpe de %A rebotó en el escudo de %V y le explotó en la cara, ridículo.flojo.',

  '%A sin botín y con menos aura. El escudo de %V no es decoración, fracasado.desastre.',

  '%V activó el escudo y %A descubrió que el ranking no perdona a los torpes.',

  '%A se creía listo. El escudo de %V le recordó que no, mierda.',

  'Robo fallido con factura: el escudo de %V cobró y %A firmó, cabrón.',

  '%A extendió la mano y el escudo de %V se la devolvió vacía y dolida, coño.cringe.',

  'El escudo de %V convirtió el atraco de %A en sketch de fail, gilipollas asco, da asco.',

  '%A pagó el curso de no atacar a quien tiene escudo. Caro, patético.vergüenza.',

  '%V intacto. %A más pobre. El escudo hizo su puto trabajo, asco.',

  '%A vs el escudo: walkover a favor de quien no necesitaba ni moverse, basura.',

  'El escudo de %V le puso a %A en su sitio: abajo del ranking, ridículo.miseria.',

  '%A intentó el atraco del día y firmó el fail del escudo, fracasado.grima.',

  'El muro se llama escudo y tiene el nombre de %V. %A de cara contra él, mierda y el contador insiste, qué nivel de pena.',

  '%A 0 — escudo de %V 1. Caso cerrado, patético con el dígito firmando solo sin apelación posible hoy, basura.',

  '%A 0 — escudo de %V 1. Sin filtro, fracasado con el cargo en firme delante de quien no quería verlo, qué cutre.',

  'Escudo activo. %V ni se ha enterado de que %A lo ha intentado, que es lo más humillante de todo sin anestesia de verdad esta vez, da pena ajena.',

  '%A 0 — escudo de %V 1. Que conste, pringado sin que nadie pida replay con el fail todavía caliente.',

  '%A 0 — escudo de %V 1. En acta, coño delante de todo el que miraba y el sistema no regala puntos.',

  '%V tenía escudo y %A no tenía plan B: resultado previsible con el botín o el fail a la vista y el sistema cierra sin discusión, patético.',

  '%A 0 — escudo de %V 1. Sin matiz, asco con el número hablando solo con el saldo a la intemperie.',

  'Intento inútil: %V pagó por no tener que aguantar a gente como %A con el eco todavía en el grupo con el número hablando solo, basura.',

  'Escudo de %V intacto. %A se ha estrellado y el grupo ha disfrutado del espectáculo delante del público que no pidió entrada, ridículo.',

  'Rebotado. %A ha intentado robar a %V y se ha ido con las manos vacías y una marca en la frente en la foto fija del ranking, fracasado.',

  '%V tiene escudo y %A no tiene suerte. Combinación fatal para el ladrón sin consuelo de consola y basta el dato del ranking, patético.',

  '%A se estampa en el escudo de %V. A la vista, vergüenza en el segundo más incómodo del chat en el idioma seco del ranking, miserable.',

  'Escudo de %V absorbe el intento de %A: intento archivado con el bot como notario del fallo y el resto es ruido de fondo, qué cringe.',

  'Choque contra escudo: %A recoge los dientes del aura sin anestesia de verdad esta vez delante de quien no quería verlo, da asco.',

  'La defensa de %V convierte el ataque de %A en anécdota sin recurso ni nota al pie en el momento que más dolía soltarlo, qué vergüenza.',

  'Escudo de %V absorbe el intento de %A. Intento archivado, cutre sin prosa que lo maquille y el ranking lo deja claro, patético.',

  'Defensa de %V convierte el ataque de %A en anécdota asco, fracasado.',

  '%A se estampa en el escudo de %V. Punto final, cutre con el grupo de testigo silencioso y el ranking lo deja claro, basura.',

  '%A cobró pared: la pared era %V con escudo. Sin derecho a reclamación, desperdicio y el hilo no pide amplificación, ridículo.',

  'El golpe de %A es eco en la defensa de %V. Sin derecho a reclamación, desperdicio y el hilo no pide amplificación, fracasado.',

  '%A 0 — escudo de %V 1. Siguiente, desperdicio en el único marcador que importa aquí y el ranking no pide permiso, basura.',

  '%A descubre tarde que %V había pasado por la tienda. Escudo up, desperdicio sin modo avión ni silencio cómplice, qué cutre.',

  'Robo interrumpido por plástico caro: %V sonríe, %A no delante de todo el que miraba con el dígito firmando solo, da pena ajena.',

  'El escudo de %V ha hecho su trabajo. %A se vuelve con una mano delante y otra detrás sin descuento por empatía, qué vacío.',

  'El muro se llama escudo y tiene el nombre de %V: %A de cara sin derecho a matiz útil sin que nadie pida replay, indignante.',

  '%V ni se enteró del golpe: el escudo sí, y lo devolvió sin segunda oportunidad hoy en la foto fija del ranking, patético.',

  '%A se estampa en el escudo de %V. Sin recurso, mierda y el ranking lo deja claro.',

  '%V tenía escudo. %A se estrelló contra él como un mosquito contra un parabrisas en el recuento que no perdona, basura.',

  '%A rebotó. %V se gastó el aura justo para que pasara esto y ha valido cada punto y el veredicto no se negocia, ridículo.',

  '%A iba a por aura y encontró metal de %V. Sin derecho a reclamación, desperdicio delante del marcador en vivo, fracasado.',

];

const CEBO_PICA = [
  '%A muerde. %V tira del sedal. Clásico de tienda, gilipollas en el segundo más incómodo del chat con el eco del almost todavía sonando, patético.',

  '%A firma de inocente: señuelo de %V. Documentado, gilipollas en alta resolución de group chat con el dígito como única defensa, miserable.',

  '%V brillaba como un diamante y por dentro era cristal. %A se lo tragó entero, el muy gilipollas y el chat archiva sin debate, qué cringe.',

  '%A vio aura fácil: era trampa de %V. Documentado, gilipollas delante de quien no quería verlo sin segunda oportunidad hoy, da asco.',

  '%A traga el cebo: %V cobra. Documentado, gilipollas sin anestesia de verdad esta vez en alta resolución de group chat, qué vergüenza.',

  '%A muerde: %V tira del sedal. Documentado, gilipollas con el dígito firmando solo con el bot como notario del fallo, ridículo.',

  '%A picó entero: el grupo no se sorprendió. Sin derecho a reclamación, gilipollas y el sistema no regala puntos, fracasado.',

  '%A entró al teatro de %V con el aura por delante y el ranking lo deja claro, qué miseria.',

  '%A ha picado como un pardillo: %V iba de millonario y no tiene ni para pipas. Menudo ridículo, da grima.',

  '%A traga el cebo: %V cobra. Caso cerrado, patético sin descuento por empatía con el cargo en firme y el ranking no discute el cargo, qué nivel de pena.',

  '%A firma de inocente: señuelo de %V. Que conste, pringado con el dígito como única defensa en el único idioma que entiende el contador, basura.',

  'La carnada era %V. El hambriento, %A. Platos servidos, asco en el único marcador que importa aquí y no hay modo de suavizarlo, qué cutre.',

  '%A traga el cebo: %V cobra. En acta, coño delante de todo el que miraba con el fallo en 4K de chat con el contador de testigo, da pena ajena.',

  '%A vio aura fácil: era trampa de %V. Delante de todos, hostia con el grupo de testigo silencioso delante de todo el que miraba, qué vacío.',

  '%A ataca el disfraz de rico y se lleva la lección barata, basura y no hay DLC que lo parchee con la firma legible del comando, indignante.',

  '%A vio aura fácil: era trampa de %V. En acta, coño en el único idioma que entiende el contador delante de todo el que miraba, qué vergüenza ajena.',

  'Cebo tragado entero por %A. %V recoge el botín y la risa, mierda sin bis ni matiz de consuelo en el idioma seco del ranking, da vergüenza.',

  '%A vio aura fácil: era trampa de %V. Sin recurso, mierda con el chat enterado del cargo sin modo avión ni silencio cómplice, qué flojo.',

  '%A firma de inocente: señuelo de %V. Delante de todos, hostia en el idioma seco del ranking y el ranking lo deja por escrito, ridículo.',

  '%A traga el cebo: %V cobra. Que conste, pringado y no hay DLC que lo parchee con el cargo en firme delante del grupo entero, qué pena.',

  '%A traga el cebo: %V cobra. El ranking anota, ridículo con el bot como notario del fallo sin anestesia de verdad esta vez, patético.',

  '%A vio aura fácil: era trampa de %V. El ranking anota, ridículo sin prosa que lo maquille sin maquillaje ni segunda toma, miserable.',

  'Cebo activado con éxito. %V gana, %A aprende (o no), ridículo con el chat enterado del cargo y el ranking lo deja claro, qué cringe.',

  '%A firma de inocente: señuelo de %V. Caso cerrado, patético sin anestesia de verdad esta vez y el ranking lo deja claro, da asco.',

  '%A traga el cebo: %V cobra. Delante de todos, hostia y el resto es ruido de fondo en el momento que más dolía soltarlo, qué vergüenza.',

  '%A firma de inocente: señuelo de %V. Sin recurso, mierda con el bot como notario del fallo sin recurso ni nota al pie, ridículo.',

  '%A vio aura fácil: era trampa de %V. Caso cerrado, patético sin prosa que lo maquille sin maquillaje ni segunda toma, fracasado.',

  '%A vio aura fácil: era trampa de %V. Que conste, pringado delante de todo el que miraba en el idioma seco del ranking, qué miseria.',

  '%A firma de inocente: señuelo de %V. En acta, coño y el hilo sigue sin ti en el centro sin consuelo de consola, da grima.',

  '%A muerde: %V tira del sedal. El ranking anota, ridículo sin recurso ni nota al pie y el ranking lo deja claro, qué nivel de pena.',

  '%A mordió el anzuelo de %V. Todo ese cálculo para robarle a un impostor sin barniz de relato heroico, basura.',

  'Señuelo de %V funciona: %A firma de inocente. Sin derecho a reclamación, patético y el ranking lo deja claro, qué cutre.',

  '%A traga el cebo: %V cobra. Sin matiz, asco en el recuento que no perdona con el bot como notario del fallo, da pena ajena.',

  '%A muerde: %V tira del sedal. En acta, coño con el dígito como única defensa en el recuento que no perdona, qué vacío.',

  '%A picó con todas las letras. El grupo tampoco se sorprendió, fracasado con el bot como notario del fallo, indignante.',

  'Señuelo de %V funciona: %A firma de inocente. El historial no miente, fracasado y el ranking lo deja claro, qué vergüenza ajena.',

  '%A traga el cebo: %V cobra. Sin filtro, fracasado delante de quien no quería verlo sin cuento que lo tape, da vergüenza.',

  '%A vio aura fácil y encontró trampa. %V tenía el guion preparado, coño delante de quien aún leía el hilo, qué flojo.',

  '%A muerde: %V tira del sedal. Sin recurso, mierda sin cuento que lo tape con el eco todavía en el grupo, menudo desastre.',

  '%A muerde: %V tira del sedal. Sin matiz, asco y el chat archiva sin debate y el ranking no pide permiso, qué pena.',

  '%A ha picado como un puto pardillo: %V iba de millonario y no tiene ni para el café.',

  'El cebo de %V funcionó. %A mordió y el ranking se cagó de risa, mierda.',

  '%A pensó que %V era botín fácil. Resultó ser el anzuelo, cabrón.cringe.',

  '%V montó el cebo y %A picó con la cara de quien no lee el ranking, coño asco, patético.',

  'Cebo 1, %A 0. El pringado del día tiene nombre, gilipollas.vergüenza.',

  '%A se lanzó al aura de %V y descubrió que era humo con precio, patético.',

  'El cebo de %V le sacó el aura a %A sin sudar. Clásico de puta madre, asco.',

  '%A vs el cebo: gana quien montó la trampa, pierde quien picó, basura.miseria.',

  '%A mordió el anzuelo de %V. y el chat archivó el fail, ridículo.grima.',

  'Cebo activado. %A pagó la lección de no fiarse de la cuenta ajena, fracasado.',

  '%V aparentaba billetes. %A aparentaba inteligencia. Solo uno falló.',

  '%A picó el cebo de %V como quien no ha visto un tutorial de estafa, mierda.cutre.',

  'El ranking de %A bajó. El de %V subió. El cebo hizo su trabajo, cabrón.pena ajena.',

  '%A se creía cazador y resultó presa del cebo de %V, coño.vacío.',

  'Cebo de %V: limpio, visible y con %A de protagonista del fail, gilipollas.',

  '%A extendió la mano al botín falso y %V le cobró el peaje real, patético.vergüenza ajena.',

  'El cebo no perdona a los ansiosos. %A acaba de comprobarlo, asco.vergüenza.',

  '%A vs %V: crónica de un pardillo y un anzuelo bien puesto, basura.flojo.',

  '%A picó y el grupo no necesitó narrador. Se vio solo, ridículo.desastre.',

  'Cebo exitoso: %V cobra, %A aprende, el chat se divierte, fracasado.pena.',

  '%A tenía hambre de aura fácil. %V tenía cebo. Gana el cebo.',

  '%A mordió y se le vio el forro del bolsillo. Qué asco de atraco, mierda.',

  'El cebo de %V convirtió a %A en el gag del comando, cabrón.cringe.',

  '%A pensó millonario y encontró trampa. Matemáticas del ranking, coño asco, patético.',

  'Cebo 1. %A 0. Sin debate posible en el hilo, gilipollas.vergüenza.',

  '%A se lanzó de cabeza y el cebo de %V le abrió el cráneo del ranking, patético.',

  '%V ni se movió. El cebo hizo el trabajo y %A pagó, asco.',

  '%A vs el anzuelo: walkover a favor de quien montó la trampa, basura.miseria.',

  'El cebo de %V le dejó a %A con menos aura y más vergüenza, ridículo.grima.',

  '%A picó como un puto novato del tutorial. El ranking lo documenta, fracasado.',

  'Pica el pez. %A es el pez. %V el que eligió el cebo, patético delante del público que no pidió entrada, basura.',

  '%A descubrió tarde que el millonario era cartonaje. %V ya cobró, mierda con el chat enterado del cargo, qué cutre.',

  '%A muerde: %V tira del sedal. Caso cerrado, patético y el contador insiste y el ranking lo deja claro, da pena ajena.',

  'El señuelo de %V funciona. %A firma el parte de inocente, cabrón en el segundo más incómodo del chat, qué vacío.',

  '%A firma de inocente: señuelo de %V. El ranking anota, ridículo y el hilo sigue sin ti en el centro, indignante.',

  '%A traga el cebo: %V cobra. Y con el dígito firmando solo delante del público que no pidió entrada y el ranking no discute el cargo, patético.',

  'El señuelo de %V funciona: %A firma el parte de inocente y el contador no discute en el único idioma que entiende el contador, asco, da vergüenza.',

  '%V sonríe: %A revisa el bolsillo: el cebo hizo click y el hilo sigue sin ti en el centro delante de la evidencia del contador, basura.',

  'Cebo tragado entero. %A fue a por el premio gordo y se encontró una cuenta vacía con purpurina y el chat archiva sin debate, ridículo.',

  '%A muerde: %V tira del sedal. Y sin apelación posible hoy en el momento que más dolía soltarlo y el sistema cierra el parte, fracasado.',

  'Cebo perfecto. %A ha robado aire envasado y %V se parte de risa y el archivo queda cerrado con el peaje cobrado al natural, patético.',

  '%A va a por el botín falso y paga el precio del ansia, cutre y el sistema marca el punto final y el ranking lo deja claro, miserable.',

  'Pica el pez: %A es el pez: %V el que eligió el cebo con el peaje cobrado al natural con el número en la frente del mensaje, qué cringe.',

  '%A vio aura fácil: era trampa de %V. A la vista, vergüenza sin barniz de relato heroico sin segunda lectura que lo arregle, da asco, patético.',

  'Cebo perfecto: %A perfecta víctima de su propia prisa sin segunda lectura que lo arregle sin suavizar el golpe del número, qué vergüenza.',

  'Picó %A: cobró %V: el manual del señuelo en una línea y no hace falta ampliar el parte sin segunda lectura que lo arregle, patético.',

  '%A vio aura fácil y encontró trampa: %V tenía el guion listo con el grupo de testigo silencioso y el contador no discute, asco, fracasado.',

  '%A robó a un pobre disfrazado de rico. Le queda la vergüenza, que no se puede gastar delante del listón que no saltaste, basura.',

  '%A vio aura fácil: era trampa de %V. Siguiente, desperdicio delante de quien no quería verlo con el fallo en 4K de chat, ridículo.',

  '%A firma de inocente: señuelo de %V. Y con el botín o el fail a la vista sin prórroga ni VAR con el contador de testigo, fracasado.',

  '%A muerde: %V tira del sedal en la foto fija del ranking sin modo avión ni silencio cómplice con el contador de testigo, qué cringe.',

  'Todo ese cálculo para robarle a un muerto de hambre disfrazado. %A puede irse a llorar con el peaje cobrado al natural, da asco, qué cutre.',

  '%A descubrió tarde que el millonario era cartón: %V ya cobró y el ranking no pide permiso, qué vergüenza.',

  '%A firma de inocente: señuelo de %V. Punto final, cutre con el dígito firmando solo y el sistema cierra sin discusión, ridículo.',

  'La carnada era %V: el hambriento %A: platos servidos con el bot como notario del fallo sin maquillaje ni segunda toma, fracasado.',

  'Cebo activado con éxito: %V gana, %A aprende o no delante de quien aún leía el hilo y el ranking lo deja por escrito, patético.',

  '%A picó con todas las letras: el grupo no se sorprendió sin anestesia de verdad esta vez en la foto fija del ranking, asco, da grima.',

  '%A fue a por lo gordo y se encontró calderilla: %V iba de rico y no tiene un duro con el bot como notario del fallo, basura.',

  '%A traga el cebo: %V cobra. Siguiente, desperdicio sin barniz de relato heroico sin modo avión ni silencio cómplice, ridículo.',

  '%A firma de inocente: señuelo de %V. A la vista, vergüenza sin filtro de autoayuda con la firma legible del comando, fracasado.',

];

// ─── El contraataque ─────────────────────────────────────────────────────────
const CONTRA_GANA = [
  '%A salió más pobre: %V no perdona. Documentado, gilipollas con el peaje cobrado al natural en alta resolución de group chat, patético.',

  '%V contraataca y gana. %A debería haber dejado estar, gilipollas y el archivo queda cerrado y el grupo ya pasó de página, miserable.',

  'Mano de %V: %C cambian de dueño desde %A. Sin derecho a reclamación, gilipollas en el único marcador que importa aquí, qué cringe.',

  '%V saca %C del bolsillo de %A. Documentado, gilipollas delante de quien aún leía el hilo y el veredicto no se negocia, da asco.',

  '%V +%C en el contraataque. Documentado, gilipollas con el grupo de testigo silencioso sin letra pequeña que lo salve, qué vergüenza.',

  '%V cobró %C de revancha. Documentado, gilipollas sin maquillaje ni segunda toma en el segundo más incómodo del chat, ridículo.',

  '%A disfrutó del botín treinta segundos. Ahora %V tiene %C y él tiene cara de gilipollas y el ranking lo deja claro, fracasado.',

  '%V saca %C del bolsillo de %A. En acta, coño sin prosa que lo maquille y no hay modo de suavizarlo y el ranking no discute el cargo, qué miseria.',

  '%A salió más pobre: %V no perdona. Caso cerrado, patético con el grupo de testigo silencioso, da grima.',

  '%A salió más pobre: %V no perdona. El ranking anota, ridículo sin segunda oportunidad hoy con el eco del almost todavía sonando, qué nivel de pena.',

  '%A salió más pobre: %V no perdona. Delante de todos, hostia sin segunda lectura que lo arregle con el botín o el fail a la vista, basura.',

  'La revancha de %V duele en el aura: %C menos para %A, cabrón y no hace falta ampliar el parte con el botín o el fail a la vista, qué cutre.',

  '%V saca %C del bolsillo de %A. Que conste, pringado con el eco del almost todavía sonando en el momento que más dolía soltarlo, da pena ajena.',

  '%A salió más pobre: %V no perdona. Sin filtro, fracasado y el hilo sigue sin ti en el centro y no hace falta ampliar el parte, qué vacío.',

  '%A salió más pobre: %V no perdona. Sin matiz, asco delante del listón que no saltaste con testigos obligados en el hilo, indignante.',

  '%V saca %C del bolsillo de %A. Caso cerrado, patético en alta resolución de group chat y no hace falta ampliar el parte, qué vergüenza ajena.',

  'Mano de %V en el bolsillo de %A. %C cambian de dueño, patético con el dígito firmando solo sin recurso ni nota al pie, da vergüenza.',

  '%A provocó. %V respondió. El marcador favorece a %V, ridículo sin bis ni matiz de consuelo y el ranking lo deja claro, qué flojo.',

  '%V saca %C del bolsillo de %A. Delante de todos, hostia delante del listón que no saltaste sin recurso ni nota al pie, ridículo.',

  '%V +%C en el contraataque. El ranking anota, ridículo con el bot como notario del fallo y el chat archiva sin debate, qué pena.',

  '%V cobró %C de revancha. El ranking anota, ridículo delante de quien aún leía el hilo en el idioma seco del ranking, patético.',

  '%V ha devuelto la hostia con intereses: %C de vuelta. %A no se lo esperaba y se nota y el archivo no admite recurso, miserable.',

  '%A vino a robar: salió más pobre: %V no perdona. Que conste en el chat, ridículo delante de quien aún leía el hilo, qué cringe.',

  '%V saca %C del bolsillo de %A. El ranking anota, ridículo sin recurso ni nota al pie delante de todo el que miraba, da asco.',

  'Contraataque con intereses: %C para %A de coste qué vergüenza.',

  '%V +%C en el contraataque. Caso cerrado, patético sin letra pequeña que lo salve con el chat enterado del cargo, ridículo.',

  'Contraataque con intereses: %C para %A de coste. El ranking lo registra, mierda con el chat enterado del cargo, fracasado.',

  '%A salió más pobre: %V no perdona. Sin recurso, mierda y el grupo ya pasó de página sin recurso ni nota al pie, qué miseria.',

  'Contraataque con intereses: %C para %A de coste. Que conste en el chat, ridículo y el ranking no pide permiso, da grima.',

  '%V +%C en el contraataque. Que conste, pringado y el chat archiva sin debate y el sistema cierra sin discusión, qué nivel de pena.',

  '%A salió más pobre: %V no perdona. Que conste, pringado y el historial no olvida en el recuento que no perdona, basura.',

  '%V gana el exchange. %A paga el curso de no robarle, mierda y el contador insiste y el ranking lo deja claro, qué cutre.',

  '%A vino a robar: salió más pobre: %V no perdona. El ranking lo registra, mierda con el fail todavía caliente, da pena ajena.',

  '%A vino a robar: salió más pobre: %V no perdona y el ranking lo deja claro, qué vacío.',

  '%V saca %C del bolsillo de %A. Sin recurso, mierda y el chat archiva sin debate y el ranking lo deja claro, indignante.',

  '%V saca %C del bolsillo de %A. Sin filtro, fracasado sin segunda oportunidad hoy sin apelación posible hoy, qué vergüenza ajena.',

  '%V cobró %C de revancha. Sin recurso, mierda sin maquillaje ni segunda toma con el eco todavía en el grupo, da vergüenza.',

  'Contraataque con botín. %V +%C, %A con la cara cambiada, pringado delante del público que no pidió entrada, qué flojo.',

  '%C de vuelta a %V. %A ha aprendido que robar al que responde sale caro con el fallo en 4K de chat, menudo desastre.',

  '%V +%C en el contraataque. Sin filtro, fracasado delante de quien no quería verlo sin cuento que lo tape, qué pena.',

  '%V le ha metido la mano en el bolsillo a %A y le ha sacado %C. Por listo.',

  'Contraataque limpio: %V cobra de %A lo que %A intentó robar y un poco más, mierda.',

  '%A atacó y %V respondió con el doble. Bienvenido al peaje, cabrón.cringe.',

  '%V no solo se defendió: le vació el aura a %A en público, coño asco, qué vergüenza.',

  'Contra 1, %A 0. El ranking firma el transfer a favor de %V, gilipollas.vergüenza.',

  '%A salió a cazar y volvió cazado. %V cuenta el botín, patético.',

  'El contraataque de %V dejó a %A con la cara de gilipollas del día, asco.',

  '%A vs %V: gana quien no se dejó y encima cobró, basura.miseria.',

  '%V le dio la vuelta al atraco y %A firmó el fail con intereses, ridículo.grima.',

  'Contraataque documentado: %A más pobre, %V más rico, el chat contento, fracasado.',

  '%A puso la mano y %V se la devolvió con el bolsillo de %A dentro.',

  '%V no perdonó el intento. %A pagó el curso completo, mierda.cutre.',

  'El ranking de %A bajó en dirección contraria a la que planeó, cabrón.pena ajena.',

  '%A intentó el golpe y %V le hizo el combo de defensa y cobro, coño.vacío.',

  'Contra limpio de %V: sin drama, con botín y con público, gilipollas.',

  '%A se creía depredador. %V le recordó la cadena alimentaria, patético.vergüenza ajena.',

  '%V cobró el peaje del intento de %A sin pedir la palabra, asco.vergüenza.',

  '%A vs el contra: walkover a favor de quien respondió bien, basura.flojo.',

  'El contraataque de %V convirtió el atraco de %A en donación, ridículo.desastre.',

  '%A sin el botín soñado y sin el suyo. %V con ambos, fracasado.pena.',

  '%V le pasó factura a %A con el aura que %A no pensaba soltar.',

  '%A atacó mal y %V cobró bien. Aritmética del ranking, mierda.',

  'Contra 1. Autor %V. Víctima del fail %A. Archivo el chat, cabrón.cringe.',

  '%A extendió el plan y %V lo usó en su contra con intereses, coño asco, qué vergüenza.',

  'El contraataque no fue suerte: fue %V leyendo el atraco de %A, gilipollas.vergüenza.',

  '%A pagó el intento con aura y con cara de pringado, patético.',

  '%V intacto y más rico. %A en el parte de bajas del ranking, asco.',

  '%A vs %V terminó con transfer automático a favor de quien se defendió, basura.',

  'El golpe de %A rebotó y le explotó en la cuenta, ridículo.grima.',

  '%A firmó el almost y el peaje en el mismo movimiento torpe, fracasado.nivel de pena.',

  'Contraataque limpio. %V recupera y encima cobra %C de propina, mierda sin anestesia de verdad esta vez, basura.',

  '%V +%C en el contraataque. Sin recurso, mierda y el sistema cierra el parte y el ranking lo deja claro, qué cutre.',

  '%V +%C en el contraataque. Delante de todos, hostia con el cargo en firme con el resultado ya consumado, da pena ajena.',

  'Contraataque limpio: %V recupera y encima cobra %C de propina, mierda y el hilo no pide amplificación, qué vacío.',

  '%A salió más pobre: %V no perdona. En acta, coño sin descuento por empatía sin recurso ni nota al pie, indignante.',

  '%V cobró %C de revancha. Caso cerrado, patético con el chat enterado del cargo sin cuento que lo tape, qué vergüenza ajena.',

  '%V saca %C del bolsillo de %A. Sin matiz, asco con el bot como notario del fallo sin prórroga ni VAR, da vergüenza.',

  '%V +%C en el contraataque. En acta, coño con el peaje cobrado al natural y el ranking lo deja claro, qué flojo.',

  '%V cobró %C de revancha. En acta, coño sin segunda oportunidad hoy y el ranking no discute el cargo, menudo desastre.',

  'Robo fallido y vuelta de tuerca: %V se lleva %C de %A sin segunda lectura que lo arregle en el único idioma que entiende el contador, fracasado.',

  '%A salió más pobre: %V no perdona con el grupo de testigo silencioso con el resultado ya consumado y el ranking no discute el cargo, patético.',

  '%A salió más pobre: %V no perdona. Punto final, cutre delante del ranking y de la cara en el único idioma que entiende el contador, miserable.',

  '%A salió más pobre: %V no perdona. A la vista, vergüenza con el eco del almost todavía sonando delante de la evidencia del contador, qué cringe.',

  'Mano de %V en el bolsillo de %A: %C cambian de dueño en el único idioma que entiende el contador y el hilo no pide amplificación, da asco, qué vergüenza.',

  '%V cobró la lección en aura: %C de matrícula para %A con el eco del almost todavía sonando en el segundo más incómodo del chat, qué vergüenza.',

  '%V contraatacó y %A pasó de ladrón a víctima sin cambiar de silla. %C con el fail todavía caliente sin descuento por empatía, patético.',

  '%V saca %C del bolsillo de %A. y el chat archiva sin debate con el dígito como única defensa y el ranking no discute el cargo, asco, fracasado.',

  'Vuelta y media: %C de vuelta a %V. Eso pasa por robarle al que sí tiene cojones de responder con el chat enterado del cargo, basura.',

  '%A vino a robar y salió más pobre: %V no perdona y el ranking no pide permiso en el único idioma que entiende el contador, ridículo.',

  '%V saca %C del bolsillo de %A. Punto final, cutre sin prórroga ni VAR en la foto fija del ranking sin maquillaje posible, fracasado.',

  '%V +%C en el contraataque. Y delante de quien no quería verlo en el momento que más dolía soltarlo sin maquillaje posible, qué vergüenza ajena.',

  '%V devolvió el golpe y se llevó %C. Robar tiene consecuencias y %A las acaba de conocer en alta resolución de group chat, da vergüenza.',

  '%A se creyó listo hasta que %V le vació %C. Eso pasa por robarle al que sí responde con la cara del resultado a la vista, qué flojo.',

  '%A salió más pobre: %V no perdona delante del listón que no saltaste sin recurso ni nota al pie delante del grupo entero, menudo desastre.',

  '%V no se quedó llorando: fue a por %A y le sacó %C. Justicia poética con intereses sin segunda lectura que lo arregle, qué pena.',

  'Robo fallido y vuelta de tuerca: %V se lleva %C de %A, desperdicio delante del marcador en vivo y el contador insiste, patético.',

  '%V contraataca y gana: %A debería haber dejado estar con el saldo a la intemperie sin modo avión ni silencio cómplice, asco, miserable.',

  'La mano que no da es la de %V: %A aprende el precio en el momento que más dolía soltarlo con el fail todavía caliente, basura.',

  'Contraataque con botín: %V +%C, %A con la cara cambiada sin modo avión ni silencio cómplice sin que nadie pida replay, ridículo.',

  '%V gana el exchange: %A paga el curso de no robarle y no hay modo de suavizarlo delante de la evidencia del contador, fracasado.',

];

const CONTRA_PIERDE = [
  '%V regala %C de propina al ladrón. Documentado, gilipollas con el fail todavía caliente en el único idioma que entiende el contador, patético.',

  '%V suelta otros %C en la revancha. Documentado, gilipollas sin prórroga ni VAR y el sistema marca el punto final, miserable.',

  '%V ha ido a por la revancha y ha soltado otros %C: dos hostias seguidas y no hace falta ampliar el parte, qué cringe.',

  '%V -%C otra vez en el contra. Documentado, gilipollas sin cuento que lo tape y el ranking lo deja claro, da asco.',

  '%V revancha cara: -%C. Documentado, gilipollas sin maquillaje ni segunda toma sin apelación posible hoy, qué vergüenza.',

  'Contraataque fallido. %V empeora el parte con %C menos, mierda delante de quien no quería verlo y no hace falta ampliar el parte, ridículo.',

  '%V buscó dignidad y encontró otro agujero en el aura, ridículo delante de quien aún leía el hilo delante de quien no quería verlo, fracasado.',

  '%V regala %C de propina al ladrón. Caso cerrado, patético con el número en la frente del mensaje delante de quien no quería verlo, qué miseria.',

  '%V regala %C de propina al ladrón. El ranking anota, ridículo en el segundo más incómodo del chat con el dígito como única defensa, da grima.',

  '%V intentó devolver el golpe y regaló más aura. %C de regalo, coño y el resto es ruido de fondo con el chat enterado del cargo, qué nivel de pena.',

  '%V añade %C al parte de bajas. El orgullo firma el ticket, fracasado y basta el dato del ranking con el eco todavía en el grupo, basura.',

  'Contraataque en falso: %V confirma el desastre con %C extra, ridículo y basta el dato del ranking sin consuelo de manual barato, qué cutre.',

  'Factura de revancha fallida: %C a nombre de %V. Sin derecho a reclamación, fracasado delante del público que no pidió entrada, da pena ajena.',

  '%V -%C otra vez en el contra. Sin matiz, asco con el cargo en firme sin que nadie pida replay y el sistema cierra el parte, qué vacío.',

  '%V ha ido a por la revancha y ha soltado otros %C. Dos hostias seguidas del mismo tío delante de la evidencia del contador, indignante.',

  '%V regala %C de propina al ladrón. Delante de todos, hostia con el saldo a la intemperie con el botín o el fail a la vista, patético.',

  '%V revancha cara: -%C. Sin recurso, mierda delante del hueco que quedó sin descuento por empatía delante del grupo entero, da vergüenza.',

  '%V -%C otra vez en el contra. El ranking anota, ridículo con el eco todavía en el grupo sin anestesia de verdad esta vez, qué flojo.',

  'Menuda puta ruina: %V quiso vengarse y le ha regalado %C más. Hay que saber tragar con la cara del resultado a la vista, menudo desastre.',

  'Factura de revancha fallida: %C a nombre de %V. El ranking lo registra, patético en el único marcador que importa aquí, qué pena.',

  '%V suelta otros %C en la revancha. Sin filtro, fracasado sin letra pequeña que lo salve con el chat enterado del cargo, patético.',

  '%V revancha cara: -%C. En acta, coño y el historial no olvida con el veredicto seco del bot con el contador de testigo, miserable.',

  '%V doble combo de pérdida. El orgullo no pagó el recibo, asco sin barniz de relato heroico y el ranking lo deja claro, qué cringe.',

  '%V suelta otros %C en la revancha. Caso cerrado, patético sin letra pequeña que lo salve sin barniz de relato heroico, da asco.',

  '%V suelta otros %C en la revancha. Que conste, pringado sin derecho a matiz útil con el eco del almost todavía sonando, qué vergüenza.',

  '%V -%C otra vez en el contra. Que conste, pringado y no hace falta ampliar el parte con el bot como notario del fallo, ridículo.',

  '%V regala %C de propina al ladrón. Sin matiz, asco y el hilo sigue sin ti en el centro con el resultado ya consumado, fracasado.',

  '%V suelta otros %C en la revancha. Sin recurso, mierda sin maquillaje ni segunda toma sin barniz de relato heroico, qué miseria.',

  '%V suelta otros %C en la revancha. En acta, coño en el único marcador que importa aquí y basta el dato del ranking, da grima.',

  '%V -%C otra vez en el contra. Sin filtro, fracasado sin modo avión ni silencio cómplice con el fallo en 4K de chat, qué nivel de pena.',

  '%V -%C otra vez en el contra. Delante de todos, hostia con el parte firmado debajo con el dígito como única defensa, basura.',

  '%V regala %C de propina al ladrón. Que conste, pringado y no hay DLC que lo parchee y el sistema no regala puntos, qué cutre.',

  'Segundo round: gana el que ya había ganado. %V paga %C, patético sin prórroga ni VAR y el ranking lo deja claro, da pena ajena.',

  'Segunda hostia: %V debería haber cerrado el hilo y no hay modo de suavizarlo en el segundo más incómodo del chat, qué vacío.',

  '%V regala %C de propina al ladrón. Sin recurso, mierda en alta resolución de group chat y el historial no olvida, indignante.',

  'Contraataque en falso. %V confirma el desastre con %C extra perdidos, basura con el bot como notario del fallo, qué vergüenza ajena.',

  '%V -%C otra vez en el contra. Sin recurso, mierda y el sistema no regala puntos sin letra pequeña que lo salve, da vergüenza.',

  '%V regala %C de propina al ladrón. En acta, coño y el chat archiva sin debate sin anestesia de verdad esta vez, qué flojo.',

  'Contraataque suicida: %C de coste para %V. Sin derecho a reclamación, fracasado y el grupo ya pasó de página, menudo desastre.',

  '%V intentó la revancha y la revancha le dio otra, hostia. %C que suman para %A sin maquillaje ni segunda toma, fracasado.',

  'Contraataque fallido: %V intentó cobrar y terminó pagando otra vez, mierda.',

  '%V se lanzó a la revancha y %A le vació el bolsillo de nuevo, cabrón.',

  '%V vs la revancha: gana el que ya había ganado, pierde el que no aprendió, coño.',

  'Segunda ronda, mismo resultado. %V más pobre, %A más contento, gilipollas asco, qué vergüenza ajena.',

  '%V quiso el peaje de vuelta y pagó el peaje del peaje, patético.vergüenza.',

  'Contra fallido: %V firmó el double fail, asco.',

  '%V se creía con derecho a revancha. El ranking pensó otra cosa, basura.',

  '%A se llevó el segundo botín de %V sin pedir la palabra, ridículo.miseria.',

  'Revancha 0. %V 0. El chat archiva el segundo fail, fracasado.grima.',

  '%V intentó el contra y el contra le hizo el vacío.nivel de pena.',

  '%V vs %A ronda 2: mismo guion, mismo resultado, más vergüenza, mierda.',

  'El ranking de %V bajó otra vez. La lección no entró a la primera, cabrón.cutre.',

  '%V puso la mano de revancha y %A se la devolvió vacía otra vez, coño.pena ajena.',

  'Contra fallido documentado: autor %V, beneficiario %A, testigo el grupo, gilipollas.',

  '%V no aprendió del primer golpe. El segundo se lo cobró igual, patético.',

  '%A cobró dos veces. %V pagó dos veces. Matemáticas crueles, asco.vergüenza ajena.',

  '%V vs el orgullo: gana el orgullo en la cabeza, pierde el aura en el ranking, basura.',

  'Segunda hostia del día para %V. El chat no pide replay porque ya duele, ridículo.',

  '%V firmó el double almost. El ranking no ofrece descuento por volumen, fracasado.',

  '%V salió a por la revancha y volvió con menos que antes.pena.',

  '%A ni se inmutó. %V se inmutó el saldo a la baja otra vez, mierda.',

  'Contra 0. Revancha fallida. %V en el parte de bajas por segunda vez, cabrón.',

  '%V quiso cerrar el ciclo y lo cerró con otro transfer a favor de %A, coño.cringe.',

  'El orgullo de %V costó aura. Otra vez. El ranking lleva la cuenta, gilipollas da asco, qué vergüenza ajena.',

  '%V vs la realidad: la realidad cobró dos veces y no pide cita, patético.vergüenza.',

  '%A se llevó el segundo botín sin sudar. %V sudó la explicación, asco.',

  'Revancha fallida: %V más pobre y el chat más entretenido, basura.',

  '%V intentó el combo de orgullo y le salió el combo de fail, ridículo.miseria.',

  '%V firmó el segundo peaje del día. El primero no bastó de lección, fracasado.',

  '%V suelta otros %C en la revancha. Delante de todos, hostia sin cuento que lo tape sin descuento por empatía, fracasado.',

  '%V -%C otra vez en el contra. Caso cerrado, patético y el veredicto no se negocia sin prosa que lo maquille, basura.',

  '%V no aprendió: el segundo golpe cuesta %C. Sin derecho a reclamación, fracasado y el ranking lo deja claro, qué cutre.',

  '%V suelta otros %C en la revancha. Sin matiz, asco y el ranking cierra el caso con el dígito firmando solo, da pena ajena.',

  '%V suelta otros %C en la revancha. El ranking anota, ridículo en el único idioma que entiende el contador, qué vacío.',

  '%V -%C otra vez en el contra. En acta, coño y basta el dato del ranking sin anestesia de verdad esta vez, indignante.',

  '%V regala %C de propina al ladrón. Sin filtro, fracasado sin consuelo de consola con el cargo en firme, qué vergüenza ajena.',

  'La venganza de %V ha salido al revés: otros %C para %A. Menuda puta broma sin bis ni matiz de consuelo, da vergüenza.',

  'Contraataque: mala idea. Ejecución: peor. Resultado: %C, pringado y el sistema marca el punto final, qué flojo.',

  '%V añade %C al parte de bajas: el orgullo firma el ticket en el momento que más dolía soltarlo con el eco todavía en el grupo, ridículo.',

  '%V fue a recuperar lo suyo y dejó %C más por el camino. Impresionante nivel de insistencia inútil sin recurso ni nota al pie, fracasado.',

  'Contraataque fallido. %V ha pasado de víctima a mecenas involuntario. %C más para el ladrón delante de quien no quería verlo, patético.',

  '%V suelta otros %C en la revancha con el bot como notario del fallo y el resto es ruido de fondo con el contador de testigo, miserable.',

  '%A le robó y %V le regaló la propina: %C. Aprender duele con la cara del resultado a la vista y el chat archiva sin debate, qué cringe.',

  '%V empeoró el marcador con %C de propina al ladrón delante de la evidencia del contador con el grupo de testigo silencioso, da asco, qué vergüenza ajena.',

  '%V regala %C de propina al ladrón. Y delante de todo el que miraba sin cuento que lo tape y el ranking no discute el cargo, qué vergüenza.',

  '%V regala %C de propina al ladrón sin bis ni matiz de consuelo con el peaje cobrado al natural con el contador de testigo, patético.',

  'Doble o nada, y a %V le salió nada. %C que no vuelven y el sistema cierra sin discusión con el dígito como única defensa, asco, fracasado.',

  'Contraataque suicida: %C de coste para el ego de %V y no hace falta ampliar el parte en el segundo más incómodo del chat, basura.',

  '%V buscó dignidad: encontró agujero de %C. Sin derecho a reclamación, desperdicio con el número en la frente del mensaje, ridículo.',

  '%V no aprendió: el segundo golpe cuesta %C. El historial no miente, desperdicio delante del público que no pidió entrada, fracasado.',

  'Contraataque fallido. %V ha conseguido perder dos veces seguidas contra la misma persona sin letra pequeña que lo salve, da grima.',

  'Doble derrota. %V ha perdido dos veces contra la misma persona y %C en cada una. Impresionante sin derecho a matiz útil, qué nivel de pena.',

  '%V doble combo de pérdida: el orgullo no pagó el recibo en el segundo más incómodo del chat con el dígito firmando solo, basura.',

  'Revancha fallida con factura: %C en la factura de %V con el botín o el fail a la vista en alta resolución de group chat, qué cutre.',

  '%V regala %C de propina al ladrón. Siguiente, desperdicio en el segundo más incómodo del chat y el contador no discute, da pena ajena.',

  '%V regala %C de propina al ladrón. A la vista, vergüenza sin anestesia de verdad esta vez y el chat archiva sin debate, patético.',

  'Contraataque mala idea: ejecución peor: resultado %C con el chat enterado del cargo con el bot como notario del fallo, asco, indignante.',

  '%V suelta otros %C en la revancha y el ranking cierra el caso sin anestesia de verdad esta vez sin maquillaje posible, basura.',

  '%V -%C otra vez en el contra y el ranking lo deja por escrito sin suavizar el golpe del número sin maquillaje posible, ridículo.',

  '%V -%C otra vez en el contra. Siguiente, desperdicio con el chat enterado del cargo con la firma legible del comando, fracasado.',

];

const CONTRA_TARDE = [
  'Tarde, campeón. Mientras tú mirabas la pared, tu aura cambiaba de dueño sin barniz de relato heroico, patético.',

  'Se cerró la ventana. Para vengarse hay que estar despierto y tú estabas a lo tuyo, que es nada y el grupo ya pasó de página, miserable.',

  'Ni contraataque ni hostias. Llegas tarde, como a todo delante del hueco que quedó sin filtro de autoayuda, qué cringe.',

  'Se te pasó el arroz. El contraataque tenía ventana y tú estabas mirando otra cosa y no hay modo de suavizarlo, da asco.',

  'Demasiado tarde. %A ya se ha gastado tu aura en algo mejor que tú en el idioma seco del ranking con el número hablando solo, qué vergüenza.',

  'La ventana se cerró. Ahora esa aura es historia y tú un capítulo triste y el ranking lo deja por escrito, ridículo.',

  'Tarde. Para vengarse hay que estar despierto, y tú ni eso con el peaje cobrado al natural y el contador no discute, fracasado.',

  'Se acabó el tiempo. La revancha tenía fecha de caducidad y la tuya ha pasado hace rato delante de la evidencia del contador, qué miseria.',

  'Ni de coña, llegas tardísimo. La ventana cerró y tu aura ya tiene otro dueño sin segunda oportunidad hoy, da grima.',

  'Tarde, como siempre. El contraataque era ahora, no cuando te diera la gana sin suavizar el golpe del número, qué nivel de pena.',

  'La ventana se cerró y tú estabas en otra parte. Probablemente mirando el techo sin letra pequeña que lo salve, basura.',

  'Demasiado lento. Para cuando has reaccionado tu aura ya ha cambiado de manos dos veces sin bis ni matiz de consuelo, qué cutre.',

  'Ni de broma. El tiempo para vengarse ha pasado y tú has llegado como llegas a todo: después con el fallo en 4K de chat, da pena ajena.',

  'El contraataque caducó. El aura ya no está donde %V la recuerda, mierda con el dígito firmando solo, qué vacío.',

  'Ventana cerrada. %V llega al sitio del robo y solo queda polvo, coño y el sistema no regala puntos sin prórroga ni VAR, indignante.',

  'Tarde. El botín se fue y la revancha se quedó sin objeto, cabrón en alta resolución de group chat sin segunda lectura que lo arregle, qué vergüenza ajena.',

  '%V despierta para contraatacar cuando el chat ya archivó el robo, gilipollas sin maquillaje ni segunda toma, da vergüenza.',

  'El tiempo no perdona. Ni el aura. %V fuera de plazo, patético sin bis ni matiz de consuelo delante del ranking y de la cara, qué flojo.',

  'Contraataque en diferido: no existe. %V lo acaba de descubrir, basura sin que nadie pida replay en el segundo más incómodo del chat, menudo desastre.',

  'Llegaste tarde a tu propia venganza. El aura tampoco te esperó, ridículo y el ranking lo deja claro, qué pena.',

  '%V mira el reloj del robo: en rojo. Sin reembolso, desperdicio sin barniz de relato heroico con el eco del almost todavía sonando, patético.',

  'Tarde. El ladrón ya contó y se fue. %V se quedó con la pose, cutre en el parte que nadie borra y el contador no discute, miserable.',

  '%V contraataca al aire. El aire no devuelve aura, fracasado con el peaje cobrado al natural con el saldo a la intemperie, qué cringe.',

  '%V llega cuando las luces del atraco ya están apagadas, mierda en la foto fija del ranking sin modo avión ni silencio cómplice, da asco, da vergüenza.',

  'Tarde, campeón: mientras tú mirabas la pared, tu aura cambiaba de dueño y el chat archiva sin debate, qué vergüenza.',

  'El contraataque caducó: el aura ya no está donde %V la recuerda, mierda sin consuelo de consola y el ranking no pide permiso, ridículo.',

  'Ventana cerrada: %V llega al sitio del robo y solo queda polvo con el dígito firmando solo y el contador no discute, fracasado.',

  'Tarde: el botín se fue y la revancha se quedó sin objeto sin consuelo de manual barato delante del público que no pidió entrada, qué miseria.',

  'El tiempo no perdona ni el aura: %V fuera de plazo y no hay DLC que lo parchee y el resto es ruido de fondo, da grima.',

  'Contraataque en diferido no existe: %V lo acaba de descubrir, ridículo sin segunda oportunidad hoy en el recuento que no perdona, qué nivel de pena.',

  'Llegaste tarde a tu propia venganza: el aura tampoco te esperó, basura y el ranking lo deja claro.',

  '%V mira el reloj del robo en rojo: sin reembolso sin filtro de autoayuda con el peaje cobrado al natural, qué cutre.',

  'La revancha tenía caducidad: %V leyó mal la etiqueta sin consuelo de manual barato y no hay DLC que lo parchee, da pena ajena.',

  'Tarde: el ladrón ya contó y se fue: %V se quedó con la pose con el eco del almost todavía sonando sin filtro de autoayuda, qué vacío.',

  'El momento era antes: ahora es teatro sin botín con el grupo de testigo silencioso con el número hablando solo, indignante.',

  '%V contraataca al aire: el aire no devuelve aura y el sistema cierra sin discusión y el archivo no admite recurso, qué vergüenza ajena.',

  '%V llega cuando las luces del atraco ya están apagadas y el contador no discute con el botín o el fail a la vista, da vergüenza.',

  'Fuera de tiempo: %V y la revancha que nadie iba a procesar y el ranking lo deja por escrito con el fail todavía caliente, qué flojo.',

  'El aura emigró: %V llegó al aeropuerto sin vuelo delante del marcador en vivo y el veredicto no se negocia, menudo desastre.',

  'Contraataque caducado: %V con la pose y sin el botín en el momento que más dolía soltarlo con testigos obligados en el hilo, qué pena.',

  'Tarde para el contra: temprano para el ridículo de %V Sin anestesia Patético con el dígito como única defensa, patético.',

  '%V revisa el hilo del robo cuando el hilo ya es historia y el ranking lo deja por escrito sin anestesia de verdad esta vez, miserable.',

  'Ventana cerrada: %V llega al polvo del robo. Sin derecho a reclamación, desperdicio y el sistema marca el punto final, qué cringe.',

  'Tarde: botín fuera: revancha sin objeto para %V. da asco, da vergüenza.',

  'Tarde: botín fuera: revancha sin objeto para %V. Sin derecho a reclamación, patético y el ranking lo deja claro, qué vergüenza.',

  'Tarde: botín fuera: revancha sin objeto para %V. Que conste en el chat, ridículo delante del hueco que quedó, ridículo.',

  'Tarde: botín fuera: revancha sin objeto para %V. El historial no miente, basura y el ranking lo deja claro, fracasado.',

  '%V despierta cuando el chat archivó el robo. El historial no miente, gilipollas delante de quien aún leía el hilo, qué miseria.',

  '%V despierta cuando el chat archivó el robo. El ranking lo registra, desperdicio y no hace falta ampliar el parte, da grima.',

  '%V fuera de plazo: el tiempo no perdona el aura qué nivel de pena.',

  '%V fuera de plazo: el tiempo no perdona el aura. Sin derecho a reclamación, fracasado y basta el dato del ranking, basura.',

  '%V fuera de plazo: el tiempo no perdona el aura. El historial no miente, mierda delante de todo el que miraba, qué cutre.',

  'Contraataque en diferido no existe: %V lo descubre da pena ajena.',

  'Caducidad de revancha: %V leyó mal la etiqueta y el ranking lo deja claro, qué vacío.',

  'Caducidad de revancha: %V leyó mal la etiqueta. Sin derecho a reclamación con el bot como notario del fallo, indignante.',

  'Caducidad de revancha: %V leyó mal la etiqueta. El ranking lo registra, ridículo en el segundo más incómodo del chat, qué vergüenza ajena.',

  'Tarde: el ladrón contó y se fue: %V con la pose. Sin derecho a reclamación, cutre y el contador insiste, da vergüenza.',

  'Tarde: el ladrón contó y se fue: %V con la pose. Que conste en el chat, pringado sin modo avión ni silencio cómplice, qué flojo.',

  'Tarde: el ladrón contó y se fue: %V con la pose. El historial no miente, fracasado sin recurso ni nota al pie, menudo desastre.',

  'El momento era antes: %V hace teatro sin botín. Sin derecho a reclamación, basura delante de quien aún leía el hilo, qué pena.',

  'El momento era antes: %V hace teatro sin botín. Que conste en el chat, desperdicio en el único marcador que importa aquí, patético.',

  '%V llega con las luces del atraco apagadas. Sin derecho a reclamación, pringado en alta resolución de group chat, miserable.',

  'Contraataque caducado: %V con pose sin botín. El historial no miente, gilipollas con el chat enterado del cargo, qué cringe.',

  'Contraataque caducado: %V con pose sin botín. El ranking lo registra, desperdicio con la firma legible del comando, da asco, da vergüenza.',

  '%V despierta cuando el chat archivó el robo. Que conste en el chat, desperdicio con el fail todavía caliente, qué vergüenza.',

  '%V fuera de plazo: el tiempo no perdona el aura. Que conste en el chat, patético con el grupo de testigo silencioso, ridículo.',

  'Caducidad de revancha: %V leyó mal la etiqueta. Que conste en el chat, ridículo y no hace falta ampliar el parte, fracasado.',

  'El momento era antes: %V hace teatro sin botín. El ranking lo registra, patético sin prórroga ni VAR, qué miseria.',

  'Contraataque caducado: %V con pose sin botín. Sin derecho a reclamación, basura y el sistema no regala puntos, da grima.',

  'Contraataque caducado: %V con pose sin botín. Que conste en el chat, desperdicio con el botín o el fail a la vista, qué nivel de pena.',

  '%V despierta cuando el chat archivó el robo. Sin derecho a reclamación, fracasado sin descuento por empatía, basura.',

  'Tarde: el ladrón contó y se fue: %V con la pose y el ranking lo deja claro, qué cutre.',

  '%V tarde a su venganza: el aura no esperó. Sin derecho a reclamación, desperdicio con el cargo en firme, da pena ajena.',

  'El momento era antes: %V hace teatro sin botín qué vacío.',

  'Tarde: el aura de %V ya cambió de dueño. Sin derecho a reclamación, desperdicio con el bot como notario del fallo, indignante.',

  'Ventana cerrada: %V llega al polvo del robo. El historial no miente, gilipollas en el único marcador que importa aquí, qué vergüenza ajena.',

  'Ventana cerrada: %V llega al polvo del robo. El ranking lo registra, desperdicio con el dígito firmando solo, da vergüenza.',

  'Contraataque caducado: %V con pose sin botín qué flojo.',

  'Ventana cerrada: %V llega al polvo del robo. Que conste en el chat, desperdicio sin filtro de autoayuda, menudo desastre.',

  '%V revisa el hilo cuando ya es historia. Sin derecho a reclamación, desperdicio y el ranking cierra el caso, qué pena.',

  '%V llega con las luces del atraco apagadas. El ranking lo registra, desperdicio en el único idioma que entiende el contador, patético.',

  '%V tarde: el aura ya cambió de dueño. Y. y el grupo ya pasó de página con testigos obligados en el hilo, miserable.',

  '%V tarde: el aura ya cambió de dueño. Sin recurso, mierda y el hilo no pide amplificación sin modo avión ni silencio cómplice, qué cringe.',

  '%V tarde: el aura ya cambió de dueño. En acta, coño delante del hueco que quedó y el ranking lo deja claro, da asco, da vergüenza.',

  '%V tarde: el aura ya cambió de dueño. Documentado, gilipollas sin descuento por empatía y el hilo sigue sin ti en el centro, qué vergüenza.',

  '%V tarde: el aura ya cambió de dueño. Caso cerrado, patético y el archivo queda cerrado sin derecho a matiz útil, ridículo.',

  '%V tarde: el aura ya cambió de dueño. El ranking anota, ridículo en el momento que más dolía soltarlo, menudo desastre.',

  '%V tarde: el aura ya cambió de dueño con el saldo a la intemperie delante de quien aún leía el hilo, qué pena.',

  '%V tarde: el aura ya cambió de dueño. Punto final, cutre delante del público que no pidió entrada delante del marcador en vivo, patético.',

  '%V tarde: el aura ya cambió de dueño. Que conste, pringado en el segundo más incómodo del chat sin anestesia de verdad esta vez, miserable.',

  '%V tarde: el aura ya cambió de dueño. A la vista, vergüenza sin barniz de relato heroico con el veredicto seco del bot, qué cringe.',

  '%V tarde: el aura ya cambió de dueño. Delante de todos, hostia sin consuelo de consola sin filtro de autoayuda, da asco, qué cutre.',

  '%V contraataque caducado. Y sin barniz de relato heroico y el ranking lo deja por escrito.',

  '%V contraataque caducado. Sin recurso, mierda y el resto es ruido de fondo delante del público que no pidió entrada, ridículo.',

  '%V contraataque caducado. En acta, coño en el parte que nadie borra con el saldo a la intemperie.',

  '%V contraataque caducado en el único marcador que importa aquí y el contador insiste.',

  '%V contraataque caducado. Documentado, gilipollas y el ranking lo deja claro.grima.',

  '%V contraataque caducado. Caso cerrado, patético delante de quien aún leía el hilo con el fallo en 4K de chat, qué nivel de pena.',

  '%V contraataque caducado. El ranking anota, ridículo en el segundo más incómodo del chat sin prórroga ni VAR, basura.',

  '%V contraataque caducado y el resto es ruido de fondo delante del marcador en vivo.',

];

// ─── El más buscado ──────────────────────────────────────────────────────────
const DIANA_GOLPE = [
  'Diana en la cima: %C de aura. Documentado, gilipollas delante del público que no pidió entrada y el ranking lo deja claro, patético.',

  'Cae el número uno: %C menos. Documentado, gilipollas delante del marcador en vivo y el sistema cierra sin discusión, miserable.',

  'Diana: el que más tenía ahora tiene %C menos. Que conste en el chat, gilipollas sin segunda oportunidad hoy, qué cringe.',

  'El número uno acaba de soltar %C. El ranking lo siente, gilipollas delante de quien no quería verlo, da asco.',

  'El top suelta %C. Documentado, gilipollas sin segunda oportunidad hoy con el veredicto seco del bot, qué vergüenza.',

  'Ha caído el número uno. %C menos para el que iba de intocable, y el grupo aplaudiendo, cabrón en el momento que más dolía soltarlo, ridículo.',

  'Golpe a la diana mayor. %C de peaje por ir de intocable, cabrón delante de quien aún leía el hilo con el número en la frente del mensaje, fracasado.',

  'El primero paga %C por la foto de la cima. Peaje del liderato, mierda con el saldo a la intemperie en el único marcador que importa aquí, qué miseria.',

  'Cae el número uno: %C menos. En acta, coño delante de todo el que miraba y el contador no discute y el ranking del top no discute el cargo, da grima.',

  'Cae el número uno: %C menos. El ranking anota, ridículo delante del público que no pidió entrada en el único marcador que importa aquí, qué nivel de pena.',

  'Diana en la cima: %C de aura. Sin recurso, mierda sin cuento que lo tape sin descuento por empatía y el ranking del top no discute el cargo, basura.',

  'El top suelta %C. En acta, coño delante de todo el que miraba en el recuento que no perdona y el ranking del top no discute el cargo, qué cutre.',

  'El top suelta %C. Sin filtro, fracasado y el chat archiva sin debate y el ranking no pide permiso y el ranking del top no discute el cargo, da pena ajena.',

  'El top se tambalea. %C menos y el trono un poco más frío, coño con el número hablando solo y el ranking lo deja por escrito, qué vacío.',

  'El intocable tocó madera. La madera era un robo de %C, asco con el bot como notario del fallo sin recurso ni nota al pie, indignante.',

  'Diana clara. El que más tenía ahora tiene %C menos, patético con el cargo en firme delante de la evidencia del contador, qué vergüenza ajena.',

  'Diana en la cima: %C de aura. Caso cerrado, patético delante de quien aún leía el hilo sin suavizar el golpe del número, da vergüenza.',

  'Golpe a la diana: %C de peaje al intocable. Sin derecho a reclamación, patético con el número en la frente del mensaje, qué flojo.',

  'El grupo ve caer %C del que más lucía. Fiesta menor, pringado y no hay DLC que lo parchee y el ranking no pide permiso, menudo desastre.',

  'Cae el número uno: %C menos. Caso cerrado, patético con el dígito como única defensa sin maquillaje ni segunda toma, qué pena.',

  'Diana en la cima: %C de aura. Que conste, pringado en el segundo más incómodo del chat con el veredicto seco del bot, patético.',

  'Cae el número uno: %C menos. Sin filtro, fracasado con el bot como notario del fallo delante de todo el que miraba, miserable.',

  'Cae el número uno: %C menos. Delante de todos, hostia con el fallo en 4K de chat y el sistema cierra sin discusión, qué cringe.',

  'Ataque al faro del ranking. %C de descuento forzoso, basura sin que nadie pida replay y el ranking lo deja claro, da asco.',

  'El top suelta %C. El ranking anota, ridículo en alta resolución de group chat y el hilo sigue sin ti en el centro, qué vergüenza.',

  'Cae el primero: %C para %A. %V llevaba de intocable y ahora lleva de ejemplo, cabrón en la foto fija del ranking, ridículo.',

  'Diana en la cima: %C de aura. Sin filtro, fracasado sin anestesia de verdad esta vez y el ranking lo deja claro, fracasado.',

  'El puto rey de los ladrones acaba de que le vacíen el bolsillo. %C. Que se explique sin recurso ni nota al pie, qué miseria.',

  'El primero suelta %C: el ranking lo siente. Sin derecho a reclamación, fracasado con el saldo a la intemperie, da grima.',

  'Cae el número uno: %C menos. Que conste, pringado delante de quien no quería verlo en la foto fija del ranking, qué nivel de pena.',

  'Diana: el que más tenía ahora tiene %C menos. Sin derecho a reclamación, fracasado sin descuento por empatía, basura.',

  'Diana: el que más tenía ahora tiene %C menos. El ranking lo registra, fracasado con el fail todavía caliente, qué cutre.',

  'Diana en la cima: %C de aura. Delante de todos, hostia sin cuento que lo tape sin letra pequeña que lo salve, da pena ajena.',

  'Diana en el top. %A le ha tocado al intocable y el ranking tiembla, cabrón. El ranking no perdona, qué vacío.',

  '%A cazó a la diana. El número uno ya no es intocable, gilipollas. El ranking no perdona, gilipollas. Qué asco de intento, indignante.',

  'Top tocado. %A se lleva %C del que iba de rey del ranking, patético. El ranking no perdona, patético.',

  'Diana 1. El intocable sangra aura y el chat aplaude, gilipollas el top, asco. El ranking no perdona, asco, da vergüenza.',

  '%A vs el número uno: gana el atacante, pierde el que se creía seguro, basura. El ranking no perdona, basura.',

  'El top ha caído. %A firma el golpe al intocable, asco para el ranking alto, ridículo. El ranking no perdona, ridículo.',

  'Diana documentada. Autor %A, víctima el que iba de intocable, fracasado. El ranking no perdona, fracasado.',

  '%A le vació %C al número uno. El ranking no perdona, ridículo el top. El ranking no perdona, patético.',

  'Top tocado en público. %A el único que sonríe, fracasado el intocable, mierda. El ranking no perdona, miserable.',

  '%A cazó la diana. El aura del top viajó de dirección, coño. El ranking no perdona, coño. Qué asco de intento, qué cringe.',

  'Número uno herido. %A cobró y el chat archivó, cabrón. El ranking no perdona, cabrón. Qué asco de intento, da asco.',

  '%A vs el rey del ranking: el rey perdió aura, gilipollas. El ranking no perdona, gilipollas. Qué asco de intento, qué vergüenza.',

  'Diana limpia. %A se lleva el trofeo del intocable, patético. El ranking no perdona, patético. Qué asco de intento, ridículo.',

  'El top ya no es sagrado. %A lo demostró con %C, asco. El ranking no perdona, asco. Qué asco de intento, fracasado.',

  '%A golpeó al número uno. El ranking actualiza sin piedad, patético el top, basura. El ranking no perdona, basura.',

  'Diana 1-0. Gana %A, pierde el que se creía fuera de alcance, ridículo. El ranking no perdona, ridículo.',

  '%A firmó el golpe al intocable, fracasado. El ranking no perdona, fracasado. Qué asco de intento delante del puto ranking, fracasado.',

  'Top sangrando aura. Autor del corte: %A, ridículo el ranking alto. El ranking no perdona, basura.',

  '%A cazó la diana y el chat no pide replay porque se vio claro, fracasado el intocable, mierda. El ranking no perdona, qué cutre.',

  'Cae el número uno: %C menos. Sin matiz, asco delante del marcador en vivo sin suavizar el golpe del número, da pena ajena.',

  'El top suelta %C. Sin recurso, mierda y el sistema no regala puntos con el número en la frente del mensaje, qué vacío.',

  'La cima no era de mármol. Era de aura. Y se acaban de llevar %C, ridículo con el peaje cobrado al natural, indignante.',

  'Diana perfecta: %C menos a quien más tenía. Sin derecho a reclamación, ridículo y el ranking lo deja claro, qué vergüenza ajena.',

  'Diana en la cima: %C de aura. En acta, coño y el chat archiva sin debate sin anestesia de verdad esta vez, da vergüenza.',

  'El top suelta %C. Que conste, pringado en el único marcador que importa aquí y no hay modo de suavizarlo, qué flojo.',

  'El top suelta %C. Sin matiz, asco delante del ranking y de la cara en el segundo más incómodo del chat, menudo desastre.',

  'Cae el número uno: %C menos. Sin recurso, mierda sin segunda oportunidad hoy sin derecho a matiz útil, qué pena.',

  'Diana en la cima: %C de aura. Sin matiz, asco con el saldo a la intemperie y el ranking lo deja claro, patético.',

  'El top suelta %C. Caso cerrado, patético con el grupo de testigo silencioso sin descuento por empatía, miserable.',

  'El intocable tocó madera: la madera era un robo de %C en el único idioma que entiende el contador en el segundo más incómodo del chat, qué cringe.',

  'Cae el número uno: %C menos y no hay DLC que lo parchee con el botín o el fail a la vista y el ranking del top no discute el cargo, da asco.',

  'Diana en la cima: %C de aura con el peaje cobrado al natural con la firma legible del comando y el ranking del top no discute el cargo, qué vergüenza.',

  'Diana en la cima: %C de aura y no hace falta ampliar el parte con el eco todavía en el grupo y el ranking del top no discute el cargo, patético.',

  'El top suelta %C. Y en el segundo más incómodo del chat sin suavizar el golpe del número y el ranking del top no discute el cargo, asco, fracasado.',

  'Diana en la cima: %C de aura. Y con el botín o el fail a la vista y el contador insiste y el ranking del top no discute el cargo, basura.',

  'Diana al más buscado: %C arrancados. %V llevaba semanas robando y %A le acaba de pasar la factura en el recuento que no perdona, ridículo.',

  'Ataque al faro del ranking: %C de descuento forzoso en el momento que más dolía soltarlo en el único marcador que importa aquí, fracasado.',

  'Cae el número uno: %C menos y el sistema no regala puntos con el parte firmado debajo y el ranking del top no discute el cargo, basura.',

  'Cae el más buscado: %C. %V va a tener que explicarse en el grupo con el chat enterado del cargo y el sistema no regala puntos, qué cutre.',

  'La cima no era de mármol: era de aura y se llevan %C con el grupo de testigo silencioso con la cara del resultado a la vista, da pena ajena.',

  'El más buscado del grupo ha caído y se ha dejado %C por el camino. %A no ha tenido piedad y el sistema marca el punto final, qué vacío.',

  '%V era intocable hasta que %A le ha quitado %C. El grupo se lo va a recordar durante días con el botín o el fail a la vista, indignante.',

  'El top suelta %C y el archivo queda cerrado con el número en la frente del mensaje y el ranking del top no discute el cargo, patético.',

  'El más buscado acaba de perder %C y la aureola de intocable. %A ha hecho justicia a lo bruto con el saldo a la intemperie, asco, da vergüenza.',

  'El ranking en la cabeza suelta %C: el resto toma nota con testigos obligados en el hilo con el botín o el fail a la vista, basura.',

  'Ha caído el número uno: %C menos para el que iba de intocable sin anestesia de verdad esta vez sin que nadie pida replay, ridículo.',

  'Cae el número uno: %C menos. Y con el fallo en 4K de chat con el cargo en firme y el ranking del top no discute el cargo, fracasado.',

  'El top suelta %C con el saldo a la intemperie en alta resolución de group chat y el ranking del top no discute el cargo, patético.',

  'El top se tambalea: %C menos y el trono un poco más frío con el peaje cobrado al natural con el resultado ya consumado, miserable.',

  'Cae el número uno: %C menos. Siguiente, desperdicio en el único marcador que importa aquí y el resto es ruido de fondo, qué cringe.',

  'Golpe limpio a la diana: el ranking tiembla %C y el hilo no pide amplificación con el eco del almost todavía sonando, da asco.',

  'Llevaba diana en la espalda y %A ha apuntado bien: %C menos para el número uno con la cara del resultado a la vista, qué vergüenza.',

  'El número uno acaba de soltar %C: el ranking lo siente y el ranking lo deja por escrito y basta el dato del ranking, patético.',

  'Diana de lujo: solo cae quien está arriba: %C menos con el grupo de testigo silencioso sin barniz de relato heroico, asco, fracasado.',

  '%A le ha bajado %C al número uno. El trono del robo tiene un asiento muy resbaladizo y el chat archiva sin debate, basura.',

  'Diana en la cima: %C de aura. El ranking anota, ridículo y el ranking lo deja claro, ridículo. El ranking no perdona, ridículo.',

  'Diana en la cima: %C de aura. Siguiente, desperdicio sin anestesia de verdad esta vez y basta el dato del ranking, fracasado.',

  '%A le ha bajado los humos al más buscado: %C. Nada sabe mejor que ver caer al que presume sin cuento que lo tape, basura.',

  'Diana clara: el que más tenía ahora tiene %C menos sin suavizar el golpe del número sin barniz de relato heroico, qué cutre.',

  'El trono cruje: %C de grieta en el aura del número uno con el saldo a la intemperie y el resto es ruido de fondo, da pena ajena.',

  'Diana marcada: %C menos en la cuenta del que mandaba sin consuelo de manual barato sin bis ni matiz de consuelo, qué vacío.',

  'Cae el número uno: %C menos. A la vista, vergüenza y no hay DLC que lo parchee sin anestesia de verdad esta vez, indignante.',

  'Diana en la cima: %C de aura. A la vista, vergüenza con el resultado ya consumado, patético.',

  'Ataque a la cima: %C de peaje obligatorio al líder sin apelación posible hoy y el sistema marca el punto final, asco, da vergüenza.',

  'Golpe a la diana mayor: %C de peaje por ir de intocable sin recurso ni nota al pie, basura.',

  '%A le ha quitado %C al que más presume. Nada sabe mejor y el resto es ruido de fondo sin filtro de autoayuda, ridículo.',

  'Diana en la cima: el aura del primero sangra %C con el bot como notario del fallo y el archivo queda cerrado, fracasado.',

];

module.exports = {
  BOTE_REVIENTA, BOTE_FALLA, BOTE_VACIO,
  COMPRA_OK, COMPRA_POBRE, ESCUDO_SALVA, CEBO_PICA,
  COMPRA_ESCUDO, COMPRA_GANZUA, COMPRA_CEBO, GANZUA_USADA, INVENTARIO_VACIO,
  CONTRA_GANA, CONTRA_PIERDE, CONTRA_TARDE,
  DIANA_GOLPE,
};
