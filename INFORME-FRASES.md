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
