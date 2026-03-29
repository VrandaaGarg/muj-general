import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const appRoleEnum = pgEnum("app_role", ["reader", "editor", "admin"]);

export const researchItemStatusEnum = pgEnum("research_item_status", [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "archived",
]);

export const researchItemTypeEnum = pgEnum("research_item_type", [
  "research_paper",
  "journal_article",
  "conference_paper",
  "thesis",
  "dissertation",
  "capstone_project",
  "technical_report",
  "patent",
  "poster",
  "dataset",
  "presentation",
]);

export const fileKindEnum = pgEnum("file_kind", [
  "main_pdf",
  "supplementary",
  "cover_image",
  "dataset_file",
  "presentation_file",
  "other",
]);

export const moderationDecisionEnum = pgEnum("moderation_decision", [
  "approved",
  "changes_requested",
  "archived",
]);

export const editorAccessRequestStatusEnum = pgEnum(
  "editor_access_request_status",
  ["pending", "approved", "rejected"],
);

export const journalStatusEnum = pgEnum("journal_status", ["active", "archived"]);

export const researchItemWorkflowStageEnum = pgEnum(
  "research_item_workflow_stage",
  [
    "draft",
    "submitted",
    "editor_review",
    "peer_review",
    "editor_revision_requested",
    "editor_forwarded_to_admin",
    "admin_review",
    "awaiting_submitter_confirmation",
    "ready_to_publish",
    "published",
    "declined_by_submitter",
    "archived",
  ],
);

export const submitterConfirmationStatusEnum = pgEnum(
  "submitter_confirmation_status",
  [
    "not_requested",
    "pending",
    "confirmed",
    "revision_requested",
    "declined_by_submitter",
  ],
);

export const peerReviewStatusEnum = pgEnum("peer_review_status", [
  "pending",
  "accepted",
  "declined",
  "completed",
  "expired",
  "revoked",
]);

export const peerReviewRecommendationEnum = pgEnum(
  "peer_review_recommendation",
  ["accept", "minor_revision", "major_revision", "reject"],
);

const timestamps = {
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .$onUpdateFn(() => new Date())
    .notNull(),
};

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    ...timestamps,
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_id_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestamps,
  },
  (table) => [uniqueIndex("departments_slug_unique").on(table.slug)],
);

export const appUsers = pgTable(
  "app_users",
  {
    id: text("id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull().default("reader"),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("app_users_role_idx").on(table.role),
    index("app_users_department_id_idx").on(table.departmentId),
  ],
);

export const editorAccessRequests = pgTable(
  "editor_access_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    status: editorAccessRequestStatusEnum("status")
      .notNull()
      .default("pending"),
    message: text("message"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "date",
    }),
    rejectionReason: text("rejection_reason"),
    ...timestamps,
  },
  (table) => [
    index("editor_access_requests_user_id_idx").on(table.userId),
    index("editor_access_requests_status_idx").on(table.status),
    index("editor_access_requests_reviewed_by_idx").on(table.reviewedByUserId),
    uniqueIndex("editor_access_requests_one_pending_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const authors = pgTable(
  "authors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: varchar("display_name", { length: 160 }).notNull(),
    email: varchar("email", { length: 255 }),
    orcid: varchar("orcid", { length: 50 }),
    affiliation: varchar("affiliation", { length: 255 }),
    linkedUserId: text("linked_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [index("authors_linked_user_id_idx").on(table.linkedUserId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("tags_name_unique").on(table.name),
    uniqueIndex("tags_slug_unique").on(table.slug),
  ],
);

export const journals = pgTable(
  "journals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 280 }).notNull(),
    description: text("description"),
    coverImageKey: text("cover_image_key"),
    issn: varchar("issn", { length: 20 }),
    eissn: varchar("eissn", { length: 20 }),
    aimAndScope: text("aim_and_scope"),
    topics: text("topics"),
    contentTypes: text("content_types"),
    ethicsPolicy: jsonb("ethics_policy").$type<string>(),
    disclosuresPolicy: jsonb("disclosures_policy").$type<string>(),
    rightsPermissions: jsonb("rights_permissions").$type<string>(),
    contactInfo: jsonb("contact_info").$type<string>(),
    submissionChecklist: jsonb("submission_checklist").$type<string>(),
    submissionGuidelines: jsonb("submission_guidelines").$type<string>(),
    howToPublish: jsonb("how_to_publish").$type<string>(),
    feesAndFunding: jsonb("fees_and_funding").$type<string>(),
    editorialBoardCanReviewSubmissions: boolean(
      "editorial_board_can_review_submissions",
    )
      .notNull()
      .default(true),
    status: journalStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("journals_slug_unique").on(table.slug),
    uniqueIndex("journals_name_unique").on(table.name),
    index("journals_status_idx").on(table.status),
  ],
);

