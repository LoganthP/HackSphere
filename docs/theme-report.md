# HackSphere theme implementation report

## Scope

Light, Dark and System preferences share one provider. Light remains the default. The user explicitly approved minimal light-mode color adjustments where required for AA. No runtime dependency was added. Server, API, routing and business logic were not changed by this task. The pre-existing Node compatibility edits in README.md, package manifests/locks and .nvmrc belong to the earlier setup repair.

## Changed files

| File | Reason |
| --- | --- |
| `client/e2e/02-app-shell-and-participant.spec.ts` | Update the existing theme assertions for the new radio controls and retain the other assertions. |
| `client/e2e/theme.spec.ts` | Desktop/mobile controls, pre-hydration reload, live device changes, cross-tab sync and route/tab contrast audits. |
| `client/index.html` | Resolve the saved preference before React and synchronize native controls and browser chrome. |
| `client/src/components/Countdown.tsx` | Give dark countdown cells an opaque themed background and explicit readable text. |
| `client/src/components/Dialog.tsx` | Strengthen the dark overlay while preserving light mode. |
| `client/src/components/EventCard.tsx` | Theme badges and bookmark controls over bright clay headers. |
| `client/src/components/Tabs.tsx` | Use semantic ink for the selected tab. |
| `client/src/components/ThemeControl.tsx` | Accessible segmented radios and reusable Radix theme menus. |
| `client/src/components/Toast.tsx` | Use coherent themed status colors. |
| `client/src/components/ui.tsx` | Theme buttons, badges, errors, native inputs, focus states and progress indicators. |
| `client/src/index.css` | Semantic light/dark tint and text tokens, native controls, focus, selection, clay/neumorphic shadows, chart colors and switch contrast. |
| `client/src/layouts/AppLayout.tsx` | Replace the independent toggle with shared radio items; theme the drawer overlay and link colors. |
| `client/src/layouts/PublicLayout.tsx` | Add the visitor theme menu and keep the 390px signed-in header within its width. |
| `client/src/lib/__tests__/theme.test.tsx` | Provider persistence/lifecycle/storage tests and keyboard radio-group coverage. |
| `client/src/lib/format.ts` | Theme stage badges and retain readableOn with an AA fallback for mid-tone blues. |
| `client/src/lib/theme.ts` | Replaced by theme.tsx and the shared provider. |
| `client/src/lib/theme.tsx` | Shared preference, device listener lifecycle, protected storage access, cross-tab synchronization and resolved DOM theme. |
| `client/src/main.tsx` | Mount ThemeProvider around the app. |
| `client/src/pages/EventDetail.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/Explore.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/Landing.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/Results.tsx` | Theme warnings and chart series; improve small podium subtitle contrast. |
| `client/src/pages/admin/Admin.tsx` | Theme account statuses, moderation links and chart series. |
| `client/src/pages/app/Dashboard.tsx` | Theme links, deadlines and role controls; improve judging-tile subtitle contrast. |
| `client/src/pages/app/Notifications.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/app/Profile.tsx` | Replace the independent dark toggle with shared Light / Dark / System radios. |
| `client/src/pages/app/TeamWorkspace.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/app/Teams.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/auth/AuthShell.tsx` | Give the auth clay panel a dark counterpart with themed text. |
| `client/src/pages/auth/ForgotPassword.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/auth/Login.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/auth/Register.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/auth/ResetPassword.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/judge/Evaluate.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/judge/JudgingHome.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `client/src/pages/organize/EventForm.tsx` | Make the accent preview choose contrast-aware text. |
| `client/src/pages/organize/ManageEvent.tsx` | Theme statuses, charts, clay-tile buttons and assignment hover states. |
| `client/src/pages/organize/OrganizerHome.tsx` | Replace fixed light status/link colors with theme-aware semantic colors. |
| `docs/theme-report.md` | Record the file audit, color replacements and validation results. |

## Palette mapping

Original light values are retained except the explicitly approved AA corrections. Tint backgrounds use opaque color mixes with the dark surface, so their contrast does not depend on a bright clay parent.

| Semantic token | Light | Dark |
| --- | --- | --- |
| `--violet-ink` | `#5a41e6` | `#c9bfff` |
| `--blue-ink` | `#1f5fd6` | `#9abeff` |
| `--coral-ink` | `#c32c4a` | `#ff9aac` |
| `--sun-ink` | `#8a5a00` | `#ffd477` |
| `--mint-ink` | `#0c745e` | `#6de5c7` |
| `--violet-tint` | `#ece8ff` | `color-mix(in srgb, #7058f5 15%, var(--surface))` |
| `--blue-tint` | `#e3edff` | `color-mix(in srgb, #4285ff 15%, var(--surface))` |
| `--coral-tint` | `#ffe6eb` | `color-mix(in srgb, #ff7890 15%, var(--surface))` |
| `--sun-tint` | `#fff4d9` | `color-mix(in srgb, #ffc857 15%, var(--surface))` |
| `--mint-tint` | `#ddf8f1` | `color-mix(in srgb, #3dcfae 15%, var(--surface))` |
| `--violet-hover` | `#dfd8ff` | `color-mix(in srgb, #7058f5 25%, var(--surface))` |
| `--coral-hover` | `#ffd3dc` | `color-mix(in srgb, #ff7890 25%, var(--surface))` |
| `--sun-hover` | `#ffbf3d` | `#ffbf3d` |
| `--auth-clay` | `#ece8ff` | `#34325c` |
| `--focus` | `#7058f5` | `#c9bfff` |
| `--selection` | `#ffc85799` | `#6b501f` |
| `--chart-violet` | `#7058f5` | `#ab96ff` |
| `--chart-blue` | `#4285ff` | `#75a8ff` |
| `--chart-coral` | `#ff7890` | `#ff9aac` |
| `--chart-mint` | `#3dcfae` | `#6de5c7` |
| `--chart-line` | `#5a41e6` | `#ab96ff` |

