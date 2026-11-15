from PIL import Image, ImageDraw, ImageFont
import os

OUT = "/home/kiang/public_html/tainan.olc.tw/docs/p/wushantou"
W, H = 1080, 1080

def font(name, size):
    paths = {
        "black": ("/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc", 3),
        "bold": ("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 3),
        "regular": ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 3),
        "medium": ("/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc", 3),
        "serif-bold": ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc", 3),
        "serif-black": ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc", 3),
        "serif-medium": ("/usr/share/fonts/opentype/noto/NotoSerifCJK-Medium.ttc", 3),
    }
    p, idx = paths[name]
    return ImageFont.truetype(p, size, index=idx)

# Colors
BG_LEFT_GREEN = (228, 243, 234)
BG_RIGHT_RED = (252, 236, 232)
BG_LEFT_AMBER = (253, 245, 216)
GREEN = (26, 122, 58)
GREEN_LIGHT = (200, 235, 212)
RED = (192, 57, 43)
RED_LIGHT = (245, 210, 205)
AMBER = (138, 109, 0)
AMBER_LIGHT = (240, 230, 185)
DARK = (28, 25, 23)
MUTED = (120, 114, 108)
WHITE = (255, 255, 255)
DIVIDER = (200, 195, 188)
BOTTOM_BG = (35, 32, 30)