export const journalEditorialBoard = pgTable(
  "journal_editorial_board",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => journals.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 100 }).notNull(),
    personName: varchar("person_name", { length: 200 }).notNull(),
    affiliation: text("affiliation"),
    email: varchar("email", { length: 255 }),
    orcid: varchar("orcid", { length: 40 }),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("journal_editorial_board_journal_id_idx").on(table.journalId),
    index("journal_editorial_board_display_order_idx").on(
      table.journalId,
      table.displayOrder,
    ),
  ],
);

export const journalVolumes = pgTable(
  "journal_volumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => journals.id, { onDelete: "cascade" }),
    volumeNumber: integer("volume_number").notNull(),
    title: varchar("title", { length: 255 }),
    year: integer("year").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("journal_volumes_unique_per_journal").on(
      table.journalId,
      table.volumeNumber,
    ),
    uniqueIndex("journal_volumes_id_journal_unique").on(table.id, table.journalId),
    index("journal_volumes_journal_id_idx").on(table.journalId),
  ],
);

export const journalIssues = pgTable(
  "journal_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => journals.id, { onDelete: "cascade" }),
    volumeId: uuid("volume_id")
      .notNull()
      .references(() => journalVolumes.id, { onDelete: "cascade" }),
    issueNumber: integer("issue_number").notNull(),
    title: varchar("title", { length: 255 }),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("journal_issues_unique_per_volume").on(
      table.volumeId,
      table.issueNumber,
    ),
    uniqueIndex("journal_issues_id_journal_unique").on(table.id, table.journalId),
    index("journal_issues_journal_id_idx").on(table.journalId),
    index("journal_issues_volume_id_idx").on(table.volumeId),
    foreignKey({
      columns: [table.volumeId, table.journalId],
      foreignColumns: [journalVolumes.id, journalVolumes.journalId],
      name: "journal_issues_volume_journal_consistency_fk",
    }),
  ],
);

export const researchItems = pgTable(
  "research_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 200 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    abstract: text("abstract").notNull(),
    itemType: researchItemTypeEnum("item_type").notNull(),
    publicationYear: integer("publication_year").notNull(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    submittedByUserId: text("submitted_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    currentVersionId: uuid("current_version_id"),
    status: researchItemStatusEnum("status").notNull().default("draft"),
    workflowStage: researchItemWorkflowStageEnum("workflow_stage")
      .notNull()
      .default("draft"),
    handlingEditorUserId: text("handling_editor_user_id").references(
      () => appUsers.id,
      {
        onDelete: "set null",
      },
    ),
    submitterConfirmationStatus: submitterConfirmationStatusEnum(
      "submitter_confirmation_status",
    )
      .notNull()
      .default("not_requested"),
    submitterConfirmationNote: text("submitter_confirmation_note"),
    submitterConfirmationRequestedAt: timestamp(
      "submitter_confirmation_requested_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),
    submitterConfirmationRespondedAt: timestamp(
      "submitter_confirmation_responded_at",
      {
        withTimezone: true,
        mode: "date",
      },
    ),
    license: varchar("license", { length: 160 }),
    externalUrl: text("external_url"),
    doi: varchar("doi", { length: 255 }),
    journalId: uuid("journal_id").references(() => journals.id, {
      onDelete: "set null",
    }),
    journalIssueId: uuid("journal_issue_id").references(() => journalIssues.id, {
      onDelete: "set null",
    }),
    pageRange: varchar("page_range", { length: 30 }),
    articleNumber: varchar("article_number", { length: 30 }),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "date",
    }),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "date",
    }),
    viewCount: integer("view_count").notNull().default(0),
    downloadCount: integer("download_count").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("research_items_slug_unique").on(table.slug),
    index("research_items_status_idx").on(table.status),
    index("research_items_type_idx").on(table.itemType),
    index("research_items_publication_year_idx").on(table.publicationYear),
    index("research_items_department_id_idx").on(table.departmentId),
    index("research_items_journal_id_idx").on(table.journalId),
    index("research_items_journal_issue_id_idx").on(table.journalIssueId),
    index("research_items_submitted_by_user_id_idx").on(table.submittedByUserId),
    index("research_items_workflow_stage_idx").on(table.workflowStage),
    index("research_items_handling_editor_user_id_idx").on(
      table.handlingEditorUserId,
    ),
    foreignKey({
      columns: [table.journalIssueId, table.journalId],
      foreignColumns: [journalIssues.id, journalIssues.journalId],
      name: "research_items_issue_journal_consistency_fk",
    }),
    check(
      "research_items_issue_requires_journal_check",
      sql`${table.journalIssueId} IS NULL OR ${table.journalId} IS NOT NULL`,
    ),
  ],
);

