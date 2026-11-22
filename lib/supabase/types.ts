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

/** Champs générés par la base : facultatifs à l'insertion. */
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
    };
    Views: Record<string, never>;
    Functions: {
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      my_role: { Args: { org: string }; Returns: OrgRole | null };
      is_org_admin: { Args: { org: string }; Returns: boolean };
      can_manage_member: { Args: { member: string }; Returns: boolean };
      can_view_member: { Args: { member: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
