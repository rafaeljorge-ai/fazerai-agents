import { describe, expect, test } from "bun:test";
import { planExistingUserUpdate } from "../../scripts/set-admin";

describe("set-admin: planExistingUserUpdate", () => {
  test("setting a password on an existing SUPER_ADMIN does NOT demote or touch tenantId", () => {
    // Regression: used to unconditionally set { role: "TENANT_ADMIN", passwordHash } without
    // tenantId, which both silently demoted the SUPER_ADMIN and violated the DB's
    // users_role_tenant_check constraint (TENANT_ADMIN requires a non-null tenantId).
    const plan = planExistingUserUpdate({
      email: "gabriel@mavikai.com.br",
      currentRole: "SUPER_ADMIN",
      targetRole: "TENANT_ADMIN",
      targetTenantId: 1n,
      targetRoleLabel: "TENANT_ADMIN (tenant 1)",
      passwordHash: "hashed-pw",
    });

    expect(plan.promotion).toBeUndefined();
    expect(plan.passwordHash).toBe("hashed-pw");
    expect(plan.message).toBe(
      "Password updated for gabriel@mavikai.com.br (role unchanged: SUPER_ADMIN).",
    );
  });

  test("promotes an AGENT to TENANT_ADMIN, setting role and tenantId together", () => {
    const plan = planExistingUserUpdate({
      email: "user@mavikai.com.br",
      currentRole: "AGENT",
      targetRole: "TENANT_ADMIN",
      targetTenantId: 1n,
      targetRoleLabel: "TENANT_ADMIN (tenant 1)",
    });

    expect(plan.promotion).toEqual({ role: "TENANT_ADMIN", tenantId: 1n });
    expect(plan.passwordHash).toBeUndefined();
    expect(plan.message).toBe(
      "Successfully set user@mavikai.com.br as TENANT_ADMIN (tenant 1).",
    );
  });

  test("promotes AND sets a password in one call", () => {
    const plan = planExistingUserUpdate({
      email: "user@mavikai.com.br",
      currentRole: "AGENT",
      targetRole: "TENANT_ADMIN",
      targetTenantId: 1n,
      targetRoleLabel: "TENANT_ADMIN (tenant 1)",
      passwordHash: "hashed-pw",
    });

    expect(plan.promotion).toEqual({ role: "TENANT_ADMIN", tenantId: 1n });
    expect(plan.passwordHash).toBe("hashed-pw");
    expect(plan.message).toBe(
      "User user@mavikai.com.br set as TENANT_ADMIN (tenant 1) with new password.",
    );
  });

  test("no-op when the user is already at or above the target role and no password given", () => {
    const plan = planExistingUserUpdate({
      email: "gabriel@mavikai.com.br",
      currentRole: "SUPER_ADMIN",
      targetRole: "TENANT_ADMIN",
      targetTenantId: 1n,
      targetRoleLabel: "TENANT_ADMIN (tenant 1)",
    });

    expect(plan.promotion).toBeUndefined();
    expect(plan.passwordHash).toBeUndefined();
    expect(plan.message).toBe(
      "User gabriel@mavikai.com.br is already at or above TENANT_ADMIN (SUPER_ADMIN).",
    );
  });
});