export const itemVersions = pgTable(
  "item_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    abstract: text("abstract").notNull(),
    license: varchar("license", { length: 160 }),
    changeSummary: text("change_summary"),
    notesToAdmin: text("notes_to_admin"),
    supervisorName: varchar("supervisor_name", { length: 160 }),
    programName: varchar("program_name", { length: 160 }),
    publicationDate: timestamp("publication_date", {
      withTimezone: true,
      mode: "date",
    }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("item_versions_item_version_unique").on(
      table.researchItemId,
      table.versionNumber,
    ),
    index("item_versions_research_item_id_idx").on(table.researchItemId),
  ],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    itemVersionId: uuid("item_version_id").references(() => itemVersions.id, {
      onDelete: "set null",
    }),
    fileKind: fileKindEnum("file_kind").notNull(),
    storageBucket: varchar("storage_bucket", { length: 160 }).notNull(),
    objectKey: text("object_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 255 }),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("files_research_item_id_idx").on(table.researchItemId),
    uniqueIndex("files_bucket_object_key_unique").on(
      table.storageBucket,
      table.objectKey,
    ),
  ],
);

export const moderationDecisions = pgTable(
  "moderation_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    itemVersionId: uuid("item_version_id")
      .notNull()
      .references(() => itemVersions.id, { onDelete: "cascade" }),
    reviewedByUserId: text("reviewed_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    decision: moderationDecisionEnum("decision").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("moderation_decisions_item_id_idx").on(table.researchItemId)],
);

export const researchItemPeerReviews = pgTable(
  "research_item_peer_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    inviteeUserId: text("invitee_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    inviteeEmail: varchar("invitee_email", { length: 255 }).notNull(),
    inviteeName: varchar("invitee_name", { length: 200 }),
    status: peerReviewStatusEnum("status").notNull().default("pending"),
    inviteToken: varchar("invite_token", { length: 255 }),
    inviteExpiresAt: timestamp("invite_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    respondedAt: timestamp("responded_at", {
      withTimezone: true,
      mode: "date",
    }),
    recommendation: peerReviewRecommendationEnum("recommendation"),
    reviewComment: text("review_comment"),
    confidentialComment: text("confidential_comment"),
    reviewSubmittedAt: timestamp("review_submitted_at", {
      withTimezone: true,
      mode: "date",
    }),
    ...timestamps,
  },
  (table) => [
    index("research_item_peer_reviews_item_id_idx").on(table.researchItemId),
    index("research_item_peer_reviews_invitee_user_id_idx").on(
      table.inviteeUserId,
    ),
    index("research_item_peer_reviews_status_idx").on(table.status),
    uniqueIndex("research_item_peer_reviews_item_email_unique").on(
      table.researchItemId,
      table.inviteeEmail,
    ),
  ],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: text("target_id").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("activity_logs_actor_user_id_idx").on(table.actorUserId)],
);

