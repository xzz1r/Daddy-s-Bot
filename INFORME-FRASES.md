# Frases marcadas — 30 sep 2026

Solo se ha marcado. No se ha reescrito nada. El índice es el del array, desde 0. Una frase que falla dos puntos cuenta en los dos.

El punto 3 es una hora, un día, un conteo o un hábito que la frase da por visto y que ese comando no tiene. No entra `rata.high[14]` (el ejemplo de oro), ni un «hace años» figurado, ni un «siempre» de cierre, ni el `%D` del rencor. «%A abraza a %V» es el verbo, no un molde. Una duración dentro de la escena tampoco entra. El tamaño y el filo que echa en falta `npm run progreso` no son uno de estos puntos.

`npm run check` salió verde. Progreso: 0 clones. Cierre plano: `ATRACO_FALLA` 40 %, `CONTRA_RUINA` 30 %. Eco 30 %: `POUT`, `SPANK`, `SLAP`.

## Cuentas

| Punto | Qué es | Frases |
|---|---|---|
| 1 | Habla de otra cosa que la que acaba de pasar | 50 |
| 2 | Número, tiempo o multiplicador que no cuadra con `economia.js` ni con el comando | 74 |
| 3 | Dato que el bot no tiene | 161 |
| 4 | Empieza en tercera (`%A` / `%V` / `%N`) y acaba en tú | 6 |
| 5 | Plana, explica el chiste, o repite el molde del pool | 98 |
| 6 | Débil: sin humor, sin coherencia o sin carisma | 1203 |

El punto 6 es lo que ya mide `npm run frases` sobre las 5.640. Una frase entra si le pasa alguna de estas: no nombra a la persona (630), cuatro o más del pool empiezan igual (299), el mismo bloque de cinco palabras copiado (186), el insulto va pegado con una coma (155, y 124 de esas se quedan en nada si quitas el taco), el chiste es un objeto (12), abre repitiendo el nombre del comando (5), o está rota (3). Son 1.203 frases distintas, el 21 %. Puede coincidir con un punto del 1 al 5.

La lista va al final, por pool, con los índices en rangos.

## Los que mienten al comando

Estos primero. El chiste se puede reescribir; la mecánica no.

- `ATRACO_VETADO` [2][8][14][16][24][28] — el mismo pool sale al comprar vetado y al repetir `!atraco`. Varias dicen que está comprando.
- `ROBO_GUARDIA` [8][18][25][26] — el escudo son 7 minutos tras un robo cobrado. No vacía el bolsillo ni dura hasta mañana.
- `AMENAZAS` [4][5][13] y `AVISO_PURGA` — no hay segundo aviso, ni mañana, ni cuenta atrás. La lista imprime el conteo real (0 a 10). Echar lo hace el dueño, con confirmación en dos minutos.
- `MISERIA` [0][2][5][11][12][14][25] y `HABLA_MAS` [12] — debajo se imprime el saldo, que suele ser mayor que cero. No hay aura por mensaje. Lo mismo en `social.js:AURA_LINES[0]`.
- Casino: `tier1.win[5][9]` dicen «primer hito» y el pool también sale en 100 y en 200. `tier2.win[3]` dice «segundo» y el de 500 es el cuarto. `redemption[0][3][6]` dan por salido del rojo; el pago es un rango fijo.
- `roast.js` `getActivityPhrases()#4[6]` — comillas simples: el grupo lee `${c}` y no la cifra. Tramo de 150 o más.
- `PERMISO_ENLACE` [15][17][20][27] — el pool es cualquier enlace borrado, y estas hablan de YouTube, vídeo, canal o reel.
- `A_TI_MISMO` [19][26] — «se pelea». El mismo aviso corta un `!dar`, un `!ship` y un `!mute` a uno mismo.
- `HANDHOLD` [26] — dar la mano escrito como un beso.
- `GUARDADO` [4] — «el que roba no llega». Un maestro se lleva el 30 % de la caja.
- `BOTE_FALLA` [2][20] — la casa destruye el 25 % de la entrada. `BOTE_VACIO` [0][1][2][3] dice cero y el pie imprime lo que hay. `ROBO_FALLO_REMATE` [29] cobra el bote también en el desastre, y ahí cobra la víctima.
- `DIANA_GOLPE` [8] — tumbar a la diana no te pone el cartel.
- `COMPRA_CEBO` [25] y `CEBO_PICA` [0] — el cebo es ×2,5; el ladrón se lleva aura de verdad.
- `APUESTA_GANA` — el mensaje imprime el × (2,00 a 2,10). «El doble» y «sale cara» sobran. `%S` es el saldo final, no el premio.
- `ROB_PARCIAL` — ×0,65. No es dos tercios ni la mitad.
- `ROB_FAIL` [16][27] — al bote va el 45 % de la multa, no la multa entera.

