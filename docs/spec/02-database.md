# 02 — Database (PostgreSQL + Prisma)

Location: `packages/db/prisma/schema.prisma`.

## Rules

- IDs: `cuid()` strings.
- **Money**: integer minor units. Percentages: **basis points** (1000 = 10%). No floats.
- **Lengths**: integer millimetres. Areas are computed, never stored.
- Provider cost: `costMicros` = USD × 1,000,000.
- Soft delete (`deletedAt`) for `Client` and `Project`. Everything else hard-deletes with cascades as shown.
- Every tenant table either has `workspaceId` or reaches it through a parent (`Room → Project → workspaceId`). `RenderJob` and `Asset` also store `workspaceId` for fast scoping and spend queries.
- Migrations: `prisma migrate dev` locally, `prisma migrate deploy` in CI/production. Never edit an applied migration.
- The Better Auth tables (`User`, `Session`, `Account`, `Verification`) are **generated** with the Better Auth CLI and pasted into this schema. Do not hand-write them. The only manual edit allowed is adding the back-relation fields on `User` shown below.

## Back-relations to add on the generated `User` model

```prisma
  ownedWorkspaces      Workspace[]       @relation("WorkspaceOwner")
  workspaceMemberships WorkspaceMember[]
```

Also add a `mode` field to `User` through Better Auth `additionalFields` (string `"HOME"` or `"PRO"`, default `"HOME"`), then regenerate with the CLI.

## Schema (app models)

