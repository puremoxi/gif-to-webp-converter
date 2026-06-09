; ============================================================
;  Shrink Ray — Inno Setup 6 installer script
;  https://jrsoftware.org/isinfo.php
;
;  Produces: dist\ShrinkRay-Setup-4.2.0.exe
;
;  Prerequisites:
;    1. Run `npm run build:exe` first to produce dist\ShrinkRay.exe
;    2. Place a 256x256 icon at build\icon.ico  (see BUILD.md)
;    3. Compile this script in the Inno Setup IDE or via:
;         ISCC.exe build\installer.iss
; ============================================================

#define AppName      "Shrink Ray"
#define AppVersion   "5.0.0"
#define AppPublisher "Shrink Ray"
#define AppExe       "ShrinkRay.exe"
#define AppURL       "https://github.com/puremoxi/gif-to-webp-converter"

; ── Setup metadata ────────────────────────────────────────────────────────────
[Setup]
AppName                    = {#AppName}
AppVersion                 = {#AppVersion}
AppVerName                 = {#AppName} {#AppVersion}
AppPublisher               = {#AppPublisher}
AppPublisherURL            = {#AppURL}
AppSupportURL              = {#AppURL}

; Install to per-user AppData\Local by default (no UAC prompt needed).
; The dialog lets the user switch to Program Files if they prefer.
DefaultDirName             = {localappdata}\{#AppName}
DefaultGroupName           = {#AppName}
PrivilegesRequired         = lowest
PrivilegesRequiredOverridesAllowed = dialog

; Output
OutputDir                  = ..\dist
OutputBaseFilename         = ShrinkRay-Setup-{#AppVersion}
SetupIconFile              = icon.ico

; Compression
Compression                = lzma2/ultra64
SolidCompression           = yes
LZMAUseSeparateProcess     = yes

; Appearance
WizardStyle                = modern
WizardResizable            = no
DisableWelcomePage         = no

; Uninstall
UninstallDisplayName       = {#AppName}
UninstallDisplayIcon       = {app}\{#AppExe}
CreateUninstallRegKey      = yes

; ── Languages ────────────────────────────────────────────────────────────────
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

; ── Optional tasks shown to the user ─────────────────────────────────────────
[Tasks]
Name: "desktopicon"; \
  Description: "Create a &desktop shortcut"; \
  GroupDescription: "Additional icons:"; \
  Flags: unchecked

; ── Files to install ─────────────────────────────────────────────────────────
[Files]
; The single self-contained executable (all assets embedded by pkg)
Source: "..\dist\{#AppExe}"; \
  DestDir: "{app}"; \
  Flags: ignoreversion

; ── Shortcuts ────────────────────────────────────────────────────────────────
[Icons]
; Start Menu
Name: "{group}\{#AppName}"; \
  Filename: "{app}\{#AppExe}"; \
  WindowStyle: wsMinimized; \
  Comment: "Open Shrink Ray image converter"

Name: "{group}\Uninstall {#AppName}"; \
  Filename: "{uninstallexe}"

; Desktop (only if the user opted in)
Name: "{commondesktop}\{#AppName}"; \
  Filename: "{app}\{#AppExe}"; \
  WindowStyle: wsMinimized; \
  Comment: "Open Shrink Ray image converter"; \
  Tasks: desktopicon

; ── Post-install launch ───────────────────────────────────────────────────────
[Run]
; Offer to launch the app immediately after installation finishes.
; shellexec + nowait means the installer doesn't wait for the app to close.
Filename: "{app}\{#AppExe}"; \
  Description: "Launch {#AppName} now"; \
  Flags: nowait postinstall skipifsilent shellexec

; ── Registry (optional: add to Windows "Open with" or file associations) ─────
; Uncomment and expand if you want file-type associations in a future version.
; [Registry]
; Root: HKCU; Subkey: "Software\{#AppPublisher}\{#AppName}"; \
;   ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"