## Los 10 pools con más marcas

1. `wingmanPhrases:PIROPOS` — 34. El dueño quiere ese registro; el arranque se repite igual.
2. `activity:AVISO_PURGA` — 20.
3. `roboExtraPhrases:ATRACO_FALLA` — 12. El 40 % cierra solo con la cifra.
4. `aura:AURA.spiral` — 10. Una pérdida con saldo ya negativo, contada como racha.
5. `accionPhrases:POUT`, `SPANK`, `SLAP` — 9 cada uno. Eco.
6. `roboExtraPhrases:CONTRA_RUINA` — 9. Cierre en la cifra, y dos mienten el tiempo.
7. `apuestaPhrases:APUESTA_GANA` — 9.
8. Empate a 8: `ROB_PARCIAL`, `COMPRA_POBRE`, `AVISOS_KICK.uno`, `AVISOS_KICK.varios`.

## Lista

`cooldownPhrases` — GENERICO [11] 2, [25] 1. AURA_TIRADA [3] 2. AURA_APOSTAR [2] 3, [5] 2 y 3, [21] 1 y 2. AURA_TOP_POBRE [7] 5. ROBO [3] 2, [4] 1, [29] 2. ROBO_ASALTO [8] 2. ROBO_GUARDIA [2] 2, [8] 1, [18] 1, [19] 2, [25] 1, [26] 1 y 2. PLAY [13] 3, [22] 2.

`roboPhrases` — ROB_WIN [0] 1, [4] 3, [16] 4. ROB_PARCIAL [2][5][6][14][20] 2, [4] 2, [8] 1, [29] 1. ROB_FAIL [16] 2, [27] 2. ROB_MAESTRO [14] 3, [18] 3. ROBO_FALLO_REMATE [29] 1.

`roboExtraPhrases` — COMPRA_OK [10] 3, [14] 3, [28] 2. COMPRA_POBRE [1][5][8] 2, [3][9][13][22] 1, [26] 3. COMPRA_CEBO [25] 1. CEBO_PICA [0] 1. ATRACO_VETADO [2][8][14][16][24][28] 1. ATRACO_GANA [1] 2, [16] 3. ATRACO_FALLA [2][6][7][8][10][13][14][19][24][25][26] 5, [20] 3 y 5. BOTE_REVIENTA [1] 3, [10] 1. BOTE_FALLA [2][20] 1. BOTE_VACIO [0][1][2][3] 2. DIANA_GOLPE [8] 1. CONTRA_GANA [1][13][19][24] 2. CONTRA_PIERDE [1] 1, [10][15][18] 2. CONTRA_TARDE [19] 3, [25] 2. CONTRA_DEMOLEDOR [21][26] 2. CONTRA_RASPADO [13] 3, [23] 1 y 3. CONTRA_RUINA [2][6][9][10][16][24][25] 5, [18] 3 y 5, [28] 2 y 5.

`apuestaPhrases` — APUESTA_GANA [4][7][10][18][20][27] 2, [11] 3, [12] 1, [16] 1. APUESTA_PIERDE [18] 1 y 3, [25] 1.