def new_img(left_bg=BG_LEFT_GREEN, right_bg=BG_RIGHT_RED):
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W//2-1, H], fill=left_bg)
    d.rectangle([W//2+1, 0, W, H], fill=right_bg)
    d.line([(W//2, 0), (W//2, H)], fill=DIVIDER, width=3)
    return img, d

def ct(d, text, x, y, f, fill, anchor="mt"):
    d.text((x, y), text, font=f, fill=fill, anchor=anchor)

def btn_text(d, text, x, y1, y2, f, fill):
    """Draw text vertically centered between y1 and y2, horizontally at x."""
    d.text((x, (y1+y2)//2), text, font=f, fill=fill, anchor="mm")

def draw_check(d, cx, cy, size=14, color=GREEN, width=5):
    """Draw a clean checkmark at center (cx, cy)."""
    d.line([(cx-size, cy), (cx-size//3, cy+size*2//3)], fill=color, width=width)
    d.line([(cx-size//3, cy+size*2//3), (cx+size, cy-size*2//3)], fill=color, width=width)

def draw_cross(d, cx, cy, size=12, color=RED, width=5):
    """Draw a clean X mark at center (cx, cy)."""
    d.line([(cx-size, cy-size), (cx+size, cy+size)], fill=color, width=width)
    d.line([(cx+size, cy-size), (cx-size, cy+size)], fill=color, width=width)

def lc(d, text, y, f, fill):
    ct(d, text, W//4, y, f, fill)

def rc(d, text, y, f, fill):
    ct(d, text, W*3//4, y, f, fill)

def cc(d, text, y, f, fill):
    ct(d, text, W//2, y, f, fill)

def bottom_bar(d, line1, line2):
    d.rectangle([0, H-150, W, H-60], fill=BOTTOM_BG)
    cc(d, line1, H-135, font("regular", 26), (190, 186, 180))
    cc(d, line2, H-95, font("bold", 30), WHITE)

def footer_strip(d):
    d.rectangle([0, H-60, W, H], fill=(25, 22, 20))
    cc(d, "北中西區台南議員候選人2號 江明宗｜tainan.olc.tw", H-35, font("regular", 22), (160, 156, 150))

def header_left(d, country, sub, color):
    lc(d, country, 48, font("serif-black", 56), color)
    lc(d, sub, 115, font("regular", 26), MUTED)

def header_right(d):
    rc(d, "烏山頭", 48, font("serif-black", 56), RED)
    rc(d, "烏山頭水庫", 115, font("regular", 26), MUTED)

# ============================================================
# 1: Singapore
# ============================================================
def img1():
    img, d = new_img()
    header_left(d, "新加坡", "登格蓄水池", GREEN)
    header_right(d)

    # Left timeline
    steps = [("2011", "啟動評估"), ("2015", "環境影響研究"), ("2016", "測試平台"), ("2018", "確認安全"), ("2021", "正式啟用")]
    for i, (year, label) in enumerate(steps):
        y = 195 + i * 95
        d.ellipse([W//4-10, y-10, W//4+10, y+10], fill=GREEN)
        if i < len(steps)-1:
            d.line([(W//4, y+10), (W//4, y+85)], fill=GREEN, width=3)
        d.text((W//4+28, y-22), year, font=font("bold", 32), fill=GREEN)
        d.text((W//4+28, y+12), label, font=font("regular", 26), fill=DARK)

    d.rounded_rectangle([70, 710, W//2-70, 780], radius=12, fill=GREEN)
    btn_text(d, "歷時 10 年", W//4, 710, 780, font("serif-bold", 38), WHITE)

    # Right - missing items
    items = [("事前評估", 260), ("測試平台", 410), ("科學驗證", 560)]
    for label, y in items:
        draw_cross(d, W*3//4-80, y, size=16, color=RED, width=6)
        d.text((W*3//4-50, y-20), label, font=font("bold", 34), fill=RED)
        d.text((W*3//4-50, y+22), "未執行", font=font("regular", 24), fill=MUTED)

    d.rounded_rectangle([W//2+70, 710, W-70, 780], radius=12, fill=RED)
    btn_text(d, "直接動工", W*3//4, 710, 780, font("serif-bold", 38), WHITE)

    bottom_bar(d, "蓄水池 vs 灌溉飲用水源", "風險更高，把關卻更少")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_1_singapore.png"))
    print("1 done")

# ============================================================
# 2: UK
# ============================================================
def img2():
    img, d = new_img()
    header_left(d, "英國", "女王二世水庫", GREEN)
    header_right(d)

    lc(d, "覆蓋面積", 170, font("bold", 28), DARK)
    # bar
    bx, by, bw, bh = 70, 210, W//2-140, 45
    d.rounded_rectangle([bx, by, bx+bw, by+bh], radius=8, outline=GREEN, width=2, fill=GREEN_LIGHT)
    d.rounded_rectangle([bx, by, bx+int(bw*0.1), by+bh], radius=8, fill=GREEN)
    lc(d, "< 10%", 310, font("black", 72), GREEN)
    lc(d, "嚴格限制覆蓋比例", 375, font("regular", 22), MUTED)

    checks = ["EIA 篩選意見書", "六年規劃審查", "國會持續監督", "生態循環維護"]
    for i, c in enumerate(checks):
        y = 430 + i * 55
        draw_check(d, 95, y+14, size=12, color=GREEN, width=5)
        d.text((118, y-2), c, font=font("bold", 28), fill=DARK)

    # Right
    rc(d, "審查程序", 170, font("bold", 28), DARK)
    d.text((W*3//4, 330), "0", font=font("black", 180), fill=RED, anchor="mm")
    rc(d, "「自行招商」免除所有審查", 440, font("regular", 22), MUTED)

    crosses = ["無 EIA 篩選", "無規劃審查", "無國會監督", "無覆蓋管控"]
    for i, c in enumerate(crosses):
        y = 530 + i * 50
        draw_cross(d, W//2+95, y+12, size=11, color=RED, width=5)
        d.text((W//2+118, y-2), c, font=font("bold", 26), fill=RED)

    bottom_bar(d, "英國：六年三關", "台灣：零年零關")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_2_uk.png"))
    print("2 done")

# ============================================================
# 3: Netherlands
# ============================================================
def img3():
    img, d = new_img()
    header_left(d, "荷蘭", "Andijk 淨水廠", GREEN)
    header_right(d)

    lc(d, "分階段建置策略", 170, font("bold", 28), DARK)
    phases = [("Phase 1", "建置第一批島嶼"), ("監測驗證", "水質、藻類、生態"), ("Phase 2", "確認安全後擴建"), ("持續監測", "科學機構把關")]
    for i, (title, sub) in enumerate(phases):
        y = 220 + i * 105
        d.rounded_rectangle([65, y, W//2-65, y+78], radius=10, outline=GREEN, width=2, fill=GREEN_LIGHT)
        d.text((85, y+8), title, font=font("bold", 26), fill=GREEN)
        d.text((85, y+40), sub, font=font("regular", 22), fill=DARK)
        if i < len(phases)-1:
            lc(d, "▼", y+90, font("bold", 24), GREEN)

    d.rounded_rectangle([70, 680, W//2-70, 740], radius=10, fill=GREEN)
    lc(d, "Deltares 科學把關", 710, font("bold", 28), WHITE)

    # Right: single big block
    rc(d, "一次到位建置", 170, font("bold", 28), DARK)
    d.rounded_rectangle([W//2+60, 220, W-60, 620], radius=12, outline=RED, width=2, fill=RED_LIGHT)
    rc(d, "11.5", 350, font("black", 110), RED)
    rc(d, "公頃", 440, font("serif-bold", 44), RED)
    rc(d, "一次建完", 510, font("bold", 34), RED)
    rc(d, "無分階段", 560, font("regular", 24), MUTED)
    rc(d, "無停損機制", 595, font("regular", 24), MUTED)

    d.rounded_rectangle([W//2+70, 680, W-70, 740], radius=10, fill=RED)
    rc(d, "無科學把關", 710, font("bold", 28), WHITE)

    bottom_bar(d, "荷蘭：分階段驗證", "台灣：一步到位，無法回頭")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_3_netherlands.png"))
    print("3 done")

# ============================================================
# 4: Korea
# ============================================================
def img4():
    img, d = new_img()
    header_left(d, "韓國", "陜川水壩", GREEN)
    header_right(d)

    lc(d, "居民參與模式", 170, font("bold", 28), DARK)
    lc(d, "居民 = 投資人", 225, font("black", 34), GREEN)

    steps_l = ["資訊透明公開", "社區溝通協商", "居民投資入股", "收益共享機制"]
    for i, s in enumerate(steps_l):
        y = 300 + i * 90
        d.rounded_rectangle([70, y, W//2-70, y+60], radius=8, outline=GREEN, width=2, fill=GREEN_LIGHT)
        lc(d, s, y+30, font("bold", 26), DARK)
        if i < len(steps_l)-1:
            lc(d, "▼", y+68, font("regular", 20), GREEN)

    d.rounded_rectangle([70, 680, W//2-70, 740], radius=10, fill=GREEN)
    lc(d, "共識建置、長期合作", 710, font("bold", 26), WHITE)

    # Right: top-down
    rc(d, "由上而下模式", 170, font("bold", 28), DARK)
    rc(d, "居民 = 被通知者", 225, font("black", 34), RED)

    steps_r = ["管理機關決定", "直接發包建置", "居民事後才知", "爭議不斷"]
    for i, s in enumerate(steps_r):
        y = 300 + i * 90
        d.rounded_rectangle([W//2+70, y, W-70, y+60], radius=8, outline=RED, width=2, fill=RED_LIGHT)
        rc(d, s, y+30, font("bold", 26), RED)
        if i < len(steps_r)-1:
            rc(d, "▼", y+68, font("regular", 20), RED)

    d.rounded_rectangle([W//2+70, 680, W-70, 740], radius=10, fill=RED)
    rc(d, "爭議不斷、信任破裂", 710, font("bold", 26), WHITE)

    bottom_bar(d, "韓國：居民共享利益", "台灣：你的水庫沒有你的發言權")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_4_korea.png"))
    print("4 done")

# ============================================================
# 5: Japan
# ============================================================
def img5():
    img, d = new_img(BG_LEFT_AMBER, BG_RIGHT_RED)
    header_left(d, "日本", "千葉山倉水庫", AMBER)
    header_right(d)

    lc(d, "水庫用途", 175, font("bold", 28), DARK)
    d.rounded_rectangle([70, 210, W//2-70, 300], radius=12, outline=AMBER, width=2, fill=AMBER_LIGHT)
    lc(d, "工業用水", 255, font("black", 44), AMBER)

    lc(d, "颱風教訓", 340, font("bold", 28), DARK)
    lc(d, "2019 法西颱風", 395, font("bold", 30), AMBER)
    lc(d, "光電板脫落起火", 435, font("regular", 26), DARK)
    lc(d, "→ 改良結構重建", 470, font("regular", 24), MUTED)

    lc(d, "擴建計畫", 530, font("bold", 28), DARK)
    d.rounded_rectangle([70, 560, W//2-70, 640], radius=10, fill=AMBER)
    lc(d, "300-500 MW 須環評", 600, font("bold", 28), WHITE)

    # Right
    rc(d, "水庫用途", 175, font("bold", 28), DARK)
    d.rounded_rectangle([W//2+70, 210, W-70, 300], radius=12, outline=RED, width=2, fill=RED_LIGHT)
    rc(d, "灌溉 + 飲用水", 255, font("black", 40), RED)

    rc(d, "颱風風險", 340, font("bold", 28), DARK)
    rc(d, "同為颱風頻繁地區", 395, font("bold", 28), RED)
    rc(d, "未見結構風險評估", 435, font("regular", 26), DARK)
    rc(d, "→ 有因應措施嗎？", 470, font("regular", 24), MUTED)

    rc(d, "現行狀態", 530, font("bold", 28), DARK)
    d.rounded_rectangle([W//2+70, 560, W-70, 640], radius=10, fill=RED)
    rc(d, "免環評", 600, font("bold", 34), WHITE)

    bottom_bar(d, "工業用水尚且需要環評擴建", "灌溉飲用水源反而免環評？")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_5_japan.png"))
    print("5 done")

# ============================================================
# 6: China
# ============================================================
def img6():
    img, d = new_img(BG_LEFT_AMBER, BG_RIGHT_RED)
    header_left(d, "中國", "丁莊水庫", AMBER)
    header_right(d)

    lc(d, "資訊透明度", 175, font("bold", 28), DARK)
    d.rounded_rectangle([60, 215, W//2-60, 480], radius=12, outline=AMBER, width=2, fill=AMBER_LIGHT)
    lc(d, "查無環評報告", 290, font("black", 36), AMBER)
    lc(d, "數據來自官方媒體", 345, font("regular", 24), MUTED)
    lc(d, "無獨立第三方驗證", 380, font("regular", 24), MUTED)
    lc(d, "無公民參與機制", 415, font("regular", 24), MUTED)

    d.rounded_rectangle([80, 510, W//2-80, 575], radius=8, fill=AMBER)
    btn_text(d, "工業用水", W//4, 510, 575, font("bold", 30), WHITE)

    # Right
    rc(d, "資訊透明度", 175, font("bold", 28), DARK)
    d.rounded_rectangle([W//2+60, 215, W-60, 480], radius=12, outline=RED, width=2, fill=RED_LIGHT)
    rc(d, "同樣免環評", 290, font("black", 36), RED)
    rc(d, "自行招商規避審查", 345, font("regular", 24), MUTED)
    rc(d, "居民溝通不足", 380, font("regular", 24), MUTED)
    rc(d, "枯水期才知中國製底座", 415, font("regular", 22), MUTED)

    d.rounded_rectangle([W//2+80, 510, W-80, 575], radius=8, fill=RED)
    btn_text(d, "灌溉 + 飲用水", W*3//4, 510, 575, font("bold", 28), WHITE)

    # Big question
    d.rounded_rectangle([120, 620, W-120, 740], radius=12, fill=BOTTOM_BG)
    btn_text(d, "台灣的把關標準", W//2, 620, 680, font("serif-bold", 32), WHITE)
    btn_text(d, "要向中國看齊嗎？", W//2, 680, 740, font("serif-black", 36), (239, 107, 94))

    bottom_bar(d, "中國工業水庫無環評", "台灣飲用水庫也無環評？")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_6_china.png"))
    print("6 done")

# ============================================================
# 7: US
# ============================================================
def img7():
    img, d = new_img()
    header_left(d, "美國", "Canoe Brook 水庫", GREEN)
    header_right(d)

    lc(d, "三層審查制度", 170, font("bold", 28), DARK)

    tiers = [
        ("聯邦", "陸軍工兵署 USACE", "Permit 52 / Section 404"),
        ("州", "環境保護局 DEP", "逐案費率審查"),
        ("地方", "地方規劃委員會", "社區公開聽證"),
    ]
    greens = [(26,122,58), (40,145,75), (60,165,95)]
    for i, (tier, line1, line2) in enumerate(tiers):
        y = 225 + i * 140
        d.rounded_rectangle([55, y, W//2-55, y+115], radius=10, fill=greens[i])
        d.text((80, y+10), f"TIER {i+1} — {tier}", font=font("bold", 22), fill=WHITE)
        d.text((80, y+42), line1, font=font("bold", 28), fill=WHITE)
        d.text((80, y+78), line2, font=font("regular", 22), fill=(220,240,225))

    d.rounded_rectangle([80, 680, W//2-80, 750], radius=10, fill=GREEN)
    btn_text(d, "3 層把關", W//4, 680, 750, font("serif-black", 42), WHITE)

    # Right: big zero
    rc(d, "審查層級", 170, font("bold", 28), DARK)
    d.rounded_rectangle([W//2+60, 225, W-60, 640], radius=12, outline=RED, width=2, fill=RED_LIGHT)
    d.text((W*3//4, 330), "0", font=font("black", 160), fill=(192,57,43,60), anchor="mm")
    rc(d, "無聯邦審查", 440, font("bold", 28), RED)
    rc(d, "無地方審查", 485, font("bold", 28), RED)
    rc(d, "無環評程序", 530, font("bold", 28), RED)
    rc(d, "自行招商一關通過", 585, font("regular", 22), MUTED)

    d.rounded_rectangle([W//2+80, 680, W-80, 750], radius=10, fill=RED)
    btn_text(d, "0 層把關", W*3//4, 680, 750, font("serif-black", 42), WHITE)

    bottom_bar(d, "美國：三層逐案審查", "台灣：連一次評估都沒做")
    footer_strip(d)
    img.save(os.path.join(OUT, "share_7_us.png"))
    print("7 done")


if __name__ == "__main__":
    img1()
    img2()
    img3()
    img4()
    img5()
    img6()
    img7()
    print("All 7 images generated!")
