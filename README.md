# Gaisberg-Widget für Paragleiter in Salzburg
Widget, das relevante Infos zum Fluggebiet Gaisberg in Echtzeit am iPhone Homescreen darstellt. Darunter:
- Nächste Busabfahrt Guggenthal -> Gaisberg
- Windwerte Nord bzw. Ost-Station: Durschnitt und Maximal (letzte 15 Min.)
- Windrichtungen als Pfeile
- Windverlauf letzte 6h. Range vert. Achse: 0 - 50 km/h
- TRA-Status Gaisberg/Schwarzenberg, ECET Time

**Installation:** 
- Scriptable installieren: https://apps.apple.com/dk/app/scriptable/id1405459188
- Kopiere Javascript Code des Widgets direkt von [widget.js](https://raw.githubusercontent.com/jrkager/fff-gaisberg-widget/refs/heads/main/widget.js) und füge in einem neuen Scriptable script namens „Gaisberg Widget“ ein
- Auf dem Homescreen lange drücken, um ihn zu bearbeiten.
- Oben links auf das „+“-Symbol tippen, dann nach unten zu „Scriptable“ scrollen, die erste Widget-Größe (klein) auswählen und Widget hinzufügen.
- Im Bearbeitungsmodus auf das neue Widget tippen, um die Einstellungen zu öffnen.
- Unter „Script“ das gerade erstellte Skript („Gaisberg Widget“) auswählen.
- Optional kann bei Interaktion (_When Interacting -> Open URL_) das Flugwetter https://flyforfun.at/flugwetter/ geöffnet werden.

**Settings:**
Einige Eigenschaften der Widgets können über die Parameter (im Bearbeitungsmodus auf das Widget klicken, ganz unten „Parameter“) angepasst werden. Die folgenden Kommandos können kommagetrennt eingetragen werden:
- `disable-chart`: Deaktiviert die Anzeige des Windverlaufs im Hintergrund
- `enable-light-mode`: Das Skript ändert dann je nach Einstellungen des iPhones (Dark Mode) seine Farben. Aufgrund von Einschränkungen des Systems wird der Pfeil dann in grau dargestellt, da die Anpassung seiner Farbe (schwarz/weiß) sonst der der Schrift um 15-20 Min. hinterherhinkt.


<img src="Screenshots/screenshot1.jpg" alt="Screenshot of Gaisberg iPhone Widget in Dark Mode" width="200">
<br>

***Gaisberg Panomax Grid Widget:***
- Zusätzlich steht ein Widget bereit, das relevante Ausschnitte aus dem aktuellen Panomax-Bild anzeigt. Leider kann auf dem Homescreen aufgrund Speicherlimits nur eine low-res Version dargestellt werden. Installation via ScriptDude: [scriptdu.de](https://scriptdu.de?name=Gaisberg%20Panomax%20Grid&source=https%3A%2F%2Fraw.githubusercontent.com%2Fjrkager%2Ffff-gaisberg-widget%2Frefs%2Fheads%2Fmain%2Fpanomax-grid.js&docs=https%3A%2F%2Fgithub.com%2Fjrkager%2Ffff-gaisberg-widget%2Fblob%2Fmain%2FREADME.md)