`vaultPhrases` — GUARDADO [4] 1. SACADO [7] 1.

`rachaPhrases` — HITO [29] 4. ROTA [23] 4, [27] 4.

`aura.js` — gainPobre [0][26][37] 2, [24] 1. gainRico [19] 2. spiral [2][15][18][20][21][25][26][28][29] 3, [27] 1. blessed [7][14] 3. loss [5][15][18] 3. cursed [8][25] 3.

`auraCobro` — MISERIA [0] 1, [2][5][11][12][14][25] 2. HABLA_MAS [12] 2.

`social` — AURA_LINES [0] 2, [24] 3.

`casino` — tier1.win [5][9] 2. tier2.win [3] 2. redemption [0][3][6] 2, [4] 3.

`activity` — AVISO_PURGA [1] 2 y 3, [2][15][19][26][33][37] 3, [9][16][18][27][41] 2, [23] 3 y 5, [31][34] 2 y 3, [5][14][30][38][44] 5. AMENAZAS [4] 1 y 3, [5][13] 1, [12][30] 2.

`duel` — DUEL_WIN [9] 4, [21] 3, [26] 1 y 2.

`antilink` — PERMISO_ENLACE [15][17][20] 1, [27] 1 y 3.

`count` — MEMBER_PHRASES[1][4] 3.

`caso` — VEREDICTOS.rico [1] 3.

`group` — REMATES [0][4][7] 3.

`relevance` — RELEVANTE [4] 3.

`roast.js` — getActivityPhrases()#2[2] 3, #4[6] 2, #4[12] 3, #5[4] 3. `#2` es menos de 20 mensajes, `#4` es 150 o más, `#5` es de 60 a 149.

`fidelityPhrases` — FIEL_HIGH [3][8] 3. FIEL_MID [5] 3. FIEL_LOW [11][13][15][18][19] 3, [21] 4. INFIEL_HIGH [16][19][20] 3. INFIEL_MID [6][8] 3. INFIEL_LOW [3] 3.

`percentLabels` — guarra.high [5] 1. Punto 3: incel.high [17]; incel.mid [1][6][8]; linda.low [2][18]; fea.high [7][11]; fea.mid [5]; fea.low [7]; sexy.high [4][8]; sexy.mid [9]; sexy.low [1][24]; crack.mid [5][8]; feminidad.mid [5][7][9]; masculinidad.high [5][6]; masculinidad.mid [2][7]; masculinidad.extreme [4]; gay.mid [6]; simp.high [5][14]; simp.mid [0][3][4][5][6][7]; rata.mid [8]; friki.high [7][15][19][20]; friki.mid [3][8]; friki.low [6]; cerdo.high [20]; cerdo.mid [8]; femboy.high [15][24]; inutil.high [15]; inutil.mid [8][9]; perdedor.mid [0][2][3]; ganador.high [4][8]; ganador.mid [2][3][4][5]; ganador.low [0][2]; puta.high [10][13][22]; puta.mid [7]; puta.low [8]; guarra.mid [5][6]; guarra.low [6]. Punto 5: linda.mid [3], linda.low [0], perdedor.high [3], cerdo.mid [4], guarra.low [7].

`kickPhrases` — AVISOS_KICK.uno y .varios, los mismos índices, punto 3: [0][3][7][8][14][33][35][42].

`wingmanPhrases` — RIZZ.low [4][20] 3. PIROPOS [71] 3, [81] 5. Moldes de apertura, punto 5: [4][25][58][73]; [6][17][38][50][56][66]; [12][21][36][67][88]; [13][24][45][62][74][85][105]; [39][57][79][97]; [41][63][72][83][93][107].

`accionPhrases` — HANDHOLD [26] 1. POUT [1][4][7][11][13][16][21][23][24] 5. SPANK [3][8][14][16][17][19][21][27][29] 5. SLAP [3][4][10][14][16][17][23][25][29] 5. FUCK [20] 3, [25] 5.