```prisma
generator client {
  provider = "prisma-client-js"   // use the generator the installed Prisma version recommends
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WorkspaceType    { PERSONAL STUDIO }
enum WorkspaceRole    { OWNER ADMIN MEMBER }
enum UnitSystem       { METRIC IMPERIAL }
enum RoomType         { LIVING_ROOM BEDROOM KITCHEN BATHROOM DINING_ROOM HOME_OFFICE KIDS_ROOM BALCONY HALLWAY OTHER }
enum AssetKind        { ORIGINAL_PHOTO RENDER THUMBNAIL LOGO BRIEF_UPLOAD }
enum RenderKind       { RESTYLE EDIT }
enum RenderStatus     { QUEUED RUNNING SUCCEEDED FAILED CANCELED }
enum RateUnit         { AREA_FLOOR AREA_CEILING AREA_WALL LENGTH_PERIMETER PER_UNIT LUMP_SUM }
enum ProposalStatus   { DRAFT SENT VIEWED APPROVED CHANGES_REQUESTED EXPIRED }
enum CommentAuthor    { CLIENT DESIGNER }
enum CreditReason     { SIGNUP_GRANT PLAN_GRANT PURCHASE RENDER_RESERVE RENDER_REFUND ADJUSTMENT }
enum BriefStatus      { OPEN SUBMITTED EXPIRED }
enum SubscriptionStatus { ACTIVE PAST_DUE CANCELED TRIALING }

model Workspace {
  id            String        @id @default(cuid())
  name          String
  type          WorkspaceType @default(PERSONAL)
  ownerId       String
  owner         User          @relation("WorkspaceOwner", fields: [ownerId], references: [id])
  currency      String        @default("USD")   // ISO 4217
  unitSystem    UnitSystem    @default(METRIC)
  brandName     String?
  brandColor    String?
  logoStorageKey String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  members       WorkspaceMember[]
  clients       Client[]
  projects      Project[]
  assets        Asset[]
  rateCards     RateCard[]
  creditLedger  CreditLedger[]
  briefLinks    BriefLink[]
  subscription  Subscription?

  @@index([ownerId])
}

model WorkspaceMember {
  id          String        @id @default(cuid())
  workspaceId String
  workspace   Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  role        WorkspaceRole @default(MEMBER)
  createdAt   DateTime      @default(now())

  @@unique([workspaceId, userId])
  @@index([userId])
}

model Client {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name        String
  email       String?
  phone       String?
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  projects    Project[]
  briefLinks  BriefLink[]

  @@index([workspaceId])
}

model Project {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  clientId    String?
  client      Client?   @relation(fields: [clientId], references: [id], onDelete: SetNull)
  name        String
  currency    String    @default("USD")
  budgetMinor Int?
  renterMode  Boolean   @default(false)
  keepList    String[]
  styleKey    String?
  notes       String?
  shareToken  String?   @unique
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  rooms       Room[]
  estimates   Estimate[]
  proposals   Proposal[]

  @@index([workspaceId, createdAt])
}

model Room {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name       String
  type       RoomType @default(OTHER)
  widthMm    Int
  lengthMm   Int
  heightMm   Int      @default(2700)
  openings   Json     @default("[]")  // [{ "type": "DOOR"|"WINDOW", "widthMm": n, "heightMm": n, "qty": n }]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  assets     Asset[]
  renderJobs RenderJob[]
  estimates  Estimate[]

  @@index([projectId])
}

model Asset {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  roomId      String?
  room        Room?     @relation(fields: [roomId], references: [id], onDelete: SetNull)
  kind        AssetKind
  storageKey  String    @unique
  mime        String
  sizeBytes   Int
  width       Int?
  height      Int?
  confirmedAt DateTime?              // set after upload confirmation
  createdAt   DateTime  @default(now())

  outputs     RenderOutput[]
  sourceFor   RenderJob[] @relation("RenderSource")

  @@index([workspaceId, kind])
}

model RenderJob {
  id             String       @id @default(cuid())
  workspaceId    String
  roomId         String
  room           Room         @relation(fields: [roomId], references: [id], onDelete: Cascade)
  kind           RenderKind
  status         RenderStatus @default(QUEUED)
  styleKey       String?
  instruction    String?
  params         Json         @default("{}")
  sourceAssetId  String
  sourceAsset    Asset        @relation("RenderSource", fields: [sourceAssetId], references: [id])
  parentJobId    String?
  parentJob      RenderJob?   @relation("RenderChain", fields: [parentJobId], references: [id])
  children       RenderJob[]  @relation("RenderChain")
  variations     Int          @default(4)
  provider       String
  model          String?
  creditsCharged Int
  costMicros     Int          @default(0)
  attempts       Int          @default(0)
  errorCode      String?
  errorMessage   String?
  startedAt      DateTime?
  finishedAt     DateTime?
  createdAt      DateTime     @default(now())

  outputs        RenderOutput[]

  @@index([workspaceId, createdAt])
  @@index([status])
}

model RenderOutput {
  id         String    @id @default(cuid())
  jobId      String
  job        RenderJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  assetId    String
  asset      Asset     @relation(fields: [assetId], references: [id])
  index      Int
  isFavorite Boolean   @default(false)
  votes      Int       @default(0)       // from share-link votes (V3)
  createdAt  DateTime  @default(now())

  @@unique([jobId, index])
}

model CreditLedger {
  id          String       @id @default(cuid())
  workspaceId String
  workspace   Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  delta       Int                          // + grant/refund, - spend
  reason      CreditReason
  refId       String?                      // jobId, workspaceId (signup), or `${subId}:${periodStart}`
  note        String?
  createdAt   DateTime     @default(now())

  @@unique([reason, refId])                // idempotency for grants and refunds
  @@index([workspaceId, createdAt])
}

model RateCard {
  id          String    @id @default(cuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name        String
  currency    String    @default("USD")
  markupBps   Int       @default(0)
  taxBps      Int       @default(0)
  isDefault   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  items       RateCardItem[]
  estimates   Estimate[]

  @@index([workspaceId])
}

model RateCardItem {
  id             String   @id @default(cuid())
  rateCardId     String
  rateCard       RateCard @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  key            String
  label          String
  category       String
  unit           RateUnit
  unitPriceMinor Int
  sortOrder      Int      @default(0)

  @@unique([rateCardId, key])
}

model Estimate {
  id            String    @id @default(cuid())
  projectId     String
  project       Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  roomId        String?
  room          Room?     @relation(fields: [roomId], references: [id], onDelete: SetNull)
  rateCardId    String?
  rateCard      RateCard? @relation(fields: [rateCardId], references: [id], onDelete: SetNull)
  version       Int       @default(1)
  currency      String
  subtotalMinor Int
  markupMinor   Int
  taxMinor      Int
  totalMinor    Int
  rangeBps      Int?                       // set for rough Home estimates
  createdAt     DateTime  @default(now())

  lines         EstimateLine[]
  proposals     Proposal[]

  @@index([projectId])
}

model EstimateLine {
  id             String   @id @default(cuid())
  estimateId     String
  estimate       Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  itemKey        String?
  label          String
  category       String
  unit           RateUnit
  quantity       Decimal  @db.Decimal(12, 2)
  unitPriceMinor Int
  totalMinor     Int
  sortOrder      Int      @default(0)

  @@index([estimateId])
}

model Proposal {
  id               String         @id @default(cuid())
  projectId        String
  project          Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  estimateId       String
  estimate         Estimate       @relation(fields: [estimateId], references: [id])
  version          Int            @default(1)
  status           ProposalStatus @default(DRAFT)
  title            String
  intro            String?
  terms            String?
  renderOutputIds  String[]                       // ordered options shown to the client
  publicToken      String         @unique
  expiresAt        DateTime?
  sentAt           DateTime?
  viewedAt         DateTime?
  approvedAt       DateTime?
  approvedOutputId String?
  pdfStorageKey    String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  comments         ProposalComment[]

  @@index([projectId])
}

model ProposalComment {
  id         String        @id @default(cuid())
  proposalId String
  proposal   Proposal      @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  authorType CommentAuthor
  authorName String
  body       String
  createdAt  DateTime      @default(now())

  @@index([proposalId])
}

model BriefLink {
  id          String      @id @default(cuid())
  workspaceId String
  workspace   Workspace   @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  clientId    String?
  client      Client?     @relation(fields: [clientId], references: [id], onDelete: SetNull)
  token       String      @unique
  status      BriefStatus @default(OPEN)
  expiresAt   DateTime?
  createdAt   DateTime    @default(now())

  submissions BriefSubmission[]

  @@index([workspaceId])
}

model BriefSubmission {
  id          String    @id @default(cuid())
  briefLinkId String
  briefLink   BriefLink @relation(fields: [briefLinkId], references: [id], onDelete: Cascade)
  answers     Json
  assetIds    String[]
  projectId   String?                           // draft project created from the submission
  createdAt   DateTime  @default(now())
}

model Subscription {
  id                     String             @id @default(cuid())
  workspaceId            String             @unique
  workspace              Workspace          @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  provider               String
  providerCustomerId     String
  providerSubscriptionId String?            @unique
  plan                   String
  status                 SubscriptionStatus
  currentPeriodEnd       DateTime?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
}

model WebhookEvent {
  id          String   @id            // provider event id
  provider    String
  type        String
  processedAt DateTime @default(now())
}
```

## Credit balance

Balance = `SUM(delta)` for the workspace from `CreditLedger`. The ledger is append-only. Never update or delete rows. A cached balance column may be added later only if measured to be needed.

## Tenant isolation test (required)

Create two workspaces A and B with data. For every service that reads or writes tenant data, a test MUST prove that workspace A's context cannot read, update or delete B's records by id. Add this test file in V2 and extend it in V3 and V4.