export const researchItemAuthors = pgTable(
  "research_item_authors",
  {
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
    authorOrder: integer("author_order").notNull(),
    isCorresponding: boolean("is_corresponding").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.researchItemId, table.authorId] }),
    index("research_item_authors_item_id_idx").on(table.researchItemId),
  ],
);

export const researchItemTags = pgTable(
  "research_item_tags",
  {
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.researchItemId, table.tagId] }),
    index("research_item_tags_item_id_idx").on(table.researchItemId),
  ],
);

export const researchItemReferences = pgTable(
  "research_item_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    researchItemId: uuid("research_item_id")
      .notNull()
      .references(() => researchItems.id, { onDelete: "cascade" }),
    citationText: text("citation_text").notNull(),
    url: text("url"),
    referenceOrder: integer("reference_order").notNull(),
    ...timestamps,
  },
  (table) => [
    index("research_item_references_item_id_idx").on(table.researchItemId),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  appUser: one(appUsers, {
    fields: [user.id],
    references: [appUsers.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const appUsersRelations = relations(appUsers, ({ one, many }) => ({
  authUser: one(user, {
    fields: [appUsers.id],
    references: [user.id],
  }),
  department: one(departments, {
    fields: [appUsers.departmentId],
    references: [departments.id],
  }),
  submittedItems: many(researchItems),
  itemVersions: many(itemVersions),
  uploadedFiles: many(files),
  moderationDecisions: many(moderationDecisions),
  activityLogs: many(activityLogs),
  editorAccessRequests: many(editorAccessRequests, {
    relationName: "editorAccessRequestsRequestedByUser",
  }),
  reviewedEditorAccessRequests: many(editorAccessRequests, {
    relationName: "editorAccessRequestsReviewedByUser",
  }),
  handlingResearchItems: many(researchItems, {
    relationName: "researchItemsHandlingEditor",
  }),
  invitedPeerReviews: many(researchItemPeerReviews, {
    relationName: "researchItemPeerReviewsInvitedByUser",
  }),
  assignedPeerReviews: many(researchItemPeerReviews, {
    relationName: "researchItemPeerReviewsInviteeUser",
  }),
}));

export const editorAccessRequestsRelations = relations(
  editorAccessRequests,
  ({ one }) => ({
    user: one(appUsers, {
      fields: [editorAccessRequests.userId],
      references: [appUsers.id],
      relationName: "editorAccessRequestsRequestedByUser",
    }),
    reviewedByUser: one(appUsers, {
      fields: [editorAccessRequests.reviewedByUserId],
      references: [appUsers.id],
      relationName: "editorAccessRequestsReviewedByUser",
    }),
  }),
);

export const departmentsRelations = relations(departments, ({ many }) => ({
  appUsers: many(appUsers),
  researchItems: many(researchItems),
}));

export const authorsRelations = relations(authors, ({ one, many }) => ({
  linkedUser: one(appUsers, {
    fields: [authors.linkedUserId],
    references: [appUsers.id],
  }),
  researchItemAuthors: many(researchItemAuthors),
}));

export const journalsRelations = relations(journals, ({ many }) => ({
  editorialBoard: many(journalEditorialBoard),
  volumes: many(journalVolumes),
  issues: many(journalIssues),
  researchItems: many(researchItems),
}));

export const journalEditorialBoardRelations = relations(
  journalEditorialBoard,
  ({ one }) => ({
    journal: one(journals, {
      fields: [journalEditorialBoard.journalId],
      references: [journals.id],
    }),
  }),
);

export const journalVolumesRelations = relations(journalVolumes, ({ one, many }) => ({
  journal: one(journals, {
    fields: [journalVolumes.journalId],
    references: [journals.id],
  }),
  issues: many(journalIssues),
}));

export const journalIssuesRelations = relations(journalIssues, ({ one, many }) => ({
  journal: one(journals, {
    fields: [journalIssues.journalId],
    references: [journals.id],
  }),
  volume: one(journalVolumes, {
    fields: [journalIssues.volumeId],
    references: [journalVolumes.id],
  }),
  researchItems: many(researchItems),
}));

export const researchItemsRelations = relations(researchItems, ({ one, many }) => ({
  department: one(departments, {
    fields: [researchItems.departmentId],
    references: [departments.id],
  }),
  journal: one(journals, {
    fields: [researchItems.journalId],
    references: [journals.id],
  }),
  journalIssue: one(journalIssues, {
    fields: [researchItems.journalIssueId],
    references: [journalIssues.id],
  }),
  submittedByUser: one(appUsers, {
    fields: [researchItems.submittedByUserId],
    references: [appUsers.id],
  }),
  handlingEditorUser: one(appUsers, {
    fields: [researchItems.handlingEditorUserId],
    references: [appUsers.id],
    relationName: "researchItemsHandlingEditor",
  }),
  currentVersion: one(itemVersions, {
    fields: [researchItems.currentVersionId],
    references: [itemVersions.id],
  }),
  versions: many(itemVersions),
  files: many(files),
  moderationDecisions: many(moderationDecisions),
  researchItemAuthors: many(researchItemAuthors),
  researchItemTags: many(researchItemTags),
  researchItemReferences: many(researchItemReferences),
  peerReviews: many(researchItemPeerReviews),
}));

export const researchItemPeerReviewsRelations = relations(
  researchItemPeerReviews,
  ({ one }) => ({
    researchItem: one(researchItems, {
      fields: [researchItemPeerReviews.researchItemId],
      references: [researchItems.id],
    }),
    invitedByUser: one(appUsers, {
      fields: [researchItemPeerReviews.invitedByUserId],
      references: [appUsers.id],
      relationName: "researchItemPeerReviewsInvitedByUser",
    }),
    inviteeUser: one(appUsers, {
      fields: [researchItemPeerReviews.inviteeUserId],
      references: [appUsers.id],
      relationName: "researchItemPeerReviewsInviteeUser",
    }),
  }),
);

export const itemVersionsRelations = relations(itemVersions, ({ one, many }) => ({
  researchItem: one(researchItems, {
    fields: [itemVersions.researchItemId],
    references: [researchItems.id],
  }),
  createdByUser: one(appUsers, {
    fields: [itemVersions.createdByUserId],
    references: [appUsers.id],
  }),
  files: many(files),
  moderationDecisions: many(moderationDecisions),
}));

export const filesRelations = relations(files, ({ one }) => ({
  researchItem: one(researchItems, {
    fields: [files.researchItemId],
    references: [researchItems.id],
  }),
  itemVersion: one(itemVersions, {
    fields: [files.itemVersionId],
    references: [itemVersions.id],
  }),
  uploadedByUser: one(appUsers, {
    fields: [files.uploadedByUserId],
    references: [appUsers.id],
  }),
}));

export const moderationDecisionsRelations = relations(
  moderationDecisions,
  ({ one }) => ({
    researchItem: one(researchItems, {
      fields: [moderationDecisions.researchItemId],
      references: [researchItems.id],
    }),
    itemVersion: one(itemVersions, {
      fields: [moderationDecisions.itemVersionId],
      references: [itemVersions.id],
    }),
    reviewedByUser: one(appUsers, {
      fields: [moderationDecisions.reviewedByUserId],
      references: [appUsers.id],
    }),
  }),
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  actorUser: one(appUsers, {
    fields: [activityLogs.actorUserId],
    references: [appUsers.id],
  }),
}));

export const researchItemAuthorsRelations = relations(
  researchItemAuthors,
  ({ one }) => ({
    researchItem: one(researchItems, {
      fields: [researchItemAuthors.researchItemId],
      references: [researchItems.id],
    }),
    author: one(authors, {
      fields: [researchItemAuthors.authorId],
      references: [authors.id],
    }),
  }),
);

export const researchItemTagsRelations = relations(researchItemTags, ({ one }) => ({
  researchItem: one(researchItems, {
    fields: [researchItemTags.researchItemId],
    references: [researchItems.id],
  }),
  tag: one(tags, {
    fields: [researchItemTags.tagId],
    references: [tags.id],
  }),
}));

export const researchItemReferencesRelations = relations(
  researchItemReferences,
  ({ one }) => ({
    researchItem: one(researchItems, {
      fields: [researchItemReferences.researchItemId],
      references: [researchItems.id],
    }),
  }),
);
