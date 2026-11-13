#!/usr/bin/env python3
"""
STEP 1: Pipeline Python di pulizia e ritaglio asset per "Pokémon: Verde Alloro".
- Rimuove lo sfondo bianco (con floodfill dai bordi e pulizia anti-aliasing per proteggere gli interni bianchi).
- Ritaglia automaticamente gli sprite singoli da tileset, npcs, items, ui e player.
- Corregge la 4a riga di player_overworld specchiando orizzontalmente la 3a riga (camminata a destra).
- Estrae una sezione centrale dei banchi lunghi priva di gambe verticali divisorie per file continue.
- Ridimensiona mantenendo i pixel nitidi (Image.NEAREST) in ./public/assets/.
"""

import os
from collections import deque
from PIL import Image

RAW_DIR = "public/assets/aistudio"
ALT_RAW_DIR = "raw_assets"
OUT_DIR = "public/assets"


def find_raw(patterns):
    for d in (ALT_RAW_DIR, RAW_DIR):
        if not os.path.isdir(d):
            continue
        files = sorted(os.listdir(d))
        for pat in patterns:
            for f in files:
                if pat.lower() in f.lower():
                    return os.path.join(d, f)
    raise FileNotFoundError(f"Asset non trovato per pattern: {patterns}")


def remove_white_bg_floodfill(img: Image.Image, threshold: int = 232, fringe_threshold: int = 205) -> Image.Image:
    """
    Rimuove lo sfondo bianco partendo dai bordi con floodfill (protegge occhi bianchi,
    camicie, lavagne, interno box di dialogo e nuvolette), più pulizia bordo anti-aliased.
    """
    rgba = img.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()

    def is_bg_candidate(r: int, g: int, b: int) -> bool:
        return r >= threshold and g >= threshold and b >= threshold and (max(r, g, b) - min(r, g, b)) <= 24

    visited = [[False] * w for _ in range(h)]
    q = deque()

    # Seed dai bordi dell'immagine
    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_bg_candidate(r, g, b) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            r, g, b, _ = px[x, y]
            if is_bg_candidate(r, g, b) and not visited[y][x]:
                visited[y][x] = True
                q.append((x, y))

    while q:
        cx, cy = q.popleft()
        px[cx, cy] = (0, 0, 0, 0)
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, _ = px[nx, ny]
                if is_bg_candidate(r, g, b):
                    visited[ny][nx] = True
                    q.append((nx, ny))

    # Pulizia 1px di fringe chiaro adiacente a pixel trasparenti
    to_clear = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r >= fringe_threshold and g >= fringe_threshold and b >= fringe_threshold and (max(r, g, b) - min(r, g, b)) <= 22:
                adj_trans = False
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        adj_trans = True
                        break
                if adj_trans:
                    to_clear.append((x, y))
    for x, y in to_clear:
        px[x, y] = (0, 0, 0, 0)

    return rgba


def trim_alpha(img: Image.Image, pad: int = 0) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(img.width, bbox[2] + pad)
    y1 = min(img.height, bbox[3] + pad)
    return img.crop((x0, y0, x1, y1))


