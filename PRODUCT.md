# PRODUCT.md

## Was SubKit ist

SubKit ist der fachliche Source-of-Truth-Service für mobile App-Subscriptions über Apps, Stores, Produkte, Entitlements, Offerings, App Users und Store-Integrationen hinweg.

Operatoren nutzen SubKit, um Store-Accounts zu verbinden, Apps zu mappen, Produktkataloge zu synchronisieren, App-User-Zustände zu prüfen, Entitlements zu verwalten und Subscription-Probleme zu analysieren, ohne zwischen App Store Connect, Play Console, Tabellen und app-spezifischen Backends wechseln zu müssen.

## Source of Truth

SubKit besitzt den App-User- und Entitlement-Zustand.

App-Backends und Apps sollen SubKit-Zustand über Runtime-/Read-APIs konsumieren, zum Beispiel: „Hat App User X das Entitlement Y?“ Sie sollen nicht als autoritative Quelle dafür gelten, welcher App User subscribed ist — außer bei klar gekennzeichneten Import-, Migrations- oder Admin-Flows.

Store-Systeme speisen SubKit über verifizierte Quellen, zum Beispiel App-Store-Connect-Katalog-Lesezugriffe, Apple Server Notifications, Google Play RTDN, Receipt Validation, Report-Imports oder bewusste Operator-Aktionen.

Ein App User kann Entitlements nicht nur über Store-Subscriptions erhalten. Gutscheine, Promo-Codes, manuelle Grants, Lifetime Purchases und Migrationen sind ebenfalls gültige Quellen für Zugriff.

## Fachliches Datenmodell

- Apps: kundenseitige mobile Apps eines Tenants.
- Products: Store-Produkte und Subscription-Produkte, die in SubKit gemappt sind.
- Entitlements: Fähigkeiten oder Zugriffsrechte, die ein App User erhält; App-Code soll Entitlements prüfen, nicht rohe Product IDs.
- Offerings: Paywall-/Package-Darstellung aus Products.
- App Users: Endnutzer einer mobilen App und ihr aktueller Entitlement-Zustand.
- Entitlement Grants: konkrete Vergaben eines Entitlements an einen App User, inklusive Quelle, Status, Zeitraum und optionaler Referenz auf Product, Store-Transaktion, Gutschein oder Operator-Aktion.
- Vouchers / Codes: einlösbare Codes, die einem App User Entitlements geben können; sie sind fachlich keine Store-Subscription, aber eine legitime Zugriffsquelle.
- Store-Integrationen: externe Store-Zustände lesen, synchronisieren und überwachen; Mutationen nur nach expliziter Vorschau und Operator-Bestätigung.

## Entitlement-Quellen

Ein aktives Entitlement kann entstehen durch:

- Apple Subscription oder Apple In-App Purchase.
- Google Play Subscription oder In-App Product.
- Gutschein / Voucher / Promo-Code.
- Manueller Operator-Grant.
- Lifetime Purchase.
- Migration oder Admin-Import.

Deshalb soll App-Code nicht fragen „hat dieser User eine Subscription?“, sondern „hat dieser App User dieses Entitlement?“. Store-Subscriptions sind nur eine mögliche Ursache für ein Entitlement.

## Begriffe

- „App User“ ist der Produktbegriff in UI, Doku und fachlicher Diskussion.
- „Subscriber“ darf nur verwendet werden, wenn es um Store-spezifische Konzepte oder interne technische Tabellen/Legacy-Namen geht.
- „Subscribed“ ist als fachlicher Zustand zu eng; maßgeblich ist, ob ein App User ein aktives Entitlement hat.
- Console-/Operator-User sind Nutzer der SubKit-Oberfläche und nicht mit App Users zu verwechseln.

## Runtime-Modell

Runtime-APIs sollen primär Autorisierungsfragen aus dem SubKit-Zustand beantworten:

- Welche Entitlements hat dieser App User?
- Ist das Entitlement aktuell active, trialing, expired, revoked oder in billing retry?
- Welche Quelle hat diesen Zustand verursacht: Store Product, Voucher, manueller Grant, Lifetime Purchase oder Migration?

Runtime-APIs müssen authentifiziert und gescoped sein. Sie sollen einem App-Backend nicht erlauben, autoritativen App-User-Zustand zu überschreiben, außer die Route ist eindeutig als Import-, Migration- oder Admin-Pfad gedacht.

## Produktprinzipien

- SubKit-Zustand ist autoritativ; externe Quellen sind Inputs, keine blinde Wahrheit.
- Preview before mutation für Product-, Store- und Catalogue-Änderungen.
- Store-APIs werden nicht mutiert, außer es wurde explizit angefordert und bestätigt.
- Secrets bleiben unsichtbar: Private Keys sind One-Way-Uploads, überall sonst redacted und auditiert.
- Source Snapshots, lokale Records, Raw Imports, Derived Metrics, Vouchers, Grants und Operator-Edits müssen unterscheidbar bleiben.
- Kompakte, explizite Operator-UI schlägt dekorative Dashboards.

## Nutzer

Subscription-, Growth-, Support- und Release-Operatoren, die für mobile Apps mit App-Store- und Play-Store-Subscription-Umsatz verantwortlich sind.

## Brand / UX-Persönlichkeit

Ruhig, präzise, operator-grade. Die Oberfläche soll unter Produktionsdruck vertrauenswürdig wirken: kompakt, lesbar, risikobewusst und klar darin, was read-only ist und was mutiert.

## Accessibility

Ziel ist WCAG AA. Status darf nicht nur über Farbe kommuniziert werden, sondern braucht Textlabels. Formulare und Tabellen müssen für dichte operative Arbeit gut lesbar bleiben.
