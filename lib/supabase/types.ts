/**
 * Types de la base.
 * Écrits pour correspondre exactement aux migrations de supabase/migrations.
 * Quand Supabase local est disponible, `pnpm db:types` régénère ce fichier
 * (la sortie générée remplace intégralement ce contenu).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type OrgRole = "org_admin" | "manager" | "sales_rep";
export type OrgStatus = "actif" | "suspendu" | "archive";

type ProfileRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  last_seen_at: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: OrgStatus;
  settings: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

type TeamRow = {
  id: string;
  organization_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  job_title: string | null;
  team_id: string | null;
  active: boolean;
  hired_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type TeamManagerRow = {
  team_id: string;
  membership_id: string;
  organization_id: string;
  created_at: string;
};

type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: OrgRole;
  team_id: string | null;
  job_title: string | null;
  token_hash: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by: string | null;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type AuditLogRow = {
  id: number;
  organization_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Json | null;
  created_at: string;
};

type EmailLogRow = {
  id: string;
  organization_id: string | null;
  to_email: string;
  template: string;
  status: "envoye" | "redirige" | "simule" | "echec";
  provider_id: string | null;
  error: string | null;
  created_at: string;
};


type LevelDescriptors = {
  level_0: string | null;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  level_4: string | null;
};

type FrameworkTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  published: boolean;
  created_at: string;
  updated_at: string | null;
};

type TemplateBlockRow = {
  id: string;
  template_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string | null;
};

type TemplateCompetencyRow = {
  id: string;
  block_id: string;
  name: string;
  statement: string | null;
  position: number;
  created_at: string;
  updated_at: string | null;
};

type TemplateSkillRow = LevelDescriptors & {
  id: string;
  competency_id: string;
  name: string;
  statement: string | null;
  position: number;
  created_at: string;
  updated_at: string | null;
};

type FrameworkRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  source_template_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type BlockRow = {
  id: string;
  organization_id: string;
  framework_id: string;
  name: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type CompetencyRow = {
  id: string;
  organization_id: string;
  block_id: string;
  name: string;
  statement: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type SkillRow = LevelDescriptors & {
  id: string;
  organization_id: string;
  competency_id: string;
  name: string;
  statement: string | null;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};


type LibraryDojoRow = {
  id: string;
  title: string;
  content: Json;
  pptx_path: string | null;
  created_at: string;
  updated_at: string | null;
};

type LibraryDojoSkillRow = { library_dojo_id: string; template_skill_id: string };

type DojoRow = {
  id: string;
  organization_id: string;
  skill_id: string;
  title: string;
  content: Json;
  status: "brouillon" | "a_tester" | "valide" | "archive";
  source: "bibliotheque" | "ia" | "manuel";
  library_dojo_id: string | null;
  pptx_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

/** Champs générés par la base : facultatifs à l'insertion. */
type EvaluationRow = {
  id: string;
  organization_id: string;
  subject_membership_id: string;
  author_membership_id: string | null;
  author_user_id: string;
  framework_id: string;
  kind: "manager" | "self";
  status: "brouillon" | "validee";
  general_comment: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type EvaluationScoreRow = {
  evaluation_id: string;
  skill_id: string;
  organization_id: string;
  score: number | null;
  comment: string | null;
  updated_at: string | null;
};

type ManagerNoteRow = {
  id: string;
  organization_id: string;
  subject_membership_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

type LatestSkillScoreRow = {
  subject_membership_id: string;
  skill_id: string;
  organization_id: string;
  score: number;
  evaluated_at: string;
  evaluation_id: string;
};

type Generated = "id" | "created_at" | "updated_at";
type InsertOf<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;

type Rel<Name extends string, Cols extends string[], Ref extends string, RefCols extends string[]> = {
  foreignKeyName: Name;
  columns: Cols;
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: RefCols;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: InsertOf<
          ProfileRow,
          | "created_at"
          | "updated_at"
          | "phone"
          | "avatar_url"
          | "is_super_admin"
          | "last_seen_at"
          | "terms_accepted_at"
        >;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: InsertOf<
          OrganizationRow,
          Generated | "logo_url" | "status" | "settings" | "created_by"
        >;
        Update: Partial<OrganizationRow>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: InsertOf<TeamRow, Generated | "active">;
        Update: Partial<TeamRow>;
        Relationships: [
          Rel<"teams_organization_id_fkey", ["organization_id"], "organizations", ["id"]>,
        ];
      };
      memberships: {
        Row: MembershipRow;
        Insert: InsertOf<MembershipRow, Generated | "job_title" | "team_id" | "active" | "hired_at">;
        Update: Partial<MembershipRow>;
        Relationships: [
          Rel<"memberships_user_id_fkey", ["user_id"], "profiles", ["id"]>,
          Rel<"memberships_organization_id_fkey", ["organization_id"], "organizations", ["id"]>,
          Rel<
            "memberships_team_id_organization_id_fkey",
            ["team_id", "organization_id"],
            "teams",
            ["id", "organization_id"]
          >,
        ];
      };
      team_managers: {
        Row: TeamManagerRow;
        Insert: InsertOf<TeamManagerRow, "created_at">;
        Update: Partial<TeamManagerRow>;
        Relationships: [
          Rel<
            "team_managers_team_id_organization_id_fkey",
            ["team_id", "organization_id"],
            "teams",
            ["id", "organization_id"]
          >,
          Rel<
            "team_managers_membership_id_organization_id_fkey",
            ["membership_id", "organization_id"],
            "memberships",
            ["id", "organization_id"]
          >,
        ];
      };
      invitations: {
        Row: InvitationRow;
        Insert: InsertOf<
          InvitationRow,
          | Generated
          | "team_id"
          | "job_title"
          | "accepted_at"
          | "revoked_at"
          | "invited_by"
          | "last_sent_at"
        >;
        Update: Partial<InvitationRow>;
        Relationships: [
          Rel<"invitations_organization_id_fkey", ["organization_id"], "organizations", ["id"]>,
          Rel<
            "invitations_team_id_organization_id_fkey",
            ["team_id", "organization_id"],
            "teams",
            ["id", "organization_id"]
          >,
        ];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: InsertOf<
          AuditLogRow,
          "id" | "created_at" | "organization_id" | "actor_user_id" | "target_type" | "target_id" | "details"
        >;
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      email_log: {
        Row: EmailLogRow;
        Insert: InsertOf<EmailLogRow, "id" | "created_at" | "organization_id" | "provider_id" | "error">;
        Update: Partial<EmailLogRow>;
        Relationships: [];
      };
      framework_templates: {
        Row: FrameworkTemplateRow;
        Insert: InsertOf<FrameworkTemplateRow, Generated | "description" | "published">;
        Update: Partial<FrameworkTemplateRow>;
        Relationships: [];
      };
      template_blocks: {
        Row: TemplateBlockRow;
        Insert: InsertOf<TemplateBlockRow, Generated | "position">;
        Update: Partial<TemplateBlockRow>;
        Relationships: [
          Rel<"template_blocks_template_id_fkey", ["template_id"], "framework_templates", ["id"]>,
        ];
      };
      template_competencies: {
        Row: TemplateCompetencyRow;
        Insert: InsertOf<TemplateCompetencyRow, Generated | "position" | "statement">;
        Update: Partial<TemplateCompetencyRow>;
        Relationships: [
          Rel<"template_competencies_block_id_fkey", ["block_id"], "template_blocks", ["id"]>,
        ];
      };
      template_skills: {
        Row: TemplateSkillRow;
        Insert: InsertOf<TemplateSkillRow, Generated | "position" | "statement" | keyof LevelDescriptors>;
        Update: Partial<TemplateSkillRow>;
        Relationships: [
          Rel<"template_skills_competency_id_fkey", ["competency_id"], "template_competencies", ["id"]>,
        ];
      };
      frameworks: {
        Row: FrameworkRow;
        Insert: InsertOf<FrameworkRow, Generated | "description" | "source_template_id" | "active">;
        Update: Partial<FrameworkRow>;
        Relationships: [];
      };
      blocks: {
        Row: BlockRow;
        Insert: InsertOf<BlockRow, Generated | "position" | "active">;
        Update: Partial<BlockRow>;
        Relationships: [
          Rel<
            "blocks_framework_id_organization_id_fkey",
            ["framework_id", "organization_id"],
            "frameworks",
            ["id", "organization_id"]
          >,
        ];
      };
      competencies: {
        Row: CompetencyRow;
        Insert: InsertOf<CompetencyRow, Generated | "position" | "active" | "statement">;
        Update: Partial<CompetencyRow>;
        Relationships: [
          Rel<
            "competencies_block_id_organization_id_fkey",
            ["block_id", "organization_id"],
            "blocks",
            ["id", "organization_id"]
          >,
        ];
      };
      skills: {
        Row: SkillRow;
        Insert: InsertOf<SkillRow, Generated | "position" | "active" | "statement" | keyof LevelDescriptors>;
        Update: Partial<SkillRow>;
        Relationships: [
          Rel<
            "skills_competency_id_organization_id_fkey",
            ["competency_id", "organization_id"],
            "competencies",
            ["id", "organization_id"]
          >,
        ];
      };
      library_dojos: {
        Row: LibraryDojoRow;
        Insert: InsertOf<LibraryDojoRow, Generated | "pptx_path">;
        Update: Partial<LibraryDojoRow>;
        Relationships: [];
      };
      library_dojo_skills: {
        Row: LibraryDojoSkillRow;
        Insert: LibraryDojoSkillRow;
        Update: Partial<LibraryDojoSkillRow>;
        Relationships: [
          Rel<"library_dojo_skills_library_dojo_id_fkey", ["library_dojo_id"], "library_dojos", ["id"]>,
          Rel<"library_dojo_skills_template_skill_id_fkey", ["template_skill_id"], "template_skills", ["id"]>,
        ];
      };
      dojos: {
        Row: DojoRow;
        Insert: InsertOf<DojoRow, Generated | "status" | "source" | "library_dojo_id" | "pptx_path" | "created_by">;
        Update: Partial<DojoRow>;
        Relationships: [
          Rel<
            "dojos_skill_id_organization_id_fkey",
            ["skill_id", "organization_id"],
            "skills",
            ["id", "organization_id"]
          >,
          Rel<"dojos_created_by_fkey", ["created_by"], "profiles", ["id"]>,
          Rel<"dojos_organization_id_fkey", ["organization_id"], "organizations", ["id"]>,
        ];
      };
      evaluations: {
        Row: EvaluationRow;
        Insert: InsertOf<
          EvaluationRow,
          Generated | "status" | "author_user_id" | "author_membership_id" | "general_comment" | "validated_at"
        >;
        Update: Partial<EvaluationRow>;
        Relationships: [
          Rel<
            "evaluations_subject_membership_id_organization_id_fkey",
            ["subject_membership_id", "organization_id"],
            "memberships",
            ["id", "organization_id"]
          >,
          Rel<"evaluations_author_user_id_fkey", ["author_user_id"], "profiles", ["id"]>,
        ];
      };
      evaluation_scores: {
        Row: EvaluationScoreRow;
        Insert: InsertOf<EvaluationScoreRow, "comment" | "updated_at">;
        Update: Partial<EvaluationScoreRow>;
        Relationships: [
          Rel<
            "evaluation_scores_evaluation_id_organization_id_fkey",
            ["evaluation_id", "organization_id"],
            "evaluations",
            ["id", "organization_id"]
          >,
        ];
      };
      manager_notes: {
        Row: ManagerNoteRow;
        Insert: InsertOf<ManagerNoteRow, Generated | "author_user_id">;
        Update: Partial<ManagerNoteRow>;
        Relationships: [Rel<"manager_notes_author_user_id_fkey", ["author_user_id"], "profiles", ["id"]>];
      };
    };
    Views: {
      v_latest_skill_scores: { Row: LatestSkillScoreRow; Relationships: [] };
    };
    Functions: {
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      my_role: { Args: { org: string }; Returns: OrgRole | null };
      is_org_admin: { Args: { org: string }; Returns: boolean };
      can_manage_member: { Args: { member: string }; Returns: boolean };
      can_view_member: { Args: { member: string }; Returns: boolean };
      copy_template_to_organization: { Args: { template: string; org: string }; Returns: string };
      is_skill_used: { Args: { skill: string }; Returns: boolean };
      is_competency_used: { Args: { competency: string }; Returns: boolean };
      is_block_used: { Args: { block: string }; Returns: boolean };
      used_skill_ids: { Args: { org: string }; Returns: string[] };
      duplicate_template: { Args: { template: string; new_name: string }; Returns: string };
      mastery_percent: { Args: { member: string }; Returns: number | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