`avisos` — CONTRA_UN_ADMIN [0][3][4][22] 5. A_TI_MISMO [19][26] 1.

`mog` — MOG_PHRASES [24] 3.

## Fuera de la lista

El «vació el bolsillo» de un maestro o un desastre. «Hace nada» sin número. «%N lleva %D días» y «La racha de %N». `ROB_FAIL[28]`, porque el 45 % sí entra al bote. `ROTA[18]`, que es el refrán. El roast o el kick que insulta un hábito sin fecha ni cifra. «Millonario de un chat» en gainRico. «Casi el doble» y «ochenta por ciento» en el maestro. «Cobró el doble» en el contra limpio. «La revancha, en tres horas» en la apuesta. El cebo dicho como «dos veces y media».

## Punto 6 — débiles

Sin humor, sin coherencia o sin carisma. Índice desde 0. Un rango `0-16` es del 0 al 16, los dos incluidos. La familia dice por qué: `nadie` no habla de la persona, `molde` abre igual que otras tres o más, `enlatado` repite un bloque de cinco palabras, `coletilla` pega el insulto con una coma, `analogia` hace el chiste con un objeto, `eco` abre con el nombre del comando, `roto` está partida.

`roboPhrases:ROBO_FALLO_REMATE` — 29. nadie 0-16,18-29. molde 6,10,13,26. enlatado 16.
`avisos:SOLO_GRUPOS` — 28. nadie 0,3-14,16-17,19-29. molde 2-3,8-10,13-14,17-19,23-24,27-29.
`wingmanPhrases:PIROPOS` — 25. coletilla 7,64. molde 2,6,16-17,29,31,38,41,50,54,56,63,66,72,80,83,92-93,107. enlatado 13,45,62,105.
`count:ADMIN_PHRASES[2]` — 25. nadie 1-2,5,7,9,11-13,15-16,19-20,26-28. molde 0-1,3-7,9-13,17-19,23-26.
`antilink:PERMISO_ENLACE` — 25. nadie 1,4,13,18,21,29,35-37,39. enlatado 1,4-9,11-13,16-17,19,21-22,32-34,38-39.
`activity:GHOST_ROASTS` — 24. nadie 2-3,5,7-14,16-19,21-26,28. coletilla 0,6. enlatado 14.
`count:ADMIN_PHRASES[1]` — 23. nadie 2-3,7-8,13,15,17-18,24-25,29. analogia 24. molde 0-1,3-4,7-9,11-15,17,19-20,22,24,27-29.
`count:MEMBER_PHRASES[0]` — 22. nadie 1,7,10,20-21,23,26. molde 0,2,5-6,9,11-12,14-15,18,21-22,24,27-29.
`activity:AVISO_PURGA` — 21. nadie 14. molde 0-1,3,5,9,11,14,18,20,23,26-27,29-30,33-34,37-38,41,44. enlatado 1,7.
`roastPhrases:HEADERS` — 20. nadie 0-5,7-8,10,14,16-20,23,25-28.
`avisos:MAL_ESCRITO` — 20. nadie 0,11,13,15,17,20-21,28,31-32,35,37,42,44,46. molde 27,39-40,43. enlatado 32,49.
`apuestaPhrases:APUESTA_PIERDE` — 20. nadie 1-3,9,11,13,16-17,22,26-27,29. coletilla 0,7-8,12,18-19,21,25.
`count:ADMIN_PHRASES[0]` — 19. nadie 0,2,8-9,12,17-18,21,23-26,28. analogia 6. molde 3,7,9,12,14,17-18,21-22,25,28-29.
`topsRandom:CIERRES` — 18. nadie 0,2,6,11-12,19-20,22-23,26-29. molde 0,2,5-6,10,17,20-23,25,27-28.
`ship:VERDICTS.zero` — 18. nadie 0-1,7,10,12,16-19,22-24,27,29. molde 8,13,15,26.
`roboExtraPhrases:BOTE_VACIO` — 18. nadie 0-1,3,5-6,8,12-13,15-17,22,25. coletilla 4. molde 6,9,14,17,22,27. roto 7.
`apuestaPhrases:APUESTA_GANA` — 18. nadie 1,3,5-8,11-12,15,19,21,23,27-28. coletilla 4,20,22,24.
`vaultPhrases:GUARDADO` — 17. nadie 0-3,5-6,9-16,19. molde 9,11,16-18.
`count:MEMBER_PHRASES[1]` — 17. nadie 1-5,9,19,22,24-25,28. analogia 7. molde 3-4,6,10,13,19,23,27.
`iq:BAJO` — 16. nadie 10,12,18-19,29. coletilla 0-7,22-23,25. enlatado 0,3,10.
`count:MEMBER_PHRASES[2]` — 16. nadie 1,5,8,11,13-14,19,23-24,26,28. molde 10,15,20,22,24,27.
`ship:VERDICTS.low` — 15. nadie 0,3-5,9,11-14,23-25. molde 2,7,15,25.
`ship:VERDICTS.high` — 15. nadie 0,5,10-13,16-18,20,22-25,29.
`avisos:CONTRA_UN_ADMIN` — 15. nadie 0,3,5,7,9,11,13-15,17,22-24,26,29.
`aura:AURA.gainRico` — 15. nadie 0,2,6-7,13,16-17,19,23-25. molde 4,12,21,27.
`social:AURA_LINES` — 14. nadie 6,10,12-14,17-18,22-24,26-27,29. coletilla 0.
`kickPhrases:AVISOS_KICK.uno` — 14. coletilla 1,4-5,10,12,14-16,19,21-22,26,29. enlatado 46.
`roastPhrases:CLOSERS` — 13. nadie 0-1,3-5,9-10,12,14-15,21,26-27.
`activity:AMENAZAS` — 13. nadie 4,22,28,33. molde 4,7,11,13,18-19,24-25,27,31.
`accionPhrases:BLEH` — 13. enlatado 0,3-4,7,11,13,17,20,22,24-25,27,29.
`cooldownPhrases:ROBO` — 12. nadie 3,18,29. coletilla 0,9-13,16-17,22.
`auraCobro:HABLA_MAS` — 12. nadie 0-3,5-8,10-12,15.
`vaultPhrases:SACADO` — 11. nadie 0,2-3,5-6,9-11,15-17.
`roastPhrases:BIO_EMPTY` — 11. nadie 7,9,12,15,18. molde 3,5,9,14-15,19,21,24.
`cooldownPhrases:AURA_APOSTAR` — 11. nadie 13,16,24. coletilla 1,11-12,15,17. molde 7,17,20,26.
`aura:AURA.loss` — 11. nadie 2,14. coletilla 1,8-9,13,15-16,18-19,22.
`accionPhrases:SPANK` — 11. enlatado 0,3,5,10,12,14-15,21-22,27-28.
`ship:VERDICTS.perfect` — 10. nadie 0-2,6,10-11,13. molde 2,4,9,12.
`roboExtraPhrases:INVENTARIO_VACIO` — 10. nadie 5,8,10,18. molde 3,6,12,20,24,26.
`iq:ABISMO` — 10. nadie 5,7,10,13,21,23,27,29. coletilla 0,6.
`cooldownPhrases:ROBO_GUARDIA` — 10. nadie 13-15,18,21-22,25,28-29. coletilla 0.
`cooldownPhrases:PLAY` — 10. nadie 8,15,19,21,28-29. coletilla 1-2,10,16.
`auraCobro:MISERIA` — 10. nadie 2,11,15-16,20-22,28. analogia 19. coletilla 12.
`accionPhrases:PAT` — 10. enlatado 0,7,11,13,17,20,23-24,28-29.
`ship:VERDICTS.mid` — 9. nadie 0,2,6,11,15-16,20,24,29.
`percentLabels:femboy.high` — 9. coletilla 12,14-17,19,21-22,24.
`iq:GENIO` — 9. nadie 0,3-5,7,11,14,19. coletilla 16.
`avisos:SIN_ACCESO` — 9. nadie 6,12-13. molde 1,3,5,7,9,11.
`aura:AURA.spiral` — 9. nadie 6,10,23,29. coletilla 1,7,11,19,26.
`accionPhrases:ANAL` — 9. enlatado 2,6,9,11,14,16,21,24,27.
`vaultPhrases:LLENO` — 8. nadie 0-5,7,9.
`roboExtraPhrases:GANZUA_USADA` — 8. molde 7,10,15-16,19,24,27. enlatado 26.
`roast:getActivityPhrases()#5` — 8. molde 0,2,4-5,7,9,11,13.
`roast:getActivityPhrases()#4` — 8. coletilla 2. molde 0,2,4,6,8,10,12,14.
`roast:getActivityPhrases()#3` — 8. molde 0,2,4,6,8,10,12,14.
`iq:MEDIO` — 8. nadie 6-7,12,22,26. coletilla 0,2,5.
`cooldownPhrases:AURA_TOP_POBRE` — 8. nadie 20,29. analogia 3. coletilla 5,8. molde 0,5,14,28.
`cooldownPhrases:AURA_TIRADA` — 8. nadie 3. coletilla 1,4,7,13,17,22,25.
`avisos:SOLO_ADMINS` — 8. nadie 6,12,24-25,30,36. coletilla 3. enlatado 23.
`avisos:SIN_PERMISO_ADMIN` — 8. nadie 19. coletilla 10. molde 9,13,16,18,22-23.
`accionPhrases:SLAP` — 8. analogia 17. molde 10,14,24,27. enlatado 0,3-4.
`accionPhrases:PECK` — 8. enlatado 8,12,19,21,24,27-29.
`vaultPhrases:POCO` — 7. nadie 0-1,5,7,9-11.
`roast:getActivityPhrases()#2` — 7. molde 0,2,4,6,8,11,14.
`iq:ALTO` — 7. nadie 2,9-11,25. coletilla 1,3.
`humorNegroPhrases:HUMOR_NEGRO` — 7. nadie 4-5,7-9,12-13.
`cooldownPhrases:GENERICO` — 7. coletilla 3,7-9,17-18,23.
`cooldownPhrases:AURA_TOP_ANSIAS` — 7. nadie 11,16,19,23. coletilla 4-5,8.
`avisos:DUELO_AJENO` — 7. nadie 7,25. molde 5,7,11,16,20,23.
`accionPhrases:UNDRESS` — 7. enlatado 5,9,18,20,23,25,28.
`accionPhrases:FEED` — 7. enlatado 0,5,11,21,25-27.
`roboExtraPhrases:BOTE_REVIENTA` — 6. nadie 9. molde 2,7,10,23. enlatado 19.
`percentLabels:gay.high` — 6. coletilla 13,17,19-21,23.
`fidelityPhrases:INFIEL_HIGH` — 6. molde 1,3,14,21. enlatado 7,11.
`accionPhrases:CUDDLE` — 6. enlatado 0,4,12,20,22,26.
`vaultPhrases:ENFRIAMIENTO` — 5. nadie 1-5.
`roboExtraPhrases:CONTRA_TARDE` — 5. nadie 19,24-26. enlatado 28.
`roboExtraPhrases:ATRACO_GANA` — 5. nadie 6-7,13,20. enlatado 0.
`relevance:RELEVANTE` — 5. coletilla 9,11,19,25. enlatado 8,19.
`rachaPhrases:ROTA` — 5. molde 1,6,13,21. enlatado 0.
`cooldownPhrases:ROBO_ASALTO` — 5. nadie 2,12,25. coletilla 0,3.
`accionPhrases:GROPE` — 5. enlatado 0,8,18,24,29.
`wingmanPhrases:WINGMAN_ANECDOTAS` — 4. enlatado 4-5,19-20.
`vaultPhrases:VACIO` — 4. nadie 0,2-3,9.
`roast:getActivityPhrases()#1` — 4. molde 0,4,10,13.
`percentLabels:sexy.extreme` — 4. nadie 1,9,16. enlatado 8.
`percentLabels:masculinidad.low` — 4. nadie 15-17. coletilla 11.
`percentLabels:masculinidad.high` — 4. nadie 0-1,5-6.
`percentLabels:incel.high` — 4. molde 12-14,20.
`percentLabels:ganador.low` — 4. nadie 0,9,22. eco 7.
`percentLabels:crack.extreme` — 4. nadie 18. analogia 15. eco 13. enlatado 12.
`kickPhrases:AVISOS_KICK.varios` — 4. coletilla 10,16,19. enlatado 46.
`caso:VEREDICTOS.fantasma` — 4. nadie 0-3.
`aura:AURA.gainPobre` — 4. nadie 16,21,35. coletilla 1.
`accionPhrases:PREG` — 4. enlatado 0,8,14,24.
`accionPhrases:LAUGH` — 4. molde 0,8,13,19.
`accionPhrases:KISS` — 4. enlatado 0,18,23,29.
`roboExtraPhrases:DIANA_GOLPE` — 3. enlatado 12,16,20.
`roboExtraPhrases:CONTRA_RASPADO` — 3. nadie 6,11,21.
`roboExtraPhrases:COMPRA_ESCUDO` — 3. nadie 6,14. enlatado 27.
`percentLabels:sexy.low` — 3. nadie 5,10,15.
`percentLabels:masculinidad.mid` — 3. nadie 4-5. analogia 1.
`percentLabels:linda.low` — 3. nadie 11,19. enlatado 22.
`percentLabels:friki.high` — 3. coletilla 1,4,11.
`percentLabels:fea.mid` — 3. nadie 0,6. enlatado 2.
`percentLabels:fea.low` — 3. nadie 0-1,4. eco 1.
`percentLabels:crack.low` — 3. nadie 13,20. coletilla 2.
`percentLabels:crack.high` — 3. nadie 1,4. enlatado 8.
`group:REMATES` — 3. nadie 1-2,7.
`caso:VEREDICTOS.reincidente` — 3. nadie 0-2.
`caso:VEREDICTOS.normal` — 3. nadie 0-2.
`caso:VEREDICTOS.fantasmaLargo` — 3. nadie 0,2. enlatado 3.
`caso:VEREDICTOS.buscado` — 3. nadie 0-2.
`caso:VEREDICTOS.ausente` — 3. nadie 0-2.
`avisos:A_TI_MISMO` — 3. nadie 6,18. coletilla 14.
`avisos:AL_BOT` — 3. nadie 10. coletilla 6,9.
`aura:AURA.cursed` — 3. nadie 20. coletilla 2,25.
`aura:APUESTA_POBRE` — 3. nadie 0,6. coletilla 2.
`accionPhrases:CUM` — 3. enlatado 0,2,21.
`roboExtraPhrases:ESCUDO_SALVA` — 2. enlatado 11,19.
`roboExtraPhrases:COMPRA_OK` — 2. nadie 11. enlatado 23.
`relevance:PARASITO` — 2. enlatado 3,28.
`percentLabels:rata.mid` — 2. nadie 0,6.
`percentLabels:rata.high` — 2. nadie 8-9.
`percentLabels:puta.low` — 2. nadie 8. analogia 6.
`percentLabels:masculinidad.extreme` — 2. nadie 3. enlatado 2.
`percentLabels:inutil.high` — 2. nadie 13. coletilla 9.
`percentLabels:guarra.mid` — 2. nadie 8. eco 6.
`percentLabels:guarra.low` — 2. nadie 9. analogia 7.
`percentLabels:feminidad.extreme` — 2. nadie 5,9. eco 5.
`percentLabels:femboy.mid` — 2. coletilla 1. enlatado 6.
`percentLabels:femboy.low` — 2. nadie 0,4.
`mog:MOG_PHRASES` — 2. roto 23,29.
`duel:DUEL_WIN` — 2. coletilla 4,9.
`caso:VEREDICTOS.rico` — 2. nadie 0-1.
`caso:VEREDICTOS.pilar` — 2. nadie 0,2.
`caso:VEREDICTOS.nunca` — 2. nadie 0-1.
`caso:VEREDICTOS.insolvente` — 2. nadie 0-1.
`casino:PHRASES.tier3.win` — 2. enlatado 1,6.
`casino:PHRASES.redemption` — 2. nadie 1,5.
`aura:AURA.blessed` — 2. coletilla 5. enlatado 17.
`accionPhrases:LICKASS` — 2. analogia 22. enlatado 7.
`accionPhrases:FUCK` — 2. enlatado 16-17.
`wingmanPhrases:RIZZ.low` — 1. coletilla 10.
`roboPhrases:ROB_WIN` — 1. enlatado 10.
`roboPhrases:ROB_FAIL` — 1. enlatado 26.
`roboExtraPhrases:CONTRA_GANA` — 1. enlatado 2.
`roboExtraPhrases:COMPRA_GANZUA` — 1. enlatado 13.
`roboExtraPhrases:CEBO_PICA` — 1. enlatado 11.
`roboExtraPhrases:BOTE_FALLA` — 1. enlatado 1.
`roboExtraPhrases:ATRACO_VACIA` — 1. analogia 23.
`roboExtraPhrases:ATRACO_FALLA` — 1. enlatado 16.
`robo:lineas` — 1. nadie 7.
`roastPhrases:OWNER_ROAST` — 1. coletilla 3.
`roastPhrases:BIO_FULL` — 1. coletilla 9.
`relevance:INTERMEDIO` — 1. enlatado 18.
`rachaPhrases:HITO` — 1. enlatado 2.
`percentLabels:puta.high` — 1. coletilla 17.
`percentLabels:perdedor.high` — 1. coletilla 6.
`percentLabels:linda.mid` — 1. enlatado 5.
`percentLabels:incel.mid` — 1. nadie 6.
`percentLabels:ganador.extreme` — 1. nadie 4.
`percentLabels:feminidad.mid` — 1. nadie 5.
`percentLabels:feminidad.low` — 1. nadie 9.
`percentLabels:feminidad.high` — 1. nadie 12.
`percentLabels:fea.high` — 1. nadie 10.
`percentLabels:cerdo.high` — 1. nadie 17.
`fidelityPhrases:FIEL_HIGH` — 1. nadie 4.
`caso:VEREDICTOS.pobre` — 1. nadie 1.
`casino:PHRASES.tier3.jackpot` — 1. enlatado 2.
`casino:PHRASES.tier3.bigwin` — 1. enlatado 1.
`casino:PHRASES.tier2.win` — 1. enlatado 3.
`casino:PHRASES.tier2.jackpot` — 1. enlatado 2.
`casino:PHRASES.tier1.win` — 1. coletilla 4. enlatado 4.
`casino:PHRASES.tier1.bigwin` — 1. enlatado 1.
`avisos:SIN_PERMISO` — 1. coletilla 7.
`avisos:PURGA_ADMIN` — 1. coletilla 7.
`accionPhrases:SEDUCE` — 1. enlatado 1.
`accionPhrases:ROAST_USUARIO` — 1. enlatado 5.
`accionPhrases:PUNCH` — 1. enlatado 2.
`accionPhrases:POUT` — 1. enlatado 27.
`accionPhrases:NOM` — 1. enlatado 1.
`accionPhrases:KICK` — 1. enlatado 29.
`accionPhrases:HUG` — 1. enlatado 6.
`accionPhrases:BITE` — 1. enlatado 24.