## Color replacements

Locations refer to the resulting files. Each row lists the color expressions on the changed line before and after the change; unchanged expressions within the line provide context. This includes semantic replacements of formerly fixed light utilities, explicit dark variants and inline chart colors.

| Location | Old -> new |
| --- | --- |
| `client/index.html:17` | Fixed theme-color `#F8FAFF` -> resolved light `#F8FAFF` / dark `#161a33`. |
| `client/src/components/Countdown.tsx:44` | `bg-white/70 dark:bg-white/10` -> `bg-white/70 text-ink dark:bg-surface` |
| `client/src/components/Dialog.tsx:26` | `bg-navy/30` -> `bg-navy/30 dark:bg-black/60` |
| `client/src/components/EventCard.tsx:27` | `bg-white/85 dark:bg-white/85` -> `bg-white/85 dark:bg-surface` |
| `client/src/components/EventCard.tsx:31` | `bg-white/80 text-navy hover:bg-white` -> `bg-white/80 text-navy hover:bg-white dark:bg-surface dark:text-ink dark:hover:bg-surface-2` |
| `client/src/components/Tabs.tsx:27` | `text-ink-soft hover:text-ink data-[state=active]:text-violet-deep dark:data-[state=active]:text-white` -> `text-ink-soft hover:text-ink data-[state=active]:text-violet-ink dark:data-[state=active]:text-white` |
| `client/src/components/Toast.tsx:18` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/components/Toast.tsx:19` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/components/Toast.tsx:20` | `bg-violet-soft text-violet-deep` -> `bg-violet-tint text-violet-ink` |
| `client/src/components/ui.tsx:30` | `bg-violet-soft text-violet-deep hover:bg-[#dfd8ff] dark:bg-violet/20 dark:text-[#c9bfff]` -> `bg-violet-tint text-violet-ink hover:bg-violet-hover` |
| `client/src/components/ui.tsx:32` | `bg-coral-soft text-coral-deep hover:bg-[#ffd3dc]` -> `bg-coral-tint text-coral-ink hover:bg-coral-hover` |
| `client/src/components/ui.tsx:33` | `bg-sun text-navy hover:bg-[#ffbf3d]` -> `bg-sun text-navy hover:bg-sun-hover` |
| `client/src/components/ui.tsx:94` | `border-line bg-surface text-ink placeholder:text-ink-soft/70 focus-visible:border-violet focus-visible:ring-violet/15 aria-[invalid=true]:border-coral-deep aria-[invalid=true]:ring-coral/20` -> `border-line bg-surface text-ink placeholder:text-ink-soft/70 dark:placeholder:text-ink-soft focus-visible:border-violet dark:focus-visible:border-violet-ink focus-visible:ring-violet/15 dark:focus-visible:ring-violet-ink/35 aria-[invalid=true]:border-coral-deep dark:aria-[invalid=true]:border-coral-ink aria-[invalid=true]:ring-coral/20` |
| `client/src/components/ui.tsx:126` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/components/ui.tsx:141` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/components/ui.tsx:156` | `bg-blue-deep` -> `bg-blue-deep dark:bg-blue-ink` |
| `client/src/components/ui.tsx:163` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/components/ui.tsx:164` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/components/ui.tsx:165` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/components/ui.tsx:224` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/components/ui.tsx:237` | `bg-violet bg-mint bg-coral bg-blue bg-sun` -> `bg-violet dark:bg-violet-ink bg-mint bg-coral bg-blue bg-sun` |
| `client/src/layouts/AppLayout.tsx:57` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/layouts/AppLayout.tsx:93` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/layouts/AppLayout.tsx:150` | `bg-navy/30` -> `bg-navy/30 dark:bg-black/60` |
| `client/src/layouts/AppLayout.tsx:191` | `text-violet-deep` -> `text-violet-ink` |
| `client/src/lib/format.ts:49` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/lib/format.ts:50` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/lib/format.ts:51` | `bg-blue-soft text-blue-deep` -> `bg-blue-tint text-blue-ink` |
| `client/src/lib/format.ts:52` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/lib/format.ts:53` | `bg-violet-soft text-violet-deep` -> `bg-violet-tint text-violet-ink` |
| `client/src/pages/EventDetail.tsx:15` | `bg-mint-soft text-mint-deep bg-sun-soft text-sun-deep bg-coral-soft text-coral-deep` -> `bg-mint-tint text-mint-ink bg-sun-tint text-sun-ink bg-coral-tint text-coral-ink` |
| `client/src/pages/EventDetail.tsx:47` | `bg-white/90 dark:bg-white/90` -> `bg-white/90 dark:bg-surface` |
| `client/src/pages/EventDetail.tsx:48` | `bg-white/70 text-navy` -> `bg-white/70 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/EventDetail.tsx:49` | `bg-white/70 text-navy` -> `bg-white/70 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/EventDetail.tsx:125` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/EventDetail.tsx:159` | `border-sun bg-sun-soft/60 dark:bg-sun/10` -> `border-sun bg-sun-tint/60 dark:bg-sun/10` |
| `client/src/pages/EventDetail.tsx:161` | `text-sun-deep` -> `text-sun-ink` |
| `client/src/pages/EventDetail.tsx:246` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/EventDetail.tsx:274` | `text-sun-deep` -> `text-sun-ink` |
| `client/src/pages/Explore.tsx:111` | `text-violet-deep` -> `text-violet-ink` |
| `client/src/pages/Landing.tsx:135` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/Landing.tsx:154` | `#7058F5` -> `var(--focus)` |
| `client/src/pages/Landing.tsx:174` | `bg-navy text-white` -> `bg-navy text-white dark:bg-white dark:text-navy` |
| `client/src/pages/Landing.tsx:180` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/Results.tsx:15` | `#7058F5 #FF7890 #3DCFAE` -> `var(--chart-violet) var(--chart-coral) var(--chart-mint)` |
| `client/src/pages/Results.tsx:41` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/Results.tsx:74` | `text-navy/75` -> `text-navy` |
| `client/src/pages/Results.tsx:120` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/admin/Admin.tsx:88` | `#4285FF` -> `var(--chart-blue)` |
| `client/src/pages/admin/Admin.tsx:102` | `#7058F5` -> `var(--chart-violet)` |
| `client/src/pages/admin/Admin.tsx:197` | `bg-mint-soft text-mint-deep bg-coral-soft text-coral-deep` -> `bg-mint-tint text-mint-ink bg-coral-tint text-coral-ink` |
| `client/src/pages/admin/Admin.tsx:198` | `bg-violet-soft text-violet-deep bg-sun-soft text-sun-deep` -> `bg-violet-tint text-violet-ink bg-sun-tint text-sun-ink` |
| `client/src/pages/admin/Admin.tsx:245` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/app/Dashboard.tsx:109` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/app/Dashboard.tsx:130` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/app/Dashboard.tsx:192` | `bg-violet-soft text-violet-deep dark:bg-violet/20 dark:text-[#c9bfff]` -> `bg-violet-tint text-violet-ink` |
| `client/src/pages/app/Dashboard.tsx:212` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/app/Dashboard.tsx:249` | `text-navy/75` -> `text-navy/85` |
| `client/src/pages/app/Dashboard.tsx:250` | `bg-white/85 text-navy` -> `bg-white/85 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/app/Dashboard.tsx:270` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/app/Dashboard.tsx:283` | `text-sun-deep` -> `text-sun-ink` |
| `client/src/pages/app/Notifications.tsx:45` | `hover:bg-surface-2 bg-violet-soft/40 dark:bg-violet/10` -> `hover:bg-surface-2 bg-violet-tint/40 dark:bg-violet/10` |
| `client/src/pages/app/Profile.tsx:99` | `bg-violet-soft text-violet-deep` -> `bg-violet-tint text-violet-ink` |
| `client/src/pages/app/Profile.tsx:100` | `bg-mint-soft text-mint-deep bg-sun-soft text-sun-deep` -> `bg-mint-tint text-mint-ink bg-sun-tint text-sun-ink` |
| `client/src/pages/app/Profile.tsx:101` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/pages/app/Profile.tsx:102` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:69` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:70` | `bg-blue-soft text-blue-deep` -> `bg-blue-tint text-blue-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:77` | `text-mint-deep` -> `text-mint-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:176` | `bg-white/80 text-navy` -> `bg-white/80 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:186` | `bg-mint-soft text-mint-deep bg-sun-soft text-sun-deep bg-coral-soft text-coral-deep` -> `bg-mint-tint text-mint-ink bg-sun-tint text-sun-ink bg-coral-tint text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:247` | `border-violet bg-violet-soft/50 border-line hover:border-violet/50` -> `border-violet bg-violet-tint/50 border-line hover:border-violet/50` |
| `client/src/pages/app/TeamWorkspace.tsx:346` | `text-sun-deep` -> `text-sun-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:355` | `text-ink-soft hover:bg-coral-soft hover:text-coral-deep` -> `text-ink-soft hover:bg-coral-tint hover:text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:369` | `bg-sun-soft/70 dark:bg-sun/10` -> `bg-sun-tint/70 dark:bg-sun/10` |
| `client/src/pages/app/TeamWorkspace.tsx:406` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:417` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:434` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:439` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:499` | `text-mint-deep` -> `text-mint-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:505` | `text-ink-soft hover:text-coral-deep` -> `text-ink-soft hover:text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:674` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/pages/app/TeamWorkspace.tsx:711` | `bg-mint-soft text-mint-deep bg-surface-2 text-ink-soft` -> `bg-mint-tint text-mint-ink bg-surface-2 text-ink-soft` |
| `client/src/pages/app/TeamWorkspace.tsx:717` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/app/Teams.tsx:59` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/app/Teams.tsx:60` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/auth/AuthShell.tsx:18` | `var(--radius-tile) text-navy #ECE8FF` -> `var(--radius-tile) text-ink var(--auth-clay)` |
| `client/src/pages/auth/ForgotPassword.tsx:30` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/auth/ForgotPassword.tsx:34` | `text-violet-deep` -> `text-violet-ink` |
| `client/src/pages/auth/ForgotPassword.tsx:39` | `text-violet-deep` -> `text-violet-ink` |
| `client/src/pages/auth/Login.tsx:46` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/auth/Register.tsx:37` | `text-violet-deep dark:text-[#b7a9ff]` -> `text-violet-ink` |
| `client/src/pages/auth/ResetPassword.tsx:35` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/auth/ResetPassword.tsx:36` | `text-violet-deep` -> `text-violet-ink` |
| `client/src/pages/judge/Evaluate.tsx:95` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/pages/judge/Evaluate.tsx:111` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/judge/Evaluate.tsx:158` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/judge/Evaluate.tsx:182` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/judge/Evaluate.tsx:208` | `accent-violet-deep` -> `accent-violet-ink` |
| `client/src/pages/judge/JudgingHome.tsx:55` | `bg-coral-soft text-coral-deep` -> `bg-coral-tint text-coral-ink` |
| `client/src/pages/judge/JudgingHome.tsx:56` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/judge/JudgingHome.tsx:57` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/organize/ManageEvent.tsx:69` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/pages/organize/ManageEvent.tsx:187` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:238` | `#7058F5` -> `var(--chart-violet)` |
| `client/src/pages/organize/ManageEvent.tsx:239` | `#7058F5` -> `var(--chart-violet)` |
| `client/src/pages/organize/ManageEvent.tsx:246` | `#5A41E6` -> `var(--chart-line)` |
| `client/src/pages/organize/ManageEvent.tsx:285` | `#7058F5` -> `var(--chart-violet)` |
| `client/src/pages/organize/ManageEvent.tsx:286` | `#3DCFAE` -> `var(--chart-mint)` |
| `client/src/pages/organize/ManageEvent.tsx:405` | `bg-mint-soft text-mint-deep` -> `bg-mint-tint text-mint-ink` |
| `client/src/pages/organize/ManageEvent.tsx:406` | `bg-blue-soft text-blue-deep` -> `bg-blue-tint text-blue-ink` |
| `client/src/pages/organize/ManageEvent.tsx:413` | `text-coral-deep` -> `text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:559` | `text-ink-soft hover:bg-coral-soft hover:text-coral-deep` -> `text-ink-soft hover:bg-coral-tint hover:text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:689` | `text-ink-soft hover:text-coral-deep` -> `text-ink-soft hover:text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:752` | `text-ink-soft hover:bg-coral-soft hover:text-coral-deep` -> `text-ink-soft hover:bg-coral-tint hover:text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:803` | `bg-coral-soft text-coral-deep bg-surface-2` -> `bg-coral-tint text-coral-ink bg-surface-2` |
| `client/src/pages/organize/ManageEvent.tsx:806` | `hover:bg-white/60` -> `hover:bg-white/60 dark:hover:bg-surface-2` |
| `client/src/pages/organize/ManageEvent.tsx:890` | `text-sun-deep` -> `text-sun-ink` |
| `client/src/pages/organize/ManageEvent.tsx:892` | `hover:bg-coral-soft hover:text-coral-deep` -> `hover:bg-coral-tint hover:text-coral-ink` |
| `client/src/pages/organize/ManageEvent.tsx:941` | `bg-white/85 text-navy` -> `bg-white/85 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/organize/ManageEvent.tsx:949` | `bg-white/85 text-navy` -> `bg-white/85 text-navy dark:bg-surface dark:text-ink` |
| `client/src/pages/organize/ManageEvent.tsx:966` | `text-mint-deep text-ink-soft` -> `text-mint-ink text-ink-soft` |
| `client/src/pages/organize/OrganizerHome.tsx:29` | `bg-sun-soft text-sun-deep` -> `bg-sun-tint text-sun-ink` |
| `client/src/index.css:150` | Focus `var(--color-violet)` -> `var(--focus)` (same light color, bright lavender in dark). |
| `client/src/index.css:155` | Selection `#ffc85799` -> `var(--selection)`; text explicitly uses ink. |
| `client/src/index.css:19` | Coral text `#c9304f` -> `#c32c4a` in light, `#ff9aac` in dark. |
| `client/src/index.css:21` | Mint text `#0f7a63` -> `#0c745e` in light, `#6de5c7` in dark. |
| `client/src/lib/format.ts:81` | Navy/white fallback for insufficient contrast -> deeper navy `#161a33`, retaining the existing contrast-aware selection. |
| `client/src/pages/EventDetail.tsx:52` | Inherited header text at 90% opacity -> full-opacity contrast-aware text. |
| `client/src/pages/organize/EventForm.tsx:217` | Fixed navy preview -> `readableOn(form.accentColor)`; subtitle inherits full-opacity preview ink. |
| `client/src/index.css:221` | Dark raised shadow `rgb(0 0 0 / 0.3)` -> `rgb(0 0 0 / 0.28)` plus `rgb(80 91 158 / 0.12)` highlight. |
| `client/src/index.css:224` | Dark pressed shadow retains `rgb(0 0 0 / 0.4)` and adds `rgb(80 91 158 / 0.12)` highlight. |

Additional CSS changes (new dark overrides rather than removed light colors):

- Dark clay shadows use 22% white inset light, 18% black inset shade and a 50% black outer shadow; bright clay fills remain unchanged.
- Dark neumorphic raised/pressed shadows use black shade and a subtle blue highlight.
- Dark switch thumbs use ink on the inactive track and canvas on the mint track.
- Dark chart tooltips use ink for both labels and values.
- Dark scrollbars use ink-soft on canvas. File controls receive the same visible focus outline.
- `readableOn` still chooses navy/white; it falls back to `#161a33` when neither original choice reaches 4.5:1. Existing blue avatars use that darker navy without changing their saved colors.

Retained after audit: decorative logo, confetti and Hero3D clay colors; bright statistics/role/podium tiles; navy text on their bright fills; translucent white decorative shapes; axis/grid/legend CSS variables. Hero3D lighting is unchanged.

## AA exceptions

None found in the audited screens. The desktop and mobile light/dark route sweeps passed with zero serious or critical axe color-contrast violations and no console errors. The sweeps cover public/auth/error pages; participant dashboard, teams, workspace tabs, inbox, notifications and profile; organizer home, new/edit forms and all command-center tabs for two event stages; judging, evaluation and its conflict dialog; and every admin tab. Automated contrast checks and desktop/mobile visual review were both used. This is a check of the rendered seeded UI, not a blanket WCAG certification of every possible user-generated color/content combination.

## Validation

All commands exited with code 0. Tests used Node 24.22.2. Browser and API checks used the separate, ignored `server/theme-e2e.db`; the normal demo database was not modified. The temporary API and Vite servers have been stopped.

| Command | Result |
| --- | --- |
| `cd client; npm run typecheck` | Passed, no diagnostics |
| `cd client; npm run build` | Passed, 3,643 modules transformed |
| `cd client; npm test` | 2 files, 12 tests passed |
| `cd client; npm run e2e` | 64 passed, desktop and mobile, 5.7 minutes |
| `cd server; npm test` | 1 file, 8 tests passed |
| `cd server; npm run smoke` | 90 API checks passed |

The browser runner emitted third-party warnings about reduced motion, THREE.Clock deprecation and NO_COLOR/FORCE_COLOR. There were no failing tests or application console errors. No contrast rule was disabled in the new theme audit.

### Client command output

`npm run typecheck` (exit 0)

```text
> hacksphere-client@1.0.0 typecheck
> tsc -b
```

`npm run build` (exit 0)

```text
> hacksphere-client@1.0.0 build
> tsc -b && vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 3643 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                                          1.84 kB │ gzip:   0.79 kB
dist/assets/bricolage-grotesque-vietnamese-wght-normal-BUzh504Q.woff2    8.60 kB
dist/assets/figtree-latin-ext-wght-normal-DCwSJGxG.woff2                10.28 kB
dist/assets/bricolage-grotesque-latin-ext-wght-normal-CcLUaPy7.woff2    18.66 kB
dist/assets/figtree-latin-wght-normal-D_ZTVpCC.woff2                    20.15 kB
dist/assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2        41.34 kB
dist/assets/index-C0wcKtYo.css                                          55.72 kB │ gzip:  10.92 kB
dist/assets/search-DEiQYcZx.js                                           0.20 kB │ gzip:   0.18 kB
dist/assets/use-reduced-motion-Cq7uyHZz.js                               0.24 kB │ gzip:   0.19 kB
dist/assets/reduced-motion-2fDGfAC9.js                                   0.27 kB │ gzip:   0.19 kB
dist/assets/external-link-CA4IIS7B.js                                    0.27 kB │ gzip:   0.22 kB
dist/assets/user-plus-DAJ_iv8b.js                                        0.33 kB │ gzip:   0.25 kB
dist/assets/pin-BkwbYujT.js                                              0.37 kB │ gzip:   0.25 kB
dist/assets/shield-alert-DRNzZ8D6.js                                     0.37 kB │ gzip:   0.27 kB
dist/assets/calendar-clock-mNRJBzup.js                                   0.40 kB │ gzip:   0.27 kB
dist/assets/trash-VR1QgiSx.js                                            0.49 kB │ gzip:   0.29 kB
dist/assets/trophy-DCogjFcL.js                                           0.53 kB │ gzip:   0.30 kB
dist/assets/NotFound-C1yo9tSE.js                                         0.59 kB │ gzip:   0.35 kB
dist/assets/rolldown-runtime-XKyaHtl9.js                                 0.72 kB │ gzip:   0.42 kB
dist/assets/map-pin-CbyJy1XW.js                                          0.96 kB │ gzip:   0.49 kB
dist/assets/Countdown-BWGmh6K_.js                                        1.37 kB │ gzip:   0.73 kB
dist/assets/AuthShell-CD8z8Myy.js                                        1.45 kB │ gzip:   0.61 kB
dist/assets/Login-DgefrYaD.js                                            1.63 kB │ gzip:   0.85 kB
dist/assets/ForgotPassword-CU43wDxQ.js                                   1.66 kB │ gzip:   0.87 kB
dist/assets/ResetPassword-DoSV82Cf.js                                    1.82 kB │ gzip:   0.91 kB
dist/assets/Register-Du4kjO3n.js                                         2.44 kB │ gzip:   1.15 kB
dist/assets/Notifications-3BYgCaQp.js                                    2.51 kB │ gzip:   1.21 kB
dist/assets/OrganizerHome-CIubW1k6.js                                    2.56 kB │ gzip:   1.20 kB
dist/assets/Teams-CAezQzN2.js                                            2.75 kB │ gzip:   1.19 kB
dist/assets/Hero3D-CopS5KSZ.js                                           2.95 kB │ gzip:   1.12 kB
dist/assets/EventCard-D4ztf9ai.js                                        3.15 kB │ gzip:   1.29 kB
dist/assets/Tabs-C8XMs9T5.js                                             3.61 kB │ gzip:   1.65 kB
dist/assets/Inbox-7SpsbJJH.js                                            3.89 kB │ gzip:   1.49 kB
dist/assets/JudgingHome-BWvm5m0m.js                                      4.11 kB │ gzip:   1.82 kB
dist/assets/Explore-BJFgKr7W.js                                          4.24 kB │ gzip:   1.84 kB
dist/assets/Profile-BoZUVBv5.js                                          4.46 kB │ gzip:   1.78 kB
dist/assets/Dialog-DqXHkXzX.js                                           6.25 kB │ gzip:   2.38 kB
dist/assets/EventForm-DSToIlMM.js                                        7.31 kB │ gzip:   2.57 kB
dist/assets/Results-CfMbt3wx.js                                          7.31 kB │ gzip:   2.76 kB
dist/assets/Landing-C2aW8mqV.js                                          9.73 kB │ gzip:   3.45 kB
dist/assets/Evaluate-D8C_A9ad.js                                         9.96 kB │ gzip:   3.68 kB
dist/assets/Admin-C6KgUOa2.js                                           10.31 kB │ gzip:   3.22 kB
dist/assets/Dashboard-BfwXEqLx.js                                       11.92 kB │ gzip:   3.56 kB
dist/assets/EventDetail-BOuoPOBq.js                                     14.29 kB │ gzip:   4.51 kB
dist/assets/useQuery-CxXzLHwc.js                                        22.76 kB │ gzip:   7.59 kB
dist/assets/TeamWorkspace-CnrBa3uL.js                                   26.23 kB │ gzip:   8.15 kB
dist/assets/ManageEvent-CzMK9jhU.js                                     33.36 kB │ gzip:   8.74 kB
dist/assets/ui-CNjR8ZaH.js                                              81.69 kB │ gzip:  28.07 kB
dist/assets/react-B_NtkjTc.js                                          131.24 kB │ gzip:  43.18 kB
dist/assets/index-bjtlfEPE.js                                          376.08 kB │ gzip: 120.15 kB
dist/assets/charts-faZJ_Szb.js                                         401.01 kB │ gzip: 114.84 kB
dist/assets/three-D1o0yK4Y.js                                          917.17 kB │ gzip: 244.00 kB

✓ built in 1.62s
```

`npm run test` (exit 0)

```text
> hacksphere-client@1.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/logan/Downloads/HackSphere/client


 Test Files  2 passed (2)
      Tests  12 passed (12)
   Start at  22:54:31
   Duration  2.77s (environment 50%, tests 22%, import 14%, setup 10%, transform 3%, worker 1%)
```

`npm run e2e` (exit 0; full pass list below, repeated dependency warnings omitted)

```text
Running 64 tests using 1 worker
ok 10 [desktop] › e2e\02-app-shell-and-participant.spec.ts:96:3 › App Shell and Participant Workspace › Notifications marking individual as read and marking all as read (1.6s)
ok 11 [desktop] › e2e\02-app-shell-and-participant.spec.ts:111:3 › App Shell and Participant Workspace › Profile settings, avatar color, name, dark mode persistence, and password validation (1.8s)
ok 12 [desktop] › e2e\02-app-shell-and-participant.spec.ts:150:3 › App Shell and Participant Workspace › Team workspace tabs, milestones persistence, project form draft, and submission checklist (1.9s)
ok 13 [desktop] › e2e\03-organizer-and-admin.spec.ts:5:3 › Organizer, Judge, and Administrator Workflows › Host form validation: venue required for offline/hybrid, date validation, accent preview, create and edit (2.5s)
ok 14 [desktop] › e2e\03-organizer-and-admin.spec.ts:52:3 › Organizer, Judge, and Administrator Workflows › Command center tabs: overview charts, add co-organizer, registrations, challenges, judging, announcements, results (3.4s)
ok 15 [desktop] › e2e\03-organizer-and-admin.spec.ts:117:3 › Organizer, Judge, and Administrator Workflows › Judge evaluation sliders, mouse/keyboard interaction, scoring validation, and draft saving (1.8s)
ok 16 [desktop] › e2e\03-organizer-and-admin.spec.ts:147:3 › Organizer, Judge, and Administrator Workflows › Administrator portal: user search, role filter, verification, audit log, and self-protection (1.8s)
ok 17 [desktop] › e2e\04-cross-cutting.spec.ts:5:3 › Cross-cutting requirements › Responsive layout has zero horizontal overflow at 390px, 768px, and 1440px (2.1s)
ok 18 [desktop] › e2e\04-cross-cutting.spec.ts:33:3 › Cross-cutting requirements › Axe accessibility audit on key pages has zero serious or critical violations (2.8s)
ok 19 [desktop] › e2e\04-cross-cutting.spec.ts:54:3 › Cross-cutting requirements › Keyboard focus trap in dialogs and Escape key dismisses them (1.5s)
ok 20 [desktop] › e2e\04-cross-cutting.spec.ts:77:3 › Cross-cutting requirements › Error states display friendly messages when API fails rather than blank screens (3.8s)
ok 21 [desktop] › e2e\04-cross-cutting.spec.ts:98:3 › Cross-cutting requirements › Real-time notifications between two browser contexts (2.9s)
ok 22 [desktop] › e2e\05-lifecycle.spec.ts:5:3 › Full Hackathon Lifecycle › Runs complete lifecycle from organizer registration to published results (21.6s)
ok 23 [desktop] › e2e\core-flows.spec.ts:13:1 › visitors can browse hackathons and see published results (1.8s)
ok 24 [desktop] › e2e\core-flows.spec.ts:22:1 › protected pages redirect to sign-in (401ms)
ok 25 [desktop] › e2e\core-flows.spec.ts:27:1 › a participant sees the role-appropriate dashboard (659ms)
ok 26 [desktop] › e2e\core-flows.spec.ts:34:1 › a judge can open an assigned project and sees the rubric (1.7s)
ok 27 [desktop] › e2e\core-flows.spec.ts:42:1 › submitting an incomplete evaluation shows clear errors (1.8s)
ok 28 [desktop] › e2e\theme.spec.ts:13:1 › all three controls share Light, Dark and System, with keyboard and live device changes (5.5s)
ok 29 [desktop] › e2e\theme.spec.ts:67:1 › the pre-paint script resolves persisted preferences before React loads (420ms)
ok 30 [desktop] › e2e\theme.spec.ts:81:1 › preferences sync between tabs, including System and clearing storage (3.8s)
ok 31 [desktop] › e2e\theme.spec.ts:100:3 › every route and tab has readable contrast in light (39.7s)
ok 32 [desktop] › e2e\theme.spec.ts:100:3 › every route and tab has readable contrast in dark (39.7s)
ok 33 [mobile] › e2e\01-public-and-auth.spec.ts:5:3 › Public pages and Authentication › Landing page elements, links, countdown and anchors work without console errors (3.1s)
ok 34 [mobile] › e2e\01-public-and-auth.spec.ts:51:3 › Public pages and Authentication › Explore page search, format, category, stage filters, and bookmarking (1.2s)
ok 35 [mobile] › e2e\01-public-and-auth.spec.ts:93:3 › Public pages and Authentication › Explore bookmark toggle and Saved chip when signed in (2.2s)
ok 36 [mobile] › e2e\01-public-and-auth.spec.ts:122:3 › Public pages and Authentication › Event detail page interactions, tabs, timeline, and dialogs (2.3s)
ok 37 [mobile] › e2e\01-public-and-auth.spec.ts:158:3 › Public pages and Authentication › Event detail role-aware action panels and team dialogs (2.1s)
ok 38 [mobile] › e2e\01-public-and-auth.spec.ts:195:3 › Public pages and Authentication › Authentication flows: sign in, quick fills, bad credentials, register and password reset (2.8s)
ok 39 [mobile] › e2e\02-app-shell-and-participant.spec.ts:5:3 › App Shell and Participant Workspace › App shell navigation, sliding active indicator, badges, and skip link (3.1s)
ok 40 [mobile] › e2e\02-app-shell-and-participant.spec.ts:56:3 › App Shell and Participant Workspace › Dashboard bento layout, cards, invitations, deadlines, and notifications link (1.9s)
ok 41 [mobile] › e2e\02-app-shell-and-participant.spec.ts:80:3 › App Shell and Participant Workspace › Inbox invitations, requests, and withdrawing (1.6s)
ok 42 [mobile] › e2e\02-app-shell-and-participant.spec.ts:96:3 › App Shell and Participant Workspace › Notifications marking individual as read and marking all as read (1.6s)
ok 43 [mobile] › e2e\02-app-shell-and-participant.spec.ts:111:3 › App Shell and Participant Workspace › Profile settings, avatar color, name, dark mode persistence, and password validation (2.3s)
ok 44 [mobile] › e2e\02-app-shell-and-participant.spec.ts:150:3 › App Shell and Participant Workspace › Team workspace tabs, milestones persistence, project form draft, and submission checklist (1.9s)
ok 45 [mobile] › e2e\03-organizer-and-admin.spec.ts:5:3 › Organizer, Judge, and Administrator Workflows › Host form validation: venue required for offline/hybrid, date validation, accent preview, create and edit (8.0s)
ok 46 [mobile] › e2e\03-organizer-and-admin.spec.ts:52:3 › Organizer, Judge, and Administrator Workflows › Command center tabs: overview charts, add co-organizer, registrations, challenges, judging, announcements, results (3.3s)
ok 47 [mobile] › e2e\03-organizer-and-admin.spec.ts:117:3 › Organizer, Judge, and Administrator Workflows › Judge evaluation sliders, mouse/keyboard interaction, scoring validation, and draft saving (2.0s)
ok 48 [mobile] › e2e\03-organizer-and-admin.spec.ts:147:3 › Organizer, Judge, and Administrator Workflows › Administrator portal: user search, role filter, verification, audit log, and self-protection (1.8s)
ok 49 [mobile] › e2e\04-cross-cutting.spec.ts:5:3 › Cross-cutting requirements › Responsive layout has zero horizontal overflow at 390px, 768px, and 1440px (2.5s)
ok 50 [mobile] › e2e\04-cross-cutting.spec.ts:33:3 › Cross-cutting requirements › Axe accessibility audit on key pages has zero serious or critical violations (3.5s)
ok 51 [mobile] › e2e\04-cross-cutting.spec.ts:54:3 › Cross-cutting requirements › Keyboard focus trap in dialogs and Escape key dismisses them (1.5s)
ok 52 [mobile] › e2e\04-cross-cutting.spec.ts:77:3 › Cross-cutting requirements › Error states display friendly messages when API fails rather than blank screens (3.8s)
ok 53 [mobile] › e2e\04-cross-cutting.spec.ts:98:3 › Cross-cutting requirements › Real-time notifications between two browser contexts (2.7s)
ok 54 [mobile] › e2e\05-lifecycle.spec.ts:5:3 › Full Hackathon Lifecycle › Runs complete lifecycle from organizer registration to published results (19.8s)
ok 55 [mobile] › e2e\core-flows.spec.ts:13:1 › visitors can browse hackathons and see published results (1.6s)
ok 56 [mobile] › e2e\core-flows.spec.ts:22:1 › protected pages redirect to sign-in (365ms)
ok 57 [mobile] › e2e\core-flows.spec.ts:27:1 › a participant sees the role-appropriate dashboard (721ms)
ok 58 [mobile] › e2e\core-flows.spec.ts:34:1 › a judge can open an assigned project and sees the rubric (1.6s)
ok 59 [mobile] › e2e\core-flows.spec.ts:42:1 › submitting an incomplete evaluation shows clear errors (1.7s)
ok 60 [mobile] › e2e\theme.spec.ts:13:1 › all three controls share Light, Dark and System, with keyboard and live device changes (6.5s)
ok 61 [mobile] › e2e\theme.spec.ts:67:1 › the pre-paint script resolves persisted preferences before React loads (418ms)
ok 62 [mobile] › e2e\theme.spec.ts:81:1 › preferences sync between tabs, including System and clearing storage (3.3s)
ok 63 [mobile] › e2e\theme.spec.ts:100:3 › every route and tab has readable contrast in light (43.1s)
ok 64 [mobile] › e2e\theme.spec.ts:100:3 › every route and tab has readable contrast in dark (39.9s)
64 passed (5.7m)
```

### Server regression output

`npm run test` (exit 0)

```text
> hacksphere-server@1.0.0 test
> vitest run


 RUN  v5.0.5 C:/Users/logan/Downloads/HackSphere/server


 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  22:55:43
   Duration  179ms (import 44%, transform 26%, worker 15%, tests 14%, environment 1%)
```

`npm run smoke` (exit 0)

```text
> hacksphere-server@1.0.0 smoke
> node tests/smoke.mjs

PASS stats 200 
PASS events list 200 
  public events: FinTech Forge 2026[COMPLETED], HealthHack Sprint[JUDGING], GreenGrid Climate Hack[IN_PROGRESS], CodeVerse 2026[REGISTRATION_OPEN], Campus Build Night[PUBLISHED]
PASS draft hidden 404 
PASS unknown event 404 404 
PASS event detail 200 
PASS results unpublished blocked 403 
PASS published results 200 
  FF ranks: 1:Ledger Legends=8.41 | 2:Rupee Rangers=7.82 | 3:Coin Crafters=7.73 | 4:Safe Swipe=6.59  awards: 5
PASS unauth dashboard 401 
PASS bad login 401 
PASS bad email register 400 400 
PASS login student@hacksphere.dev 200 
PASS dashboard 200 
  student stats {"registeredEvents":1,"teams":1,"activeProjects":0,"unreadNotifications":1} recs 2 deadlines 0
PASS invitations 200 
PASS accept invite 200 
PASS can't create 2nd team same event 409 
PASS participant cannot create event 403 
PASS participant cannot manage 403 
PASS participant cannot admin 403 
PASS unknown team 404 404 
PASS my teams 200 
PASS member can't register (leader only) 403 
PASS login leader@hacksphere.dev 200 
PASS workspace 200 
  members 3 perm {"isLeader":true,"isMember":true,"isManager":false}
PASS register team 201 
PASS duplicate register 409 
PASS save project draft 200 
PASS bad url rejected 400 
PASS submit blocked (registration stage) 400 
PASS login organizer@hacksphere.dev 200 
PASS manage overview 200 
  stats {"pending":3,"approved":1,"rejected":0}
PASS approve registration 200 
PASS create event 201 
PASS bad dates 400 
PASS end date before start date 400 400 
PASS min team size > max team size 400 400 
PASS publish w/o problems blocked 400 
PASS add limited problem 201 
PASS first team select limited problem 200 
PASS delete problem chosen by team blocked 400 
PASS add problem 201 
PASS open registration 200 
PASS announce 201 
PASS hh detail 200 
PASS criteria locked when scoring 400 
PASS results preview 200 
  HH preview 1:Care Crafters=7.73 miss1 | 2:Pulse Pioneers=7.45 miss1 | 3:Queue Breakers=7.41 miss0 | 4:MediMinds=7.32 miss0
PASS login judge@hacksphere.dev 200 
PASS judge assignments 200 
PASS assignment detail 200 
PASS score > 10 rejected 400 
PASS score < 0 rejected 400 
PASS incomplete submit rejected 400 
PASS save draft 200 
PASS submit eval 200 
  score 9
PASS declare conflict 200 
PASS conflicted cannot score 403 
PASS judge cannot see unrelated team 403 
PASS publish results 200 
PASS public results now 200 
  HH final 1:Care Crafters=8.37 | 2:Pulse Pioneers=7.45 | 3:Queue Breakers=7.41 | 4:MediMinds=7.32
PASS login karthik@hacksphere.dev 200 
PASS karthik teams 200 
PASS final missing fields 400 
PASS complete project 200 
PASS final submission w/ file 201 
  version 2 pitch.pdf
PASS challenge locked after final submission 400 
PASS bad file type 400 
PASS attachment requires auth 401
PASS attachment forbidden for unrelated user 403 
PASS login admin@hacksphere.dev 200 
PASS admin overview 200 
PASS pending organizers 200 
PASS verify organizer 200 
PASS audit 200 
PASS me 200 
PASS can't suspend self 400 
PASS can't demote self 400 
PASS login techclub@hacksphere.dev 200 
PASS techclub can access before suspend 200 
PASS suspend user 200 
PASS suspended session revoked 401 401 
PASS suspended user login blocked 403 403 
PASS reactivate user 200 
PASS socket.io notification received CodeVerse 2026: Socket Live Test
PASS notifications 200 
  student unread 4
PASS forgot 200 
PASS reset 200 
PASS login new pw 200 
PASS old session revoked 401 
PASS forgot restore 200 
PASS reset back to default pw 200 
PASS login restored pw 200
```

