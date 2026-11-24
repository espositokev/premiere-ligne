"use client";

import { useActionState } from "react";

import { setOrganizationAiPlan } from "@/app/actions/organizations";
import { Field, FormFeedback, Select, SubmitButton } from "@/components/ui/form-controls";
import { AI_PLAN_LABELS, AI_PLAN_PRICES, AI_PLANS } from "@/lib/domain/ai-plan";
import { initialFormState } from "@/lib/forms";
import type { AiPlan } from "@/lib/supabase/types";

/** Choix de l'option IA d'une entreprise, par le super admin. */
export function AiPlanForm({ organizationId, plan }: { organizationId: string; plan: AiPlan }) {
  const [state, action] = useActionState(setOrganizationAiPlan, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="organization_id" value={organizationId} />
      <Field label="Option active" htmlFor="ai-plan">
        <Select id="ai-plan" name="ai_plan" defaultValue={plan}>
          {AI_PLANS.map((value) => (
            <option key={value} value={value}>
              {AI_PLAN_LABELS[value]}
              {AI_PLAN_PRICES[value] ? ` · ${AI_PLAN_PRICES[value]}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton variant="outline" size="sm" className="self-start">
        Enregistrer
      </SubmitButton>
      <FormFeedback state={state} />
    </form>
  );
}
