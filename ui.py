"""
Global Country Explorer — UI
Professional, fully-responsive desktop application built with CustomTkinter.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import webbrowser
import tkinter as tk
import tkinter.filedialog as filedialog

import customtkinter as ctk
import requests
from io import BytesIO
from PIL import Image, ImageTk

from logic import CountryLogic

# ── Optional Windows system beeps ────────────────────────────────────────────
try:
    import winsound
    def _beep_ok():    winsound.MessageBeep(winsound.MB_OK)
    def _beep_err():   winsound.MessageBeep(winsound.MB_ICONERROR)
except ImportError:
    def _beep_ok():    pass
    def _beep_err():   pass


# ─────────────────────────────────────────────────────────────────────────────
# Settings persistence
# ─────────────────────────────────────────────────────────────────────────────

def _settings_path() -> str:
    base = (os.path.dirname(sys.executable)
            if getattr(sys, "frozen", False)
            else os.path.abspath("."))
    return os.path.join(base, "settings.json")


def _load_theme() -> str:
    try:
        with open(_settings_path(), encoding="utf-8") as f:
            return json.load(f).get("theme", "System")
    except Exception:
        return "System"


def _save_theme(mode: str) -> None:
    try:
        with open(_settings_path(), "w", encoding="utf-8") as f:
            json.dump({"theme": mode}, f)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Formatting helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fmt_pop(raw) -> str:
    try:
        return f"{int(str(raw).replace(',', '')):,}"
    except (ValueError, TypeError):
        return str(raw) if raw else "N/A"


def _has_value(v) -> bool:
    return bool(v) and v != "N/A"


# ─────────────────────────────────────────────────────────────────────────────
# Design tokens  (light-mode / dark-mode tuples where needed)
# ─────────────────────────────────────────────────────────────────────────────

ACCENT        = "#3B82F6"          # blue-500
ACCENT_HOVER  = "#2563EB"          # blue-600
ACCENT_SUBTLE = ("#DBEAFE", "#1E3A5F")   # light bg tint around accent elements
SUCCESS       = "#10B981"          # emerald-500
DANGER        = "#EF4444"          # red-500
SIDEBAR_BG    = ("#1E293B", "#0F172A")   # slate-800 / slate-900
SIDEBAR_FG    = "#F8FAFC"
CARD_BG       = ("#FFFFFF", "#1E293B")
PANEL_BG      = ("#F1F5F9", "#0F172A")
BORDER        = ("#CBD5E1", "#334155")
TEXT_PRIMARY  = ("#0F172A", "#F8FAFC")
TEXT_MUTED    = ("#64748B", "#94A3B8")
ROW_HOVER     = ("#E2E8F0", "#1E3A5F")
STATUS_BG     = ("#F8FAFC", "#0F172A")


# ─────────────────────────────────────────────────────────────────────────────
# Splash screen  (uses its own CTk root)
# ─────────────────────────────────────────────────────────────────────────────

class SplashScreen(ctk.CTkToplevel):
    """Shown briefly while the data layer initialises."""

    W, H = 420, 240

    def __init__(self, master):
        super().__init__(master)
        self.overrideredirect(True)
        self.lift()
        self.attributes("-topmost", True)

        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"{self.W}x{self.H}+{(sw - self.W) // 2}+{(sh - self.H) // 2}")
        self.configure(fg_color="#0F172A")

        ctk.CTkLabel(self, text="🌍", font=("Segoe UI Emoji", 48)).pack(pady=(28, 0))
        ctk.CTkLabel(
            self, text="Global Country Explorer",
            font=("Segoe UI", 20, "bold"), text_color=ACCENT
        ).pack(pady=(6, 2))
        ctk.CTkLabel(
            self, text="Loading…",
            font=("Segoe UI", 10), text_color="#64748B"
        ).pack()

        self._bar = ctk.CTkProgressBar(
            self, width=320, height=6, corner_radius=3, progress_color=ACCENT,
            fg_color="#334155"
        )
        self._bar.pack(pady=(14, 0))
        self._bar.set(0)

        self._status = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 10), text_color="#94A3B8"
        )
        self._status.pack(pady=(6, 0))

    def step(self, value: float, text: str = "") -> None:
        self._bar.set(value)
        self._status.configure(text=text)
        self.update()


# ─────────────────────────────────────────────────────────────────────────────
# InfoRow  — a single labelled data row inside the result card
# ─────────────────────────────────────────────────────────────────────────────

class InfoRow(ctk.CTkFrame):
    """Icon + bold label + value, designed to stretch with the card."""

    ICON_W  = 26
    KEY_W   = 100

    def __init__(self, parent, icon: str, label: str, **kw):
        super().__init__(parent, fg_color="transparent", **kw)
        self.columnconfigure(2, weight=1)

        ctk.CTkLabel(
            self, text=icon, font=("Segoe UI Emoji", 14),
            width=self.ICON_W, anchor="w"
        ).grid(row=0, column=0, sticky="w")

        ctk.CTkLabel(
            self, text=f"{label}:", font=("Segoe UI", 13, "bold"),
            width=self.KEY_W, anchor="w",
            text_color=TEXT_MUTED
        ).grid(row=0, column=1, sticky="w", padx=(4, 8))

        self._val = ctk.CTkLabel(
            self, text="", font=("Segoe UI", 13),
            anchor="w", justify="left",
            wraplength=1,               # updated dynamically on resize
        )
        self._val.grid(row=0, column=2, sticky="ew")

    def set(self, text: str, color: str | tuple | None = None) -> None:
        cfg: dict = {"text": text}
        if color:
            cfg["text_color"] = color
        else:
            cfg["text_color"] = TEXT_PRIMARY
        self._val.configure(**cfg)

    def update_wraplength(self, width: int) -> None:
        self._val.configure(wraplength=max(width, 40))


# ─────────────────────────────────────────────────────────────────────────────
# Main application window
# ─────────────────────────────────────────────────────────────────────────────

class CountryUI(ctk.CTk):

    SIDEBAR_W  = 230
    MIN_W      = 800
    MIN_H      = 560

    def __init__(self, logic: CountryLogic) -> None:
        super().__init__()
        self.logic = logic
        self.withdraw()

        self.title("Global Country Explorer")
        self.geometry("1100x700")
        self.minsize(self.MIN_W, self.MIN_H)

        # Runtime state
        self._current_data: dict | None = None
        self._history:      list[str]   = []
        self._flag_img:     ImageTk.PhotoImage | None = None
        self._map_img:      ImageTk.PhotoImage | None = None
        self._popup_open:   bool = False
        self._resize_job:   str | None = None  # after() id for debounced resize
        # Monotonic counter — incremented on each search so stale
        # background fetches can detect they've been superseded.
        self._search_gen:   int = 0

        # Root grid: sidebar | content
        self.columnconfigure(0, weight=0, minsize=self.SIDEBAR_W)
        self.columnconfigure(1, weight=1)
        self.rowconfigure(0, weight=1)
        self.rowconfigure(1, weight=0)  # status bar

        self._build_sidebar()
        self._build_content()
        self._build_status_bar()
        self._build_autocomplete()

        self._hide_results()

        # Responsive resize hook
        self.bind("<Configure>", self._on_window_resize)

    # ══════════════════════════════════════════════════════════════════════════
    # Sidebar
    # ══════════════════════════════════════════════════════════════════════════

    def _build_sidebar(self) -> None:
        sb = ctk.CTkFrame(self, width=self.SIDEBAR_W, corner_radius=0,
                          fg_color=SIDEBAR_BG)
        sb.grid(row=0, column=0, rowspan=2, sticky="nsew")
        sb.grid_propagate(False)
        sb.columnconfigure(0, weight=1)
        sb.rowconfigure(2, weight=1)  # history expands
        self._sb = sb

        # ── Brand header ──────────────────────────────────────────────────────
        hdr = ctk.CTkFrame(sb, fg_color="transparent", corner_radius=0)
        hdr.grid(row=0, column=0, sticky="ew", pady=(0, 0))
        hdr.columnconfigure(0, weight=1)

        ctk.CTkLabel(hdr, text="🌍", font=("Segoe UI Emoji", 40),
                     text_color=SIDEBAR_FG).grid(row=0, column=0, pady=(22, 0))
        ctk.CTkLabel(
            hdr, text="Country Explorer",
            font=("Segoe UI", 15, "bold"), text_color=SIDEBAR_FG
        ).grid(row=1, column=0, pady=(4, 2))
        ctk.CTkLabel(
            hdr,
            text=f"{len(self.logic.country_names)} countries",
            font=("Segoe UI", 10), text_color="#64748B"
        ).grid(row=2, column=0, pady=(0, 16))

        # Divider
        ctk.CTkFrame(sb, height=1, fg_color="#334155",
                     corner_radius=0).grid(row=1, column=0, sticky="ew")

        # ── Recent searches ───────────────────────────────────────────────────
        hist_hdr = ctk.CTkFrame(sb, fg_color="transparent")
        hist_hdr.grid(row=2, column=0, sticky="nsew")
        hist_hdr.columnconfigure(0, weight=1)
        hist_hdr.rowconfigure(1, weight=1)

        ctk.CTkLabel(
            hist_hdr, text="RECENT SEARCHES",
            font=("Segoe UI", 9, "bold"), text_color="#475569", anchor="w"
        ).grid(row=0, column=0, sticky="w", padx=16, pady=(14, 6))

        self._hist_frame = ctk.CTkScrollableFrame(
            hist_hdr, fg_color="transparent",
            scrollbar_button_color="#334155",
            scrollbar_button_hover_color="#475569"
        )
        self._hist_frame.grid(row=1, column=0, sticky="nsew", padx=6)
        self._hist_frame.columnconfigure(0, weight=1)

        # ── Divider + theme ───────────────────────────────────────────────────
        ctk.CTkFrame(sb, height=1, fg_color="#334155",
                     corner_radius=0).grid(row=3, column=0, sticky="ew")

        foot = ctk.CTkFrame(sb, fg_color="transparent")
        foot.grid(row=4, column=0, sticky="ew", padx=14, pady=12)
        foot.columnconfigure(1, weight=1)

        ctk.CTkLabel(
            foot, text="Theme", font=("Segoe UI", 11),
            text_color="#94A3B8"
        ).grid(row=0, column=0, sticky="w", padx=(0, 10))

        self._theme_opt = ctk.CTkOptionMenu(
            foot, values=["Light", "Dark", "System"],
            font=("Segoe UI", 11),
            fg_color="#1E293B", button_color="#334155",
            button_hover_color="#475569", text_color=SIDEBAR_FG,
            dropdown_fg_color="#1E293B", dropdown_text_color=SIDEBAR_FG,
            dropdown_hover_color="#334155",
            command=self._on_theme_change,
        )
        self._theme_opt.grid(row=0, column=1, sticky="ew")
        self._theme_opt.set(_load_theme())

    # ══════════════════════════════════════════════════════════════════════════
    # Content area
    # ══════════════════════════════════════════════════════════════════════════

    def _build_content(self) -> None:
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.grid(row=0, column=1, sticky="nsew", padx=24, pady=20)
        content.columnconfigure(0, weight=1)
        content.rowconfigure(1, weight=1)
        self._content = content

        self._build_search_bar(content)
        self._build_welcome(content)
        self._build_result_card(content)

    # ── Search bar ────────────────────────────────────────────────────────────

    def _build_search_bar(self, parent: ctk.CTkFrame) -> None:
        bar = ctk.CTkFrame(parent, fg_color="transparent")
        bar.grid(row=0, column=0, sticky="ew", pady=(0, 16))
        bar.columnconfigure(0, weight=1)
        self._search_frame = bar

        self._entry = ctk.CTkEntry(
            bar,
            placeholder_text="Search for a country...",
            height=46,
            font=("Segoe UI", 15),
            border_width=1,
            border_color=BORDER,
            corner_radius=8,
            fg_color=CARD_BG,
            text_color=TEXT_PRIMARY,
        )
        self._entry.grid(row=0, column=0, sticky="ew", padx=(0, 8))
        self._entry.bind("<KeyRelease>", self._on_key_release)
        self._entry.bind("<Return>",     lambda _: self._do_search())
        self._entry.bind("<Escape>",     lambda _: self._close_popup())
        self._entry.bind("<Down>",       self._popup_arrow)

        self._btn_search = ctk.CTkButton(
            bar, text="Search", width=100, height=46,
            font=("Segoe UI", 13, "bold"),
            corner_radius=8,
            fg_color=ACCENT, hover_color=ACCENT_HOVER,
            command=self._do_search,
        )
        self._btn_search.grid(row=0, column=1, padx=(0, 6))

        self._btn_clear = ctk.CTkButton(
            bar, text="Clear", width=80, height=46,
            font=("Segoe UI", 13),
            corner_radius=8,
            fg_color=("gray80", "gray25"),
            hover_color=("gray70", "gray35"),
            text_color=TEXT_PRIMARY,
            command=self._do_clear,
        )
        self._btn_clear.grid(row=0, column=2)

        self._lbl_error = ctk.CTkLabel(
            bar, text="", font=("Segoe UI", 12),
            text_color=DANGER, anchor="w"
        )
        self._lbl_error.grid(row=1, column=0, columnspan=3,
                              sticky="w", pady=(4, 0))

    # ── Welcome / empty state ─────────────────────────────────────────────────

    def _build_welcome(self, parent: ctk.CTkFrame) -> None:
        frame = ctk.CTkFrame(parent, fg_color=CARD_BG,
                              corner_radius=12, border_width=1,
                              border_color=BORDER)
        frame.grid(row=1, column=0, sticky="nsew")
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(0, weight=1)

        inner = ctk.CTkFrame(frame, fg_color="transparent")
        inner.place(relx=0.5, rely=0.5, anchor="center")

        ctk.CTkLabel(inner, text="🌐", font=("Segoe UI Emoji", 56)).pack()
        ctk.CTkLabel(
            inner, text="Global Country Explorer",
            font=("Segoe UI", 20, "bold"), text_color=TEXT_PRIMARY
        ).pack(pady=(8, 4))
        ctk.CTkLabel(
            inner,
            text="Type a country name in the search bar to get started.",
            font=("Segoe UI", 13), text_color=TEXT_MUTED
        ).pack()
        ctk.CTkLabel(
            inner,
            text=f"{len(self.logic.country_names)} countries available",
            font=("Segoe UI", 11), text_color=TEXT_MUTED
        ).pack(pady=(8, 0))

        self._welcome = frame

    # ── Result card ───────────────────────────────────────────────────────────

    def _build_result_card(self, parent: ctk.CTkFrame) -> None:
        card = ctk.CTkFrame(parent, fg_color=CARD_BG,
                             corner_radius=12, border_width=1,
                             border_color=BORDER)
        card.columnconfigure(0, weight=1)
        card.columnconfigure(1, weight=0)
        card.rowconfigure(0, weight=1)
        self._card = card

        self._build_info_panel(card)
        self._build_flag_panel(card)

    def _build_info_panel(self, parent: ctk.CTkFrame) -> None:
        panel = ctk.CTkFrame(parent, fg_color="transparent")
        panel.grid(row=0, column=0, sticky="nsew", padx=28, pady=24)
        panel.columnconfigure(0, weight=1)
        panel.rowconfigure(1, weight=1)
        self._info_panel = panel

        # Country name
        self._lbl_name = ctk.CTkLabel(
            panel, text="", font=("Segoe UI", 28, "bold"),
            text_color=ACCENT, anchor="w"
        )
        self._lbl_name.grid(row=0, column=0, sticky="ew", pady=(0, 2))

        # Separator
        ctk.CTkFrame(panel, height=2, fg_color=ACCENT_SUBTLE,
                     corner_radius=1).grid(row=1, column=0, sticky="ew",
                                           pady=(0, 16))

        # Data rows
        rows_wrap = ctk.CTkFrame(panel, fg_color="transparent")
        rows_wrap.grid(row=2, column=0, sticky="nsew")
        rows_wrap.columnconfigure(0, weight=1)
        self._rows_wrap = rows_wrap

        self._rows: dict[str, InfoRow] = {}
        fields = [
            ("capital",    "🏛️", "Capital"),
            ("continent",  "🌍", "Continent"),
            ("population", "👥", "Population"),
            ("area",       "📐", "Area (km²)"),
            ("currency",   "💱", "Currency"),
            ("language",   "🗣️", "Language"),
            ("timezone",   "🕐", "Timezone"),
        ]
        for key, icon, label in fields:
            r = InfoRow(rows_wrap, icon, label)
            r.grid(sticky="ew", pady=4)
            rows_wrap.rowconfigure(len(self._rows), weight=0)
            self._rows[key] = r

        # Action buttons
        btn_bar = ctk.CTkFrame(panel, fg_color="transparent")
        btn_bar.grid(row=3, column=0, sticky="ew", pady=(20, 0))

        _btn = dict(height=34, corner_radius=7, font=("Segoe UI", 12))

        self._btn_copy = ctk.CTkButton(
            btn_bar, text="Copy Info", width=100,
            fg_color=("gray82", "gray28"),
            hover_color=("gray72", "gray38"),
            text_color=TEXT_PRIMARY,
            command=self._copy_info, **_btn
        )
        self._btn_copy.pack(side="left", padx=(0, 8))

        self._btn_export = ctk.CTkButton(
            btn_bar, text="Export JSON", width=110,
            fg_color=("gray82", "gray28"),
            hover_color=("gray72", "gray38"),
            text_color=TEXT_PRIMARY,
            command=self._export_json, **_btn
        )
        self._btn_export.pack(side="left", padx=(0, 8))

        self._btn_maps = ctk.CTkButton(
            btn_bar, text="Open in Maps", width=120,
            fg_color=ACCENT, hover_color=ACCENT_HOVER,
            command=self._open_maps, **_btn
        )
        self._btn_maps.pack(side="left")

    def _build_flag_panel(self, parent: ctk.CTkFrame) -> None:
        panel = ctk.CTkFrame(parent, fg_color=PANEL_BG,
                              corner_radius=12, width=300)
        panel.grid(row=0, column=1, sticky="nsew")
        panel.columnconfigure(0, weight=1)
        panel.rowconfigure(1, weight=1)
        panel.grid_propagate(False)
        self._flag_panel = panel

        ctk.CTkLabel(
            panel, text="NATIONAL FLAG",
            font=("Segoe UI", 9, "bold"), text_color=TEXT_MUTED
        ).grid(row=0, column=0, pady=(20, 8))

        self._lbl_flag = ctk.CTkLabel(panel, text="")
        self._lbl_flag.grid(row=1, column=0, padx=20, pady=(0, 20), sticky="n")

        # Country code badge
        self._lbl_code = ctk.CTkLabel(
            panel, text="",
            font=("Segoe UI", 22, "bold"), text_color=TEXT_MUTED
        )
        self._lbl_code.grid(row=2, column=0, pady=(0, 20))

    # ── Status bar ────────────────────────────────────────────────────────────

    def _build_status_bar(self) -> None:
        bar = ctk.CTkFrame(self, height=26, corner_radius=0,
                            fg_color=STATUS_BG)
        bar.grid(row=1, column=0, columnspan=2, sticky="ew")
        self._status_bar = bar

        self._lbl_status = ctk.CTkLabel(
            bar, text="Ready",
            font=("Segoe UI", 10), text_color=TEXT_MUTED
        )
        self._lbl_status.pack(side="left", padx=14)

        self._lbl_db = ctk.CTkLabel(
            bar,
            text=f"{len(self.logic.country_names)} countries loaded",
            font=("Segoe UI", 10),
            text_color=(SUCCESS, SUCCESS),
        )
        self._lbl_db.pack(side="right", padx=14)

    # ── Autocomplete popup ────────────────────────────────────────────────────

    def _build_autocomplete(self) -> None:
        self._popup = tk.Listbox(
            self,
            font=("Segoe UI", 13),
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            selectbackground=ACCENT,
            selectforeground="white",
            activestyle="none",
            cursor="hand2",
        )
        self._popup.bind("<<ListboxSelect>>", self._on_popup_pick)
        self._popup.bind("<Escape>",  lambda _: self._close_popup())
        self._popup.bind("<Return>",  self._on_popup_pick)
        self._popup_open = False

    # ══════════════════════════════════════════════════════════════════════════
    # Autocomplete logic
    # ══════════════════════════════════════════════════════════════════════════

    def _on_key_release(self, _event=None) -> None:
        q = self._entry.get().strip()
        if not q:
            self._close_popup()
            return
        hits = self.logic.get_suggestions(q)
        if hits:
            self._open_popup(hits)
        else:
            self._close_popup()

    def _open_popup(self, items: list[str]) -> None:
        self._popup.delete(0, tk.END)
        for item in items:
            self._popup.insert(tk.END, f"  {item}")

        self.update_idletasks()
        # Position directly under the entry widget
        rx = self._entry.winfo_rootx() - self.winfo_rootx()
        ry = (self._entry.winfo_rooty() - self.winfo_rooty()
              + self._entry.winfo_height() + 2)
        rw = self._entry.winfo_width()

        rows   = min(len(items), 7)
        row_h  = 30
        height = rows * row_h

        mode = ctk.get_appearance_mode()
        if mode == "Dark":
            self._popup.configure(bg="#1E293B", fg="#F1F5F9",
                                   highlightbackground="#334155",
                                   selectbackground=ACCENT)
        else:
            self._popup.configure(bg="#FFFFFF", fg="#0F172A",
                                   highlightbackground="#CBD5E1",
                                   selectbackground=ACCENT)

        self._popup.configure(height=rows)
        self._popup.place(x=rx, y=ry, width=rw, height=height)
        self._popup.lift()
        self._popup_open = True

    def _close_popup(self) -> None:
        if self._popup_open:
            self._popup.place_forget()
            self._popup_open = False

    def _popup_arrow(self, _event=None) -> None:
        if self._popup_open:
            self._popup.focus_set()
            self._popup.selection_set(0)

    def _on_popup_pick(self, _event=None) -> None:
        sel = self._popup.curselection()
        if not sel:
            return
        chosen = self._popup.get(sel[0]).strip()
        self._entry.delete(0, tk.END)
        self._entry.insert(0, chosen)
        self._close_popup()
        self._do_search()

    # ══════════════════════════════════════════════════════════════════════════
    # Search
    # ══════════════════════════════════════════════════════════════════════════

    def _do_search(self) -> None:
        self._close_popup()
        query = self._entry.get().strip()
        if not query:
            return

        self._set_status(f'Searching for "{query}"...')
        data = self.logic.get_country_info(query)

        if data:
            self._current_data = data
            self._lbl_error.configure(text="")
            _beep_ok()
            self._show_results(data)
            self._add_history(data["name"])
            self._set_status(f"Results for {data['name']}")
        else:
            self._current_data = None
            _beep_err()
            self._lbl_error.configure(
                text=f'No results for "{query}" — check spelling.'
            )
            self._hide_results()
            self._set_status("No results found")

    def _do_clear(self) -> None:
        self._entry.delete(0, tk.END)
        self._lbl_error.configure(text="")
        self._close_popup()
        self._current_data = None
        self._hide_results()
        self._set_status("Ready")

    # ══════════════════════════════════════════════════════════════════════════
    # Results display
    # ══════════════════════════════════════════════════════════════════════════

    def _show_results(self, data: dict) -> None:
        # Each search gets a unique generation id.
        # Background threads capture it and skip UI updates if it's stale.
        self._search_gen += 1
        gen = self._search_gen

        # Swap panels
        self._welcome.grid_remove()
        self._card.grid(row=1, column=0, sticky="nsew")

        # Populate fields that come from the CSV immediately
        self._lbl_name.configure(text=data["name"])
        self._rows["capital"].set(data["capital"])
        self._rows["continent"].set(data["continent"], color=ACCENT)
        self._rows["population"].set(_fmt_pop(data["population"]), color=SUCCESS)

        # Extra fields — show a subtle placeholder while loading
        for key in ("area", "currency", "language", "timezone"):
            self._rows[key].set("Fetching...", color=TEXT_MUTED)

        # Country code badge
        code = data.get("country_code", "").upper()
        self._lbl_code.configure(text=code if code else "")

        # Reset flag
        self._lbl_flag.configure(image=None, text="Loading...")
        self._flag_img = None

        # ── Launch background threads ─────────────────────────────────────────
        if data.get("country_code"):
            threading.Thread(
                target=self._fetch_flag,
                args=(data["country_code"], gen),
                daemon=True
            ).start()
            threading.Thread(
                target=self._fetch_extra,
                args=(data["country_code"], gen),
                daemon=True
            ).start()
        else:
            self._lbl_flag.configure(image=None, text="No flag available")
            for key in ("area", "currency", "language", "timezone"):
                self._rows[key].set("N/A")

        # Trigger a resize to re-fit wraplengths
        self.after(50, self._reflow)

    def _hide_results(self) -> None:
        self._card.grid_remove()
        self._welcome.grid(row=1, column=0, sticky="nsew")

    # ══════════════════════════════════════════════════════════════════════════
    # Async flag loading
    # ══════════════════════════════════════════════════════════════════════════

    def _fetch_flag(self, code: str, gen: int) -> None:
        try:
            url = f"https://flagcdn.com/w320/{code.strip().lower()}.png"
            resp = requests.get(url, timeout=7)
            resp.raise_for_status()
            img = Image.open(BytesIO(resp.content)).convert("RGBA")

            # Scale flag to fill panel width (panel is 300px wide, padx=20 each side)
            target_w = 260
            ratio    = target_w / img.width
            target_h = max(int(img.height * ratio), 1)
            img = img.resize((target_w, target_h), Image.LANCZOS)

            photo = ImageTk.PhotoImage(img)
            self.after(0, lambda p=photo: self._apply_flag(p, gen))
        except Exception:
            self.after(0, lambda: self._apply_flag(None, gen))

    def _apply_flag(self, photo: ImageTk.PhotoImage | None, gen: int) -> None:
        if gen != self._search_gen:
            return                          # superseded by a newer search
        if photo:
            self._flag_img = photo          # keep reference — prevents GC
            self._lbl_flag.configure(image=self._flag_img, text="")
        else:
            self._lbl_flag.configure(image=None, text="Flag unavailable")

    def _fetch_extra(self, code: str, gen: int) -> None:
        """Fetch area / currency / language / timezone in a background thread."""
        extra = self.logic.fetch_extra_info(code)
        self.after(0, lambda e=extra: self._apply_extra(e, gen))

    def _apply_extra(self, extra: dict, gen: int) -> None:
        """Apply fetched extra fields — only if this search is still current."""
        if gen != self._search_gen:
            return

        self._rows["area"].set(extra["area"])
        self._rows["currency"].set(extra["currency"])
        self._rows["language"].set(extra["language"])
        self._rows["timezone"].set(extra["timezone"])

        # Persist into current_data so Copy / Export include the live values
        if self._current_data:
            self._current_data.update(extra)

        self._reflow()

    # ══════════════════════════════════════════════════════════════════════════
    # Action buttons
    # ══════════════════════════════════════════════════════════════════════════

    def _copy_info(self) -> None:
        if not self._current_data:
            return
        d = self._current_data
        lines = [
            f"Country:    {d['name']}",
            f"Capital:    {d['capital']}",
            f"Continent:  {d['continent']}",
            f"Population: {_fmt_pop(d['population'])}",
        ]
        for key, label in (("area", "Area"), ("currency", "Currency"),
                           ("language", "Language"), ("timezone", "Timezone")):
            v = d.get(key, "N/A")
            if _has_value(v):
                lines.append(f"{label+':':<12}{v}")
        self.clipboard_clear()
        self.clipboard_append("\n".join(lines))
        self._flash("Copied to clipboard", 2200)

    def _export_json(self) -> None:
        if not self._current_data:
            return
        safe_name = self._current_data["name"].lower().replace(" ", "_")
        path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialfile=f"{safe_name}.json",
        )
        if path:
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(self._current_data, f, indent=4, ensure_ascii=False)
                self._flash(f"Exported to {os.path.basename(path)}", 2500)
            except Exception as exc:
                self._set_status(f"Export failed: {exc}")

    def _open_maps(self) -> None:
        if not self._current_data:
            return
        name  = self._current_data["name"]
        query = requests.utils.quote(name)
        webbrowser.open_new_tab(
            f"https://www.google.com/maps/search/?api=1&query={query}"
        )
        self._flash(f"Opened Google Maps for {name}", 2000)

    # ══════════════════════════════════════════════════════════════════════════
    # History
    # ══════════════════════════════════════════════════════════════════════════

    def _add_history(self, name: str) -> None:
        if name in self._history:
            self._history.remove(name)
        self._history.insert(0, name)
        self._history = self._history[:15]
        self._render_history()

    def _render_history(self) -> None:
        for w in self._hist_frame.winfo_children():
            w.destroy()

        if not self._history:
            ctk.CTkLabel(
                self._hist_frame, text="No searches yet",
                font=("Segoe UI", 11), text_color="#475569"
            ).pack(padx=8, pady=6)
            return

        for item in self._history:
            btn = ctk.CTkButton(
                self._hist_frame,
                text=item,
                anchor="w",
                height=32,
                font=("Segoe UI", 12),
                fg_color="transparent",
                text_color="#CBD5E1",
                hover_color="#1E293B",
                corner_radius=6,
                command=lambda i=item: self._history_search(i),
            )
            btn.pack(fill="x", padx=4, pady=1)

    def _history_search(self, name: str) -> None:
        self._entry.delete(0, tk.END)
        self._entry.insert(0, name)
        self._do_search()

    # ══════════════════════════════════════════════════════════════════════════
    # Theme
    # ══════════════════════════════════════════════════════════════════════════

    def _on_theme_change(self, mode: str) -> None:
        ctk.set_appearance_mode(mode)
        _save_theme(mode)
        if self._popup_open:
            self._close_popup()

    # ══════════════════════════════════════════════════════════════════════════
    # Responsive resize
    # ══════════════════════════════════════════════════════════════════════════

    def _on_window_resize(self, _event=None) -> None:
        # Debounce — reflow once, 80ms after the last resize event
        if self._resize_job:
            self.after_cancel(self._resize_job)
        self._resize_job = self.after(80, self._reflow)

    def _reflow(self) -> None:
        """Recalculate dynamic sizes after a window resize."""
        self._resize_job = None
        self.update_idletasks()

        # Update InfoRow wraplengths so value text wraps cleanly
        if self._rows_wrap.winfo_exists():
            wrap_w = max(self._rows_wrap.winfo_width()
                         - InfoRow.ICON_W - InfoRow.KEY_W - 30, 60)
            for row in self._rows.values():
                row.update_wraplength(wrap_w)

        # Keep autocomplete popup in sync if open
        if self._popup_open:
            self._open_popup([
                self._popup.get(i).strip()
                for i in range(self._popup.size())
            ])

    # ══════════════════════════════════════════════════════════════════════════
    # Status bar
    # ══════════════════════════════════════════════════════════════════════════

    def _set_status(self, text: str) -> None:
        self._lbl_status.configure(text=text)

    def _flash(self, text: str, restore_ms: int = 2000) -> None:
        """Show a temporary status message then restore the previous one."""
        # Capture current status *value* before changing it
        current_name = (self._current_data["name"]
                        if self._current_data else None)
        self._set_status(text)
        restore_text = (f"Results for {current_name}"
                        if current_name else "Ready")
        self.after(restore_ms, lambda: self._set_status(restore_text))


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    ctk.set_appearance_mode(_load_theme())
    ctk.set_default_color_theme("blue")

    # The splash needs a real CTk root to parent to
    _root = ctk.CTk()
    _root.withdraw()

    splash = SplashScreen(_root)
    splash.step(0.10, "Loading database...")

    logic = CountryLogic()
    splash.step(0.60, f"Loaded {len(logic.country_names)} countries")

    splash.step(0.85, "Building interface...")
    app = CountryUI(logic)

    splash.step(1.00, "Ready")
    splash.after(400, splash.destroy)
    _root.after(450, _root.destroy)

    app.after(460, app.deiconify)
    app.mainloop()


if __name__ == "__main__":
    main()