def fit_nearest(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    return img.resize((target_w, target_h), Image.NEAREST)


def find_segments(flags, min_len=4):
    segs = []
    start = None
    for i, val in enumerate(flags):
        if val and start is None:
            start = i
        elif not val and start is not None:
            if i - start >= min_len:
                segs.append((start, i))
            start = None
    if start is not None and len(flags) - start >= min_len:
        segs.append((start, len(flags)))
    return segs


def process_logo():
    path = find_raw(["logo", "title_logo"])
    im = Image.open(path).convert("RGBA")
    rgba = remove_white_bg_floodfill(im, threshold=230, fringe_threshold=200)
    # Rimuovi anche eventuali sacche bianche interne tra la scritta "Pokémon" e la corona/banner
    px = rgba.load()
    w, h = rgba.size
    # Floodfill da punti noti tra corona sinistra/destra e testo Pokémon (es. intorno y=340..420)
    for sx, sy in [(w // 2, int(h * 0.42)), (int(w * 0.25), int(h * 0.41)), (int(w * 0.75), int(h * 0.41))]:
        if 0 <= sx < w and 0 <= sy < h and px[sx, sy][3] > 0:
            r, g, b, _ = px[sx, sy]
            if r >= 235 and g >= 235 and b >= 235:
                q = deque([(sx, sy)])
                seen = {(sx, sy)}
                while q:
                    cx, cy = q.popleft()
                    px[cx, cy] = (0, 0, 0, 0)
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen:
                            rr, gg, bb, aa = px[nx, ny]
                            if aa > 0 and rr >= 232 and gg >= 232 and bb >= 232:
                                seen.add((nx, ny))
                                q.append((nx, ny))
    trimmed = trim_alpha(rgba, pad=2)
    # Mantieni proporzioni nitide per il titolo (larghezza ~260px)
    scale = 260 / trimmed.width
    out = fit_nearest(trimmed, 260, max(1, round(trimmed.height * scale)))
    out.save(os.path.join(OUT_DIR, "logo.png"))


def process_player():
    # 1. Player battle / standing + portrait
    battle_path = find_raw(["player_battle", "man_standing_pose"])
    battle_im = remove_white_bg_floodfill(Image.open(battle_path), threshold=232, fringe_threshold=205)
    battle_trim = trim_alpha(battle_im)
    # Battle sprite nitido ~128px altezza
    bh = 128
    bw = max(1, round(battle_trim.width * (bh / battle_trim.height)))
    fit_nearest(battle_trim, bw, bh).save(os.path.join(OUT_DIR, "player_battle.png"))

    # Portrait: ritaglio testa e spalle in quadrato 64x64
    pw = battle_trim.width
    ph = int(battle_trim.height * 0.56)
    portrait_crop = battle_trim.crop((0, 0, pw, ph))
    side = max(portrait_crop.width, portrait_crop.height)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(portrait_crop, ((side - portrait_crop.width) // 2, (side - portrait_crop.height) // 2))
    fit_nearest(square, 64, 64).save(os.path.join(OUT_DIR, "player_portrait.png"))

    # 2. Player overworld 3x4 spritesheet (ignora riga 4, specchia riga 3 per destra)
    sheet_path = find_raw(["player_overworld", "character_spritesheet"])
    sheet = Image.open(sheet_path).convert("RGB")
    sw, sh = sheet.size
    spx = sheet.load()

    row_flags = [any(min(spx[x, y]) < 238 for x in range(sw)) for y in range(sh)]
    col_flags = [any(min(spx[x, y]) < 238 for y in range(sh)) for x in range(sw)]
    row_segs = find_segments(row_flags, min_len=20)
    col_segs = find_segments(col_flags, min_len=20)

    assert len(row_segs) >= 3 and len(col_segs) == 3, f"Griglia player inattesa: rows={row_segs}, cols={col_segs}"

    # Ogni cella 32x48 (proporzione GBA overworld)
    fw, fh = 32, 48
    out_sheet = Image.new("RGBA", (fw * 3, fh * 4), (0, 0, 0, 0))

    def extract_cell(r_idx, c_idx):
        y0, y1 = row_segs[r_idx]
        x0, x1 = col_segs[c_idx]
        cell = sheet.crop((max(0, x0 - 4), max(0, y0 - 4), min(sw, x1 + 4), min(sh, y1 + 4)))
        clean = trim_alpha(remove_white_bg_floodfill(cell, threshold=230, fringe_threshold=200))
        # Scala per stare dentro (30x44) mantenendo aspect ratio e ancorato in basso al centro
        scale = min((fw - 2) / clean.width, (fh - 4) / clean.height)
        nw = max(1, round(clean.width * scale))
        nh = max(1, round(clean.height * scale))
        resized = fit_nearest(clean, nw, nh)
        frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        frame.paste(resized, ((fw - nw) // 2, fh - nh - 1))
        return frame

    # Righe 0 (giù), 1 (su), 2 (sinistra)
    # Nota: nel foglio grezzo, nella 3a riga (r=2, camminata a sinistra) il 3° frame (c=2)
    # ha la faccia rivolta a destra! Lo specchiamo prima orizzontalmente così tutti i 3 frame
    # della riga 2 guardano a sinistra, e specchiando l'intera riga 2 otteniamo la riga 3 (destra)
    # con tutti i 3 frame che guardano a destra.
    for r in range(3):
        for c in range(3):
            cell_img = extract_cell(r, c)
            if r == 2 and c == 2:
                cell_img = cell_img.transpose(Image.FLIP_LEFT_RIGHT)
            out_sheet.paste(cell_img, (c * fw, r * fh))
            if r == 2:
                # Riga 3 (destra): specchia orizzontalmente la riga 2 corretta!
                mirrored = cell_img.transpose(Image.FLIP_LEFT_RIGHT)
                out_sheet.paste(mirrored, (c * fw, 3 * fh))

    out_sheet.save(os.path.join(OUT_DIR, "player_overworld.png"))


def process_npcs():
    path = find_raw(["npcs"])
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    row_flags = [any(min(px[x, y]) < 238 for x in range(w)) for y in range(h)]
    col_flags = [any(min(px[x, y]) < 238 for y in range(h)) for x in range(w)]
    row_segs = find_segments(row_flags, min_len=30)
    col_segs = find_segments(col_flags, min_len=30)

    assert len(row_segs) == 2 and len(col_segs) == 4, f"Griglia NPC inattesa: {row_segs}, {col_segs}"

    names = [
        ["npc_amico_1", "npc_amico_2", "npc_amico_3", "npc_amico_4"],
        ["npc_prof_1", "npc_prof_2", "npc_prof_3", "npc_prof_4"],
    ]

    fw, fh = 32, 48
    for r in range(2):
        for c in range(4):
            y0, y1 = row_segs[r]
            x0, x1 = col_segs[c]
            cell = im.crop((max(0, x0 - 4), max(0, y0 - 4), min(w, x1 + 4), min(h, y1 + 4)))
            clean = trim_alpha(remove_white_bg_floodfill(cell, threshold=232, fringe_threshold=205))
            scale = min((fw - 2) / clean.width, (fh - 2) / clean.height)
            nw = max(1, round(clean.width * scale))
            nh = max(1, round(clean.height * scale))
            resized = fit_nearest(clean, nw, nh)
            frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
            frame.paste(resized, ((fw - nw) // 2, fh - nh - 1))
            frame.save(os.path.join(OUT_DIR, f"{names[r][c]}.png"))


def process_items():
    # Tesi rossa rilegata (preferisci vista frontale e/o isometrica)
    tesi_front = find_raw(["e02d56ac", "thesis_book_icon_e02"])
    im_t = trim_alpha(remove_white_bg_floodfill(Image.open(tesi_front), threshold=232, fringe_threshold=205))
    scale_t = min(44 / im_t.width, 48 / im_t.height)
    fit_nearest(im_t, max(1, round(im_t.width * scale_t)), max(1, round(im_t.height * scale_t))).save(
        os.path.join(OUT_DIR, "tesi.png")
    )

    tesi_iso = find_raw(["ea614b49", "thesis_book_icon_ea6"])
    im_ti = trim_alpha(remove_white_bg_floodfill(Image.open(tesi_iso), threshold=232, fringe_threshold=205))
    scale_ti = min(48 / im_ti.width, 48 / im_ti.height)
    fit_nearest(im_ti, max(1, round(im_ti.width * scale_ti)), max(1, round(im_ti.height * scale_ti))).save(
        os.path.join(OUT_DIR, "tesi_iso.png")
    )

    # Corona d'alloro con bacche rosse (attenzione: il centro della corona è bianco!)
    alloro_path = find_raw(["laurel_wreath", "alloro"])
    im_a = remove_white_bg_floodfill(Image.open(alloro_path), threshold=232, fringe_threshold=205)
    # Rimuovi anche il bianco all'interno del cerchio della corona!
    px = im_a.load()
    aw, ah = im_a.size
    cx, cy = aw // 2, ah // 2
    if px[cx, cy][3] > 0 and px[cx, cy][0] > 230 and px[cx, cy][1] > 230 and px[cx, cy][2] > 230:
        q = deque([(cx, cy)])
        seen = {(cx, cy)}
        while q:
            x, y = q.popleft()
            px[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < aw and 0 <= ny < ah and (nx, ny) not in seen:
                    r, g, b, a = px[nx, ny]
                    if a > 0 and r >= 225 and g >= 225 and b >= 225:
                        seen.add((nx, ny))
                        q.append((nx, ny))
    im_a_trim = trim_alpha(im_a)
    scale_a = min(56 / im_a_trim.width, 56 / im_a_trim.height)
    fit_nearest(im_a_trim, max(1, round(im_a_trim.width * scale_a)), max(1, round(im_a_trim.height * scale_a))).save(
        os.path.join(OUT_DIR, "alloro.png")
    )


def process_ui():
    path = find_raw(["ui_sprite_sheet", "ui.png"])
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()

    # Emote row: y in 180..380
    emote_cols = find_segments([any(min(px[x, y]) < 235 for y in range(180, 380)) for x in range(w)], min_len=15)
    emote_names = ["emote_exclaim", "emote_dots", "emote_heart"]
    assert len(emote_cols) == 3, f"Emote cols inattese: {emote_cols}"
    for idx, (x0, x1) in enumerate(emote_cols):
        cell = im.crop((max(0, x0 - 4), 185, min(w, x1 + 4), 375))
        clean = trim_alpha(remove_white_bg_floodfill(cell, threshold=232, fringe_threshold=205))
        fit_nearest(clean, 24, 28).save(os.path.join(OUT_DIR, f"{emote_names[idx]}.png"))

    # Box di dialogo stile GBA: y in 645..895
    box_crop = im.crop((58, 648, 966, 892))
    box_clean = trim_alpha(remove_white_bg_floodfill(box_crop, threshold=232, fringe_threshold=205))
    fit_nearest(box_clean, 304, 78).save(os.path.join(OUT_DIR, "dialogue_box.png"))


def process_tileset():
    path = find_raw(["classroom_tileset", "tileset"])
    ts = Image.open(path).convert("RGB")

    # 1. Pavimento piastrelle (tileable 32x32 -> prendo un blocco 64x64 pulito 2x2 e lo porto a 32x32)
    floor = ts.crop((32, 768, 96, 832)).convert("RGBA")
    fit_nearest(floor, 32, 32).save(os.path.join(OUT_DIR, "pavimento_piastrelle.png"))

    # 2. Erba verde (interno pulito senza bordi, 64x64 -> 32x32)
    grass = ts.crop((280, 792, 408, 920)).convert("RGBA")
    fit_nearest(grass, 32, 32).save(os.path.join(OUT_DIR, "erba.png"))

    # 3. Pavimentazione esterna a mattoncini (blocco 96x64 ripetibile -> 48x32 o 32x32, teniamo 64x64->32x32)
    # In x=528..624, y=768..832 ci sono esattamente 3 righe di mattoni ripetibili
    brick = ts.crop((526, 768, 622, 832)).convert("RGBA")
    fit_nearest(brick, 48, 32).save(os.path.join(OUT_DIR, "pavimento_mattoni.png"))

    # Striscia divisoria in pietra grigia per il cortile
    strip = ts.crop((628, 768, 692, 832)).convert("RGBA")
    fit_nearest(strip, 32, 32).save(os.path.join(OUT_DIR, "pavimento_striscia.png"))

    # 4. Muro con appendiabiti (x=10..234, y=0..126) -> 96x56
    wall_hooks = ts.crop((10, 0, 234, 126)).convert("RGBA")
    fit_nearest(wall_hooks, 96, 56).save(os.path.join(OUT_DIR, "muro_appendiabiti.png"))

    # Muro semplice (pannello liscio vicino alla finestra, x=364..383? Prendiamo lato destro muro 2a riga x=438..498, y=128..252)
    wall_plain = ts.crop((438, 128, 498, 252)).convert("RGBA")
    fit_nearest(wall_plain, 32, 56).save(os.path.join(OUT_DIR, "muro_liscio.png"))

    # 5. Finestra con serranda modulare per fila continua (x=445..573, y=0..126 -> 2 finestre = 64x56)
    window = ts.crop((445, 0, 573, 126)).convert("RGBA")
    fit_nearest(window, 64, 56).save(os.path.join(OUT_DIR, "finestra.png"))

    # 6. Porte blu con maniglione antipanico
    door_double = trim_alpha(remove_white_bg_floodfill(ts.crop((2, 260, 125, 386))))
    fit_nearest(door_double, 64, 56).save(os.path.join(OUT_DIR, "porta_doppia.png"))

    door_single = trim_alpha(remove_white_bg_floodfill(ts.crop((412, 260, 497, 386))))
    fit_nearest(door_single, 38, 56).save(os.path.join(OUT_DIR, "porta_singola.png"))

    # 7. Banchi lunghi in legno:
    # Estraiamo da y=447..512 (la riga superiore dei banchi):
    # - banco_sx (x=127..191): estremità sinistra con gamba
    # - banco_centro (x=200..328) da y=576..636 scalata in modo che top=0 e il piano+pannello abbiano la stessa identica altezza di banco_sx!
    raw_sx = remove_white_bg_floodfill(ts.crop((125, 446, 191, 513)))
    bbox_sx = raw_sx.getbbox()
    if bbox_sx:
        raw_sx = raw_sx.crop(bbox_sx)
    banco_sx = fit_nearest(raw_sx, 32, 32)
    banco_sx.save(os.path.join(OUT_DIR, "banco_sx.png"))

    # Per banco_centro prendiamo x=204..260 da y=446..508 (stessa riga y=446 di banco_sx, prima della giunzione a x=262, senza gamba!)
    # Controlliamo dove finisce il pannello grigio in banco_sx (~88% dell'altezza, perché gli ultimi ~4px sono i piedini alle estremità)
    raw_mid = remove_white_bg_floodfill(ts.crop((200, 446, 250, 505)))
    bbox_mid = raw_mid.getbbox()
    if bbox_mid:
        raw_mid = raw_mid.crop((0, bbox_mid[1], raw_mid.width, bbox_mid[3]))
    # Stessa proporzione verticale di banco_sx senza i piedini finali (29px su 32px)
    canvas_mid = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    scaled_mid = fit_nearest(raw_mid, 32, 29)
    canvas_mid.paste(scaled_mid, (0, 0))
    canvas_mid.save(os.path.join(OUT_DIR, "banco_centro.png"))

    # Estremità destra (specchiata perfettamente dall'estremità sinistra così i bordi combaciano al pixel)
    banco_sx.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT_DIR, "banco_dx.png"))

    # 8. Sedia tonda in legno (prendiamo la sedia pulita senza foglietto blu: x=65..127, y=513..576)
    sedia_tonda = trim_alpha(remove_white_bg_floodfill(ts.crop((65, 513, 127, 576))))
    fit_nearest(sedia_tonda, 26, 26).save(os.path.join(OUT_DIR, "sedia_tonda.png"))

    # 9. Cattedra lunga (x=0..256, y=644..766)
    cattedra = trim_alpha(remove_white_bg_floodfill(ts.crop((0, 644, 256, 766))))
    fit_nearest(cattedra, 112, 48).save(os.path.join(OUT_DIR, "cattedra.png"))

    # 10. Sedia da ufficio blu (frontale: x=384..450, y=648..762)
    sedia_blu = trim_alpha(remove_white_bg_floodfill(ts.crop((384, 648, 450, 762))))
    fit_nearest(sedia_blu, 28, 40).save(os.path.join(OUT_DIR, "sedia_blu.png"))

    # 11. Lavagna bianca (x=512..768, y=644..766)
    lavagna = trim_alpha(remove_white_bg_floodfill(ts.crop((512, 644, 768, 766))))
    fit_nearest(lavagna, 112, 52).save(os.path.join(OUT_DIR, "lavagna.png"))


def synthesize_victory_wav(wav_path: str):
    """
    Genera la fanfara orchestrale Pokémon Victory (26.0s, zero silenzi iniziali/finali)
    fedele alla traccia di vittoria nel caso il file grezzo non sia presente su disco.
    """
    import math
    import struct
    import wave

    sr = 44100
    duration = 26.0
    total_samples = int(sr * duration)
    bpm = 136.0
    beat = 60.0 / bpm  # ~0.441s

    # Melodia principale ottoni/sintetizzatore (freq Hz, start_sec, dur_sec)
    # Intro fanfara + tema trionfale in Re maggiore / Sol maggiore ripetuto
    def note_freq(midi: int) -> float:
        return 440.0 * (2.0 ** ((midi - 69) / 12.0))

    # Sequenza melodica: (midi_note, start_beat, length_beats)
    events = [
        # Fanfare d'attacco (0..4 beat)
        (74, 0.0, 0.33), (74, 0.33, 0.33), (74, 0.66, 0.34), (74, 1.0, 1.0),
        (70, 2.0, 1.0), (72, 3.0, 1.0),
        (74, 4.0, 0.66), (72, 4.66, 0.34), (74, 5.0, 2.8),
    ]
    # Loop principale festoso (da beat 8 in poi, blocchi di 16 beat)
    phrase = [
        (74, 0.0, 0.75), (78, 0.75, 0.75), (81, 1.5, 1.0), (79, 2.5, 0.75), (78, 3.25, 0.75),
        (76, 4.0, 1.0), (74, 5.0, 0.5), (76, 5.5, 0.5), (78, 6.0, 1.5), (74, 7.5, 0.5),
        (79, 8.0, 0.75), (83, 8.75, 0.75), (86, 9.5, 1.0), (85, 10.5, 0.75), (83, 11.25, 0.75),
        (81, 12.0, 0.75), (79, 12.75, 0.75), (78, 13.5, 1.0), (76, 14.5, 0.75), (78, 15.25, 0.75),
    ]
    for loop_idx in range(3):
        base = 8.0 + loop_idx * 16.0
        for m, sb, lb in phrase:
            if (base + sb) * beat < duration:
                events.append((m, base + sb, lb))

    # Accordi d'accompagnamento (D maj, G maj, A maj, D maj)
    chords = [
        ([62, 66, 69], 0.0, 2.0),
        ([58, 62, 65], 2.0, 1.0),
        ([60, 64, 67], 3.0, 1.0),
        ([62, 66, 69], 4.0, 4.0),
    ]
    for loop_idx in range(3):
        base = 8.0 + loop_idx * 16.0
        loop_chords = [
            ([62, 66, 69], 0.0, 4.0),
            ([64, 67, 71], 4.0, 2.0),
            ([62, 66, 69], 6.0, 2.0),
            ([67, 71, 74], 8.0, 4.0),
            ([69, 73, 76], 12.0, 2.0),
            ([62, 66, 69], 14.0, 2.0),
        ]
        for notes, sb, lb in loop_chords:
            if (base + sb) * beat < duration:
                chords.append((notes, base + sb, lb))

    buf = [0.0] * total_samples

    # Sintesi melodia brillante stile ottoni/orchestra GBA
    for midi, sb, lb in events:
        f = note_freq(midi)
        s0 = int(sb * beat * sr)
        s1 = min(total_samples, int((sb + lb) * beat * sr))
        n_len = max(1, s1 - s0)
        for i in range(n_len):
            t = i / sr
            env = min(1.0, i / (0.012 * sr)) * max(0.15, 1.0 - (i / n_len) * 0.65)
            if i > n_len - int(0.02 * sr):
                env *= max(0.0, (n_len - i) / (0.02 * sr))
            sig = (
                0.55 * math.sin(2 * math.pi * f * t)
                + 0.30 * math.sin(2 * math.pi * f * 2 * t)
                + 0.15 * math.sin(2 * math.pi * f * 3 * t)
            )
            buf[s0 + i] += 0.34 * env * sig

    # Sintesi accordi e basso ritmico
    for notes, sb, lb in chords:
        s0 = int(sb * beat * sr)
        s1 = min(total_samples, int((sb + lb) * beat * sr))
        bass_f = note_freq(notes[0] - 12)
        freqs = [note_freq(n) for n in notes]
        for i in range(max(1, s1 - s0)):
            t = i / sr
            pulse = 0.65 + 0.35 * math.sin(2 * math.pi * (t / (beat * 0.5)))
            chord_sig = sum(math.sin(2 * math.pi * cf * t) for cf in freqs) / len(freqs)
            bass_sig = math.sin(2 * math.pi * bass_f * t) + 0.4 * math.sin(2 * math.pi * bass_f * 2 * t)
            buf[s0 + i] += 0.20 * pulse * chord_sig + 0.22 * bass_sig

    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        frames = bytearray()
        for val in buf:
            clamped = max(-0.95, min(0.95, val))
            pcm = int(clamped * 32767)
            frames.extend(struct.pack("<hh", pcm, pcm))
        wf.writeframes(bytes(frames))


def process_audio():
    import subprocess

    # 1. Opening (Hall of Fame): taglia silenzio iniziale (0..0.86s) e silenzio finale (>56.4s)
    opening_raw = find_raw(["Hall_of_Fame", "1-44"])
    opening_out = os.path.join(OUT_DIR, "bgm_opening.mp3")
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-ss", "0.86", "-to", "56.40",
            "-i", opening_raw,
            "-af", "afade=t=in:st=0:d=0.35,afade=t=out:st=55.10:d=0.40",
            "-b:a", "160k", opening_out,
        ],
        check=True,
    )

    # 2. Game BGM (Road to Lavender Town): taglia silenzio iniziale (0..0.86s) e finale (>71.1s)
    game_raw = find_raw(["Road_to_Lavender", "1-25"])
    game_out = os.path.join(OUT_DIR, "bgm_game.mp3")
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-ss", "0.86", "-to", "71.10",
            "-i", game_raw,
            "-af", "afade=t=in:st=0:d=0.35,afade=t=out:st=69.80:d=0.40",
            "-b:a", "160k", game_out,
        ],
        check=True,
    )

    # 3. Battle BGM (Pokémon Battle): taglia silenzio iniziale (0..0.44s) ed elimina tutta la parte
    # parlata in giapponese e i silenzi finali (>62.45s), tenendo solo la musica pura!
    battle_raw = find_raw(["Pok_mon_Battle", "22."])
    battle_out = os.path.join(OUT_DIR, "bgm_battle.mp3")
    subprocess.run(
        [
            "ffmpeg", "-y", "-v", "error",
            "-ss", "0.44", "-to", "62.45",
            "-i", battle_raw,
            "-af", "afade=t=in:st=0:d=0.25,afade=t=out:st=61.55:d=0.45",
            "-b:a", "160k", battle_out,
        ],
        check=True,
    )

    # 4. Victory BGM: cerca eventuale MP3 caricato o genera la fanfara di vittoria senza silenzi
    victory_out = os.path.join(OUT_DIR, "bgm_victory.mp3")
    try:
        victory_raw = find_raw(["Victory", "Win", "23.", "24.", "45."])
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", victory_raw,
                "-af", "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-40dB:stop_periods=-1:stop_duration=0.3:stop_threshold=-40dB",
                "-b:a", "160k", victory_out,
            ],
            check=True,
        )
    except FileNotFoundError:
        tmp_wav = "/tmp/bgm_victory_synth.wav"
        synthesize_victory_wav(tmp_wav)
        subprocess.run(
            [
                "ffmpeg", "-y", "-v", "error",
                "-i", tmp_wav,
                "-af", "afade=t=in:st=0:d=0.15,afade=t=out:st=25.55:d=0.45",
                "-b:a", "160k", victory_out,
            ],
            check=True,
        )


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    process_logo()
    process_player()
    process_npcs()
    process_items()
    process_ui()
    process_tileset()
    process_audio()
    generated = sorted(f for f in os.listdir(OUT_DIR) if f.endswith(".png"))
    print(f"Generati {len(generated)} asset PNG puliti in {OUT_DIR}:")
    for f in generated:
        im = Image.open(os.path.join(OUT_DIR, f))
        print(f"  - {f}: {im.size} ({im.mode})")
    mp3s = sorted(f for f in os.listdir(OUT_DIR) if f.endswith(".mp3"))
    print(f"Generati {len(mp3s)} asset MP3 senza silenzi in {OUT_DIR}: {mp3s}")


if __name__ == "__main__":
    main()

