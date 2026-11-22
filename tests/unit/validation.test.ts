import { describe, expect, it } from "vitest";

import {
  acceptInvitationSchema,
  invitationSchema,
  memberUpdateSchema,
  organizationSchema,
  otpSchema,
  profileSchema,
} from "@/lib/validation/schemas";

const teamId = "aaaaaaaa-0000-4000-8000-000000000001";

describe("invitationSchema", () => {
  it("normalise l'email et vide les champs facultatifs", () => {
    const result = invitationSchema.parse({
      email: "  Claire.Martin@Exemple.FR ",
      first_name: " Claire ",
      last_name: "Martin",
      role: "manager",
      team_id: "",
      job_title: "",
    });
    expect(result).toEqual({
      email: "claire.martin@exemple.fr",
      first_name: "Claire",
      last_name: "Martin",
      role: "manager",
      team_id: null,
      job_title: null,
    });
  });

  it("exige une équipe pour un commercial", () => {
    const result = invitationSchema.safeParse({
      email: "leo@exemple.fr",
      first_name: "Léo",
      last_name: "Bernard",
      role: "sales_rep",
      team_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("refuse une équipe pour un manager", () => {
    const result = invitationSchema.safeParse({
      email: "jules@exemple.fr",
      first_name: "Jules",
      last_name: "Petit",
      role: "manager",
      team_id: teamId,
    });
    expect(result.success).toBe(false);
  });

  it("refuse un rôle inconnu et un email invalide", () => {
    expect(
      invitationSchema.safeParse({
        email: "x@y.fr",
        first_name: "a",
        last_name: "b",
        role: "super_admin",
      }).success,
    ).toBe(false);
    expect(
      invitationSchema.safeParse({
        email: "pas-un-email",
        first_name: "a",
        last_name: "b",
        role: "manager",
      }).success,
    ).toBe(false);
  });
});

describe("memberUpdateSchema", () => {
  it("retire l'équipe quand la personne n'est plus commerciale", () => {
    const result = memberUpdateSchema.parse({ role: "manager", team_id: teamId, job_title: "" });
    expect(result.team_id).toBeNull();
  });
});

describe("autres schémas", () => {
  it("le code de connexion contient exactement 6 chiffres", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse(" 123456 ").success).toBe(true);
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
  });

  it("l'adresse d'une entreprise est en minuscules et tirets", () => {
    expect(organizationSchema.safeParse({ name: "Acme", slug: "acme-auto" }).success).toBe(true);
    expect(organizationSchema.safeParse({ name: "Acme", slug: "Acme Auto" }).success).toBe(false);
  });

  it("l'acceptation d'invitation exige la case des CGU", () => {
    const base = { token: "x".repeat(43), first_name: "Inès", last_name: "Moreau" };
    expect(acceptInvitationSchema.safeParse(base).success).toBe(false);
    expect(acceptInvitationSchema.safeParse({ ...base, accept_terms: "on" }).success).toBe(true);
  });

  it("le téléphone est facultatif", () => {
    expect(profileSchema.parse({ first_name: "A", last_name: "B", phone: "" }).phone).toBeNull();
  });
});
